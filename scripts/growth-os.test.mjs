/**
 * Demand Radar / PV Relay / Pipeline / Next Winners / Revenue Funnel / Annual Learning の単体テスト（node --test）。
 * npm run verify と npm run test:growth で実行する。式を変えたら docs/GROWTH_ENGINE.md と一緒に直す。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demandPipeline, demandRadar, effortOf, nextWinners, pvRelay, relayBatch } from '../src/lib/demand-radar.mjs';
import { addDays, daysBetween } from '../src/lib/growth-engine.mjs';
import { revenueFunnel } from '../src/lib/revenue-funnel.mjs';
import { aggregateLearning, syncLearningRecords } from '../src/lib/seasonal-learning.mjs';

const engineConfig = JSON.parse(readFileSync('data/editorial/growth-engine.json', 'utf8'));
const config = JSON.parse(readFileSync('data/editorial/demand-radar.json', 'utf8'));
const TODAY = '2026-10-07';
const pagesOf = (list) => new Map(list.map((p) => [p.path, { tags: [], municipalities: [], ...p }]));
const site = (views7, rows, extra = {}) => ({ windows: { ga4: { recent7: { views: views7 }, recent28: { views: views7 * 4 } } }, pageMetrics: rows, ...extra });

test('Demand Radar：速度は前週比から。実測の無い要素は分母から外し coverage に出す', () => {
  const pages = pagesOf([{ path: '/a/', title: 'A 駐車場' }]);
  const snapshot = site(1000, [{ path: '/a/', views7: 200, viewsPrev7: 100 }]);
  const [a] = demandRadar({ snapshot, pages, seasons: new Map(), engineConfig, config, today: TODAY });
  assert.equal(a.viewsVelocityPct, 100);
  assert.equal(a.components.velocity, 1 / 3);
  assert.equal(a.components.size, null); // GSC が無い → 0 ではなく null
  assert.equal(a.components.competition, null);
  assert.equal(a.commercial, true); // 「駐車場」は商用意図
  assert.ok(a.coverage < 1);
  assert.equal(a.confidence, a.coverage >= 0.7 ? 'high' : a.coverage >= 0.4 ? 'medium' : 'low');
});

test('Demand Radar：台帳の未掲載イベントは90日以内だけ。記事があるものは出さない', () => {
  const registry = { events: [
    { id: 'e1', name: '近いイベント', status: 'verified', startDate: '2026-10-20' },
    { id: 'e2', name: '遠いイベント', status: 'verified', startDate: '2027-03-01' },
    { id: 'e3', name: '記事あり', status: 'verified', startDate: '2026-10-20', articleUrl: '/events/x/' },
  ] };
  const radar = demandRadar({ snapshot: site(100, []), pages: new Map(), seasons: new Map(), engineConfig, config, registry, today: TODAY });
  const names = radar.filter((s) => s.kind === 'event-candidate').map((s) => s.label);
  assert.deepEqual(names, ['近いイベント']);
});

test('PV Relay：終わったページは余韻の後に流入が止まる想定で forecast。終わりが無いページは不明として警告', () => {
  const after = engineConfig.seasonalRules.default.aftermathDays;
  const pages = pagesOf([
    { path: '/ended/', title: '終わった祭り', startDate: '2026-10-03', endDate: '2026-10-04' },
    { path: '/unknown/', title: '期限の無い制度' },
  ]);
  const snapshot = site(1000, [
    { path: '/ended/', views7: 350, viewsPrev7: 300 },
    { path: '/unknown/', views7: 300, viewsPrev7: 100 },
  ]);
  const relay = pvRelay({ snapshot, pages, seasons: new Map(), engineConfig, config, radar: [], today: TODAY });
  const ended = relay.items.find((i) => i.path === '/ended/');
  assert.equal(ended.status, 'ENDED');
  const from = Math.max(0, daysBetween(TODAY, addDays('2026-10-04', after))); // 終了＋余韻の後から止まる
  assert.equal(ended.lostViewsForecast[7], Math.round((350 / 7) * (7 - from)));
  const unknown = relay.items.find((i) => i.path === '/unknown/');
  assert.equal(unknown.status, 'END UNKNOWN');
  assert.equal(unknown.lostViewsForecast[7], null);
  assert.ok(relay.alerts.some((a) => a.kind === 'PV at Risk' && a.message.includes('終わりの日付データが無く')));
  assert.ok(relay.alerts.some((a) => a.kind === '依存度')); // 上位1ページで35%
});

test('流入急減の事前警戒：14日以内の終了・検索表示の急減・順位下落（前期間の値がある時だけ）', () => {
  const pages = pagesOf([{ path: '/soon/', title: 'もうすぐ終わる祭り', startDate: '2026-10-15', endDate: '2026-10-16' }, { path: '/seo/', title: '検索ページ' }]);
  const snapshot = site(1000, [
    { path: '/soon/', views7: 150, viewsPrev7: 140 },
    { path: '/seo/', views7: 100, viewsPrev7: 100, gsc: { impressions28: 500, impressionsPrev28: 1000, position28: 9, positionPrev28: 5, ctr28: 0.01 } },
  ]);
  const relay = pvRelay({ snapshot, pages, seasons: new Map(), engineConfig, config, radar: [], today: TODAY });
  const kinds = relay.alerts.map((a) => a.kind);
  assert.ok(relay.alerts.some((a) => a.kind === 'PV at Risk' && a.message.includes('あと9日')));
  assert.ok(kinds.includes('検索表示急減'));
  assert.ok(kinds.includes('順位下落'));
  assert.ok(!kinds.includes('CTR悪化')); // ctrPrev28 が無い → 比べない
  assert.equal(relay.items.find((i) => i.path === '/seo/').ctrChangePct, null);
});

test('Next Winners：終わったページと急減中のページは外す', () => {
  const radar = [
    { kind: 'page', path: '/up/', components: { timing: 1, velocity: 0.6 }, viewsVelocityPct: 80 },
    { kind: 'page', path: '/ended/', components: { timing: 0, velocity: 0.9 }, viewsVelocityPct: 200 },
    { kind: 'page', path: '/drop/', components: { timing: null, velocity: 0 }, viewsVelocityPct: -60 },
  ];
  const forecasts = [{ path: '/up/', upside: 100 }, { path: '/ended/', upside: 500 }, { path: '/drop/', upside: 300 }];
  assert.deepEqual(nextWinners({ radar, forecasts }).map((w) => w.path), ['/up/']);
});

test("Today's Growth Batch：期待PV × 確度 ÷ 工数 × 緊急度。失うPVの代替は1.3倍、期待PVが無い候補は順位を付けない", () => {
  const relay = { items: [{ replacements: [{ path: '/next/' }] }] };
  const engineBatch = [
    { title: '/next/ の title・description', page: '/next/', expectedPv: 100, confidence: 'medium' },
    { title: '/other/ の title・description', page: '/other/', expectedPv: 100, confidence: 'medium' },
    { title: '/none/ の改善', page: '/none/', expectedPv: null, confidence: 'low' },
  ];
  const { batch, candidatesWithoutEstimate } = relayBatch({ engineBatch, winners: [], relay, seasons: new Map() });
  assert.equal(batch[0].path, '/next/');
  assert.equal(batch[0].urgency, 1.3);
  assert.equal(batch[0].score, Math.round((100 * 0.5 / 1) * 1.3));
  assert.equal(batch[1].score, Math.round(100 * 0.5 / 1));
  assert.deepEqual(candidatesWithoutEstimate.map((c) => c.path), ['/none/']);
  assert.equal(effortOf('新規記事'), 'L');
  assert.equal(effortOf('title・description'), 'S');
  assert.equal(effortOf('本文とFAQの事実更新'), 'M');
});

test('30/60/90 Pipeline：開催日までの日数で分け、終わったものは入れない', () => {
  const pages = pagesOf([
    { path: '/a/', title: 'A', startDate: '2026-10-20' },
    { path: '/b/', title: 'B', startDate: '2026-11-20' },
    { path: '/c/', title: 'C', startDate: '2026-12-20' },
    { path: '/old/', title: 'old', startDate: '2026-09-01' },
  ]);
  const items = demandPipeline({ pages, seasons: new Map(), radar: [], snapshot: site(0, []), today: TODAY });
  assert.deepEqual(items.map((i) => [i.path, i.bucket]), [['/a/', '0-30'], ['/b/', '31-60'], ['/c/', '61-90']]);
});

test('Revenue Funnel：取得できない値は0ではなく null。クリックあり成果0はミスマッチ診断', () => {
  const asp = { asOf: '2026-10-07', providers: [{ key: 'a8', name: 'A8.net', occurred: 0, confirmed: 0, revenueYen: 0 }] };
  const snapshot = site(5000, [], { conversionDetail: { recent7: { booking_guide_view: 400, outbound_booking_click: 40, paid_booking_click: 4 }, byProviderPage: [] } });
  const f = revenueFunnel({ snapshot, ledger: { entries: [] }, asp });
  const v = Object.fromEntries(f.stages.map((s) => [s.key, s.value]));
  assert.deepEqual(v, { pv: 5000, ctaImpression: 400, ctaClick: 40, aspClick: 4, occurred: 0, confirmed: 0, revenue: 0 });
  assert.equal(f.metrics.affiliateCtr, 0.01);
  assert.equal(f.metrics.occurredCvr, null); // 期間がそろわない値で割らない
  assert.equal(f.metrics.epc, null);
  assert.equal(f.diagnosis.length, 1);
  assert.match(f.diagnosis[0].message, /発生成果0/);

  const empty = revenueFunnel({ snapshot: site(5000, []), ledger: { entries: [] }, asp: { providers: [{ name: 'X', occurred: null }] } });
  const e = Object.fromEntries(empty.stages.map((s) => [s.key, s.value]));
  assert.equal(e.ctaImpression, null);
  assert.equal(e.aspClick, null);
  assert.equal(e.occurred, null);
  assert.equal(empty.diagnosis.length, 0);
});

test('Annual Learning：同期は実測の項目を上書きしない。学習は同カテゴリ2件以上の実測から', () => {
  const pages = pagesOf([
    { path: '/hanabi-a/', title: 'A花火大会2026', slug: 'hanabi-a', startDate: '2026-08-01', pubDate: '2026-07-01' },
    { path: '/hanabi-b/', title: 'B花火大会2026', slug: 'hanabi-b', startDate: '2026-09-01', pubDate: '2026-08-01' },
    { path: '/kouyou-a/', title: 'A紅葉2026', slug: 'kouyou-a', startDate: '2026-11-01' },
  ]);
  const prev = [{ path: '/hanabi-a/', demandStartDate: '2026-06-22', measuredAt: '2026-08-10' }, { path: '/gone/', title: '削除済み', leadDays: 30 }];
  const records = syncLearningRecords({ records: prev, pages, config });
  const a = records.find((r) => r.path === '/hanabi-a/');
  assert.equal(a.category, 'hanabi');
  assert.equal(a.demandStartDate, '2026-06-22');
  assert.equal(a.measuredAt, '2026-08-10');
  assert.equal(records.find((r) => r.path === '/gone/').archived, true);

  let learned = aggregateLearning(records, config);
  assert.equal(learned.find((c) => c.category === 'hanabi').status, 'データ不足'); // 実測1件
  assert.equal(learned.find((c) => c.category === 'hanabi').leadDaysAvg, null);

  const b = records.find((r) => r.path === '/hanabi-b/');
  b.demandStartDate = '2026-07-20';
  learned = aggregateLearning(records, config);
  const hanabi = learned.find((c) => c.category === 'hanabi');
  assert.equal(hanabi.status, 'learned');
  assert.equal(hanabi.leadDaysAvg, (40 + 43) / 2);
});
