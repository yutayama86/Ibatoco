/**
 * Control Center「週次アナリティクスレポート」の計算（表示専用・非公開）。
 * 入力は data/editorial/performance-snapshot.json（毎朝の GA4 公式 API 同期）だけ。
 * 取得できない値は 0 で埋めず null を返す（AGENTS.md）。
 * 長期目標：2027年1月に月間100万PV（2026-11 オーナー決定。11月10万PVの目標はそのまま併記する）。
 */
import { addDateOnlyDays, parseDateOnly, toDateOnlyString } from './date-only.js';
import { experimentTypeOf } from './growth-engine.mjs';

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

const TYPE_LABEL = {
  'internal-link': '内部リンク', metadata: 'タイトル・説明文', body: '本文', 'new-article': '新規記事',
  template: 'テンプレート', ia: 'サイト構成', cta: 'CTA', ui: 'UI', fact: '事実の更新', measurement: '計測',
};

/**
 * PV の増減を「訪問（セッション）」と「回遊（1訪問あたりのPV）」に分ける。
 * PV = セッション × PV/セッション なので、どちらのレバーが効いたかが分かる。
 */
export function pvDrivers(recent, previous) {
  const s1 = num(recent?.sessions); const s0 = num(previous?.sessions);
  const v1 = num(recent?.views); const v0 = num(previous?.views);
  if (s1 == null || s0 == null || v1 == null || v0 == null || s0 === 0 || s1 === 0) return null;
  const vps1 = v1 / s1; const vps0 = v0 / s0;
  // 対数で分解すると、2つの寄与の和が PV の変化と一致する
  const total = Math.log(v1 / v0);
  const sessionShare = total === 0 ? null : Math.log(s1 / s0) / total;
  return {
    sessions: s1, sessionsPrev: s0, sessionsChangePct: changePct(s1, s0),
    viewsPerSession: Math.round(vps1 * 1000) / 1000, viewsPerSessionPrev: Math.round(vps0 * 1000) / 1000,
    viewsPerSessionChangePct: changePct(vps1, vps0),
    viewsChangePct: changePct(v1, v0),
    // 回遊を1.5にした場合の、同じ訪問数でのPV（目安）
    viewsAt15: Math.round(s1 * 1.5),
    sessionSharePct: sessionShare == null ? null : Math.round(sessionShare * 100),
  };
}

/**
 * 施策→結果。ページ単位の変更（src/data/seo-changes.ts）に、そのページの直近の数字を並べる。
 * 直近7日と前の7日の比較で、変更日の厳密な前後比較ではない（参考）。
 * 観測窓（data/editorial/growth-engine.json）の間は判定しない。
 */
/** @param {{ changes?: any[], pages?: any[], config?: any, today?: string | null, sinceDays?: number, limit?: number }} options */
export function changeResults({ changes = [], pages = [], config, today, sinceDays = 90, limit = 200 }) {
  if (!today) return [];
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const windows = config?.observationWindows ?? {};
  const since = shift(today, -sinceDays);
  return changes
    .filter((c) => c && c.url && c.url !== '*' && typeof c.date === 'string' && c.date >= since && c.date <= today)
    .map((c) => {
      const type = experimentTypeOf(c);
      const days = typeof windows[type] === 'number' ? windows[type] : 28;
      const observeUntil = shift(c.date, days);
      const observing = days > 0 && observeUntil > today;
      const p = byPath.get(c.url);
      const g = p?.gsc ?? {};
      const views7 = num(p?.views7); const viewsPrev7 = num(p?.viewsPrev7);
      const vChange = changePct(views7, viewsPrev7);
      let verdict = '観測中';
      if (!observing) {
        if (!p) verdict = 'データなし';
        else if (vChange == null) verdict = '比較できず';
        else if ((views7 ?? 0) + (viewsPrev7 ?? 0) < 40) verdict = '少数'; // 2週で40PV未満は誤差が大きく判定しない
        else if (vChange >= 10) verdict = '伸び';
        else if (vChange <= -10) verdict = '低下';
        else verdict = '横ばい';
      }
      const pct1 = (v) => (num(v) == null ? null : Math.round(v * 1000) / 10);
      const pos = (v) => (num(v) == null ? null : Math.round(v * 10) / 10);
      return {
        id: c.id, date: c.date, path: c.url, type, typeLabel: TYPE_LABEL[type] ?? type, change: c.change,
        observing, observeUntil, verdict,
        views7, viewsPrev7, viewsChangePct: vChange,
        ctr7: pct1(g.ctr7), ctrPrev7: pct1(g.ctrPrev7), position7: pos(g.position7), positionPrev7: pos(g.positionPrev7),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/**
 * @param {any} snapshot
 * @param {{ goal?: typeof LONG_TERM_GOAL, changes?: any[], config?: any, today?: string | null }} [options]
 */
export function buildAnalyticsReport(snapshot, { goal = LONG_TERM_GOAL, changes = [], config = null, today = null } = {}) {
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

  const drivers = pvDrivers(r7, p7);
  const nextReads = (snapshot?.experiments ?? []).find((e) => e?.id === '20260921-growth-next-reads') ?? null;
  const results = changeResults({ changes, pages: snapshot?.pageMetrics ?? [], config, today: today ?? r7.end ?? null });
  const verdictCounts = results.filter((x) => x.type !== 'fact' && x.type !== 'measurement').reduce((acc, r) => ({ ...acc, [r.verdict]: (acc[r.verdict] ?? 0) + 1 }), {});
  // 判定できるもの（観測窓が終わり、数字がある）を先に。改善の判断に使うのはこちら
  // 事実の更新・計測の修正は改善の実験ではないので判定の表に出さない
  const isExperiment = (x) => x.type !== 'fact' && x.type !== 'measurement';
  const judged = results.filter((x) => isExperiment(x) && !x.observing && ['伸び', '横ばい', '低下'].includes(x.verdict)).slice(0, 20);
  const observingList = results.filter((x) => x.observing);

  return {
    asOf: r7.end ?? null,
    drivers,
    recirculationBaseline: nextReads?.baseline?.viewsPerSession != null ? { value: nextReads.baseline.viewsPerSession, period: nextReads.baseline.period, experimentId: nextReads.id, status: nextReads.status } : null,
    changeResults: judged,
    observingChanges: observingList,
    verdictCounts,
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
