/**
 * GA4 の日別実績（performance-snapshot.json の windows.ga4.daily）。純粋関数（ファイルは読まない）。
 *
 * 形式：[{ date, views, sessions, engagedSessions, organicViews, incident? }]（日付の昇順、直近35日まで）
 *   views           … GA4 screen_page_views（日別の総数）
 *   sessions        … GA4 sessions
 *   engagedSessions … GA4 engaged_sessions
 *   organicViews    … session_default_channel_group = "Organic Search" の screen_page_views（Organic sessions ではない）。取れない日は null
 *   incident        … 計測障害の日（data/editorial/measurement-incidents.json の id）。値は実測のまま持ち、参考計算からは外す
 * 原則：取得できなかった日は行を作らない（ゼロで埋めない）。確定していない日（confirmedThrough より後）は入れない。
 * 取得元：Windsor.ai の GA4（property 547804264）。日次の取り込みは ChatGPT の日次処理（docs/prompts/IBATOCO_DAILY_GROWTH_DIRECTOR.md）
 */
import { addDays, daysBetween } from './growth-engine.mjs';

export const GA4_DAILY_MAX_DAYS = 35;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Windsor.ai の取得結果を日付で結合する。
 *   totals   … [{ date, screen_page_views, sessions, engaged_sessions }]（日別の総数）
 *   channels … [{ date, session_default_channel_group, screen_page_views }]（チャネル別）
 * 日別の総数が無い日は、チャネル別があっても行を作らない（総数を推測しない）
 */
export function joinWindsorDaily({ totals = [], channels = [] }) {
  const organic = new Map();
  for (const c of channels) {
    if (!isDate(c?.date) || c.session_default_channel_group !== 'Organic Search') continue;
    const v = num(c.screen_page_views ?? c.views);
    if (v == null) continue;
    organic.set(c.date, (organic.get(c.date) ?? 0) + v);
  }
  const rows = new Map();
  for (const t of totals) {
    if (!isDate(t?.date)) continue;
    rows.set(t.date, {
      date: t.date,
      views: num(t.screen_page_views ?? t.views),
      sessions: num(t.sessions),
      engagedSessions: num(t.engaged_sessions ?? t.engagedSessions),
      organicViews: organic.has(t.date) ? organic.get(t.date) : null,
    });
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 既存の日別に新しい行を重ねる（同じ日は新しい方）。confirmedThrough より後の日は入れず、confirmedThrough から35日に絞る。
 * 計測障害の日には incident を付ける（値は変えない）
 */
export function mergeDaily({ existing = [], incoming = [], confirmedThrough, incidents = null }) {
  const affected = new Map();
  for (const i of incidents?.incidents ?? []) if (i.source === 'ga4') for (const d of i.affectedDates ?? []) affected.set(d, i.id);
  const byDate = new Map();
  for (const r of [...existing, ...incoming]) if (isDate(r?.date)) byDate.set(r.date, { ...byDate.get(r.date), ...r });
  const through = isDate(confirmedThrough) ? confirmedThrough : [...byDate.keys()].sort().at(-1);
  if (!through) return [];
  const from = addDays(through, -(GA4_DAILY_MAX_DAYS - 1));
  return [...byDate.values()]
    .filter((r) => r.date >= from && r.date <= through)
    .map((r) => {
      const { incident, ...rest } = r;
      return affected.has(r.date) ? { ...rest, incident: affected.get(r.date) } : rest;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 直近35日のうち、行がある日・無い日 */
export function dailyCoverage(daily = [], confirmedThrough) {
  const through = isDate(confirmedThrough) ? confirmedThrough : daily.at(-1)?.date;
  if (!through) return { from: null, to: null, rows: 0, expectedDays: GA4_DAILY_MAX_DAYS, missingDates: [] };
  const from = addDays(through, -(GA4_DAILY_MAX_DAYS - 1));
  const have = new Set(daily.map((r) => r.date));
  const missingDates = [];
  for (let d = from; d <= through; d = addDays(d, 1)) if (!have.has(d)) missingDates.push(d);
  return { from, to: through, rows: daily.length, expectedDays: GA4_DAILY_MAX_DAYS, missingDates };
}

/**
 * 整合の確認：集計（windows.ga4 の recent7・previous7・recent28・recent3・latestDay）と、同じ期間の日別の合計を比べる。
 * 期間の日が日別にすべてある集計だけを比べる（欠けた日がある期間は uncovered）。取得時点が違うと GA4 側の再集計で差が出ることがあるため、検査では止めず報告に出す
 */
export function compareWindows(ga4 = {}) {
  const daily = Array.isArray(ga4.daily) ? ga4.daily : [];
  const byDate = new Map(daily.map((r) => [r.date, r]));
  const compared = [];
  const uncovered = [];
  for (const key of ['recent7', 'previous7', 'recent28', 'recent3', 'latestDay']) {
    const win = ga4[key];
    const start = key === 'latestDay' ? win?.date : win?.start;
    const end = key === 'latestDay' ? win?.date : win?.end;
    if (!isDate(start) || !isDate(end) || num(win.views) == null) continue;
    const rows = [];
    for (let d = start; d <= end; d = addDays(d, 1)) rows.push(byDate.get(d));
    if (rows.some((r) => r == null)) { uncovered.push(key); continue; }
    const views = rows.reduce((s, r) => s + r.views, 0);
    compared.push({ window: key, start, end, official: num(win.views), daily: views, diff: views - num(win.views) });
  }
  return { compared, uncovered, matched: compared.every((c) => c.diff === 0) };
}

/** 取り込み時の確認：チャネル別の合計が日別の総数と違う日（チャネルの欠けや取得時点の違い。Organic の値の確からしさの目安） */
export function channelTotalsGap({ totals = [], channels = [] }) {
  const sums = new Map();
  for (const c of channels) {
    const v = num(c?.screen_page_views ?? c?.views);
    if (isDate(c?.date) && v != null) sums.set(c.date, (sums.get(c.date) ?? 0) + v);
  }
  return totals
    .filter((t) => isDate(t?.date) && num(t.screen_page_views ?? t.views) != null && sums.get(t.date) !== num(t.screen_page_views ?? t.views))
    .map((t) => ({ date: t.date, total: num(t.screen_page_views ?? t.views), channels: sums.get(t.date) ?? null }));
}

/** 形式の検査（npm run verify）。ゼロ埋めの疑い・確定前の日・重複・障害日の印の食い違いを止める */
export function checkDaily(daily, { confirmedThrough = null, incidents = null } = {}) {
  const errors = [];
  if (daily == null) return errors;
  if (!Array.isArray(daily)) return ['windows.ga4.daily が配列ではない'];
  if (daily.length > GA4_DAILY_MAX_DAYS) errors.push(`windows.ga4.daily が ${daily.length} 行（最大 ${GA4_DAILY_MAX_DAYS} 日）`);
  const affected = new Map();
  for (const i of incidents?.incidents ?? []) if (i.source === 'ga4') for (const d of i.affectedDates ?? []) affected.set(d, i.id);
  let prev = null;
  for (const r of daily) {
    if (!isDate(r?.date)) { errors.push(`日付が YYYY-MM-DD でない：${JSON.stringify(r?.date)}`); continue; }
    if (prev && r.date <= prev) errors.push(`日付が昇順でない・重複：${prev} → ${r.date}`);
    prev = r.date;
    for (const key of ['views', 'sessions', 'engagedSessions', 'organicViews']) {
      const v = r[key];
      if (v != null && (!Number.isInteger(v) || v < 0)) errors.push(`${r.date} の ${key} が0以上の整数でない（${v}）`);
    }
    if (r.views == null) errors.push(`${r.date} の views が無い（日別の総数が無い日は行を作らない）`);
    if (r.views === 0 && r.sessions === 0 && r.confirmedZero !== true) errors.push(`${r.date} が views 0・sessions 0（未取得日のゼロ埋めの疑い。本当に0なら confirmedZero: true）`);
    if (r.organicViews != null && r.views != null && r.organicViews > r.views) errors.push(`${r.date} の organicViews（${r.organicViews}）が views（${r.views}）より大きい`);
    if (isDate(confirmedThrough) && r.date > confirmedThrough) errors.push(`${r.date} は確定日（${confirmedThrough}）より後`);
    if (affected.has(r.date) && r.incident !== affected.get(r.date)) errors.push(`${r.date} は計測障害（${affected.get(r.date)}）の日だが incident の印が無い・違う`);
    if (!affected.has(r.date) && r.incident) errors.push(`${r.date} に台帳に無い incident（${r.incident}）`);
  }
  if (daily.length >= 2 && daysBetween(daily[0].date, daily.at(-1).date) > GA4_DAILY_MAX_DAYS - 1) errors.push('windows.ga4.daily が35日の範囲を超えている');
  return errors;
}
