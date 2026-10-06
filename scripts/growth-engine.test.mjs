/**
 * Growth Engine と鮮度チェックの単体テスト（node --test）。npm run verify で実行する。
 * 計算式を変えたら、ここの期待値を docs/GROWTH_ENGINE.md と一緒に直す。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  activeDaysInMonth, experimentTypeOf, gapController, observationWindows, pageSeason,
  scoreActions, seasonalPhase, seoOpportunities,
} from '../src/lib/growth-engine.mjs';
import { auditFreshness } from './freshness-guard.mjs';

const config = JSON.parse(readFileSync('data/editorial/growth-engine.json', 'utf8'));
const snap = (recent7, previous7, extra = {}) => ({ windows: { ga4: { recent7: { views: recent7, viewsPerSession: 1.15 }, previous7: { views: previous7 }, recent28: { views: 10469 } } }, ...extra });

test('Gap Controller：11月前は直近7日の1日平均×30日', () => {
  const g = gapController({ snapshot: snap(4916, 2153), config, today: '2026-10-06' });
  assert.equal(g.forecast, 21069);
  assert.equal(g.gap, 21069 - 100000);
  assert.equal(g.targetDailyAverage, 3333);
  assert.equal(g.currentDailyAverage, 702);
  assert.equal(g.status, 'OFF TRACK');
  assert.equal(g.daysToMonth, 26);
});

test('Gap Controller：11月に入ったら実績＋残り日数×1日平均。状態のしきい値', () => {
  const on = gapController({ snapshot: snap(14000, 10000, { monthToDate: { month: '2026-11', views: 60000, days: 10 } }), config, today: '2026-11-11' });
  assert.equal(on.forecast, 60000 + 2000 * 20);
  assert.equal(on.status, 'ON TRACK');
  assert.equal(on.targetDailyAverage, 2000);
  const risk = gapController({ snapshot: snap(7000, 7000, { monthToDate: { month: '2026-11', views: 65000, days: 10 } }), config, today: '2026-11-11' });
  assert.equal(risk.forecast, 85000);
  assert.equal(risk.status, 'AT RISK');
  const none = gapController({ snapshot: {}, config, today: '2026-10-06' });
  assert.equal(none.status, 'NO DATA');
  assert.equal(none.forecast, null);
});

test('Seasonal Deadline：花火は開催42日前から需要、締切はその14日前', () => {
  const s = seasonalPhase({ startDate: '2026-11-07', category: 'hanabi', today: '2026-10-06', config });
  assert.equal(s.phase, 'demand-rising');
  assert.equal(s.milestones.find((m) => m.key === 'demandStart').date, '2026-09-26');
  assert.equal(s.milestones.find((m) => m.key === 'publishDeadline').date, '2026-09-12');
  assert.equal(seasonalPhase({ startDate: '2026-11-07', category: 'hanabi', today: '2026-11-07', config }).phase, 'live');
  assert.equal(seasonalPhase({ startDate: '2026-11-07', category: 'hanabi', today: '2026-11-10', config }).phase, 'ended');
  assert.equal(seasonalPhase({ startDate: '2026-12-31', category: 'newyear', today: '2026-10-06', config }).phase, 'prepare');
});

test('季節ガイド：年をまたぐ需要期間は終わりを翌年にする', () => {
  const s = pageSeason({ slug: 'oarai-ankou-nabe-guide', tags: ['あんこう'], title: '' }, config, '2026-10-06');
  assert.equal(s.startDate, '2026-11-01');
  assert.equal(s.endDate, '2027-02-28');
  assert.equal(pageSeason({ slug: 'x', tags: ['あんこう'], title: '', lifespan: 'evergreen' }, config, '2026-10-06'), null);
});

test('11月の有効日数：開催後の余韻まで。対象月より前に終わるものは0', () => {
  const hanabi = seasonalPhase({ startDate: '2026-11-07', category: 'hanabi', today: '2026-10-06', config });
  assert.equal(activeDaysInMonth(hanabi, '2026-11'), 9); // 11/1〜11/9（終了後2日）
  const early = seasonalPhase({ startDate: '2026-10-17', category: 'hanabi', today: '2026-10-06', config });
  assert.equal(activeDaysInMonth(early, '2026-11'), 0);
  assert.equal(activeDaysInMonth(null, '2026-11'), 30);
});

test('Observation Window：変更の種類ごとの観測日数', () => {
  assert.equal(experimentTypeOf({ kind: 'on-page', change: 'title と description を検索語に合わせて変更' }), 'metadata');
  assert.equal(experimentTypeOf({ kind: 'on-page', change: '本文に駐車場の節を追加' }), 'body');
  assert.equal(experimentTypeOf({ kind: 'internal-link', change: '' }), 'internal-link');
  assert.equal(experimentTypeOf({ kind: 'on-page', experimentType: 'cta', change: '本文' }), 'cta');
  const rows = observationWindows({
    changes: [
      { id: 'a', date: '2026-10-01', url: '/x/', kind: 'on-page', change: 'title を変更' },
      { id: 'b', date: '2026-09-01', url: '/x/', kind: 'on-page', change: '本文を追加' },
      { id: 'c', date: '2026-09-01', url: '/y/', kind: 'internal-link', change: '' },
    ],
    config,
    today: '2026-10-06',
  });
  const x = rows.find((r) => r.path === '/x/');
  assert.equal(x.changeId, 'a');
  assert.equal(x.observeUntil, '2026-10-15');
  assert.equal(x.status, 'observing');
  assert.equal(rows.find((r) => r.path === '/y/').status, 'open');
});

test('SEO Opportunity：8〜20位・上位の低CTR・急増を分類する', () => {
  const snapshot = {
    windows: { ga4: { recent7: { viewsPerSession: 1 } } },
    pageMetrics: [
      { path: '/striking/', gsc: { impressions28: 500, clicks28: 5, position28: 12 } },
      { path: '/lowctr/', gsc: { impressions28: 500, clicks28: 5, position28: 3 } },
      { path: '/rising/', gsc: { impressions28: 400, clicks28: 40, position28: 2, impressionsPrev28: 200 } },
      { path: '/small/', gsc: { impressions28: 20, clicks28: 0, position28: 12 } },
    ],
  };
  const out = seoOpportunities({ snapshot, config, seasons: new Map(), inbound: null, focusPaths: [], observation: [], month: '2026-11', today: '2026-10-06' });
  const types = (path) => out.find((o) => o.page === path)?.types ?? [];
  assert.ok(types('/striking/').includes('STRIKING_DISTANCE'));
  assert.ok(types('/lowctr/').includes('LOW_CTR'));
  assert.ok(types('/rising/').includes('RISING_DEMAND'));
  assert.equal(types('/small/').length, 0);
  assert.ok(out.find((o) => o.page === '/striking/').upsideViews > 0);
});

test('Growth Action Queue：期待PV×確度÷工数×締切の緊急度。不足は null', () => {
  const [scored, missing] = scoreActions({
    actions: [
      { id: 'a', title: 'A', status: 'ready', expectedPvImpact: 1000, confidence: 'high', effort: 'M', dueDate: '2026-10-09' },
      { id: 'b', title: 'B', status: 'candidate' },
      { id: 'c', title: 'C', status: 'done', expectedPvImpact: 9999, confidence: 'high', effort: 'S' },
    ],
    seasons: new Map(),
    today: '2026-10-06',
  });
  assert.equal(scored.score, Math.round(1000 * 0.8 / 3 * 1.5));
  assert.equal(missing.score, null);
  assert.deepEqual(missing.missing, ['expectedPvImpact', 'confidence', 'effort']);
});

test('Freshness：期限切れの導線・期限を過ぎた受付・年度違いを見つける', () => {
  const page = (path, fm, extra = {}) => [path, { path, slug: path.split('/')[2], title: fm.title ?? '', frontmatter: fm, sourceUrls: [], noindex: false, startDate: null, endDate: null, year: null, pubDate: '2026-09-01', ...extra }];
  const pages = new Map([
    page('/events/a-2026/', { bookingGuide: { items: [{ label: '有料駐車場', expiresAt: '2026-10-01' }] } }),
    page('/events/b-2026/', { title: '花火2026', keyPoints: ['観覧席は10月1日まで受付。'] }, { startDate: '2026-11-07', year: 2026 }),
    page('/events/c-2026/', { title: '祭り2025', keyPoints: ['申込は9月1日まで受付でした。'] }, { startDate: '2025-11-07', year: 2026 }),
    page('/events/d-2026/', { summary: '現在、観覧席を販売中です。' }, { startDate: '2026-09-01', endDate: '2026-09-02', year: 2026 }),
  ]);
  const found = auditFreshness({ pages, today: '2026-10-06' });
  const has = (path, type) => found.some((f) => f.path === path && f.type === type);
  assert.ok(has('/events/a-2026/', 'expired-cta'));
  assert.ok(has('/events/b-2026/', 'stale-deadline'));
  assert.ok(has('/events/c-2026/', 'year-slug'));
  assert.equal(found.find((f) => f.type === 'year-slug').severity, 'error');
  assert.ok(!has('/events/c-2026/', 'stale-deadline')); // 「でした」は過去の文脈
  assert.ok(has('/events/d-2026/', 'ended-live-wording'));
});
