/**
 * Demand Radar / PV Relay / Pipeline / Next Winners / Revenue Funnel / Annual Learning の単体テスト（node --test）。
 * npm run verify と npm run test:growth で実行する。式を変えたら docs/GROWTH_ENGINE.md と一緒に直す。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demandPipeline, demandRadar, effortOf, nextWinners, pvRelay, queryClusters, relayBatch } from '../src/lib/demand-radar.mjs';
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

test('実測の整合チェック：query「multiple」は検索語として扱わない。gscQueries の1語がページ合計より大きいときは不整合', async () => {
  const { auditSnapshot } = await import('../src/lib/snapshot-quality.mjs');
  const snapshot = {
    source: { freshness: { gscLatestConfirmedDate: '2026-10-04' } },
    gscDiscovery: { findings: [
      { page: '/p/', query: 'multiple', impressions: 58792, period: '2026-09-07..2026-10-04' }, // 2ページの合算行
      { page: '/p/', query: '茨城パスポート', impressions: 900, period: '2026-09-20..2026-10-04' },
    ] },
    gscQueries: [
      { query: 'multiple', page: '/p/', impressions7: 1, impressionsPrev7: 1, impressions28: 99999 },
      { query: '茨城パスポート', page: '/p/', impressions7: 6304, impressionsPrev7: 29, impressions28: 11494, impressionsPrev28: 40, position28: 8.12, ctr28: 0.02 },
      { query: '大きすぎる語', page: '/q/', impressions7: 10, impressionsPrev7: 5, impressions28: 500 },
      { query: '表示なし', page: '/p/', impressions7: 0, impressionsPrev7: 0, impressions28: 0, position28: 30, ctr28: 0 },
    ],
    pageMetrics: [
      { path: '/p/', gsc: { impressions28: 24583, clicks28: 400, ctr28: 0.016, position28: 7.4 } },
      { path: '/q/', gsc: { impressions28: 100, clicks28: 1, ctr28: 0.01, position28: 9 } },
    ],
  };
  const { snapshot: out, issues } = auditSnapshot(snapshot);
  assert.equal(out.pageMetrics.find((r) => r.path === '/p/').gsc.impressions28, 24583); // 合算行と比べて外さない
  assert.equal(out.pageMetrics.find((r) => r.path === '/q/').gscExcluded, true);
  assert.deepEqual(out.gscDiscovery.findings.map((f) => f.query), ['茨城パスポート']);
  assert.deepEqual(out.gscQueries.map((q) => q.query), ['茨城パスポート', '表示なし']);
  assert.equal(out.gscQueries[1].position28, null);
  assert.ok(issues.some((i) => i.kind === 'データ整理'));
  assert.ok(issues.some((i) => i.kind === 'データ不整合' && i.path === '/q/'));
});

test('Demand Radar（検索語）：前7日比で上昇を判定し、4〜20位は3位相当のCTR目安までを伸びしろ（推定）にする。Batchに入る', () => {
  const pages = pagesOf([{ path: '/stadium/', title: 'スタジアム駐車場' }]);
  const snapshot = site(1000, [], { gscQueries: [
    { query: '水戸信用金庫スタジアム 駐車場', page: '/stadium/', impressions7: 212, impressionsPrev7: 112, impressions28: 679, impressionsPrev28: 300, position28: 9.72, ctr28: 0.01 },
    { query: '少ない語', page: '/stadium/', impressions7: 5, impressionsPrev7: 1, impressions28: 10, position28: 12, ctr28: 0 },
  ] });
  const radar = demandRadar({ snapshot, pages, seasons: new Map(), engineConfig, config, today: TODAY });
  const q = radar.find((s) => s.kind === 'query' && s.query === '水戸信用金庫スタジアム 駐車場');
  assert.equal(q.impressions7VelocityPct, 89.3);
  assert.equal(q.rising, true);
  assert.equal(q.commercial, true);
  const top3 = engineConfig.ctrCurve['3'];
  assert.equal(q.upside, Math.round((679 / 28) * 30 * (top3 - 0.01)));
  assert.equal(radar.find((s) => s.query === '少ない語').rising, false); // 表示7日がしきい値未満
  // 検索語は PV Relay の代替候補・Pipeline には入らない
  const relay = pvRelay({ snapshot, pages, seasons: new Map(), engineConfig, config, radar, today: TODAY });
  assert.ok(relay.items.every((i) => i.replacements.every((r) => r.kind !== 'query')));
  assert.ok(demandPipeline({ pages, seasons: new Map(), radar, snapshot, today: TODAY }).every((i) => i.kind !== 'query'));
  const clusters = queryClusters({ snapshot, pages, seasons: new Map(), engineConfig, config, today: TODAY });
  const { batch } = relayBatch({ engineBatch: [], winners: [], relay, seasons: new Map(), clusters });
  assert.equal(batch[0].source, 'demand-radar:query-cluster');
  assert.equal(batch[0].path, '/stadium/');
});

test('Query Clusters：表記ゆれを「ページ × 検索意図」でまとめ、順位は表示で重み付け。打ち手を順位帯で分ける', () => {
  const pages = pagesOf([{ path: '/kasama/', title: '第20回かさま新栗まつり2026｜体験' }, { path: '/cable/', title: '筑波山ロープウェイの料金' }]);
  const snapshot = site(1000, [], { gscQueries: [
    { query: '笠間栗まつり2026', page: '/kasama/', impressions7: 100, impressionsPrev7: 50, impressions28: 200, impressionsPrev28: 0, position28: 6, ctr28: 0.02 },
    { query: '新栗まつり 2026', page: '/kasama/', impressions7: 50, impressionsPrev7: 50, impressions28: 100, impressionsPrev28: 0, position28: 9, ctr28: 0.05 },
    { query: '筑波山 ロープウェイ 料金', page: '/cable/', impressions7: 84, impressionsPrev7: 0, impressions28: 84, impressionsPrev28: 0, position28: 7.6, ctr28: 0 },
    { query: '筑波山ケーブルカー 料金', page: '/cable/', impressions7: 94, impressionsPrev7: 0, impressions28: 94, impressionsPrev28: 0, position28: 6.7, ctr28: 0.032 },
    { query: '茨城バスポート', page: '/cable/', impressions7: 5, impressionsPrev7: 0, impressions28: 5, impressionsPrev28: 0, position28: 6, ctr28: 0 },
  ] });
  const clusters = queryClusters({ snapshot, pages, seasons: new Map(), engineConfig, config, today: TODAY });
  const kasama = clusters.find((c) => c.page === '/kasama/');
  assert.equal(kasama.intent, '総合');
  assert.equal(kasama.queryCount, 2);
  assert.equal(kasama.impressions7, 150);
  assert.equal(kasama.position, 7); // (6×200 + 9×100) ÷ 300
  assert.equal(kasama.ctr, 0.03); // (0.02×200 + 0.05×100) ÷ 300
  const fare = clusters.find((c) => c.page === '/cable/' && c.intent === '料金');
  assert.equal(fare.queryCount, 2);
  assert.equal(fare.isNew, true);
  assert.equal(fare.play, 'improve');
  assert.equal(clusters.find((c) => c.topQueries.includes('茨城バスポート')).intent, '総合'); // 「バス」を含むだけではアクセスにしない
});

test('PV Relay：申請締切などの節目は終わりとして扱わず、止まった場合の上限だけを別に出す。参考値は上位2ページ除外', () => {
  const pages = pagesOf([{ path: '/passport/', title: 'パスポート' }, { path: '/other/', title: '他' }, { path: '/third/', title: '三' }]);
  const snapshot = site(1000, [
    { path: '/passport/', views7: 350, viewsPrev7: 10 },
    { path: '/other/', views7: 200, viewsPrev7: 200 },
    { path: '/third/', views7: 100, viewsPrev7: 100 },
  ]);
  const cfg = { ...config, milestones: { '/passport/': [
    { key: 'applicationDeadline', label: '追加申請の締切', date: '2026-10-16', effect: 'demand-may-drop' },
    { key: 'additionalDistributionStart', label: '追加交付の開始', date: '2026-11-10', effect: 'demand-may-rise' },
  ] } };
  const relay = pvRelay({ snapshot, pages, seasons: new Map(), engineConfig, config: cfg, radar: [], today: TODAY });
  const p = relay.items.find((i) => i.path === '/passport/');
  assert.equal(p.status, 'MILESTONE');
  assert.equal(p.endDate, null);
  assert.equal(p.nextMilestone.key, 'applicationDeadline');
  assert.equal(p.lostViewsForecast[7], null); // 終わりではないので forecast の合計に入れない
  assert.deepEqual(p.lostViewsIfDrops, { 7: 0, 14: 250, 30: 1050 }); // 1日50 × （期間 − 締切までの9日）
  assert.equal(relay.lostViewsForecast[30], 0);
  assert.ok(relay.alerts.some((a) => a.message.includes('追加申請の締切（2026-10-16）の後に需要が落ちる可能性') && a.message.includes('追加交付の開始 2026-11-10')));
  assert.equal(relay.baselineExcludingTop2.views7, 1000 - 350 - 200);
  assert.equal(relay.baselineExcludingTop2.monthly30, Math.round((450 / 7) * 30));
});

test('Annual Learning：検索表示のピークが開催の何日前かを、実測の日付2件以上から出す', () => {
  const records = [
    { path: '/a/', category: 'hanabi', eventStart: '2026-09-12', impressionsPeakDate: '2026-09-11', viewsPeakDate: '2026-09-12', measuredAt: '2026-10-07' },
    { path: '/b/', category: 'hanabi', eventStart: '2026-09-26', impressionsPeakDate: '2026-09-24', viewsPeakDate: '2026-09-25', measuredAt: '2026-10-07' },
    { path: '/c/', category: 'matsuri', eventStart: '2026-10-02', impressionsPeakDate: '2026-10-02', measuredAt: '2026-10-07' },
  ];
  const learned = aggregateLearning(records, config);
  const hanabi = learned.find((c) => c.category === 'hanabi');
  assert.equal(hanabi.impressionsPeakLeadAvg, 1.5);
  assert.equal(hanabi.viewsPeakLeadAvg, 0.5);
  assert.equal(hanabi.status, 'データ不足'); // 需要の立ち上がり（demandStartDate）は未実測
  assert.equal(learned.find((c) => c.category === 'matsuri').impressionsPeakLeadAvg, null); // 1件だけ
});

test('計測障害：障害日を含む集計は参考値に差し替え、公式値は変えない。ページ別の GA4 値は null（ゼロにしない）', async () => {
  const { adjustSnapshotForIncidents, incidentStatus } = await import('../src/lib/measurement-incidents.mjs');
  const incidents = JSON.parse(readFileSync('data/editorial/measurement-incidents.json', 'utf8'));
  const official = {
    windows: { ga4: {
      latestDay: { date: '2026-10-09', views: 17 },
      recent7: { start: '2026-10-03', end: '2026-10-09', views: 2800, sessions: 2500, engagedSessions: 1500 },
      previous7: { start: '2026-09-26', end: '2026-10-02', views: 2600, sessions: 2300, engagedSessions: 1600 },
      recent28: { start: '2026-09-12', end: '2026-10-09', views: 9000 },
      recent7VsPrevious7: { viewsPct: 7.69 },
    } },
    pageMetrics: [{ path: '/a/', views7: 5, viewsPrev7: 100, views28: 300, gsc: { impressions28: 500 } }],
  };
  // 日別データなし → 障害前の確定値を参考値に
  const noDaily = adjustSnapshotForIncidents(official, incidents);
  assert.equal(official.windows.ga4.recent7.views, 2800); // 公式値は変えない
  assert.equal(noDaily.snapshot.windows.ga4.recent7.views, 5287);
  assert.match(noDaily.snapshot.windows.ga4.recent7.basis, /障害前の確定値/);
  assert.equal(noDaily.snapshot.windows.ga4.previous7.views, 2600); // 障害日を含まない集計はそのまま
  assert.equal(noDaily.snapshot.windows.ga4.latestDay.incident, true);
  const row = noDaily.snapshot.pageMetrics[0];
  assert.equal(row.views7, null);
  assert.equal(row.views28, null);
  assert.equal(row.viewsPrev7, 100);
  assert.equal(row.gsc.impressions28, 500); // GSC は影響を受けていない
  assert.deepEqual(noDaily.corrections.map((c) => c.window), ['recent7', 'recent28']);

  // 日別データあり → 障害日を除いた1日平均 × 日数
  const daily = [];
  for (let d = 3; d <= 9; d += 1) daily.push({ date: `2026-10-0${d}`, views: d >= 8 ? 20 : 300, sessions: 250, engagedSessions: 150 });
  const withDaily = adjustSnapshotForIncidents({ ...official, windows: { ga4: { ...official.windows.ga4, daily } } }, incidents);
  assert.equal(withDaily.snapshot.windows.ga4.recent7.views, 300 * 7);
  assert.match(withDaily.snapshot.windows.ga4.recent7.basis, /障害日（2026-10-08・2026-10-09）を除いた5日/);

  // 障害日を含まない snapshot は何もしない
  const clean = adjustSnapshotForIncidents({ windows: { ga4: { recent7: { start: '2026-10-01', end: '2026-10-07', views: 5287 } } }, pageMetrics: [] }, incidents);
  assert.deepEqual(clean.contaminated, []);

  // 復旧の判定：イベント送信と日次PVを分け、日次PVは障害後の確定日だけで判定
  const pending = incidentStatus(official, incidents)[0];
  assert.equal(pending.dailyViews.status, '判定待ち');
  const after = incidentStatus({ windows: { ga4: { latestDay: { date: '2026-10-11', views: 300 } }, gsc: { latestDay: { date: '2026-10-08', clicks: 140 } } }, source: { freshness: { ga4LatestConfirmedDate: '2026-10-11', gscLatestConfirmedDate: '2026-10-08' } } }, incidents)[0];
  assert.equal(after.dailyViews.status, '回復');
  assert.equal(after.dailyViews.baseline, Math.round((369 + 314) / 2));
  assert.equal(after.gsc.status, '維持');
  assert.equal(after.startEstimated, true);
});

test('GA4 日別：Windsor の総数とチャネル別を日付で結合（Organic は Organic Search の views）。総数が無い日は行を作らない', async () => {
  const { joinWindsorDaily, mergeDaily, checkDaily, dailyCoverage } = await import('../src/lib/ga4-daily.mjs');
  const incidents = JSON.parse(readFileSync('data/editorial/measurement-incidents.json', 'utf8'));
  const rows = joinWindsorDaily({
    totals: [
      { date: '2026-10-07', screen_page_views: 314, sessions: 280, engaged_sessions: 203 },
      { date: '2026-10-08', screen_page_views: 38, sessions: 39, engaged_sessions: 0 },
    ],
    channels: [
      { date: '2026-10-07', session_default_channel_group: 'Organic Search', screen_page_views: 284 },
      { date: '2026-10-07', session_default_channel_group: 'Direct', screen_page_views: 17 },
      { date: '2026-10-10', session_default_channel_group: 'Organic Search', screen_page_views: 5 }, // 総数が無い日
    ],
  });
  assert.deepEqual(rows.map((r) => r.date), ['2026-10-07', '2026-10-08']);
  assert.equal(rows[0].organicViews, 284);
  assert.equal(rows[1].organicViews, null); // チャネル別が無い日は null（0にしない）

  // 確定日より後は入れない・障害日に印・35日に絞る
  const old = { date: '2026-08-01', views: 100, sessions: 90, engagedSessions: 50, organicViews: 80 };
  const merged = mergeDaily({ existing: [old], incoming: [...rows, { date: '2026-10-10', views: 1, sessions: 1, engagedSessions: 0 }], confirmedThrough: '2026-10-09', incidents });
  assert.deepEqual(merged.map((r) => r.date), ['2026-10-07', '2026-10-08']);
  assert.equal(merged[1].incident, '2026-10-ga4-csp');
  assert.equal(merged[1].views, 38); // 実測のまま
  assert.equal(dailyCoverage(merged, '2026-10-09').missingDates.length, 33);
  assert.deepEqual(checkDaily(merged, { confirmedThrough: '2026-10-09', incidents }), []);

  // 検査：ゼロ埋めの疑い・Organic が総数より大きい・障害日の印が無い・確定日より後
  const bad = [
    { date: '2026-10-05', views: 0, sessions: 0, engagedSessions: 0, organicViews: 0 },
    { date: '2026-10-06', views: 10, sessions: 10, engagedSessions: 5, organicViews: 20 },
    { date: '2026-10-08', views: 38, sessions: 39, engagedSessions: 0, organicViews: 3 },
    { date: '2026-10-12', views: 300, sessions: 280, engagedSessions: 200, organicViews: 250 },
  ];
  const errors = checkDaily(bad, { confirmedThrough: '2026-10-09', incidents }).join('\n');
  assert.match(errors, /ゼロ埋めの疑い/);
  assert.match(errors, /organicViews（20）が views（10）より大きい/);
  assert.match(errors, /2026-10-08 は計測障害/);
  assert.match(errors, /2026-10-12 は確定日/);
});

test('計測障害の補正：日別が障害日以外の日をすべて持っていないときは、日別から参考値を作らない', async () => {
  const { adjustSnapshotForIncidents } = await import('../src/lib/measurement-incidents.mjs');
  const incidents = JSON.parse(readFileSync('data/editorial/measurement-incidents.json', 'utf8'));
  const partial = { windows: { ga4: {
    recent7: { start: '2026-10-03', end: '2026-10-09', views: 2800 },
    daily: [
      { date: '2026-10-06', views: 369, sessions: 322, engagedSessions: 219 },
      { date: '2026-10-07', views: 314, sessions: 280, engagedSessions: 203 },
    ],
  } }, pageMetrics: [] };
  const r = adjustSnapshotForIncidents(partial, incidents);
  assert.equal(r.snapshot.windows.ga4.recent7.views, 5287); // 障害前の確定値（10/3〜10/5 が欠けているため）
  assert.match(r.snapshot.windows.ga4.recent7.basis, /障害前の確定値/);
});

test('計測障害の復旧判定：日別に障害後の行があれば、それで日次PVの回復を判定する', async () => {
  const { incidentStatus } = await import('../src/lib/measurement-incidents.mjs');
  const incidents = JSON.parse(readFileSync('data/editorial/measurement-incidents.json', 'utf8'));
  const s = { windows: { ga4: { latestDay: { date: '2026-10-07', views: 314 }, daily: [
    { date: '2026-10-09', views: 17, sessions: 16, engagedSessions: 1, incident: '2026-10-ga4-csp' },
    { date: '2026-10-11', views: 150, sessions: 140, engagedSessions: 90 },
  ] } }, source: { freshness: { ga4LatestConfirmedDate: '2026-10-07' } } };
  const st = incidentStatus(s, incidents)[0];
  assert.equal(st.dailyViews.date, '2026-10-11');
  assert.equal(st.dailyViews.status, '未回復'); // 150 は基準 342 の44%
});

test('GA4 日別：集計（windows）と同じ期間の日別の合計を照合する。全日がそろわない期間は照合しない', async () => {
  const { compareWindows, channelTotalsGap } = await import('../src/lib/ga4-daily.mjs');
  const daily = [
    { date: '2026-10-05', views: 532, sessions: 463, engagedSessions: 331 },
    { date: '2026-10-06', views: 369, sessions: 322, engagedSessions: 219 },
    { date: '2026-10-07', views: 314, sessions: 280, engagedSessions: 203 },
  ];
  const r = compareWindows({
    daily,
    recent3: { start: '2026-10-05', end: '2026-10-07', views: 1215 },
    latestDay: { date: '2026-10-07', views: 300 },
    recent7: { start: '2026-10-01', end: '2026-10-07', views: 5287 },
  });
  assert.deepEqual(r.compared.map((c) => [c.window, c.diff]), [['recent3', 0], ['latestDay', 14]]);
  assert.deepEqual(r.uncovered, ['recent7']);
  assert.equal(r.matched, false);

  const gaps = channelTotalsGap({
    totals: [{ date: '2026-10-07', screen_page_views: 314 }, { date: '2026-10-08', screen_page_views: 38 }],
    channels: [
      { date: '2026-10-07', session_default_channel_group: 'Organic Search', screen_page_views: 284 },
      { date: '2026-10-07', session_default_channel_group: 'Direct', screen_page_views: 30 },
      { date: '2026-10-08', session_default_channel_group: 'Organic Search', screen_page_views: 3 },
    ],
  });
  assert.deepEqual(gaps, [{ date: '2026-10-08', total: 38, channels: 3 }]);
});

test('計測障害の補正：日別がそろっていれば、障害日（10/8・10/9）を除いた日の平均で7日・28日の参考値を作る。公式値は変えない', async () => {
  const { adjustSnapshotForIncidents, incidentStatus } = await import('../src/lib/measurement-incidents.mjs');
  const incidents = JSON.parse(readFileSync('data/editorial/measurement-incidents.json', 'utf8'));
  const views = { '2026-10-03': 990, '2026-10-04': 682, '2026-10-05': 532, '2026-10-06': 369, '2026-10-07': 314, '2026-10-08': 38, '2026-10-09': 17 };
  const daily = Object.entries(views).map(([date, v]) => ({ date, views: v, sessions: v, engagedSessions: 0, ...(date >= '2026-10-08' ? { incident: '2026-10-ga4-csp' } : {}) }));
  const official = { windows: { ga4: {
    recent7: { start: '2026-10-03', end: '2026-10-09', views: 2942, sessions: 2942, engagedSessions: 0 },
    daily,
    dailyMeta: { confirmedThrough: '2026-10-09' },
  } }, source: { freshness: { ga4LatestConfirmedDate: '2026-10-07' } }, pageMetrics: [] };
  const r = adjustSnapshotForIncidents(official, incidents);
  assert.equal(r.snapshot.windows.ga4.recent7.views, Math.round(((990 + 682 + 532 + 369 + 314) / 5) * 7)); // 4042
  assert.match(r.snapshot.windows.ga4.recent7.basis, /障害日（2026-10-08・2026-10-09）を除いた5日/);
  assert.equal(r.corrections[0].official, 2942); // 公式値は別に残る
  assert.equal(official.windows.ga4.recent7.views, 2942); // 入力は変えない
  assert.equal(official.windows.ga4.daily[5].views, 38); // 障害日の実測は保持

  // 集計（windows）が 10/7 まででも、日別に入った障害日と最新の確定日を出す
  const st = incidentStatus(official, incidents)[0];
  assert.equal(st.inData, false);
  assert.equal(st.ga4DailyLatest, '2026-10-09');
  assert.deepEqual(st.dailyIncidentDates, ['2026-10-08', '2026-10-09']);
  assert.match(st.dailyViews.note, /最新 2026-10-09/);
});

test('参考予測：一時（終了・節目）・季節・基礎に分け、一時的な流入は対象月に残さない。公式の予測は変えない', async () => {
  const { splitForecast, recentLevels, backtestDaily } = await import('../src/lib/forecast-reference.mjs');
  const forecasts = [
    { path: '/news/passport/', label: 'パスポート', views7: 1580, forecast: 6771, activeDays: 30, seasonPhase: null },
    { path: '/news/shinguri/', label: '新栗', views7: 1350, forecast: 0, activeDays: 0, seasonPhase: 'ended' },
    { path: '/events/ankou/', label: 'あんこう祭', views7: 809, forecast: 2080, activeDays: 18, seasonPhase: 'index-window' },
    { path: '/events/guide/', label: 'ガイド', views7: 100, forecast: 429, activeDays: 30, seasonPhase: null },
    { path: '/events/no-data/', label: '未取得', views7: null, forecast: null, activeDays: 30, seasonPhase: null },
  ];
  const relayItems = [{ path: '/news/passport/', status: 'MILESTONE', nextMilestone: { label: '締切', date: '2026-10-16', effect: 'demand-may-drop' } }];
  const s = splitForecast({ siteViews7: 5287, forecasts, relayItems, month: '2026-11' });
  assert.equal(s.temporary.views7, 1580 + 1350);
  assert.equal(s.temporary.milestoneCurrentPace, 6771); // 節目のあるページの今のペースは別に出すが、予測には入れない
  assert.equal(s.seasonal.forecast, 2080);
  assert.equal(s.base.views7, 5287 - 2930 - 809); // ページ別に無い分（未取得を含む）は基礎に入る
  assert.equal(s.base.forecast, Math.round(((5287 - 2930 - 809) / 7) * 30));
  assert.equal(s.reference, s.base.forecast + 2080);
  assert.equal(s.temporary.pages[0].reason, '2026-10-16 締切の後は不明');

  // ページ別が計測障害で null のときは分けない
  assert.ok(splitForecast({ siteViews7: 4042, forecasts: forecasts.map((f) => ({ ...f, views7: null })), relayItems, month: '2026-11' }).unavailable);

  // ① 障害日を除いた直近の実績（ゼロで埋めない・使った日数を出す）
  const daily = [];
  for (let d = 1; d <= 30; d += 1) daily.push({ date: `2026-09-${String(d).padStart(2, '0')}`, views: 100 });
  daily.push({ date: '2026-10-01', views: 400 }, { date: '2026-10-02', views: 10, incident: 'x' }, { date: '2026-10-03', views: 200 });
  const r = recentLevels(daily);
  assert.equal(r.latest.date, '2026-10-03');
  assert.equal(r.last3.days, 2); // 10/2 は障害日なので除く
  assert.equal(r.last3.dailyAverage, 300);

  // 答え合わせ：一定のペースなら誤差0。障害日は実績にも履歴にも使わない
  const flat = daily.slice(0, 30);
  const bt = backtestDaily(flat, { horizon: 7 });
  assert.ok(bt.origins > 0);
  for (const m of bt.methods) assert.equal(m.mape, 0);
});
