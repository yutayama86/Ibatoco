/**
 * GA4/GSC スナップショットの鮮度判定（Issue #545）。
 *
 * 確定日は、同期が毎日成功していても「今日の3日前」（GOOGLE_CONFIRM_LAG_DAYS）になる。
 * そのため「遅れ」は、確定日からの経過日数ではなく、**本来あるはずの確定日（今日−3日）からの遅れ**で数える。
 *   GA4：遅れが3日（72時間）以上で stale
 *   GSC：遅れが4日（96時間）以上で stale
 * 確定日が読めないときは missing（null を返し、前回値を最新扱いしない）。
 */
import { GOOGLE_CONFIRM_LAG_DAYS } from './ga4-daily.mjs';
import { addDays, daysBetween } from './growth-engine.mjs';

export const ANALYTICS_FRESHNESS_SLO_DAYS = { ga4: 3, gsc: 4 };
const KEYS = { ga4: 'ga4LatestConfirmedDate', gsc: 'gscLatestConfirmedDate' };
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * @param {object|null} snapshot data/editorial/performance-snapshot.json
 * @param {string} today 日本時間の今日（YYYY-MM-DD）
 */
export function analyticsFreshness(snapshot, today) {
  const expected = addDays(today, -GOOGLE_CONFIRM_LAG_DAYS);
  const sources = {};
  for (const [name, key] of Object.entries(KEYS)) {
    const latest = snapshot?.source?.freshness?.[key] ?? snapshot?.[key] ?? null;
    if (!isDate(latest)) {
      sources[name] = { latestConfirmedDate: null, delayDays: null, status: 'missing' };
      continue;
    }
    const delayDays = Math.max(0, daysBetween(latest, expected));
    sources[name] = { latestConfirmedDate: latest, delayDays, status: delayDays >= ANALYTICS_FRESHNESS_SLO_DAYS[name] ? 'stale' : 'fresh' };
  }
  const statuses = Object.values(sources).map((s) => s.status);
  const status = statuses.includes('missing') ? 'missing' : statuses.includes('stale') ? 'stale' : 'fresh';
  return { today, expectedConfirmedDate: expected, status, sources };
}

/** 人が読む1行ずつの説明。fresh のときは空 */
export function analyticsFreshnessMessages(result) {
  const label = { ga4: 'GA4', gsc: 'GSC' };
  const out = [];
  for (const [name, s] of Object.entries(result.sources)) {
    if (s.status === 'missing') out.push(`${label[name]} の確定日が読めません（未取得）。前回の値を最新として扱わないでください。`);
    else if (s.status === 'stale') out.push(`${label[name]} の確定値が ${s.latestConfirmedDate} で止まっています（本来は ${result.expectedConfirmedDate} まで。${s.delayDays}日の遅れ）。`);
  }
  return out;
}
