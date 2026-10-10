/**
 * 計測障害（data/editorial/measurement-incidents.json）を判断から外す。純粋関数（ファイルは読まない）。
 *
 * 原則
 *   - GA4 の生データ・公式実績は変えない（公式値は元の snapshot から別に出す）
 *   - 障害日を含む集計（7日・28日・3日）は、日別データ（windows.ga4.daily）が障害日以外の日をすべて持っていれば、
 *     障害日を除いた1日平均 × 日数の参考値に、欠けていれば障害前の確定値（baselineBeforeIncident）を参考値にする。どちらも「参考値」と明記する
 *   - 障害日を含むページ別の GA4 値は null（不明）にする。ゼロとして扱わない（急減と誤判定しない）
 *   - 推定値を公式PVに加算しない
 * Growth Engine の計算式は変えない（入力の snapshot を差し替えるだけ）。docs/GROWTH_ENGINE.md の「計測障害」
 */
import { addDays, daysBetween } from './growth-engine.mjs';

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const WINDOW_BASELINE = { recent7: 'ga4Recent7', previous7: 'ga4Previous7', recent28: 'ga4Recent28' };
// ページ別の値と、それが属する集計期間
const PAGE_FIELDS = { views7: 'recent7', viewsPrev7: 'previous7', views28: 'recent28' };

export function ga4Incidents(data) {
  return (data?.incidents ?? []).filter((i) => i.source === 'ga4' && Array.isArray(i.affectedDates));
}

const overlap = (win, dates) => (win && isDate(win.start) && isDate(win.end) ? dates.filter((d) => d >= win.start && d <= win.end) : []);

/**
 * @returns {{ snapshot: any, contaminated: string[], corrections: { window: string, affected: string[], basis: string, official: number | null, reference: number | null }[] }}
 */
export function adjustSnapshotForIncidents(snapshot, data) {
  const incidents = ga4Incidents(data);
  const ga4 = snapshot?.windows?.ga4;
  if (!incidents.length || !ga4) return { snapshot, contaminated: [], corrections: [] };
  const affected = [...new Set(incidents.flatMap((i) => i.affectedDates))].sort();
  const baseline = incidents.find((i) => i.baselineBeforeIncident)?.baselineBeforeIncident ?? null;
  const daily = Array.isArray(ga4.daily) ? ga4.daily : null;
  const out = JSON.parse(JSON.stringify(snapshot));
  const contaminated = [];
  const corrections = [];

  for (const key of ['recent7', 'previous7', 'recent28', 'recent3']) {
    const win = ga4[key];
    const hit = overlap(win, affected);
    if (!hit.length) continue;
    contaminated.push(key);
    const span = daysBetween(win.start, win.end) + 1;
    const clean = daily ? daily.filter((d) => d.date >= win.start && d.date <= win.end && !affected.includes(d.date) && d.views != null) : [];
    // 障害日以外の日が日別ですべてそろっているときだけ、日別から参考値を作る（欠けた日がある平均は偏るため使わない）
    const cleanDays = [];
    for (let d = win.start; d <= win.end; d = addDays(d, 1)) if (!affected.includes(d)) cleanDays.push(d);
    if (clean.length && clean.length === cleanDays.length) {
      const avg = (field) => (clean.every((d) => d[field] != null) ? clean.reduce((s, d) => s + d[field], 0) / clean.length : null);
      const scaled = (field) => (avg(field) == null ? null : Math.round(avg(field) * span));
      out.windows.ga4[key] = {
        ...win,
        views: scaled('views'),
        sessions: scaled('sessions'),
        engagedSessions: scaled('engagedSessions'),
        adjusted: true,
        basis: `障害日（${hit.join('・')}）を除いた${clean.length}日の1日平均 × ${span}日（参考値）`,
      };
    } else if (baseline && WINDOW_BASELINE[key] && baseline[WINDOW_BASELINE[key]]) {
      const b = baseline[WINDOW_BASELINE[key]];
      out.windows.ga4[key] = { ...win, ...b, viewsPerSession: b.sessions ? Number((b.views / b.sessions).toFixed(4)) : win.viewsPerSession ?? null, adjusted: true, basis: `障害前の確定値（${b.start}〜${b.end}）を参考値として使う（日別データが無いため）` };
    } else {
      out.windows.ga4[key] = { ...win, views: null, sessions: null, engagedSessions: null, adjusted: true, basis: '障害日を含み、参考値を作れないため不明（null）' };
    }
    corrections.push({ window: key, affected: hit, basis: out.windows.ga4[key].basis, official: win.views ?? null, reference: out.windows.ga4[key].views ?? null });
  }
  if (contaminated.includes('recent7') || contaminated.includes('previous7')) {
    const r = out.windows.ga4.recent7?.views;
    const p = out.windows.ga4.previous7?.views;
    out.windows.ga4.recent7VsPrevious7 = { ...(ga4.recent7VsPrevious7 ?? {}), viewsPct: r != null && p ? Number(((r / p - 1) * 100).toFixed(2)) : null, adjusted: true };
  }
  // 最新日が障害日なら、急落の判定に使わない
  if (ga4.latestDay?.date && affected.includes(ga4.latestDay.date)) {
    out.windows.ga4.latestDay = { ...ga4.latestDay, incident: true };
    contaminated.push('latestDay');
  }
  // ページ別の GA4 値（日別が無いので障害日だけを除けない）→ その集計期間が障害日を含むなら null
  const pageExcluded = Object.entries(PAGE_FIELDS).filter(([, key]) => overlap(ga4[key], affected).length).map(([field]) => field);
  if (pageExcluded.length) {
    out.pageMetrics = (snapshot.pageMetrics ?? []).map((row) => ({
      ...row,
      ...Object.fromEntries(pageExcluded.map((f) => [f, null])),
      ga4Excluded: pageExcluded,
    }));
    contaminated.push(`pageMetrics(${pageExcluded.join('・')})`);
  }
  return { snapshot: out, contaminated, corrections };
}

/** 障害ごとの状態と復旧の判定（イベント送信の成功と、日次PVの回復を分けて出す） */
export function incidentStatus(snapshot, data) {
  const ga4 = snapshot?.windows?.ga4 ?? {};
  const gsc = snapshot?.windows?.gsc ?? {};
  const ga4Latest = snapshot?.source?.freshness?.ga4LatestConfirmedDate ?? ga4.latestDay?.date ?? null;
  const gscLatest = snapshot?.source?.freshness?.gscLatestConfirmedDate ?? gsc.latestDay?.date ?? null;
  return ga4Incidents(data).map((i) => {
    const first = i.affectedDates[0];
    const last = i.affectedDates.at(-1);
    const base = i.baselineBeforeIncident ?? {};
    const baseDaily = Object.values(base.dailyViews ?? {});
    const baseAvg = baseDaily.length ? baseDaily.reduce((s, v) => s + v, 0) / baseDaily.length : null;
    // 障害後の確定日：日別（windows.ga4.daily）に障害後の行があれば最新の行、無ければ latestDay
    const dailyAfter = (Array.isArray(ga4.daily) ? ga4.daily : []).filter((r) => isDate(r.date) && r.date > last && !r.incident && r.views != null);
    const afterDay = dailyAfter.at(-1) ?? (ga4.latestDay?.date && isDate(ga4.latestDay.date) && ga4.latestDay.date > last ? ga4.latestDay : null);
    const ratio = afterDay?.views != null && baseAvg ? afterDay.views / baseAvg : null;
    const baseGsc = Object.values(base.gscDaily ?? {});
    const baseClicks = baseGsc.length ? baseGsc.reduce((s, v) => s + v.clicks, 0) / baseGsc.length : null;
    const gscDay = gsc.latestDay?.date && gsc.latestDay.date >= first ? gsc.latestDay : null;
    return {
      id: i.id,
      start: i.start,
      startEstimated: i.startEstimated === true,
      end: i.end,
      affectedDates: i.affectedDates,
      inData: Boolean(ga4Latest && ga4Latest >= first),
      ga4Latest,
      dailyViews: afterDay
        ? { status: ratio >= 0.7 ? '回復' : '未回復', date: afterDay.date, views: afterDay.views, baseline: Math.round(baseAvg), ratio: Number(ratio.toFixed(2)) }
        : { status: '判定待ち', note: `障害後（${last} より後）の GA4 確定日がまだ無い（最新 ${ga4Latest ?? '—'}）` },
      gsc: gscDay
        ? { status: baseClicks && gscDay.clicks >= baseClicks * 0.7 ? '維持' : '要確認', date: gscDay.date, clicks: gscDay.clicks, baselineClicks: baseClicks == null ? null : Math.round(baseClicks) }
        : { status: '判定待ち', note: `障害期間の GSC 確定日がまだ無い（最新 ${gscLatest ?? '—'}）` },
      eventSending: '本番 QA（毎デプロイ）の「GA4 の送信経路」で判定',
      issue: i.issue,
    };
  });
}
