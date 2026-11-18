/** Derive dashboard summaries from the confirmed daily series, never legacy summaries. */
import { parseDateOnly, addDateOnlyDays } from './date-only.js';

const count = (value) => Number.isSafeInteger(value) && value >= 0;
const dayString = (date) => date.toISOString().slice(0, 10);

export function confirmedControlMetrics(snapshot) {
  const ga = snapshot?.windows?.ga4 ?? {};
  const gs = snapshot?.windows?.gsc ?? {};
  const through = snapshot?.asOf;
  // Invalid or misaligned periods must never become a valid-looking total.
  try { parseDateOnly(through); } catch { return null; }
  if (ga.dailyMeta?.confirmedThrough !== through || gs.dailyMeta?.confirmedThrough !== through) return null;
  const end = parseDateOnly(through);
  const monthStart = `${through.slice(0, 7)}-01`;
  function sumWindow(rows, start, field) {
    const byDate = new Map();
    for (const row of rows ?? []) {
      if (row.date < start || row.date > through) continue;
      if (byDate.has(row.date)) return null;
      byDate.set(row.date, row);
    }
    let total = 0;
    for (let date = parseDateOnly(start); date <= end; date = addDateOnlyDays(date, 1)) {
      const value = byDate.get(dayString(date))?.[field];
      if (!count(value)) return null;
      total += value;
    }
    return total;
  }
  const start7 = dayString(addDateOnlyDays(end, -6));
  const start3 = dayString(addDateOnlyDays(end, -2));
  const views7 = sumWindow(ga.daily, start7, 'views');
  const views3 = sumWindow(ga.daily, start3, 'views');
  const organicViews7 = sumWindow(ga.daily, start7, 'organicViews');
  if (views7 == null || views3 == null || views7 !== ga.recent7?.views || ga.recent7?.start !== start7 || ga.recent7?.end !== through) return null;
  const target = snapshot.northStar?.target;
  const recent7DailyAverage = views7 / 7;
  const recent3DailyAverage = views3 / 3;
  const delta = recent7DailyAverage ? (recent3DailyAverage / recent7DailyAverage - 1) * 100 : null;
  return {
    monthToDate: {
      month: through.slice(0, 7), start: monthStart, through,
      views: sumWindow(ga.daily, monthStart, 'views'),
      organicViews: sumWindow(ga.daily, monthStart, 'organicViews'),
      searchClicks: sumWindow(gs.daily, monthStart, 'clicks'),
      source: 'Google official confirmed daily series',
    },
    organicViews7,
    organicShare: organicViews7 != null && views7 > 0 && organicViews7 <= views7 ? organicViews7 / views7 : null,
    pace: {
      checkedAt: ga.dailyMeta.fetchedAt, ga4Through: through,
      recent3Views: views3, recent3DailyAverage,
      referenceRunRate30FromRecent3: Math.round(recent3DailyAverage * 30),
      referenceRunRate30FromRecent7: Math.round(recent7DailyAverage * 30),
      recent3DailyVsRecent7DailyPct: delta,
      requiredNovemberDailyAverage: count(target) ? target / 30 : null,
      trend: delta == null ? 'unknown' : delta < -5 ? 'decelerating' : delta > 5 ? 'accelerating' : 'stable',
      basis: `${start7}..${through}: confirmed daily observations. 30-day run rate is a reference, not a forecast.`,
    },
  };
}
