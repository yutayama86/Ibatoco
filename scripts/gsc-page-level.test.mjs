import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pageLevelWindows, toPath, buildGscQueries, buildPageMetrics, buildTopPages, ga4ViewsByWindow, checkPageLevel,
} from '../src/lib/gsc-page-level.mjs';
import { pageLevelFreshness } from '../src/lib/analytics-freshness.mjs';

const U = (p) => `https://ibatoco.jp${p}`;
const row = (keys, clicks, impressions, position) => ({ keys, clicks, impressions, position });
const win = (rows, truncated = false) => ({ rows, truncated });

test('4つの窓は確定日で終わり、重ならない（日本の暦日）', () => {
  const w = pageLevelWindows('2026-11-10');
  assert.deepEqual(w.recent28, { start: '2026-10-14', end: '2026-11-10' });
  assert.deepEqual(w.previous28, { start: '2026-09-16', end: '2026-10-13' });
  assert.deepEqual(w.recent7, { start: '2026-11-04', end: '2026-11-10' });
  assert.deepEqual(w.previous7, { start: '2026-10-28', end: '2026-11-03' });
  // 月をまたぐ・年をまたぐ
  assert.equal(pageLevelWindows('2027-01-02').recent7.start, '2026-12-27');
});

test('URL はサイト内パスにし、別ホストは捨てる', () => {
  assert.equal(toPath('https://ibatoco.jp/events/a/'), '/events/a/');
  assert.equal(toPath('https://www.ibatoco.jp/x/'), '/x/');
  assert.equal(toPath('https://ibatoco.jp/area/%E6%B0%B4%E6%88%B8/'), '/area/水戸/');
  assert.equal(toPath('https://example.com/a/'), null);
  assert.equal(toPath('not a url'), null);
});

test('検索語×ページ：既存の形で作り、行が無い窓は上限未達なら0・達していれば null', () => {
  const rows = buildGscQueries({
    recent28: win([row([U('/a/'), 'あんこう祭'], 10, 200, 3.2), row([U('/b/'), 'つくば 紅葉'], 1, 50, 8)]),
    previous28: win([]),
    recent7: win([row([U('/a/'), 'あんこう祭'], 6, 120, 2.9)]),
    previous7: win([], true),
  });
  assert.equal(rows.length, 2);
  const a = rows[0];
  assert.equal(a.page, '/a/');
  assert.equal(a.query, 'あんこう祭');
  assert.equal(a.impressions28, 200);
  assert.equal(a.ctr28, 0.05);
  assert.equal(a.impressions7, 120);
  assert.equal(a.impressionsPrev28, 0); // 上限未達・行なし → 0
  assert.equal(a.positionPrev28, null); // 表示0の順位は無い
  assert.equal(a.impressionsPrev7, null); // 上限に達した窓 → 不明
  const b = rows[1];
  assert.equal(b.impressions7, 0);
  assert.equal(b.ctr7, null);
});

test('検索語×ページ：表示の多い順に keep 件。別ホスト・空の検索語は入れない', () => {
  const rows = buildGscQueries({
    recent28: win([
      row([U('/a/'), 'q1'], 0, 5, 9), row([U('/a/'), 'q2'], 0, 50, 9), row([U('/a/'), 'q3'], 0, 20, 9),
      row(['https://example.com/a/', 'q4'], 0, 999, 1), row([U('/a/'), ' '], 0, 999, 1),
    ]),
    previous28: win([]), recent7: win([]), previous7: win([]),
  }, { keep: 2 });
  assert.deepEqual(rows.map((r) => r.query), ['q2', 'q3']);
});

test('同じパスに正規化された行は合算し、順位は表示回数で重み付け', () => {
  const rows = buildGscQueries({
    recent28: win([row([U('/a/'), 'q'], 1, 100, 2), row(['https://www.ibatoco.jp/a/', 'q'], 1, 300, 6)]),
    previous28: win([]), recent7: win([]), previous7: win([]),
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].impressions28, 400);
  assert.equal(rows[0].clicks28, 2);
  assert.equal(rows[0].position28, 5);
});

test('不正な値は例外（0 で埋めて続けない）', () => {
  assert.throws(() => buildGscQueries({ recent28: win([row([U('/a/'), 'q'], -1, 1, 1)]), previous28: win([]), recent7: win([]), previous7: win([]) }));
  assert.throws(() => ga4ViewsByWindow([{ dimensionValues: [{ value: '/a/' }, { value: 'date_range_0' }], metricValues: [{ value: 'NaN' }] }]));
});

test('GA4 のページ別 Views を窓ごとに分ける', () => {
  const v = ga4ViewsByWindow([
    { dimensionValues: [{ value: '/a/' }, { value: 'date_range_0' }], metricValues: [{ value: '30' }] },
    { dimensionValues: [{ value: '/a/' }, { value: 'date_range_1' }], metricValues: [{ value: '10' }] },
    { dimensionValues: [{ value: '/a/' }, { value: 'date_range_2' }], metricValues: [{ value: '90' }] },
    { dimensionValues: [{ value: '/c/' }, { value: 'date_range_2' }], metricValues: [{ value: '5' }] },
    { dimensionValues: [{ value: '(not set)' }, { value: 'date_range_2' }], metricValues: [{ value: '7' }] },
  ]);
  assert.equal(v.recent7.get('/a/'), 30);
  assert.equal(v.previous7.get('/a/'), 10);
  assert.equal(v.recent28.get('/a/'), 90);
  assert.equal(v.recent28.has('(not set)'), false);
  const top = buildTopPages(v, 1);
  assert.deepEqual(top.recent28, [{ path: '/a/', views: 90 }]);
});

test('ページ別：GSC と GA4 を合わせ、片方に無い値の扱いを守る', () => {
  const views = { recent7: new Map([['/a/', 30]]), previous7: new Map(), recent28: new Map([['/a/', 90], ['/c/', 5]]) };
  const pages = buildPageMetrics({
    recent28: win([row([U('/a/')], 10, 500, 4), row([U('/b/')], 2, 100, 9)]),
    previous28: win([]), recent7: win([row([U('/a/')], 5, 200, 3.5)]), previous7: win([]),
  }, views);
  const by = Object.fromEntries(pages.map((p) => [p.path, p]));
  assert.deepEqual(Object.keys(by).sort(), ['/a/', '/b/', '/c/']);
  assert.equal(by['/a/'].views28, 90);
  assert.equal(by['/a/'].viewsPrev7, 0);
  assert.equal(by['/a/'].gsc.impressions28, 500);
  assert.equal(by['/a/'].gsc.position7, 3.5);
  assert.equal(by['/b/'].views28, 0);
  assert.equal(by['/c/'].gsc.impressions28, 0);
  assert.equal(pages[0].path, '/a/');
  // GA4 が取れなかったときは views を null（0 にしない）
  const noGa = buildPageMetrics({ recent28: win([row([U('/b/')], 2, 100, 9)]), previous28: win([]), recent7: win([]), previous7: win([]) }, null);
  assert.equal(noGa[0].views28, null);
});

const okLevel = (through) => ({
  periods: pageLevelWindows(through),
  gscQueries: [{ page: '/a/', query: 'q', impressions28: 10, clicks28: 2 }],
  pageMetrics: [{ path: '/a/' }],
});

test('検査：期間のずれ・空の結果・サイト全体を超えるクリックを止める', () => {
  const through = '2026-11-10';
  assert.deepEqual(checkPageLevel(null, { confirmedThrough: through }), []);
  assert.deepEqual(checkPageLevel(okLevel(through), { confirmedThrough: through }), []);
  assert.ok(checkPageLevel(okLevel('2026-11-09'), { confirmedThrough: through }).some((e) => e.includes('期間')));
  assert.ok(checkPageLevel({ ...okLevel(through), gscQueries: [] }, { confirmedThrough: through }).some((e) => e.includes('空')));
  const site = [];
  for (let i = 0; i < 28; i++) site.push({ date: new Date(Date.UTC(2026, 9, 14 + i)).toISOString().slice(0, 10), clicks: 1 });
  const big = { ...okLevel(through), gscQueries: [{ page: '/a/', query: 'q', impressions28: 1000, clicks28: 100 }] };
  assert.ok(checkPageLevel(big, { confirmedThrough: through, gscDaily: site }).some((e) => e.includes('超える')));
  assert.deepEqual(checkPageLevel(okLevel(through), { confirmedThrough: through, gscDaily: site }), []);
});

test('ページ別データの鮮度：期間なし・遅れ・最新を分ける', () => {
  assert.equal(pageLevelFreshness({}, '2026-11-13').status, 'missing');
  const snap = (end) => ({ source: { pageLevel: { periods: { recent28: { start: 'x', end } } } } });
  assert.equal(pageLevelFreshness(snap('2026-11-10'), '2026-11-13').status, 'fresh');
  const stale = pageLevelFreshness(snap('2026-11-05'), '2026-11-13');
  assert.equal(stale.status, 'stale');
  assert.equal(stale.delayDays, 5);
});

test('確定日の調整：GSC が1〜2日遅れたら最新の確定日まで下げ、3日以上なら止める', async () => {
  const { alignConfirmedThrough } = await import('../src/lib/ga4-daily.mjs');
  const dates = ['2026-11-08', '2026-11-09', '2026-11-10'];
  assert.equal(alignConfirmedThrough('2026-11-10', dates), '2026-11-10');
  assert.equal(alignConfirmedThrough('2026-11-11', dates), '2026-11-10'); // 2026-11-14 の実例
  assert.equal(alignConfirmedThrough('2026-11-12', dates), '2026-11-10');
  assert.throws(() => alignConfirmedThrough('2026-11-13', dates), /3 日遅れ/);
  assert.throws(() => alignConfirmedThrough('2026-11-10', []), /日付が無い/);
  // 予定より後の日付は使わない
  assert.equal(alignConfirmedThrough('2026-11-09', dates), '2026-11-09');
  // 月をまたいでも暦日で数える
  assert.equal(alignConfirmedThrough('2026-12-01', ['2026-11-29', '2026-11-30']), '2026-11-30');
});
