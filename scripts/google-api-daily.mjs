/**
 * Read-only Google APIs → existing ga4-daily import shape.
 * Does not mutate snapshots, obtain credentials, or change deployment.
 * Use ADC with a short-lived token from an authorized Workload Identity provider.
 */
import { writeFileSync } from 'node:fs';
import { BOOKING_CTA_AB_EVENTS, alignConfirmedThrough, bookingCtaAbCounts, googleDailyRange } from '../src/lib/ga4-daily.mjs';
import { addDays } from '../src/lib/growth-engine.mjs';
import {
  GSC_ROW_LIMIT, pageLevelWindows, buildGscQueries, buildPageMetrics, buildTopPages, ga4ViewsByWindow, checkPageLevel,
} from '../src/lib/gsc-page-level.mjs';

const env = process.env;
// Allow both GA4 and GSC processing lag; do not infer missing days are zero.
// 35 days so the 28+7 day windows never depend on rows left over from an earlier (possibly failed) sync.
const { from, through: plannedThrough } = googleDailyRange(Date.now());
// GSC の確定が遅れた日は、GSC の最新の確定日まで確定日を下げる（下の alignConfirmedThrough）
let through = plannedThrough;
const token = env.GOOGLE_ACCESS_TOKEN;
const property = env.GA4_PROPERTY_ID;
const site = env.GSC_SITE_URL;
if (!token || !/^\d+$/.test(property ?? '') || !site) {
  throw new Error('GOOGLE_ACCESS_TOKEN, numeric GA4_PROPERTY_ID, and GSC_SITE_URL are required');
}
async function request(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Google API HTTP ${response.status} (${new URL(url).hostname}); aborted without changing data`);
  return response.json();
}
const ga = await request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
  dateRanges: [{ startDate: from, endDate: through }],
  dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
  metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'engagedSessions' }],
  limit: '10000',
});
const dateString = (s) => `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
const dailyMap = new Map();
for (const row of ga.rows ?? []) {
  const date = dateString(row.dimensionValues[0].value);
  const channel = row.dimensionValues[1].value;
  const nums = row.metricValues.map(x => Number(x.value));
  if (nums.some(x => !Number.isFinite(x) || x < 0)) throw new Error('Invalid GA4 metrics');
  const cur = dailyMap.get(date) ?? { date, views: 0, sessions: 0, engagedSessions: 0, organicViews: 0 };
  cur.views += nums[0]; cur.sessions += nums[1]; cur.engagedSessions += nums[2];
  if (channel === 'Organic Search') cur.organicViews += nums[0];
  dailyMap.set(date, cur);
}
if (!dailyMap.size) throw new Error('GA4 response empty; do not publish zero-filled data');
const gsc = await request(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
  startDate: from, endDate: through, dimensions: ['date'], rowLimit: 25000, dataState: 'final'
});
const gscDaily = (gsc.rows ?? []).map(r => ({
  date: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position
}));
if (!gscDaily.length) throw new Error('GSC response empty; do not publish zero-filled data');
// GSC の確定データ（final）は予定の確定日に届かないことがある（2026-11-14 は 11-11 が未確定で preflight が止まった）。
// その日は GSC の最新の確定日まで確定日を下げ、GA4 もその日までで切る。遅れが2日を超えたら止める
through = alignConfirmedThrough(plannedThrough, gscDaily.map((d) => d.date));
if (through !== plannedThrough) {
  for (const date of [...dailyMap.keys()]) if (date > through) dailyMap.delete(date);
  for (let i = gscDaily.length - 1; i >= 0; i--) if (gscDaily[i].date > through) gscDaily.splice(i, 1);
  console.warn(`::warning title=確定日を${through}に調整::Search Console の確定データが ${plannedThrough} にまだ届いていないため、${through} までを同期します（0 や推計では埋めません）。`);
}
// 予約ボタンの A/B 実験の4イベント（直近7日・確定日まで）。行の無いイベントは null のまま（0 で埋めない）
const abPeriod = { start: addDays(through, -6), end: through };
const abReport = await request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
  dateRanges: [{ startDate: abPeriod.start, endDate: abPeriod.end }],
  dimensions: [{ name: 'eventName' }],
  metrics: [{ name: 'eventCount' }],
  dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: BOOKING_CTA_AB_EVENTS } } },
  limit: '100',
});
const bookingCtaExperiment = bookingCtaAbCounts(abReport.rows, abPeriod);
// ページ別・検索語別（監査 A1）。読み取りだけ。失敗してもサイト全体の日別の同期は止めず、pageLevel を出さない
// （その日は従来どおり pageMetrics・gscQueries を書き換えない。0 や古い値で埋めない）
async function gscRows(dimensions, period) {
  const rows = [];
  // 1回の上限は25,000行。最大4回（10万行）まで続きを取り、それでも残れば truncated（行の無い値を0と見なさない）
  for (let page = 0; page < 4; page++) {
    const res = await request(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      startDate: period.start, endDate: period.end, dimensions, rowLimit: GSC_ROW_LIMIT, startRow: page * GSC_ROW_LIMIT, dataState: 'final',
    });
    const got = res.rows ?? [];
    rows.push(...got);
    if (got.length < GSC_ROW_LIMIT) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}
let pageLevel = null;
try {
  const periods = pageLevelWindows(through);
  const queryWindows = {}, pageWindows = {};
  for (const [name, period] of Object.entries(periods)) {
    queryWindows[name] = await gscRows(['page', 'query'], period);
    pageWindows[name] = await gscRows(['page'], period);
  }
  const gaPages = await request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    dateRanges: [
      { startDate: periods.recent7.start, endDate: periods.recent7.end },
      { startDate: periods.previous7.start, endDate: periods.previous7.end },
      { startDate: periods.recent28.start, endDate: periods.recent28.end },
    ],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    limit: '100000',
  });
  const gaTruncated = Number(gaPages.rowCount ?? 0) > (gaPages.rows ?? []).length;
  const views = gaTruncated ? null : ga4ViewsByWindow(gaPages.rows);
  pageLevel = {
    source: 'Search Console API (page, page×query) + GA4 Data API (pagePath)',
    periods,
    truncated: {
      gscQueries: Object.fromEntries(Object.entries(queryWindows).map(([k, w]) => [k, w.truncated])),
      gscPages: Object.fromEntries(Object.entries(pageWindows).map(([k, w]) => [k, w.truncated])),
      ga4Pages: gaTruncated,
    },
    gscQueries: buildGscQueries(queryWindows),
    pageMetrics: buildPageMetrics(pageWindows, views),
    ga4TopPages: views ? buildTopPages(views) : null,
  };
  const errors = checkPageLevel(pageLevel, { confirmedThrough: through, gscDaily });
  if (errors.length) { console.warn('::warning title=ページ別データ::' + errors.join(' / ') + '（ページ別は今回は反映しない）'); pageLevel = null; }
} catch (error) {
  console.warn(`::warning title=ページ別データ::取得できませんでした（${error.message}）。サイト全体の日別だけを同期します。`);
  pageLevel = null;
}
const output = {
  source: 'Google official read-only APIs (ADC external OIDC)',
  fetchedAt: new Date().toISOString(),
  confirmedThrough: through,
  daily: [...dailyMap.values()].sort((a,b)=>a.date.localeCompare(b.date)),
  gsc: { source: 'Search Console API', confirmedThrough: through, daily: gscDaily },
  bookingCtaExperiment,
  ...(pageLevel ? { pageLevel } : {}),
};
writeFileSync(env.OUTPUT_PATH || '/tmp/ibatoco-google-daily.json', JSON.stringify(output, null, 2) + '\n');
console.log(`Read-only: GA4 ${output.daily.length} dates, GSC ${gscDaily.length} dates, page-level ${pageLevel ? `${pageLevel.gscQueries.length} query rows / ${pageLevel.pageMetrics.length} pages` : 'not included'}. No snapshot modified.`);
