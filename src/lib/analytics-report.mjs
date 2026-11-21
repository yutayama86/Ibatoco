/**
 * Control Center「週次アナリティクスレポート」の計算（表示専用・非公開）。
 * 入力は data/editorial/performance-snapshot.json（毎朝の GA4 公式 API 同期）だけ。
 * 取得できない値は 0 で埋めず null を返す（AGENTS.md）。
 * 長期目標：2027年1月に月間100万PV（2026-11 オーナー決定。11月10万PVの目標はそのまま併記する）。
 */
import { addDateOnlyDays, parseDateOnly, toDateOnlyString } from './date-only.js';

const shift = (ymd, days) => toDateOnlyString(addDateOnlyDays(parseDateOnly(ymd), days));

export const LONG_TERM_GOAL = { monthlyViews: 1_000_000, deadline: '2027-01-31', label: '2027年1月 月間100万PV' };

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
export const changePct = (cur, prev) => {
  const c = num(cur);
  const p = num(prev);
  if (c == null || p == null || p === 0) return null;
  return Math.round(((c - p) / p) * 1000) / 10;
};

/** URL からコンテンツ種別を決める（機械的な分類。編集上の区分ではない） */
export function contentType(path) {
  if (path === '/' || path === '/events/' || path === '/news/' || path === '/kouyou/') return 'トップ・一覧';
  if (path.startsWith('/area/')) return 'エリア（市町村）';
  if (path.startsWith('/food-library/')) return '食ライブラリ';
  if (/-guide\/$/.test(path) || path.includes('roundup')) return '常緑ガイド';
  if (path.startsWith('/events/') || path.startsWith('/news/')) return '時事（イベント・ニュース）';
  return 'その他';
}

/** 日別 GA4 を最新日から7日ずつ区切る（欠けた週は出さない） */
export function weeklyBlocks(daily, maxWeeks = 5) {
  const rows = (daily ?? []).filter((d) => d && typeof d.date === 'string' && num(d.views) != null);
  if (rows.length === 0) return [];
  const byDate = new Map(rows.map((d) => [d.date, d.views]));
  const latest = rows.map((d) => d.date).sort().at(-1);
  const out = [];
  for (let w = 0; w < maxWeeks; w += 1) {
    const end = shift(latest, -7 * w);
    const start = shift(end, -6);
    let views = 0;
    let days = 0;
    for (let i = 0; i < 7; i += 1) {
      const v = byDate.get(shift(start, i));
      if (v != null) { views += v; days += 1; }
    }
    if (days < 7) break;
    out.unshift({ start, end, views });
  }
  return out;
}

function daysBetween(a, b) {
  try {
    return Math.round((parseDateOnly(b).valueOf() - parseDateOnly(a).valueOf()) / 86_400_000);
  } catch {
    return null;
  }
}

export function buildAnalyticsReport(snapshot, { goal = LONG_TERM_GOAL } = {}) {
  const ga4 = snapshot?.windows?.ga4 ?? {};
  const r7 = ga4.recent7 ?? {};
  const p7 = ga4.previous7 ?? {};
  const r28 = ga4.recent28 ?? {};
  const views7 = num(r7.views);

  // 長期目標：直近7日の30日換算を月間ペースとし、期限まで毎週同じ倍率で伸びる場合の必要週次成長率
  const pace = views7 == null ? null : Math.round((views7 * 30) / 7);
  const weeksLeft = r7.end ? Math.max(1, Math.round((daysBetween(r7.end, goal.deadline) ?? 0) / 7)) : null;
  const goalWeekly = (goal.monthlyViews * 7) / 30;
  const weeklyRate = views7 && weeksLeft ? Math.pow(goalWeekly / views7, 1 / weeksLeft) : null;
  const longTerm = {
    label: goal.label,
    target: goal.monthlyViews,
    pace,
    progressPct: pace == null ? null : Math.round((pace / goal.monthlyViews) * 1000) / 10,
    multiplier: pace ? Math.round((goal.monthlyViews / pace) * 10) / 10 : null,
    weeksLeft,
    requiredWeeklyGrowthPct: weeklyRate == null ? null : Math.round((weeklyRate - 1) * 100),
    nextWeekRequired: weeklyRate == null ? null : Math.round(views7 * weeklyRate),
  };

  const ns = snapshot?.northStar ?? {};
  const november = {
    target: num(ns.target),
    current28: num(ns.current),
    progressPct: num(ns.progress) == null ? null : Math.round(ns.progress * 1000) / 10,
  };

  const kpis = {
    views7,
    views7Prev: num(p7.views),
    views7ChangePct: changePct(views7, num(p7.views)),
    views28: num(r28.views),
    engagement7: num(r7.engagementRate) == null ? null : Math.round(r7.engagementRate * 1000) / 10,
    engagement7Prev: num(p7.engagementRate) == null ? null : Math.round(p7.engagementRate * 1000) / 10,
  };

  const channelRows = (ga4.channelRecent7 ?? []).filter((c) => num(c.views) != null && c.views > 0);
  const channelTotal = channelRows.reduce((s, c) => s + c.views, 0);
  const channels = channelRows
    .map((c) => ({ channel: c.channel, views: c.views, sharePct: channelTotal ? Math.round((c.views / channelTotal) * 1000) / 10 : null }))
    .sort((a, b) => b.views - a.views);

  const pages = (snapshot?.pageMetrics ?? [])
    .filter((p) => p && typeof p.path === 'string')
    .map((p) => ({
      path: p.path,
      type: contentType(p.path),
      views7: num(p.views7),
      viewsPrev7: num(p.viewsPrev7),
      views28: num(p.views28),
      changePct: changePct(num(p.views7), num(p.viewsPrev7)),
    }));

  const typeMap = new Map();
  for (const p of pages) {
    const t = typeMap.get(p.type) ?? { type: p.type, pages: 0, views28: 0, views7: 0, viewsPrev7: 0 };
    t.pages += 1;
    t.views28 += p.views28 ?? 0;
    t.views7 += p.views7 ?? 0;
    t.viewsPrev7 += p.viewsPrev7 ?? 0;
    typeMap.set(p.type, t);
  }
  const typeTotal = [...typeMap.values()].reduce((s, t) => s + t.views28, 0);
  const contentTypes = [...typeMap.values()]
    .map((t) => ({ ...t, sharePct: typeTotal ? Math.round((t.views28 / typeTotal) * 1000) / 10 : null, changePct: changePct(t.views7, t.viewsPrev7) }))
    .sort((a, b) => b.views28 - a.views28);

  const topPages = pages.filter((p) => p.views7 != null).sort((a, b) => b.views7 - a.views7).slice(0, 15);
  const decliners = pages
    .filter((p) => (p.viewsPrev7 ?? 0) >= 50 && p.changePct != null && p.changePct <= -30)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 10);

  return {
    asOf: r7.end ?? null,
    periods: { recent7: [r7.start ?? null, r7.end ?? null], previous7: [p7.start ?? null, p7.end ?? null], recent28: [r28.start ?? null, r28.end ?? null] },
    november,
    longTerm,
    kpis,
    weeks: weeklyBlocks(ga4.daily),
    channels,
    contentTypes,
    pageCount: pages.length,
    topPages,
    decliners,
  };
}
