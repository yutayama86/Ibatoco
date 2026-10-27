/**
 * Read-only Google APIs → existing ga4-daily import shape.
 * Does not mutate snapshots, obtain credentials, or change deployment.
 * Use ADC with a short-lived token from an authorized Workload Identity provider.
 */
import { writeFileSync } from 'node:fs';
import { googleDailyRange } from '../src/lib/ga4-daily.mjs';

const env = process.env;
// Allow both GA4 and GSC processing lag; do not infer missing days are zero.
// 35 days so the 28+7 day windows never depend on rows left over from an earlier (possibly failed) sync.
const { from, through } = googleDailyRange(Date.now());
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
const output = {
  source: 'Google official read-only APIs (ADC external OIDC)',
  fetchedAt: new Date().toISOString(),
  confirmedThrough: through,
  daily: [...dailyMap.values()].sort((a,b)=>a.date.localeCompare(b.date)),
  gsc: { source: 'Search Console API', confirmedThrough: through, daily: gscDaily }
};
writeFileSync(env.OUTPUT_PATH || '/tmp/ibatoco-google-daily.json', JSON.stringify(output, null, 2) + '\n');
console.log(`Read-only: GA4 ${output.daily.length} dates, GSC ${gscDaily.length} dates. No snapshot modified.`);
