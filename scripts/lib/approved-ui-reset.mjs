/** A recorded owner approval applies only to the reviewed UI patch and PR. */
const UI_FILE = /^src\/(?:pages|components|styles)\/.+\.(?:astro|css)$/;
const SUPPORT_FILES = new Set([
  'scripts/observation-guard.mjs',
  'scripts/lib/approved-ui-reset.mjs',
  'scripts/growth-engine.test.mjs',
  'data/editorial/approved-ui-resets.json',
  'src/data/seo-changes.ts',
]);
const isSafeFile = (file) => UI_FILE.test(file) || SUPPORT_FILES.has(file) || /^docs\/(?:design\/|GROWTH_ENGINE\.md$)/.test(file);

export function approvedUiResetFor({ approvals, repository, prNumber, baseSha, today, path, type, observedChangeId, changedFiles, deletedFiles = [], fileHashes, changes }) {
  if (type !== 'template' || !repository || !Number.isInteger(prNumber) || deletedFiles.length) return null;
  if (!changedFiles.length || !changedFiles.every(isSafeFile)) return null;
  const uiFiles = changedFiles.filter((file) => UI_FILE.test(file)).sort();
  if (!uiFiles.length) return null;
  return approvals.find((approval) => {
    if (approval.repository !== repository || approval.pullRequest !== prNumber || approval.baseSha !== baseSha) return false;
    if (approval.path !== path || approval.previousChangeId !== observedChangeId) return false;
    if (approval.approvedBy !== repository.split('/')[0] || typeof approval.reason !== 'string' || approval.reason.trim().length < 4) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(approval.approvedOn ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(approval.validThrough ?? '')) return false;
    if (approval.approvedOn > today || approval.validThrough < today || approval.validThrough < approval.approvedOn) return false;
    if (!Array.isArray(approval.allowedFiles) || !changedFiles.every((file) => approval.allowedFiles.includes(file))) return false;
    const hashes = Object.entries(approval.sourceBlobs ?? {});
    if (JSON.stringify(hashes.map(([file]) => file).sort()) !== JSON.stringify(uiFiles)) return false;
    if (!hashes.every(([file, hash]) => /^[0-9a-f]{40}$/.test(hash) && fileHashes[file] === hash)) return false;
    const restart = changes.find((change) => change.id === approval.restartChangeId);
    // A fresh, truthful publication record is required; do not move historical dates.
    return restart?.url === path && restart.date === today && restart.experimentType === 'template';
  }) ?? null;
}
