/**
 * 本番デプロイの入口（scripts/deploy-guard.mjs）のテスト（node --test）。npm run verify で実行する。
 * 正規の経路（GitHub Actions「Deploy production」・main）を止めず、それ以外を止めることを確かめる。
 * 環境変数は GitHub の定義どおりに作る：workflow_run の GITHUB_REF は既定ブランチ、
 * workflow_dispatch の GITHUB_REF は実行したブランチ（docs.github.com「Events that trigger workflows」）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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
