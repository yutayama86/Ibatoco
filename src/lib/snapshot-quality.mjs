/**
 * performance-snapshot の実測データの整合チェック（Growth Engine に渡す前に通す）。
 *
 * 計算式（src/lib/growth-engine.mjs）は変えず、矛盾する値を計算から外し、理由を警告として返す。
 * 推測で値を直すことはしない（外すだけ。正しい値は取得し直す）。
 *
 * 見るもの
 *   - ページ別GSC（pageMetrics[].gsc）の28日の表示回数が、同じページの検索語1つの表示回数（gscDiscovery、期間が28日の中）より少ない
 *     → ページ全体が検索語の表示より少ないことはあり得ない。どちらが正しいか判定できないので、そのページのGSC値と、
 *       矛盾した検索語の所見の両方を計算から外す（矛盾しない小さい所見は残す）
 *   - 表示回数0のページの CTR・順位は計算できないので null にする（0% と書かない）
 */
import { daysBetween, addDays } from './growth-engine.mjs';

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const num = (value) => (value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));

/**
 * @returns {{ snapshot: any, issues: { level: 'warning' | 'info', kind: string, path: string, message: string }[] }}
 */
export function auditSnapshot(snapshot) {
  const issues = [];
  if (!snapshot?.pageMetrics?.length) return { snapshot, issues };
  const gscEnd = snapshot?.source?.freshness?.gscLatestConfirmedDate;
  const windowStart = isDate(gscEnd) ? addDays(gscEnd, -27) : null;

  // 28日の中に収まる検索語別の所見で、ページごとの最大の表示回数
  const maxQuery = new Map();
  for (const f of snapshot?.gscDiscovery?.findings ?? []) {
    const impressions = num(f.impressions);
    if (!f.page || impressions == null) continue;
    const [start, end] = String(f.period ?? '').split('..');
    if (!windowStart || !isDate(start) || !isDate(end) || daysBetween(windowStart, start) < 0 || daysBetween(end, gscEnd) < 0) continue;
    const current = maxQuery.get(f.page);
    if (!current || impressions > current.impressions) maxQuery.set(f.page, { impressions, query: f.query, period: f.period });
  }

  const conflicting = new Map(); // path → ページ別の表示回数（これより大きい所見は外す）
  const pageMetrics = snapshot.pageMetrics.map((row) => {
    const gsc = row.gsc ? { ...row.gsc } : null;
    if (!gsc) return row;
    const impressions = num(gsc.impressions28);
    const query = maxQuery.get(row.path);
    if (impressions != null && query && impressions < query.impressions) {
      issues.push({
        level: 'warning',
        kind: 'データ不整合',
        path: row.path,
        message: `${row.path} のページ別GSC表示（28日 ${impressions}）が、検索語「${query.query}」の表示（${query.impressions}・${query.period}）より少ない。どちらが正しいか判定できないため、取得し直すまで両方を計算から外す`,
      });
      conflicting.set(row.path, impressions);
      return { ...row, gsc: { impressions28: null, clicks28: null, ctr28: null, position28: null, impressionsPrev28: null }, gscExcluded: true };
    }
    if (impressions === 0) {
      gsc.ctr28 = null;
      gsc.position28 = null;
    }
    return { ...row, gsc };
  });
  const findings = (snapshot?.gscDiscovery?.findings ?? []).filter((f) => !(conflicting.has(f.page) && num(f.impressions) > conflicting.get(f.page)));
  const gscDiscovery = snapshot.gscDiscovery ? { ...snapshot.gscDiscovery, findings } : snapshot.gscDiscovery;
  return { snapshot: { ...snapshot, pageMetrics, gscDiscovery }, issues };
}
