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

test('pvDrivers splits PV change into visits and recirculation', async () => {
  const { pvDrivers } = await import('../src/lib/analytics-report.mjs');
  const d = pvDrivers({ sessions: 1000, views: 1500 }, { sessions: 1000, views: 1000 });
  assert.equal(d.sessionsChangePct, 0);
  assert.equal(d.viewsPerSession, 1.5);
  assert.equal(d.sessionSharePct, 0);
  assert.equal(pvDrivers({ sessions: null, views: 1 }, { sessions: 1, views: 1 }), null);
});

test('changeResults does not judge during the observation window', async () => {
  const { changeResults } = await import('../src/lib/analytics-report.mjs');
  const config = { observationWindows: { metadata: 14, body: 28 } };
  const pages = [{ path: '/a/', views7: 120, viewsPrev7: 100, gsc: { ctr7: 0.05, ctrPrev7: 0.02 } }, { path: '/small/', views7: 3, viewsPrev7: 10 }];
  const changes = [
    { id: 'x', date: '2026-11-20', url: '/a/', kind: 'on-page', change: 'title を改善' },
    { id: 'y', date: '2026-10-20', url: '/a/', kind: 'on-page', change: 'title を改善' },
    { id: 'z', date: '2026-11-01', url: '*', kind: 'technical', change: 'sitemap' },
    { id: 'w', date: '2026-10-21', url: '/small/', kind: 'on-page', change: 'title を改善' },
  ];
  const rows = changeResults({ changes, pages, config, today: '2026-11-22' });
  assert.equal(rows.length, 3);
  assert.equal(rows.find((r) => r.path === '/small/').verdict, '少数');
  assert.equal(rows[0].verdict, '観測中');
  assert.equal(rows[0].observeUntil, '2026-12-04');
  const judged = rows.find((r) => r.id === 'y');
  assert.equal(judged.verdict, '伸び');
  assert.equal(judged.ctr7, 5);
});

test('fact updates are not shown as improvement results', () => {
  const r = buildAnalyticsReport(
    { pageMetrics: [{ path: '/a/', views7: 200, viewsPrev7: 100 }], windows: { ga4: { recent7: { end: '2026-11-18' } } } },
    { changes: [{ id: 'f', date: '2026-11-01', url: '/a/', kind: 'on-page', change: '日程を更新', experimentType: 'fact' }], config: { observationWindows: { fact: 0 } }, today: '2026-11-22' },
  );
  assert.equal(r.changeResults.length, 0);
});
