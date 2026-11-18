import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { confirmedControlMetrics } from '../src/lib/confirmed-control-metrics.mjs';

const saved = () => JSON.parse(readFileSync(new URL('../data/editorial/performance-snapshot.json', import.meta.url)));

test('confirmed daily totals replace October pace and never use legacy channel rows', () => {
  const snapshot = saved();
  const result = confirmedControlMetrics(snapshot);
  const total = snapshot.windows.ga4.daily.filter((r) => r.date >= result.monthToDate.start).reduce((s, r) => s + r.views, 0);
  assert.equal(result.monthToDate.views, total);
  assert.equal(result.monthToDate.through, snapshot.asOf);
  assert.equal(result.pace.referenceRunRate30FromRecent7, Math.round(snapshot.windows.ga4.recent7.views / 7 * 30));
  assert.equal(result.pace.ga4Through, snapshot.asOf);
  snapshot.windows.ga4.channelRecent7 = [{ channel: 'Organic Search', sessions: 0, views: 999999 }];
  snapshot.paceDiagnostics.referenceRunRate30FromRecent7 = 1;
  assert.deepEqual(confirmedControlMetrics(snapshot), result);
  assert.ok(result.organicShare > 0 && result.organicShare <= 1);
});

test('missing or duplicate daily observations stay unknown instead of producing a partial MTD', () => {
  const snapshot = saved();
  const start = `${snapshot.asOf.slice(0, 7)}-01`;
  snapshot.windows.ga4.daily = snapshot.windows.ga4.daily.filter((r) => r.date !== start);
  assert.equal(confirmedControlMetrics(snapshot).monthToDate.views, null);
  const duplicate = saved();
  duplicate.windows.ga4.daily.push({ ...duplicate.windows.ga4.daily.at(-1) });
  assert.equal(confirmedControlMetrics(duplicate), null);
});

test('period mismatch or unavailable organic metrics cannot be converted to zero', () => {
  const snapshot = saved();
  snapshot.windows.ga4.daily.at(-1).organicViews = null;
  assert.equal(confirmedControlMetrics(snapshot).organicViews7, null);
  assert.equal(confirmedControlMetrics(snapshot).organicShare, null);
  snapshot.windows.gsc.dailyMeta.confirmedThrough = '2026-01-01';
  assert.equal(confirmedControlMetrics(snapshot), null);
});
