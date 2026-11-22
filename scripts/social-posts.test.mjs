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
  assert.ok(d.x.split('\n').some((line) => line === 'https://ibatoco.jp/events/a/'), 'URL が独立した1行で入る');
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

test('nextPostSlot: short events get 7-days-before, day-before and same-day slots', async () => {
  const { nextPostSlot } = await import('../src/lib/social-posts.mjs');
  const e = ev({ startDate: '2026-12-12', endDate: '2026-12-12' });
  assert.deepEqual(nextPostSlot(e, '2026-11-23'), { slot: '告知', date: '2026-12-05', time: '12:00' });
  assert.equal(nextPostSlot(e, '2026-12-06').slot, '前日');
  assert.equal(nextPostSlot(e, '2026-12-12').slot, '当日');
});

test('nextPostSlot: long events are posted individually only two days before the end', async () => {
  const { nextPostSlot } = await import('../src/lib/social-posts.mjs');
  const e = ev({ startDate: '2026-11-14', endDate: '2027-01-24' });
  assert.deepEqual(nextPostSlot(e, '2026-11-23'), { slot: 'まもなく終了', date: '2027-01-22', time: '12:00' });
});

test('schedulePosts caps today at 3 and ranks same-day first', async () => {
  const { schedulePosts } = await import('../src/lib/social-posts.mjs');
  const cs = ['a', 'b', 'c', 'd'].map((x, i) => ({ page: ev({ path: `/events/${x}/`, startDate: i === 0 ? '2026-11-23' : '2026-11-24', endDate: i === 0 ? '2026-11-23' : '2026-11-24' }), reason: '' }));
  const s = schedulePosts(cs, '2026-11-23');
  assert.equal(s.today.length, 3);
  assert.equal(s.today[0].page.path, '/events/a/');
  assert.equal(s.today[0].plan.slot, '当日');
  assert.equal(s.extra.length, 1);
});

test('weekendRoundup only on Thursday/Friday with 2+ weekend events', async () => {
  const { weekendRoundup } = await import('../src/lib/social-posts.mjs');
  const pages = [ev({ path: '/events/x/', title: 'X祭り｜詳細', startDate: '2026-11-28', endDate: '2026-11-29' }), ev({ path: '/events/y/', title: 'Yフェス', startDate: '2026-11-20', endDate: '2026-12-31' })];
  assert.equal(weekendRoundup(pages, '2026-11-23'), null);
  const r = weekendRoundup(pages, '2026-11-26');
  assert.equal(r.count, 2);
  assert.ok(r.threads.startsWith('今週末（11/28（土）・11/29（日））の茨城'));
  // 週末だけの短いイベントが長期開催より先
  assert.ok(r.threads.indexOf('X祭り') < r.threads.indexOf('Yフェス'));
});
