import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDrafts, md, selectPostCandidates, timingLine, xWeight, X_LIMIT } from '../src/lib/social-posts.mjs';

const ev = (o) => ({ type: 'event', path: '/events/a/', title: 'A祭り2026｜11月23日開催', description: '説明。', municipalities: ['tokai'], noindex: false, frontmatter: {}, ...o });

test('md formats Japanese calendar dates with weekday (no timezone shift)', () => {
  assert.equal(md('2026-11-23'), '11/23（月）');
});

test('timingLine uses absolute dates and skips ended or tentative dates', () => {
  assert.equal(timingLine(ev({ startDate: '2026-11-23', endDate: '2026-11-23' }), '2026-11-22'), '11/23（月）開催');
  assert.equal(timingLine(ev({ startDate: '2026-11-14', endDate: '2027-01-11' }), '2026-11-22'), '開催中・1/11（月）まで');
  assert.equal(timingLine(ev({ startDate: '2026-11-01', endDate: '2026-11-03' }), '2026-11-22'), null);
  assert.equal(timingLine(ev({ startDate: '2026-12-12', dateStatus: 'tentative' }), '2026-11-22'), null);
});

test('X draft stays within the weighted limit', () => {
  const long = ev({ startDate: '2026-11-23', title: 'あ'.repeat(70) + '｜' + 'い'.repeat(60) });
  const d = buildDrafts(long, { today: '2026-11-22', muniName: () => '東海村' });
  assert.ok(d.xWeight <= X_LIMIT, String(d.xWeight));
  assert.ok(d.x.includes('https://ibatoco.jp/events/a/'));
  assert.ok(d.instagram.includes('プロフィールのリンク'));
  assert.equal(d.image, 'https://ibatoco.jp/og/events/a.png');
  assert.equal(xWeight('あa https://example.com/x'), 3 + 1 + 23);
});

test('candidates: upcoming within 14 days first, then new articles; excludes noindex', () => {
  const pages = [
    ev({ path: '/events/soon/', startDate: '2026-11-23' }),
    ev({ path: '/events/far/', startDate: '2026-12-31' }),
    ev({ path: '/events/hidden/', startDate: '2026-11-23', noindex: true }),
    { type: 'news', path: '/news/n/', title: 'N', description: 'd', municipalities: [], pubDate: '2026-11-20', noindex: false, frontmatter: {} },
  ];
  const c = selectPostCandidates(pages, { today: '2026-11-22' });
  assert.deepEqual(c.map((x) => x.page.path), ['/events/soon/', '/news/n/']);
  // 開催中で終わりが近いものは、長期開催より先
  const c2 = selectPostCandidates([ev({ path: '/events/long/', startDate: '2026-11-01', endDate: '2027-01-31' }), ev({ path: '/events/ending/', startDate: '2026-11-01', endDate: '2026-11-23' })], { today: '2026-11-22' });
  assert.deepEqual(c2.map((x) => [x.page.path, x.reason]), [['/events/ending/', 'まもなく終了'], ['/events/long/', '開催中']]);
});

test('breakJa keeps katakana words, dates and numbers intact', async () => {
  const { breakJa } = await import('../src/lib/instagram-card.mjs');
  assert.equal(breakJa('茨城のイルミネーション2026-2027', 10), '茨城の\nイルミネーション\n2026-2027');
  assert.equal(breakJa('筑西市プレミアム商品券第2弾は10月26日発売', 11), '筑西市プレミアム\n商品券第2弾は\n10月26日発売');
});
