/**
 * ページ別・検索語別の GSC と、ページ別の GA4 Views（performance-snapshot の gscQueries・pageMetrics・ga4TopPages）。
 * 純粋関数（ファイルもネットワークも触らない）。取得は scripts/google-api-daily.mjs、反映は scripts/google-analytics-sync.mjs。
 *
 * なぜ必要か（監査 docs/audit-20261113 の A1）：
 *   日次同期はサイト全体の日別しか取っておらず、ページ×検索語は11月より前の古いデータのまま残っていた。
 *   どの記事を直すか・直した効果はどうかを、古いデータで判断していた。
 *
 * 原則（既存の日次同期と同じ）：
 *   - 確定日（confirmedThrough）までの期間だけを使う。期間は日本時間の暦日
 *   - 取れなかった値は null。0 で埋めない。
 *     ただし GSC は表示0の行を返さないため、その窓の応答が上限（rowLimit）に達していなければ「行が無い＝0」と扱う。
 *     上限に達した窓では、行が無い値は null（不明）にする
 *   - 期間を必ず記録する（いつのデータかが分からない状態を二度と作らない）
 */
import { addDays } from './growth-engine.mjs';

/** 1回の取得で返る行の上限（Search Console API の最大） */
export const GSC_ROW_LIMIT = 25000;
/** スナップショットに残す検索語×ページの行数（容量のため。28日の表示の多い順） */
export const GSC_QUERY_KEEP = 3000;
/** スナップショットに残すページ別の行数 */
export const PAGE_METRICS_KEEP = 200;
/** ga4TopPages に残す件数 */
export const TOP_PAGES_KEEP = 20;

/** 4つの窓（直近28日・前28日・直近7日・前7日）。終わりは確定日 */
export function pageLevelWindows(through) {
  return {
    recent28: { start: addDays(through, -27), end: through },
    previous28: { start: addDays(through, -55), end: addDays(through, -28) },
    recent7: { start: addDays(through, -6), end: through },
    previous7: { start: addDays(through, -13), end: addDays(through, -7) },
  };
}

/** GSC の page キー（絶対URL）をサイト内のパスにする。別ホストやパースできないものは null */
export function toPath(pageUrl, host = 'ibatoco.jp') {
  try {
    const u = new URL(pageUrl);
    if (u.hostname !== host && u.hostname !== `www.${host}`) return null;
    return decodeURI(u.pathname);
  } catch {
    return null;
  }
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * GSC の応答（rows）を key → {clicks, impressions, position} の Map にする。
 * @param {{ keys: string[], clicks: number, impressions: number, position: number }[]} rows
 * @param {(keys: string[]) => string | null} keyOf
 */
function indexRows(rows, keyOf) {
  const map = new Map();
  for (const r of rows ?? []) {
    if (!finite(r?.clicks) || !finite(r?.impressions) || !finite(r?.position)) throw new Error('GSC page-level: invalid metrics');
    const key = keyOf(r.keys ?? []);
    if (key == null) continue;
    const prev = map.get(key);
    if (prev) {
      // 同じパスに正規化された行（末尾の違いなど）は合算する。順位は表示回数で重み付け
      const impressions = prev.impressions + r.impressions;
      map.set(key, {
        clicks: prev.clicks + r.clicks,
        impressions,
        position: impressions ? (prev.position * prev.impressions + r.position * r.impressions) / impressions : null,
      });
    } else {
      map.set(key, { clicks: r.clicks, impressions: r.impressions, position: r.position });
    }
  }
  return map;
}

/** 窓ごとの値。行があればその値、無ければ「上限未達なら0、達していれば null」 */
function metric(map, key, truncated) {
  const v = map.get(key);
  if (v) return { impressions: v.impressions, clicks: v.clicks, ctr: v.impressions ? v.clicks / v.impressions : null, position: v.impressions ? v.position : null };
  return truncated
    ? { impressions: null, clicks: null, ctr: null, position: null }
    : { impressions: 0, clicks: 0, ctr: null, position: null };
}

/**
 * 検索語×ページ（既存の gscQueries と同じ形）。直近28日に表示のある行だけを、表示の多い順に keep 件。
 * @param {Record<'recent28'|'previous28'|'recent7'|'previous7', { rows: any[], truncated: boolean }>} windows
 */
export function buildGscQueries(windows, { host = 'ibatoco.jp', keep = GSC_QUERY_KEEP } = {}) {
  const keyOf = (keys) => {
    const path = toPath(keys[0], host);
    const query = keys[1];
    return path && typeof query === 'string' && query.trim() ? `${path}\u0000${query}` : null;
  };
  const m = Object.fromEntries(Object.entries(windows).map(([k, w]) => [k, indexRows(w.rows, keyOf)]));
  const rows = [];
  for (const [key, r28] of m.recent28) {
    const [page, query] = key.split('\u0000');
    const r7 = metric(m.recent7, key, windows.recent7.truncated);
    const p7 = metric(m.previous7, key, windows.previous7.truncated);
    const p28 = metric(m.previous28, key, windows.previous28.truncated);
    rows.push({
      query,
      page,
      impressions28: r28.impressions,
      clicks28: r28.clicks,
      position28: r28.impressions ? r28.position : null,
      ctr28: r28.impressions ? r28.clicks / r28.impressions : null,
      impressions7: r7.impressions,
      clicks7: r7.clicks,
      position7: r7.position,
      ctr7: r7.ctr,
      impressionsPrev7: p7.impressions,
      clicksPrev7: p7.clicks,
      positionPrev7: p7.position,
      ctrPrev7: p7.ctr,
      impressionsPrev28: p28.impressions,
      clicksPrev28: p28.clicks,
      positionPrev28: p28.position,
      ctrPrev28: p28.ctr,
    });
  }
  rows.sort((a, b) => b.impressions28 - a.impressions28 || b.clicks28 - a.clicks28 || a.page.localeCompare(b.page) || a.query.localeCompare(b.query));
  return rows.slice(0, keep);
}

/**
 * ページ別（既存の pageMetrics と同じ形）。GSC のページ別と GA4 のページ別 Views を合わせる。
 * GA4 にあって GSC に無いページは gsc の値を「上限未達なら0」、GSC にあって GA4 に無いページは views を null にする。
 * @param {Record<string, { rows: any[], truncated: boolean }>} gscPages  4つの窓（dimensions: ['page']）
 * @param {{ recent7: Map<string, number>, previous7: Map<string, number>, recent28: Map<string, number> } | null} ga4Views
 */
export function buildPageMetrics(gscPages, ga4Views, { host = 'ibatoco.jp', keep = PAGE_METRICS_KEEP } = {}) {
  const keyOf = (keys) => toPath(keys[0], host);
  const m = Object.fromEntries(Object.entries(gscPages).map(([k, w]) => [k, indexRows(w.rows, keyOf)]));
  const paths = new Set([...m.recent28.keys(), ...(ga4Views ? ga4Views.recent28.keys() : [])]);
  const out = [];
  for (const path of paths) {
    const r28 = metric(m.recent28, path, gscPages.recent28.truncated);
    const p28 = metric(m.previous28, path, gscPages.previous28.truncated);
    const r7 = metric(m.recent7, path, gscPages.recent7.truncated);
    const p7 = metric(m.previous7, path, gscPages.previous7.truncated);
    const views = (win) => (ga4Views ? (ga4Views[win].get(path) ?? 0) : null);
    out.push({
      path,
      views7: views('recent7'),
      viewsPrev7: views('previous7'),
      views28: views('recent28'),
      gsc: {
        impressions28: r28.impressions, clicks28: r28.clicks, ctr28: r28.ctr, position28: r28.position,
        impressionsPrev28: p28.impressions, clicksPrev28: p28.clicks, ctrPrev28: p28.ctr, positionPrev28: p28.position,
        impressions7: r7.impressions, clicks7: r7.clicks, ctr7: r7.ctr, position7: r7.position,
        impressionsPrev7: p7.impressions, clicksPrev7: p7.clicks, ctrPrev7: p7.ctr, positionPrev7: p7.position,
      },
    });
  }
  const score = (r) => (r.views28 ?? 0) + (r.gsc.impressions28 ?? 0) / 10;
  out.sort((a, b) => score(b) - score(a) || a.path.localeCompare(b.path));
  return out.slice(0, keep);
}

/** ga4TopPages（直近7日・直近28日の Views 上位） */
export function buildTopPages(ga4Views, keep = TOP_PAGES_KEEP) {
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, keep).map(([path, views]) => ({ path, views }));
  return { recent7: top(ga4Views.recent7), recent28: top(ga4Views.recent28) };
}

/**
 * GA4 runReport（dimensions: pagePath + dateRange、dateRanges: recent7・previous7・recent28 の順）の応答を窓別の Map に。
 * GA4 は複数の dateRanges を渡すと dateRange 次元（date_range_0 …）を自動で付ける。
 */
export function ga4ViewsByWindow(rows) {
  const names = ['recent7', 'previous7', 'recent28'];
  const out = { recent7: new Map(), previous7: new Map(), recent28: new Map() };
  for (const r of rows ?? []) {
    const path = r.dimensionValues?.[0]?.value;
    const range = r.dimensionValues?.[1]?.value;
    const idx = /^date_range_(\d)$/.exec(range ?? '')?.[1];
    const win = idx != null ? names[Number(idx)] : null;
    const views = Number(r.metricValues?.[0]?.value);
    if (!win || typeof path !== 'string' || !path.startsWith('/')) continue;
    if (!Number.isFinite(views) || views < 0) throw new Error('GA4 page-level: invalid views');
    out[win].set(path, (out[win].get(path) ?? 0) + views);
  }
  return out;
}

/**
 * 取得結果（export の pageLevel）の検査。preflight と sync の両方で使う。
 * @returns {string[]} エラー（空なら合格）
 */
export function checkPageLevel(pageLevel, { confirmedThrough, gscDaily = [] } = {}) {
  const errors = [];
  if (pageLevel == null) return errors; // 任意（取れなかった日は従来どおりサイト全体だけを更新する）
  const expected = pageLevelWindows(confirmedThrough);
  for (const [name, w] of Object.entries(expected)) {
    const got = pageLevel.periods?.[name];
    if (!got || got.start !== w.start || got.end !== w.end) errors.push(`pageLevel: ${name} の期間が確定日（${confirmedThrough}）と合わない`);
  }
  if (!Array.isArray(pageLevel.gscQueries) || pageLevel.gscQueries.length === 0) errors.push('pageLevel: gscQueries が空（0行で上書きしない）');
  if (!Array.isArray(pageLevel.pageMetrics) || pageLevel.pageMetrics.length === 0) errors.push('pageLevel: pageMetrics が空（0行で上書きしない）');
  for (const q of pageLevel.gscQueries ?? []) {
    if (typeof q.page !== 'string' || !q.page.startsWith('/') || typeof q.query !== 'string' || !q.query) { errors.push('pageLevel: page/query が不正な行がある'); break; }
    if (!finite(q.impressions28) || !finite(q.clicks28) || q.clicks28 > q.impressions28) { errors.push(`pageLevel: 不正な28日の値（${q.page} ${q.query}）`); break; }
  }
  // 検索語×ページのクリック合計が、同じ28日のサイト全体の日別合計を超えることはない（匿名化で下回るのは正常）
  const r28 = expected.recent28;
  const siteRows = gscDaily.filter((d) => d.date >= r28.start && d.date <= r28.end);
  if (siteRows.length === 28) {
    const siteClicks = siteRows.reduce((s, d) => s + d.clicks, 0);
    const queryClicks = (pageLevel.gscQueries ?? []).reduce((s, q) => s + (q.clicks28 ?? 0), 0);
    if (queryClicks > siteClicks * 1.02 + 5) errors.push(`pageLevel: 検索語×ページの28日クリック合計（${queryClicks}）がサイト全体（${siteClicks}）を超える`);
  }
  return errors;
}
