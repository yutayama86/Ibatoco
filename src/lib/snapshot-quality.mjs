/**
 * performance-snapshot の実測データの整合チェック（Growth Engine に渡す前に通す）。
 *
 * 計算式（src/lib/growth-engine.mjs）は変えず、矛盾する値を計算から外し、理由を警告として返す。
 * 推測で値を直すことはしない（外すだけ。正しい値は取得し直す）。
 *
 * 見るもの
 *   - ページ別GSC（pageMetrics[].gsc）の28日の表示回数が、同じページの検索語1つの表示回数（gscDiscovery、期間が28日の中）より少ない
 *     → ページ全体が検索語1つより少ないことはあり得ないので、ページ別GSCの取得漏れ（URLの表記ゆれ・取得行数の上限など）とみなし、そのページのGSC値を null にする
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
        message: `${row.path} のページ別GSC表示（28日 ${impressions}）が、検索語「${query.query}」だけの表示（${query.impressions}・${query.period}）より少ない。ページ別GSCを取得し直すまで計算から外す`,
      });
      return { ...row, gsc: { impressions28: null, clicks28: null, ctr28: null, position28: null, impressionsPrev28: null }, gscExcluded: true };
    }
    if (impressions === 0) {
      gsc.ctr28 = null;
      gsc.position28 = null;
    }
    return { ...row, gsc };
  });
  return { snapshot: { ...snapshot, pageMetrics }, issues };
}
