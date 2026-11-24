/**
 * 本番デプロイの入口（scripts/deploy-guard.mjs）のテスト（node --test）。npm run verify で実行する。
 * 正規の経路（GitHub Actions「Deploy production」・main）を止めず、それ以外を止めることを確かめる。
 * 環境変数は GitHub の定義どおりに作る：workflow_run の GITHUB_REF は既定ブランチ、
 * workflow_dispatch の GITHUB_REF は実行したブランチ（docs.github.com「Events that trigger workflows」）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const run = (vars) => {
  const env = { ...process.env };
  for (const k of ['GITHUB_ACTIONS', 'GITHUB_WORKFLOW', 'GITHUB_REF', 'GITHUB_EVENT_NAME']) delete env[k];
  return spawnSync(process.execPath, ['scripts/deploy-guard.mjs'], { env: { ...env, ...vars }, encoding: 'utf8' });
};
const actions = (workflow, ref, event) => ({ GITHUB_ACTIONS: 'true', GITHUB_WORKFLOW: workflow, GITHUB_REF: ref, GITHUB_EVENT_NAME: event });

test('通す：Validate site 成功後の自動デプロイ（workflow_run・main）', () => {
  assert.equal(run(actions('Deploy production', 'refs/heads/main', 'workflow_run')).status, 0);
});

test('通す：緊急時の手動実行（workflow_dispatch・main）', () => {
  assert.equal(run(actions('Deploy production', 'refs/heads/main', 'workflow_dispatch')).status, 0);
});

test('止める：手元のPC・Claude Code（GitHub Actions の外）', () => {
  const r = run({});
  assert.equal(r.status, 1);
  assert.match(r.stderr, /GitHub Actions の外/);
});

test('止める：Deploy production 以外のワークフロー（Validate site など）', () => {
  assert.equal(run(actions('Validate site', 'refs/heads/main', 'push')).status, 1);
});

test('止める：main 以外のブランチ・PR からの実行', () => {
  assert.equal(run(actions('Deploy production', 'refs/heads/feature', 'workflow_dispatch')).status, 1);
  assert.equal(run(actions('Deploy production', 'refs/pull/1/merge', 'pull_request')).status, 1);
});

test('ワークフローと npm スクリプトが、ガードの前提と一致している', () => {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.match(workflow, /^name: Deploy production$/m, 'deploy.yml の name を変えるときは deploy-guard.mjs も直す');
  assert.match(workflow, /run: npm run deploy$/m);
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(scripts.deploy, /^node scripts\/deploy-guard\.mjs && /, 'npm run deploy の先頭でガードを実行する');
});

// ── 定期デプロイと計測データの分離（2026-10-27） ──
import { analyticsFreshness, STALE_AFTER_HOURS } from './deploy-preflight.mjs';

const NOW = Date.parse('2026-10-27T21:30:00Z');
const snap = (hoursAgo, extra = {}) => ({
  asOf: '2026-10-24',
  source: { status: 'google-api-daily-confirmed', lastConfirmedAt: new Date(NOW - hoursAgo * 3600000).toISOString(), ...extra },
});

test('計測データの鮮度：48時間以内は ok、それを超えたら stale、読めなければ unknown', () => {
  assert.equal(analyticsFreshness(snap(4), NOW).level, 'ok');
  assert.equal(analyticsFreshness(snap(STALE_AFTER_HOURS), NOW).level, 'ok');
  const stale = analyticsFreshness(snap(24 * 6), NOW);
  assert.equal(stale.level, 'stale');
  assert.match(stale.message, /6日前/);
  assert.equal(analyticsFreshness({ asOf: '2026-10-21' }, NOW).level, 'unknown');
  assert.equal(analyticsFreshness(null, NOW).level, 'unknown');
  assert.equal(analyticsFreshness(snap(-5), NOW).level, 'unknown');
});

test('計測データが古くても・読めなくても、鮮度の確認はデプロイを止めない（終了コード0）', () => {
  const r = spawnSync(process.execPath, ['scripts/deploy-preflight.mjs'], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
  assert.equal(r.status, 0, r.stderr);
});

test('Deploy production：計測で止めず、検証済みの最新 main だけを出し、公開後の SHA 照合を残す', () => {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.doesNotMatch(workflow, /scheduled deploy blocked/, '計測データの古さで定期デプロイを止めない');
  assert.match(workflow, /run: node scripts\/deploy-preflight\.mjs$/m);
  assert.match(workflow, /name: Require successful validation of the target commit\n\s+if: github\.event_name != 'workflow_run'/);
  assert.match(workflow, /actions\/workflows\/validate\.yml\/runs\?head_sha=\$TARGET_SHA&branch=main&status=success/);
  assert.match(workflow, /select\(\.head_sha == \$ENV\.TARGET_SHA/, 'API が絞り込みを無視しても、一致した実行だけを数える');
  assert.match(workflow, /name: Reject superseded deployment/);
  assert.match(workflow, /name: Check latest main before deployment/);
  assert.match(workflow, /name: Confirm deployed SHA and current main/);
  assert.match(workflow, /Production SHA mismatch/);
  assert.doesNotMatch(workflow, /^\s+(contents|actions|pull-requests|id-token): write/m, 'Deploy production に書き込み権限を足さない');
});

// 外部の Action はタグ（@v4 など）ではなくコミット SHA で固定する（#392）。タグは書き換えられるため。
// 2026-10-28 に GA4 同期（#446）と依存監査のワークフローがタグ指定のまま残っていたので、全ワークフローを検査する
test('すべてのワークフロー：外部の Action はコミット SHA で固定されている', () => {
  const dir = '.github/workflows';
  const files = readdirSync(dir).filter((name) => /\.ya?ml$/.test(name));
  assert.ok(files.length > 0);
  for (const name of files) {
    for (const line of readFileSync(`${dir}/${name}`, 'utf8').split('\n')) {
      const m = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
      if (!m || m[1].startsWith('./') || m[1].startsWith('docker://')) continue;
      assert.match(m[1], /@[0-9a-f]{40}$/, `${name}：SHA で固定されていない ${m[1]}`);
    }
  }
});

/** Run the actual release command offline. Only network/build/publish boundaries are replaced. */
function releaseFixture({ clean = true, networkFailure = false, criticalDev = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ibatoco-release-audit-'));
  const write = (path, value, mode) => {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, value, mode ? { mode } : undefined);
  };
  try {
    for (const path of ['scripts/deploy-guard.mjs', 'scripts/dependency-audit.mjs', 'src/lib/dependency-audit.mjs']) {
      write(path, readFileSync(path, 'utf8'));
    }
    const report = { auditReportVersion: 2,
      metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: clean ? 0 : 1, critical: 0, total: clean ? 0 : 1 } },
      vulnerabilities: clean ? {} : { picomatch: { severity: 'high', nodes: ['node_modules/picomatch'],
        via: [{ name: 'picomatch', dependency: 'picomatch', severity: 'high', range: '<=4.0.7',
          url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf' }] } } };
    write('audit-fixture.json', JSON.stringify(report));
    write('bin/npm', `#!${process.execPath}\nimport {readFileSync,appendFileSync} from 'node:fs';
const production=process.argv.includes('--omit=dev');
appendFileSync(process.env.FIXTURE_STAGE_LOG,(production?'production-audit':'critical-audit')+'\\n');
if(production){process.stdout.write(readFileSync(process.env.FIXTURE_AUDIT_PATH));process.exit(Number(process.env.FIXTURE_AUDIT_EXIT));}
if(process.argv.includes('--audit-level=critical'))process.exit(Number(process.env.FIXTURE_CRITICAL_EXIT));
process.exit(2);\n`, 0o755);
    // Make extensionless executable stubs use ES modules, like the repository scripts.
    write('package.json', JSON.stringify({ type: 'module' }));
    for (const stage of ['build', 'publish', 'verify', 'ui']) {
      write(`fixture-${stage}.mjs`, `import {appendFileSync} from 'node:fs';appendFileSync(process.env.FIXTURE_STAGE_LOG,'${stage}\\n');`);
    }
    const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
    const command = scripts.deploy
      .replace('npm run audit:site', 'node fixture-build.mjs')
      .replace('npx wrangler deploy', 'node fixture-publish.mjs')
      .replace('node scripts/verify-production.mjs --wait', 'node fixture-verify.mjs')
      .replace('node scripts/ui-smoke.mjs --production', 'node fixture-ui.mjs');
    assert.doesNotMatch(command, /wrangler|verify-production|ui-smoke|audit:site/, 'Never execute real publishing or production QA in a fixture');
    const result = spawnSync('/bin/sh', ['-c', command], { cwd: root, encoding: 'utf8', timeout: 10000,
      env: { ...process.env, ...actions('Deploy production', 'refs/heads/main', 'schedule'), GITHUB_STEP_SUMMARY: '',
        PATH: `${join(root, 'bin')}:${process.env.PATH ?? ''}`, FIXTURE_STAGE_LOG: join(root, 'stages.log'),
        FIXTURE_AUDIT_PATH: join(root, 'audit-fixture.json'), FIXTURE_AUDIT_EXIT: networkFailure ? '2' : clean ? '0' : '1',
        FIXTURE_CRITICAL_EXIT: criticalDev ? '1' : '0' } });
    let stages = [];
    try { stages = readFileSync(join(root, 'stages.log'), 'utf8').trim().split('\n'); } catch { /* A missing audit is detected by assertions below. */ }
    return { ...result, stages };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('公開直前監査：productionとcriticalを再監査してからビルド・公開する', () => {
  const r = releaseFixture();
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stages, ['production-audit', 'critical-audit', 'build', 'publish', 'verify', 'ui']);
});

for (const [name, options] of [
  ['production high（旧picomatchも対象）', { clean: false }],
  ['監査取得失敗', { networkFailure: true }],
]) {
  test(`公開直前監査で止める：${name}`, () => {
    const r = releaseFixture(options);
    assert.notEqual(r.status, 0);
    assert.deepEqual(r.stages, ['production-audit']);
  });
}

test('公開直前監査：開発依存のcriticalもビルド・公開前に止める', () => {
  const r = releaseFixture({ criticalDev: true });
  assert.notEqual(r.status, 0);
  assert.deepEqual(r.stages, ['production-audit', 'critical-audit']);
});
