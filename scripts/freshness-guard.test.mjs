import test from 'node:test';
import assert from 'node:assert/strict';
import { auditFreshness } from './freshness-guard.mjs';

const audit = (text, overrides = {}) => auditFreshness({ today: '2026-11-18', pages: new Map([['/events/example-2026/', {
  path: '/events/example-2026/', noindex: false, title: '2026年の催し', year: 2026,
  startDate: '2026-11-07', endDate: '2026-11-07', pubDate: '2026-10-01',
  sourceUrls: [], frontmatter: { summary: text }, ...overrides,
}]]) });

test('締切の過去の案内と明示された終了済みの申込は再警告しない', () => {
  for (const text of [
    '一般申込みは2026年10月31日（土）までと案内されていました。',
    '申込は締め切り済み（大会サイトは11月3日まで延長、市は10月30日までと記載）',
    '申込は締切済み。',
  ]) assert.deepEqual(audit(text), []);
});

test('終了案内のない過去の締切は引き続き警告する', () => {
  assert.ok(audit('申込みは2026年10月31日までです。').some((f) => f.type === 'stale-deadline'));
});

test('開催中止は開催中とは区別し、開催中の誤案内は警告する', () => {
  assert.deepEqual(audit('開催中止なら予約代金を返金します。'), []);
  assert.ok(audit('予約受付中、イベント開催中です。').some((f) => f.type === 'ended-live-wording'));
});

test('当年の日付入りファイルは古い格納年だけで前年資料とみなさない', () => {
  for (const date of ['20261107', '20261122']) {
    assert.deepEqual(audit('', { sourceUrls: [{ url: `https://example.jp/uploads/2025/10/${date}_info.pdf` }] }), []);
  }
});

test('前年だけのURL・無効日付・長い識別子の前年警告を残す', () => {
  for (const filename of ['info.pdf', '20261301_info.pdf', '20260230_info.pdf', '1202611079_info.pdf']) {
    assert.ok(audit('', { sourceUrls: [{ url: `https://example.jp/2025/${filename}` }] }).some((f) => f.type === 'year-source-url'));
  }
});

test('翌年の明示された期限と年越しの自動判定を維持する', () => {
  assert.deepEqual(audit('購入した券は2027年2月28日まで利用できます。'), []);
  assert.deepEqual(audit('購入した券は2月28日まで利用できます。', { startDate: '2026-12-01', endDate: '2027-02-28' }), []);
});

test('開催年とURL年の不一致は引き続きerrorにする', () => {
  assert.ok(audit('', { year: 2025 }).some((f) => f.type === 'year-slug' && f.severity === 'error'));
});
