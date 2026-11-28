import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvedContentChangeFor } from './lib/approved-content-change.mjs';

const file = 'src/content/events/sample.md';
const hash = 'a'.repeat(40);
const approval = {
  scope: 'content', repository: 'yutayama86/Ibatoco', pullRequest: 10, baseSha: 'base1',
  path: '/events/sample/', previousChangeId: 'old-change', approvedBy: 'yutayama86',
  approvedOn: '2026-11-28', validThrough: '2026-11-30', reason: 'オーナーが個別承認',
  restartChangeId: 'new-change', restartExperimentType: 'cta',
  sourceBlobs: { [file]: hash }, allowedFiles: [file, 'src/data/seo-changes.ts', 'data/editorial/approved-ui-resets.json'],
};
const base = {
  approvals: [approval], repository: 'yutayama86/Ibatoco', prNumber: 10, baseSha: 'base1', today: '2026-11-28',
  path: '/events/sample/', type: 'body', observedChangeId: 'old-change',
  changedFiles: [file, 'src/data/seo-changes.ts', 'data/editorial/approved-ui-resets.json'],
  fileHashes: { [file]: hash },
  changes: [{ id: 'new-change', url: '/events/sample/', date: '2026-11-28', experimentType: 'cta' }],
};

test('すべて一致すれば許可する', () => {
  assert.equal(approvedContentChangeFor(base)?.restartChangeId, 'new-change');
});
test('記事の内容が承認時と違えば止める', () => {
  assert.equal(approvedContentChangeFor({ ...base, fileHashes: { [file]: 'b'.repeat(40) } }), null);
});
test('別のPR・別のbase・期限切れ・オーナー以外は止める', () => {
  assert.equal(approvedContentChangeFor({ ...base, prNumber: 11 }), null);
  assert.equal(approvedContentChangeFor({ ...base, baseSha: 'other' }), null);
  assert.equal(approvedContentChangeFor({ ...base, today: '2026-12-01' }), null);
  assert.equal(approvedContentChangeFor({ ...base, approvals: [{ ...approval, approvedBy: 'someone' }] }), null);
});
test('scope が content でない承認・新しい観測記録がない・許可外のファイルは止める', () => {
  assert.equal(approvedContentChangeFor({ ...base, approvals: [{ ...approval, scope: undefined }] }), null);
  assert.equal(approvedContentChangeFor({ ...base, changes: [] }), null);
  assert.equal(approvedContentChangeFor({ ...base, changedFiles: [...base.changedFiles, 'src/components/X.astro'] }), null);
});
