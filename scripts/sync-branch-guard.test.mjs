/**
 * GA4/GSC 日次同期の固定ブランチを、人の修正ごと上書きしないこと（scripts/sync-branch-guard.mjs・2026-10-28・#445）。
 * 一時ディレクトリに小さな git リポジトリを作り、実際の git で確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pendingChanges, SYNC_OWNED_FILES } from './sync-branch-guard.mjs';

const SNAPSHOT = SYNC_OWNED_FILES[0];

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'ibatoco-sync-guard-'));
  const git = (...args) => execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const write = (file, body) => { mkdirSync(dirname(join(dir, file)), { recursive: true }); writeFileSync(join(dir, file), body); };
  const commit = (message) => { git('add', '-A'); git('commit', '-q', '-m', message); };
  git('init', '-q', '-b', 'main');
  write(SNAPSHOT, '{"asOf":"2026-10-21"}\n');
  write('scripts/sync.mjs', 'v1\n');
  commit('main');
  return { dir, git, write, commit, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('同期ブランチの上書き：スナップショットだけの変更なら上書きしてよい', () => {
  const r = repo();
  try {
    r.git('switch', '-q', '-c', 'bot');
    r.write(SNAPSHOT, '{"asOf":"2026-10-25"}\n');
    r.commit('bot: snapshot');
    assert.deepEqual(pendingChanges({ main: 'main', branch: 'bot', cwd: r.dir }), []);
  } finally { r.cleanup(); }
});

test('同期ブランチの上書き：人が足した修正が main に無ければ止める', () => {
  const r = repo();
  try {
    r.git('switch', '-q', '-c', 'bot');
    r.write(SNAPSHOT, '{"asOf":"2026-10-25"}\n');
    r.commit('bot: snapshot');
    r.write('scripts/sync.mjs', 'v2（人の修正）\n');
    r.write('docs/note.md', 'メモ\n');
    r.commit('human: fix');
    assert.deepEqual(pendingChanges({ main: 'main', branch: 'bot', cwd: r.dir }).sort(), ['docs/note.md', 'scripts/sync.mjs']);
  } finally { r.cleanup(); }
});

test('同期ブランチの上書き：修正が squash で main に入った後は止めない（main が先へ進んでいても）', () => {
  const r = repo();
  try {
    r.git('switch', '-q', '-c', 'bot');
    r.write(SNAPSHOT, '{"asOf":"2026-10-25"}\n');
    r.write('scripts/sync.mjs', 'v2（人の修正）\n');
    r.commit('bot+human');
    r.git('switch', '-q', 'main');
    r.write('scripts/sync.mjs', 'v2（人の修正）\n'); // squash merge と同じ中身
    r.commit('squash');
    r.write('src/other.mjs', 'later\n'); // その後の main の変更（同期ブランチの変更ではない）
    r.commit('later');
    assert.deepEqual(pendingChanges({ main: 'main', branch: 'bot', cwd: r.dir }), []);
  } finally { r.cleanup(); }
});

test('同期ブランチの上書き：main を取り込んだマージコミットだけなら止めない', () => {
  const r = repo();
  try {
    r.git('switch', '-q', '-c', 'bot');
    r.write(SNAPSHOT, '{"asOf":"2026-10-25"}\n');
    r.commit('bot: snapshot');
    r.git('switch', '-q', 'main');
    r.write('src/other.mjs', 'main moved\n');
    r.commit('main moved');
    r.git('switch', '-q', 'bot');
    r.git('merge', '-q', '--no-ff', '--no-edit', 'main');
    assert.deepEqual(pendingChanges({ main: 'main', branch: 'bot', cwd: r.dir }), []);
  } finally { r.cleanup(); }
});

test('同期ブランチの上書き：共通の履歴が無ければ判定できない（例外＝上書きしない）', () => {
  const r = repo();
  try {
    r.git('switch', '-q', '--orphan', 'bot');
    r.write(SNAPSHOT, '{"asOf":"2026-10-25"}\n');
    r.commit('unrelated');
    assert.throws(() => pendingChanges({ main: 'main', branch: 'bot', cwd: r.dir }));
  } finally { r.cleanup(); }
});

test('GA4/GSC 日次同期のワークフロー：強制 push の前に同期ブランチを検査する', () => {
  const workflow = readFileSync('.github/workflows/google-analytics-daily.yml', 'utf8');
  const guard = workflow.indexOf('node scripts/sync-branch-guard.mjs HEAD "origin/$branch"');
  assert.ok(guard > 0, '検査を呼ぶ');
  assert.ok(guard < workflow.indexOf('push --force origin'), '強制 push より前');
  assert.match(workflow, /fetch-depth: 0/, '共通の祖先を求めるために履歴を取る');
  // 使う Action はすべてコミット SHA で固定（#392 と同じ方針）
  for (const line of workflow.split('\n').filter((l) => /^\s*-?\s*uses:/.test(l))) {
    assert.match(line, /@[0-9a-f]{40}(\s|$)/, `SHA で固定されていない：${line.trim()}`);
  }
});
