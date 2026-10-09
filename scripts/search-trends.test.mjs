/**
 * Search Trends（Google Trends・proxy）の単体テスト。npm run verify・npm run test:growth で実行する。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrendsData, parseTrendsCsv, seasonalityOf, trendsSummary } from '../src/lib/search-trends.mjs';
import { addDays } from '../src/lib/growth-engine.mjs';

/** 週単位の系列を作る（start から weeks 週、値は fn(i)） */
const weekly = (start, weeks, fn) => Array.from({ length: weeks }, (_, i) => ({ date: addDays(start, i * 7), value: fn(i) }));

test('CSV：「1 未満」は数値にしない（belowOne）。見出しの「: (日本)」を外す', () => {
  const csv = 'カテゴリ: すべてのカテゴリ\n\n週,土浦花火: (日本),袋田の滝 紅葉: (日本)\n2026-09-27,9,1 未満\n2026-10-04,7,1\n';
  const { granularity, series } = parseTrendsCsv(csv);
  assert.equal(granularity, 'week');
  assert.deepEqual(series.map((s) => s.keyword), ['土浦花火', '袋田の滝 紅葉']);
  assert.deepEqual(series[1].points[0], { date: '2026-09-27', value: null, belowOne: true });
  assert.equal(series[1].points[1].value, 1);
});

test('季節性：山・立ち上がり（山の10%以上が山まで連続）・山の週の割合。山が5未満の年はデータ不足', () => {
  // 毎年 52週ごとに山。山の4週前から10、山は100、それ以外は2
  const points = weekly('2022-01-02', 52 * 3, (i) => {
    const w = i % 52;
    return w === 43 ? 100 : w >= 39 && w < 43 ? 10 : 2;
  });
  const seasons = seasonalityOf(points);
  const ok = seasons.filter((s) => s.status === 'ok');
  assert.ok(ok.length >= 2);
  assert.equal(ok[0].peakValue, 100);
  assert.equal(ok[0].riseToPeakDays, 28); // 4週前から
  assert.equal(ok[0].peakShare, Number((100 / (100 + 4 * 10 + 8 * 2 + 2 * 2)).toFixed(2)));
  const small = seasonalityOf(weekly('2022-01-02', 104, (i) => (i % 52 === 40 ? 3 : 0)));
  assert.ok(small.every((s) => s.status === 'データ不足'));
});

test('比較をまたぐ尺度：各比較の基準語の最大を100にする。基準語が無い比較はエラー', () => {
  const g1 = { granularity: 'week', series: [
    { keyword: '土浦花火', points: weekly('2025-01-05', 3, (i) => [10, 100, 5][i]) },
    { keyword: 'A', points: weekly('2025-01-05', 3, (i) => [1, 8, 0][i]) },
  ] };
  const g2 = { granularity: 'week', series: [
    { keyword: '土浦花火', points: weekly('2025-01-05', 3, (i) => [9, 93, 5][i]) }, // 別の比較では基準語の最大が93
    { keyword: 'B', points: weekly('2025-01-05', 3, (i) => [100, 50, 40][i]) },
  ] };
  const data = buildTrendsData({ groups: [g1, g2], anchor: '土浦花火', keywords: { B: { theme: 'sports', seasonal: false } }, fetchedAt: '2026-10-09' });
  assert.equal(data.basis, 'proxy');
  assert.deepEqual(data.series.map((s) => s.keyword), ['土浦花火', 'A', 'B']); // 基準語は最初の比較のものだけ
  assert.equal(data.series.find((s) => s.keyword === 'A').peakRelativeToAnchor, 8);
  assert.equal(data.series.find((s) => s.keyword === 'B').peakRelativeToAnchor, Number((100 / 93 * 100).toFixed(1)));
  assert.equal(data.seasonality.some((s) => s.keyword === 'B'), false); // 通年型は季節性を出さない
  assert.throws(() => buildTrendsData({ groups: [{ granularity: 'week', series: [{ keyword: 'X', points: [] }] }], anchor: '土浦花火', fetchedAt: '2026-10-09' }));
});

test('要約：短い催しは今年の開催日を含む週を山と見込み、立ち上がりは例年の日数を引く。1か月続く催しは開催日を使わない', () => {
  const points = weekly('2022-01-02', 52 * 4 + 40, (i) => {
    const w = i % 52;
    return w === 43 ? 100 : w >= 39 && w < 43 ? 12 : 1;
  });
  const data = { updatedAt: '2026-10-09', series: [
    { keyword: '花火', page: '/hanabi/', seasonal: true, peakRelativeToAnchor: 100, points },
    { keyword: '祭り', page: '/matsuri/', seasonal: true, peakRelativeToAnchor: 2, points },
  ], seasonality: [...seasonalityOf(points).map((s) => ({ keyword: '花火', ...s })), ...seasonalityOf(points).map((s) => ({ keyword: '祭り', ...s }))] };
  const pages = new Map([
    ['/hanabi/', { startDate: '2026-11-07', endDate: null }],
    ['/matsuri/', { startDate: '2026-10-24', endDate: '2026-11-23' }],
  ]);
  const [hanabi, matsuri] = trendsSummary(data, { pages, today: '2026-10-09' });
  assert.equal(hanabi.expectedPeakWeek, '2026-11-01'); // 11月7日（土）を含む週（日曜始まり）
  assert.equal(hanabi.typicalRiseToPeakDays, 28);
  assert.equal(hanabi.expectedRise, '2026-10-04');
  assert.match(hanabi.expectedPeakBasis, /開催日 2026-11-07/);
  assert.match(matsuri.expectedPeakBasis, /例年の山の月日/);
});
