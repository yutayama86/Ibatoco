/** Fail-closed audit evaluation. A proposal may run only in PR CI, never main. */
import { parseDateOnly, addDateOnlyDays } from './date-only.js';

export const PICOMATCH_ADVISORY = 'GHSA-fc5q-39xc-vjpf';
const URL = `https://github.com/advisories/${PICOMATCH_ADVISORY}`;
const SHA256 = /^[a-f0-9]{64}$/;
const VERSIONS = {
  'node_modules/picomatch': '4.0.7',
  'node_modules/anymatch/node_modules/picomatch': '2.3.2',
};
const EVIDENCE = ['package-lock.json', 'worker/index.js', 'wrangler.jsonc', 'astro.config.mjs'];

export function evaluateDependencyAudit({ report, exitCode, rule, today, evidence, lockfile, eventName, inActions = false }) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const result = (mode = 'blocked') => ({ ok: errors.length === 0, mode, errors });
  if (![0, 1].includes(exitCode) || report?.auditReportVersion !== 2 || report.error
    || !report.vulnerabilities || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
    fail('監査レポートが不完全またはnpmの取得エラー。公開を止めます。');
    return result();
  }
  const entries = Object.entries(report.vulnerabilities);
  const totals = report.metadata?.vulnerabilities;
  for (const severity of ['info', 'low', 'moderate', 'high', 'critical']) {
    const observed = entries.filter(([, v]) => v?.severity === severity).length;
    if (!Number.isInteger(totals?.[severity]) || totals[severity] !== observed) fail(`監査件数が不整合: ${severity}`);
  }
  const blockers = entries.filter(([, v]) => ['high', 'critical'].includes(v?.severity));
  if (errors.length) return result();
  if (!blockers.length) {
    if (exitCode !== 0) fail('高リスク0件なのにnpmが異常終了。合格にはしません。');
    return result('strict');
  }
  if (exitCode === 0) fail('高リスクがあるのにnpmの終了コードが0。合格にはしません。');

  function onlyKnownAdvisory(name, chain = new Set()) {
    if (chain.has(name)) return false;
    const item = report.vulnerabilities[name];
    if (!item || item.severity === 'critical' || !Array.isArray(item.via) || !item.via.length) return false;
    const next = new Set([...chain, name]);
    return item.via.every((via) => typeof via === 'string' ? onlyKnownAdvisory(via, next)
      : name === 'picomatch' && via?.name === 'picomatch' && via.dependency === 'picomatch'
        && via.url === URL && via.range === '<=4.0.7' && via.severity === 'high');
  }
  for (const [name, entry] of blockers) {
    if (entry.severity === 'critical' || !onlyKnownAdvisory(name)) fail(`例外対象外の高リスク/critical: ${name}`);
  }
  if (errors.length) return result();

  if (rule?.advisory !== PICOMATCH_ADVISORY || rule.exploitFixed !== false) fail('例外の識別子または未修正の表示が不正。');
  let date, reviewed, expires;
  try { date = parseDateOnly(today); reviewed = parseDateOnly(rule?.reviewedOn); expires = parseDateOnly(rule?.expiresOn); }
  catch { fail('例外の日付が不正。'); }
  if (date && reviewed && expires) {
    if (date < reviewed || date >= expires) fail(`例外の期間外。期限は${rule.expiresOn} 00:00 JST。`);
    if (expires <= reviewed || expires > addDateOnlyDays(reviewed, 7)) fail('例外は最大7日。無期限・長期延長を拒否。');
  }
  const proposalOnly = rule?.status === 'pending-owner-approval' && inActions && eventName === 'pull_request';
  if (rule?.status !== 'approved' && !proposalOnly) fail('オーナー承認前の例外はPR検証専用。main・定期実行・手元では適用しません。');
  if (rule?.status === 'approved' && (!rule.approvedBy || !rule.approvedAt)) fail('例外の承認記録がありません。');
  for (const path of EVIDENCE) {
    const pinned = rule?.evidenceSha256?.[path];
    if (!SHA256.test(pinned ?? '') || evidence?.[path] !== pinned) fail(`評価した構成から変更されています: ${path}`);
  }
  const nodes = report.vulnerabilities.picomatch?.nodes;
  if (!Array.isArray(nodes) || !nodes.length) fail('picomatchの実体パスが不明。');
  for (const path of nodes ?? []) {
    if (!VERSIONS[path] || lockfile?.packages?.[path]?.version !== VERSIONS[path]) fail(`未評価のpicomatch実体/バージョン: ${path}`);
  }
  if (errors.length) return result();
  return result(proposalOnly ? 'proposal-ci-only' : 'temporary-risk-accepted');
}
