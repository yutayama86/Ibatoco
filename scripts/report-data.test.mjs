/**
 * 収益・送客レポートの共通の読み取り（scripts/lib/report-data.mjs）のテスト（node --test）。npm run verify で実行する。
 *
 * 2026-10-27 まで monetization-audit と partner-opportunity は予約リンクを1本も数えられず、
 * 「収益化ギャップなし」「新規提携の候補なし」と出していた。実際の記事で 0 本に戻らないことも確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  bookingItems, dataFreshness, eventLastDate, formatCount, isEventEnded, isPublished, lookup, orZero, readFrontmatter, viewsByPath,
} from './lib/report-data.mjs';

// 実際のイベント記事と同じ字下げ（items は4スペースの「- 」、各項目は6スペース）
const SAMPLE = `---
title: "大洗あんこう祭2026"
draft: false
reviewed: true
eventInfo:
  name: "大洗あんこう祭"
  startDate: 2026-11-14
  endDate: 2026-11-15
booking:
  heading: "大洗に泊まる"
  items:
    - label: "大洗観光協会の宿泊施設一覧"
      provider: "official"
      url: "https://www.oarai-info.jp/spot_cat/cat01/"
      kind: "official"
    - label: "大洗・ひたちなかの宿を探す（楽天トラベル）"
      provider: "rakuten-travel"
      url: "https://travel.rakuten.co.jp/yado/ibaraki/oarai.html"
      kind: "ota"
    - label: "provider の無い行は数えない"
      url: "https://example.com/"
businessIntent:
  accommodation: true
  parking: false
---

本文
`;

test('frontmatter を YAML として読み、予約リンクを数える（字下げに依存しない）', () => {
  const data = readFrontmatter(SAMPLE);
  const items = bookingItems(data);
  assert.equal(items.length, 2);
  assert.deepEqual(items[1], {
    provider: 'rakuten-travel',
    url: 'https://travel.rakuten.co.jp/yado/ibaraki/oarai.html',
    label: '大洗・ひたちなかの宿を探す（楽天トラベル）',
    kind: 'ota',
  });
  assert.equal(data.businessIntent.accommodation, true);
});

test('frontmatter が無い・壊れているときは null、予約リンクは空', () => {
  assert.equal(readFrontmatter('本文だけ'), null);
  assert.equal(readFrontmatter('---\ntitle: [\n---\n'), null);
  assert.deepEqual(bookingItems(null), []);
  assert.deepEqual(bookingItems({ booking: { items: 'x' } }), []);
});

test('公開中の判定：draft: false・reviewed: true・noindex でない', () => {
  assert.equal(isPublished({ draft: false, reviewed: true }), true);
  assert.equal(isPublished({ draft: false, reviewed: true, noindex: true }), false);
  assert.equal(isPublished({ draft: true, reviewed: true }), false);
  assert.equal(isPublished({ draft: false, reviewed: false }), false);
  assert.equal(isPublished(null), false);
});

test('イベントの終了判定は eventInfo の最終日（無ければ開始日）と今日（日本時間）で行う', () => {
  const data = readFrontmatter(SAMPLE);
  assert.equal(eventLastDate(data), '2026-11-15');
  assert.equal(isEventEnded(data, '2026-11-15'), false);
  assert.equal(isEventEnded(data, '2026-11-16'), true);
  assert.equal(eventLastDate({ eventInfo: { startDate: '2026-10-03' } }), '2026-10-03');
  assert.equal(eventLastDate({ eventInfo: { startDate: new Date('2026-10-03T00:00:00Z') } }), '2026-10-03');
  // トップレベルの endDate は見ない（スキーマでは eventInfo の中にある）
  assert.equal(eventLastDate({ endDate: '2026-01-01' }), null);
  assert.equal(isEventEnded({}, '2026-10-27'), false);
});

test('GA4 上位ページに無いページは 0 ではなく null。表示は「未取得」', () => {
  const map = viewsByPath([{ path: '/a/', views: 12 }, { path: '/b/', views: 0 }, { path: '/c/', views: null }]);
  assert.equal(lookup(map, '/a/'), 12);
  assert.equal(lookup(map, '/b/'), 0);
  assert.equal(lookup(map, '/c/'), null);
  assert.equal(lookup(map, '/missing/'), null);
  assert.equal(orZero(null), 0);
  assert.equal(formatCount(null), '未取得');
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(null, '上位外'), '上位外');
});

test('計測データの鮮度：2日を超えたら古いと書く', () => {
  assert.equal(dataFreshness('2026-10-25', '2026-10-27').stale, false);
  const old = dataFreshness('2026-10-21', '2026-10-27');
  assert.equal(old.ageDays, 6);
  assert.equal(old.stale, true);
  assert.match(old.line, /6日前/);
  assert.equal(dataFreshness(null, '2026-10-27').stale, true);
});

test('実際のイベント記事：予約リンクを持つ公開記事を1本以上数えられる（0本に戻らない）', () => {
  const dir = join(process.cwd(), 'src/content/events');
  let pagesWithBookingKey = 0;
  let pagesCounted = 0;
  let items = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
    const raw = readFileSync(join(dir, file), 'utf8');
    const data = readFrontmatter(raw);
    if (!isPublished(data)) continue;
    if (Array.isArray(data.booking?.items) && data.booking.items.length) pagesWithBookingKey += 1;
    const found = bookingItems(data);
    if (found.length) pagesCounted += 1;
    items += found.length;
  }
  assert.ok(pagesWithBookingKey > 0, '予約案内のある公開記事が見つからない');
  assert.equal(pagesCounted, pagesWithBookingKey, 'booking.items があるのに数えられない記事がある');
  assert.ok(items >= pagesCounted);
});
