import test from 'node:test';
import assert from 'node:assert/strict';
import { selectConfirmedPopular } from '../src/lib/popular-ranking.mjs';

const good = () => ({
  asOf: '2026-11-12',
  source: { pageLevel: {
    periods: { recent7: { start: '2026-11-06', end: '2026-11-12' } },
    truncated: { ga4Pages: false }, ga4TopPagesUpdated: true,
  } },
  windows: { ga4: { recent7: { start: '2026-11-06', end: '2026-11-12' } } },
  ga4TopPages: { recent7: [
    { path: '/events/ended-event/', views: 594 },
    { path: '/events/live-event/', views: 256 },
    { path: '/events/other-live/', views: 200 },
    { path: '/events/noindex/', views: 99 },
    { path: '/events/other-live/', views: 88 },
    { path: '/', views: 65 },
  ] },
});
const eligible = new Set(['/events/live-event/', '/events/other-live/']);

test('official 7d ranking: exclude ended, noindex, home and duplicates without altering GA4 counts', () => {
  const result = selectConfirmedPopular(good(), eligible, '2026-11-15');
  assert.deepEqual(result, { start: '2026-11-06', end: '2026-11-12', pages: [
    { path: '/events/live-event/', views: 256 },
    { path: '/events/other-live/', views: 200 },
  ] });
});

test('never report stale or future GA4 ranking', () => {
  assert.equal(selectConfirmedPopular(good(), eligible, '2026-11-27').pages.length, 0);
  assert.equal(selectConfirmedPopular(good(), eligible, '2026-11-11').pages.length, 0);
  assert.equal(selectConfirmedPopular(good(), eligible, '2026-11-26').pages.length, 2);
});

test('reject misaligned asOf, partial report, unavailable page-level and missing data', () => {
  const cases = [
    (d) => { d.asOf = '2026-11-13'; },
    (d) => { d.source.pageLevel.periods.recent7.end = '2026-11-11'; },
    (d) => { d.windows.ga4.recent7.start = '2026-11-07'; },
    (d) => { d.source.pageLevel.ga4TopPagesUpdated = false; },
    (d) => { d.source.pageLevel.truncated.ga4Pages = true; },
    (d) => { d.ga4TopPages.recent7 = null; },
  ];
  for (const modify of cases) {
    const d = good(); modify(d);
    assert.equal(selectConfirmedPopular(d, eligible, '2026-11-15').pages.length, 0);
  }
});

test('reject invalid view numbers and never synthesize zero for absent GA4 observations', () => {
  const d = good();
  d.ga4TopPages.recent7[1].views = null;
  d.ga4TopPages.recent7[2].views = -5;
  assert.deepEqual(selectConfirmedPopular(d, eligible, '2026-11-15').pages, []);
});

test('top N applies after public/linkable filtering, and empty set never exposes results', () => {
  assert.deepEqual(selectConfirmedPopular(good(), eligible, '2026-11-15', 1).pages, [
    { path: '/events/live-event/', views: 256 },
  ]);
  assert.deepEqual(selectConfirmedPopular(good(), new Set(), '2026-11-15').pages, []);
});

test('ended one-off seasonal guides without eventInfo never re-enter current recommendations', () => {
  const d = good();
  d.ga4TopPages.recent7.unshift(
    { path: '/events/tsuchiura-hanabi-2026-kaeri/', views: 283 },
    { path: '/events/ibaraki-kenmin-no-hi-2026/', views: 167 },
  );
  const paths = new Set([...eligible, '/events/tsuchiura-hanabi-2026-kaeri/', '/events/ibaraki-kenmin-no-hi-2026/']);
  const now = selectConfirmedPopular(d, paths, '2026-11-15').pages;
  assert.deepEqual(now.map((row) => row.path), ['/events/live-event/', '/events/other-live/']);
  // On the event date itself, calendar-only data cannot assert it has closed yet.
  const early = selectConfirmedPopular(d, paths, '2026-11-13').pages;
  assert.ok(early.some((row) => row.path === '/events/ibaraki-kenmin-no-hi-2026/'));
});
