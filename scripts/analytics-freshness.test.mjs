import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsFreshness, analyticsFreshnessMessages } from '../src/lib/analytics-freshness.mjs';

const snap = (ga4, gsc) => ({ ga4LatestConfirmedDate: ga4, gscLatestConfirmedDate: gsc, source: { freshness: { ga4LatestConfirmedDate: ga4, gscLatestConfirmedDate: gsc } } });

test('鮮度：確定日が今日の3日前なら遅れ0で fresh（同期が毎日成功している状態）', () => {
  const r = analyticsFreshness(snap('2026-11-07', '2026-11-07'), '2026-11-10');
  assert.equal(r.expectedConfirmedDate, '2026-11-07');
  assert.equal(r.status, 'fresh');
  assert.equal(r.sources.ga4.delayDays, 0);
  assert.deepEqual(analyticsFreshnessMessages(r), []);
});

test('鮮度：GA4 は72時間（3日）の遅れで stale、2日ならまだ fresh', () => {
  assert.equal(analyticsFreshness(snap('2026-11-05', '2026-11-05'), '2026-11-10').sources.ga4.status, 'fresh');
  const r = analyticsFreshness(snap('2026-11-04', '2026-11-04'), '2026-11-10');
  assert.equal(r.sources.ga4.status, 'stale');
  assert.equal(r.sources.ga4.delayDays, 3);
});

test('鮮度：GSC は96時間（4日）の遅れで stale。GA4 と別に判定する', () => {
  const r = analyticsFreshness(snap('2026-11-07', '2026-11-04'), '2026-11-10');
  assert.equal(r.sources.ga4.status, 'fresh');
  assert.equal(r.sources.gsc.status, 'fresh');
  const late = analyticsFreshness(snap('2026-11-07', '2026-11-03'), '2026-11-10');
  assert.equal(late.sources.gsc.status, 'stale');
  assert.equal(late.status, 'stale');
});

test('鮮度：2026-10-28 で止まった実例（Issue #545）を検出する', () => {
  const r = analyticsFreshness(snap('2026-10-28', '2026-10-28'), '2026-11-10');
  assert.equal(r.status, 'stale');
  assert.equal(r.sources.ga4.delayDays, 10);
  assert.equal(analyticsFreshnessMessages(r).length, 2);
});

test('鮮度：確定日が無い・形式が違うときは missing（null。前回値を最新扱いしない）', () => {
  for (const s of [null, {}, snap('', null), snap('2026/11/07', '11-07')]) {
    const r = analyticsFreshness(s, '2026-11-10');
    assert.equal(r.status, 'missing');
    assert.equal(r.sources.ga4.latestConfirmedDate, null);
    assert.equal(r.sources.ga4.delayDays, null);
  }
});

test('鮮度：確定日が本来より新しくても遅れは負にならない', () => {
  assert.equal(analyticsFreshness(snap('2026-11-09', '2026-11-09'), '2026-11-10').sources.ga4.delayDays, 0);
});
