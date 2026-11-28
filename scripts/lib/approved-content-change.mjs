/**
 * オーナーが個別に承認した「観測中の記事への変更」だけを通す（2026-11-28 オーナー決定）。
 *
 * approved-ui-reset.mjs と同じ厳しさで、次のすべてが一致したときだけ許可する：
 *  - approvals の scope が 'content'、承認者がリポジトリのオーナー、承認日〜有効期限の範囲内
 *  - PR番号・base SHA・ページのパス・直前の観測記録ID（previousChangeId）が一致
 *  - 変更ファイルが allowedFiles に含まれ、記事ファイルの内容（blob）が承認時と一致
 *  - 同じPRに、今日付け・同じURL・承認された種類（restartExperimentType）の新しい観測記録がある
 * 宣言1行で通る例外（observation-exception）は増やさない。承認は記録として残る。
 */
const CONTENT_FILE = /^src\/content\/(?:events|news)\/[^/]+\.md$/;
const SUPPORT_FILES = new Set([
  'src/data/seo-changes.ts',
  'src/data/affiliates.ts',
  'data/editorial/approved-ui-resets.json',
  'data/editorial/event-registry.json',
]);
const ALLOWED_TYPES = new Set(['body', 'metadata', 'internal-link']);
const RESTART_TYPES = new Set(['cta', 'metadata', 'body', 'internal-link']);

export function approvedContentChangeFor({ approvals, repository, prNumber, baseSha, today, path, type, observedChangeId, changedFiles, deletedFiles = [], fileHashes, changes }) {
  if (!ALLOWED_TYPES.has(type) || !repository || !Number.isInteger(prNumber) || deletedFiles.length) return null;
  if (!changedFiles.length || !changedFiles.every((file) => CONTENT_FILE.test(file) || SUPPORT_FILES.has(file))) return null;
  const contentFiles = changedFiles.filter((file) => CONTENT_FILE.test(file)).sort();
  if (!contentFiles.length) return null;
  return approvals.find((approval) => {
    if (approval.scope !== 'content') return false;
    if (approval.repository !== repository || approval.pullRequest !== prNumber || approval.baseSha !== baseSha) return false;
    if (approval.path !== path || approval.previousChangeId !== observedChangeId) return false;
    if (approval.approvedBy !== repository.split('/')[0] || typeof approval.reason !== 'string' || approval.reason.trim().length < 4) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(approval.approvedOn ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(approval.validThrough ?? '')) return false;
    if (approval.approvedOn > today || approval.validThrough < today || approval.validThrough < approval.approvedOn) return false;
    if (!Array.isArray(approval.allowedFiles) || !changedFiles.every((file) => approval.allowedFiles.includes(file))) return false;
    const hashes = Object.entries(approval.sourceBlobs ?? {});
    if (JSON.stringify(hashes.map(([file]) => file).sort()) !== JSON.stringify(contentFiles)) return false;
    if (!hashes.every(([file, hash]) => /^[0-9a-f]{40}$/.test(hash) && fileHashes[file] === hash)) return false;
    if (!RESTART_TYPES.has(approval.restartExperimentType)) return false;
    const restart = changes.find((change) => change.id === approval.restartChangeId);
    return restart?.url === path && restart.date === today && restart.experimentType === approval.restartExperimentType;
  }) ?? null;
}
