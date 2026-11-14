import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAreaCoverage, areaCoverageMarkdown, THIN_COVERAGE_MAX } from '../src/lib/area-coverage.mjs';
import { loadAreas, loadEntries } from './area-coverage.mjs';

const areas = [
  { slug: 'tone', name: '利根町', region: 'kennan' },
  { slug: 'mito', name: '水戸市', region: 'keno' },
];
const e = (path, municipalities, extra = {}) => ({ path, title: path, collection: 'events', pubDate: '2026-11-01', municipalities, published: true, ...extra });
const metric = (path, clicks28, clicks7, clicksPrev7, views28) => ({ path, views28, gsc: { clicks28, impressions28: clicks28 * 20, clicks7, clicksPrev7 } });

test('公開中だけ数え、複数市町村の記事はそれぞれに数え、少ない順に並べる', () => {
  const r = buildAreaCoverage(areas, [
    e('/events/a/', ['mito']), e('/events/b/', ['mito', 'tone']), e('/events/c/', ['mito']),
    e('/events/d/', ['tone'], { published: false }),
  ], null);
  assert.deepEqual(r.rows.map((x) => [x.slug, x.articles]), [['tone', 1], ['mito', 3]]);
  assert.equal(r.totals.publishedEntries, 3);
  assert.equal(r.periodRecorded, false);
});

test('ページ別の行が無い記事は 0 にせず、データありに入れない', () => {
  const snapshot = { pageMetrics: [metric('/events/a/', 10, 4, 2, 100)], source: { pageLevel: { periods: { recent28: { start: '2026-10-15', end: '2026-11-11' }, recent7: { start: '2026-11-05', end: '2026-11-11' }, previous7: { start: '2026-10-29', end: '2026-11-04' } } } } };
  const r = buildAreaCoverage(areas, [e('/events/a/', ['mito']), e('/events/b/', ['mito']), e('/events/c/', ['tone'])], snapshot);
  const mito = r.rows.find((x) => x.slug === 'mito');
  const tone = r.rows.find((x) => x.slug === 'tone');
  assert.equal(mito.pagesWithData, 1);
  assert.equal(mito.clicks28, 10);
  assert.equal(mito.topPage.path, '/events/a/');
  assert.equal(tone.clicks28, null);
  assert.equal(r.periodRecorded, true);
  const md = areaCoverageMarkdown(r, { today: '2026-11-14' });
  assert.match(md, /直近28日 2026-10-15〜2026-11-11/);
  assert.match(md, /\+100%/);
});

test('期間が未記録のときは旧データだと明示する', () => {
  const md = areaCoverageMarkdown(buildAreaCoverage(areas, [], { pageMetrics: [] }), { today: '2026-11-14' });
  assert.match(md, /集計期間が記録されていない旧データ/);
  assert.match(md, new RegExp(`${THIN_COVERAGE_MAX}本以下`));
});

test('実データ：44市町村を読み、記事の URL がルーティングと同じ形になる', () => {
  const real = loadAreas();
  assert.equal(real.length, 44);
  const entries = loadEntries(real);
  assert.ok(entries.length > 100);
  for (const x of entries) assert.match(x.path, /^\/[a-z-]+\/[a-z0-9-]+\/$/);
  assert.ok(entries.some((x) => x.path === '/events/yanagita-kunio-kinen-koen-tone-guide/' && x.municipalities.includes('tone')));
});
