import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsReport, contentType, changePct, weeklyBlocks } from '../src/lib/analytics-report.mjs';

test('contentType classifies by URL', () => {
  assert.equal(contentType('/area/kasama/'), 'エリア（市町村）');
  assert.equal(contentType('/events/kairakuen-guide/'), '常緑ガイド');
  assert.equal(contentType('/events/daigo-hanabi-2026/'), '時事（イベント・ニュース）');
  assert.equal(contentType('/food-library/satsumaimo/'), '食ライブラリ');
  assert.equal(contentType('/'), 'トップ・一覧');
});

test('changePct returns null instead of inventing values', () => {
  assert.equal(changePct(10, 0), null);
  assert.equal(changePct(null, 5), null);
  assert.equal(changePct(15, 10), 50);
});

test('weeklyBlocks uses only complete 7-day weeks ending at the latest date', () => {
  const daily = Array.from({ length: 10 }, (_, i) => ({ date: `2026-11-${String(i + 10).padStart(2, '0')}`, views: 100 }));
  assert.deepEqual(weeklyBlocks(daily), [{ start: '2026-11-13', end: '2026-11-19', views: 700 }]);
});

test('missing snapshot data stays null', () => {
  const r = buildAnalyticsReport({});
  assert.equal(r.kpis.views7, null);
  assert.equal(r.longTerm.pace, null);
  assert.deepEqual(r.weeks, []);
});

test('long-term pace and required growth', () => {
  const r = buildAnalyticsReport({ windows: { ga4: { recent7: { start: '2026-11-12', end: '2026-11-18', views: 7000 }, previous7: { views: 3500 } } } });
  assert.equal(r.longTerm.pace, 30000);
  assert.equal(r.kpis.views7ChangePct, 100);
  assert.equal(r.longTerm.weeksLeft, 11);
  assert.ok(r.longTerm.requiredWeeklyGrowthPct > 30);
});
