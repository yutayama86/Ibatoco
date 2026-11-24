/**
 * Read-only Google APIs → existing ga4-daily import shape.
 * Does not mutate snapshots, obtain credentials, or change deployment.
 * Use ADC with a short-lived token from an authorized Workload Identity provider.
 */
import { writeFileSync } from 'node:fs';
import { experimentGroup, NEXT_STEP_BASELINE } from '../src/lib/next-step.mjs';
import { aggregateAiReferrals } from '../src/lib/ai-referrals.mjs';
import { BOOKING_CTA_AB_EVENTS, alignConfirmedThrough, bookingCtaAbCounts, googleDailyRange } from '../src/lib/ga4-daily.mjs';
import { addDays } from '../src/lib/growth-engine.mjs';
import {
  GSC_ROW_LIMIT, pageLevelWindows, buildGscQueries, buildPageMetrics, buildTopPages, ga4ViewsByWindow, checkPageLevel,
} from '../src/lib/gsc-page-level.mjs';
import {
  REFERRAL_EVENTS, CLICK_EVENTS, referralWindows, referralDimensions, referralTotals, buildByProviderPage, buildByPage, checkBookingReferrals, referralReportQualityIssues,
} from '../src/lib/booking-referrals.mjs';

const env = process.env;
// Allow both GA4 and GSC processing lag; do not infer missing days are zero.
// 35 days so the 28+7 day windows never depend on rows left over from an earlier (possibly failed) sync.
const { from, through: plannedThrough } = googleDailyRange(Date.now());
// GA4 か GSC の確定が遅れた日は、両方がそろっている最新の日まで確定日を下げる（下の alignConfirmedThrough）
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
// GA4 も確定が遅れることがある（2026-11-15 は GA4 が 11-11 まで・GSC は 11-12 まで）。両方にある日だけを候補にする
const ga4Dates = new Set(dailyMap.keys());
through = alignConfirmedThrough(plannedThrough, gscDaily.map((d) => d.date).filter((d) => ga4Dates.has(d)));
if (through !== plannedThrough) {
  for (const date of [...dailyMap.keys()]) if (date > through) dailyMap.delete(date);
  for (let i = gscDaily.length - 1; i >= 0; i--) if (gscDaily[i].date > through) gscDaily.splice(i, 1);
  console.warn(`::warning title=確定日を${through}に調整::GA4 または Search Console の確定データが ${plannedThrough} にまだ届いていないため、両方がそろっている ${through} までを同期します（0 や推計では埋めません）。`);
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
// 送客クリックの内訳（Issue #612）。同じ読み取りトークンで、登録済みのカスタムディメンションだけを使う。
// 失敗・不整合のときは bookingReferrals を出さない（前の値と期間が残る。0 や古い値で上書きしない）
let bookingReferrals = null;
try {
  const reportUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`;
  const metaRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}/metadata`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!metaRes.ok) throw new Error(`metadata HTTP ${metaRes.status}`);
  const dims = referralDimensions(await metaRes.json());
  if (dims.missing.length) throw new Error(`未登録のディメンション: ${dims.missing.join(', ')}（新しく登録はしない）`);
  const periods = referralWindows(through);
  const dateRanges = [periods.recent28, periods.recent7].map((p) => ({ startDate: p.start, endDate: p.end }));
  const eventFilter = (values) => ({ filter: { fieldName: 'eventName', inListFilter: { values } } });
  const complete = (res, label) => {
    const issues = referralReportQualityIssues(res, label);
    if (issues.length) throw new Error(issues.join(' / '));
    return res.rows ?? [];
  };
  const totals = referralTotals(complete(await request(reportUrl, {
    dateRanges, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventFilter(REFERRAL_EVENTS), limit: '100',
  }), 'totals'));
  const provider = buildByProviderPage(complete(await request(reportUrl, {
    dateRanges,
    dimensions: ['eventName', 'pagePath', 'customEvent:link_url', 'customEvent:link_provider', ...(dims.partnerStatus ? ['customEvent:partner_status'] : [])].map((name) => ({ name })),
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventFilter(CLICK_EVENTS), limit: '100000',
  }), 'byProviderPage'), { partnerStatus: dims.partnerStatus });
  const byPage = buildByPage(complete(await request(reportUrl, {
    dateRanges: [dateRanges[1]], dimensions: [{ name: 'eventName' }, { name: 'pagePath' }], metrics: [{ name: 'eventCount' }],
    dimensionFilter: eventFilter(REFERRAL_EVENTS), limit: '100000',
  }), 'byPage'));
  bookingReferrals = {
    source: `Google official GA4 Data API: pagePath × link_url × link_provider${dims.partnerStatus ? ' × partner_status' : ''}`,
    periods, partnerStatus: dims.partnerStatus, totals,
    byProviderPage: provider.rows, unattributed: provider.unattributed, dropped: provider.dropped, byPage,
  };
  const errors = checkBookingReferrals(bookingReferrals, { confirmedThrough: through });
  if (errors.length) { console.warn('::warning title=送客先別データ::' + errors.join(' / ') + '（送客先別は今回は反映しない）'); bookingReferrals = null; }
} catch (error) {
  console.warn(`::warning title=送客先別データ::取得できませんでした（${error.message}）。前回の値と期間を残します。`);
  bookingReferrals = null;
}
// Issue #683: read-only landing-page cohorts, same confirmed 7-day window.
// Group by session landing page (not the destination page of a click).
let nextStepExperiment = null;
try {
  const getCohorts = async (period) => {
    const totals = { A: { views: 0, sessions: 0, engagedSessions: 0 }, B: { views: 0, sessions: 0, engagedSessions: 0 } };
    let offset = 0;
    while (true) {
      const report = await request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
        dateRanges: [{ startDate: period.start, endDate: period.end }],
        dimensions: [{ name: 'landingPage' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'engagedSessions' }],
        limit: '10000', offset: String(offset),
      });
      const rows = report.rows ?? [];
      if (offset === 0 && rows.length === 0) throw new Error('GA4 landing-page cohort report returned no rows');
      if (rows.length === 0 && offset < Number(report.rowCount ?? 0)) throw new Error('GA4 landing-page cohort report truncated');
      for (const row of rows) {
        const path = row.dimensionValues?.[0]?.value ?? '';
        const match = /^\/events\/([^/?#]+)\/?$/.exec(path);
        if (!match) continue;
        const group = experimentGroup(match[1]);
        const nums = row.metricValues.map((v) => Number(v.value));
        if (nums.length !== 3 || nums.some((v) => !Number.isFinite(v) || v < 0)) throw new Error('Invalid landing-page metrics');
        totals[group].views += nums[0];
        totals[group].sessions += nums[1];
        totals[group].engagedSessions += nums[2];
      }
      offset += rows.length;
      if (offset >= Number(report.rowCount ?? rows.length)) break;
    }
    return Object.fromEntries(Object.entries(totals).map(([group, v]) => [group, {
      ...v, viewsPerSession: v.sessions > 0 ? v.views / v.sessions : null,
      engagementRate: v.sessions > 0 ? v.engagedSessions / v.sessions : null,
    }]));
  };
  const totals = await getCohorts(abPeriod);
  const period28 = { start: addDays(through, -27), end: through };
  const totals28 = await getCohorts(period28);
  // 公開前の基準（固定期間。毎回取り直す）
  const baselineGroups = await getCohorts(NEXT_STEP_BASELINE);
  const events = await request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    dateRanges: [{ startDate: abPeriod.start, endDate: abPeriod.end }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['next_step_view', 'next_step_click'] } } },
    limit: '10',
  });
  const counts = Object.fromEntries((events.rows ?? []).map((r) => [r.dimensionValues[0].value, Number(r.metricValues[0].value)]));
  const views = counts.next_step_view ?? null;
  const clicks = counts.next_step_click ?? null;
  // 効果の判定（公開日以降か・基準期間）は表示側で seo-changes.ts の変更日と照合する。ここでは実測だけを返す
  nextStepExperiment = {
    events: { views, clicks, ctr: views > 0 && clicks != null ? clicks / views : null },
    period: abPeriod, confirmedThrough: through, source: 'GA4 Data API: landingPage × screenPageViews/sessions/engagedSessions',
    groups: totals,
    period28, groups28: totals28,
    baseline: { period: NEXT_STEP_BASELINE, groups: baselineGroups },
  };
} catch (error) {
  console.warn(`::warning title=回遊A/B計測::取得できませんでした（${error.message}）。未取得として扱います。`);
}
// AI 検索・AI アシスタント経由（既定チャネル「AI Assistant」）：どの AI から・どのページへ。読み取りのみ
let aiReferrals = null;
try {
  const aiReport = async (period) => {
    const report = await request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
      dateRanges: [{ startDate: period.start, endDate: period.end }],
      dimensions: [{ name: 'sessionSource' }, { name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
      dimensionFilter: { filter: { fieldName: 'sessionDefaultChannelGroup', stringFilter: { matchType: 'EXACT', value: 'AI Assistant' } } },
      limit: '10000',
    });
    const rows = report.rows ?? [];
    if (Number(report.rowCount ?? rows.length) > rows.length) throw new Error('AI referral report truncated');
    return { period, ...aggregateAiReferrals(rows) };
  };
  const recent28 = await aiReport({ start: addDays(through, -27), end: through });
  const previous28 = await aiReport({ start: addDays(through, -55), end: addDays(through, -28) });
  aiReferrals = { source: 'GA4 Data API: sessionDefaultChannelGroup = AI Assistant（sessionSource × landingPage）', confirmedThrough: through, recent28, previous28: { period: previous28.period, sessions: previous28.sessions, views: previous28.views, bySource: previous28.bySource } };
} catch (error) {
  console.warn(`::warning title=AI経由の流入::取得できませんでした（${error.message}）。未取得として扱います。`);
}
// BtoB の窓口（/biz/・発注者向け記事）の表示と、相談までの流れ。読み取りのみ（2026-11-24 オーナー決定：/control/ に出す）
// 送信完了の件名（form_subject）は GA4 のカスタムディメンションに登録されている場合だけ取れる。取れなければ未取得のまま
let b2bFunnel = null;
try {
  const runReport = (body) => request(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, body);
  const funnel = async (period) => {
    const dateRanges = [{ startDate: period.start, endDate: period.end }];
    const pages = await runReport({ dateRanges, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/biz/' } } }, limit: '1000' });
    const events = await runReport({ dateRanges, dimensions: [{ name: 'eventName' }, { name: 'pagePath' }], metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['business_cta_click', 'contact_form_view', 'contact_form_start', 'generate_lead'] } } }, limit: '10000' });
    const num = (v) => Number(v ?? 0);
    const pageRows = pages.rows ?? [];
    const bizViews = pageRows.reduce((sum, r) => sum + num(r.metricValues?.[0]?.value), 0);
    const insightViews = pageRows.filter((r) => String(r.dimensionValues?.[0]?.value ?? '').startsWith('/biz/insights/')).reduce((sum, r) => sum + num(r.metricValues?.[0]?.value), 0);
    const count = (name, pred) => (events.rows ?? []).filter((r) => r.dimensionValues?.[0]?.value === name && pred(String(r.dimensionValues?.[1]?.value ?? ''))).reduce((sum, r) => sum + num(r.metricValues?.[0]?.value), 0);
    let bizLeads = null;
    try {
      const leads = await runReport({ dateRanges, dimensions: [{ name: 'customEvent:form_subject' }], metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'generate_lead' } } }, limit: '100' });
      bizLeads = (leads.rows ?? []).filter((r) => r.dimensionValues?.[0]?.value === '法人・自治体のご相談').reduce((sum, r) => sum + num(r.metricValues?.[0]?.value), 0);
    } catch { bizLeads = null; }
    return {
      period,
      bizViews,
      insightViews,
      bizCtaClicks: count('business_cta_click', (path) => path.startsWith('/biz/')),
      contactFormViews: count('contact_form_view', (path) => path.startsWith('/contact/')),
      leadsAll: count('generate_lead', () => true),
      bizLeads,
    };
  };
  b2bFunnel = {
    source: 'GA4 Data API: pagePath BEGINS_WITH /biz/（screenPageViews）、eventName（business_cta_click・contact_form_view・generate_lead）、generate_lead の customEvent:form_subject（登録時のみ）',
    confirmedThrough: through,
    recent28: await funnel({ start: addDays(through, -27), end: through }),
    previous28: await funnel({ start: addDays(through, -55), end: addDays(through, -28) }),
  };
} catch (error) {
  console.warn(`::warning title=BtoBの窓口::取得できませんでした（${error.message}）。未取得として扱います。`);
}
const output = {
  source: 'Google official read-only APIs (ADC external OIDC)',
  fetchedAt: new Date().toISOString(),
  confirmedThrough: through,
  daily: [...dailyMap.values()].sort((a,b)=>a.date.localeCompare(b.date)),
  gsc: { source: 'Search Console API', confirmedThrough: through, daily: gscDaily },
  bookingCtaExperiment,
  ...(nextStepExperiment ? { nextStepExperiment } : {}),
  ...(aiReferrals ? { aiReferrals } : {}),
  ...(b2bFunnel ? { b2bFunnel } : {}),
  ...(pageLevel ? { pageLevel } : {}),
  ...(bookingReferrals ? { bookingReferrals } : {}),
};
writeFileSync(env.OUTPUT_PATH || '/tmp/ibatoco-google-daily.json', JSON.stringify(output, null, 2) + '\n');
console.log(`Read-only: GA4 ${output.daily.length} dates, GSC ${gscDaily.length} dates, page-level ${pageLevel ? `${pageLevel.gscQueries.length} query rows / ${pageLevel.pageMetrics.length} pages` : 'not included'}, booking referrals ${bookingReferrals ? `${bookingReferrals.byProviderPage.length} destination rows / ${bookingReferrals.byPage.length} pages` : 'not included'}. No snapshot modified.`);
