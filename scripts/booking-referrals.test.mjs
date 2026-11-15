import test from 'node:test';
import assert from 'node:assert/strict';
import {
  referralWindows, referralDimensions, referralTotals, buildByProviderPage, buildByPage, classifyReferral,
  checkBookingReferrals, referralSnapshotFields, referralReportQualityIssues,
} from '../src/lib/booking-referrals.mjs';
import { referralFreshness } from '../src/lib/analytics-freshness.mjs';
import { businessReferrals } from '../src/lib/local-revenue.mjs';

const r = (dims, n) => ({ dimensionValues: dims.map((value) => ({ value })), metricValues: [{ value: String(n) }] });
const OUT = 'outbound_booking_click', PAID = 'paid_booking_click', VIEW = 'booking_guide_view';
const A8 = 'https://px.a8.net/svt/ejp?a8mat=X';

test('窓は確定日で終わる（日本の暦日）', () => {
  const w = referralWindows('2026-11-12');
  assert.deepEqual(w.recent28, { start: '2026-10-16', end: '2026-11-12' });
  assert.deepEqual(w.recent7, { start: '2026-11-06', end: '2026-11-12' });
});

test('登録済みのディメンションだけを使う。必須が無ければ missing、partner_status は任意', () => {
  const meta = (names) => ({ dimensions: names.map((apiName) => ({ apiName })) });
  assert.deepEqual(referralDimensions(meta(['customEvent:link_url', 'customEvent:link_provider'])), { missing: [], partnerStatus: false });
  assert.deepEqual(referralDimensions(meta(['customEvent:link_url'])).missing, ['customEvent:link_provider']);
  assert.equal(referralDimensions(meta(['customEvent:link_url', 'customEvent:link_provider', 'customEvent:partner_status'])).partnerStatus, true);
  assert.equal(referralDimensions(null).missing.length, 2);
});

test('サイト全体：行が無いイベントは null（0 にしない）', () => {
  const t = referralTotals([r([OUT, 'date_range_0'], 40), r([OUT, 'date_range_1'], 9), r([VIEW, 'date_range_0'], 500), r(['page_view', 'date_range_0'], 9999)]);
  assert.deepEqual(t.recent28, { booking_guide_view: 500, outbound_booking_click: 40, paid_booking_click: null });
  assert.deepEqual(t.recent7, { booking_guide_view: null, outbound_booking_click: 9, paid_booking_click: null });
  assert.throws(() => referralTotals([r([OUT, 'date_range_0'], -1)]));
});

test('区分：提携・公式・未提携候補・提携先の未設定', () => {
  assert.equal(classifyReferral({ link_url: 'https://example.jp/', link_provider: 'official', paid: 0 }), 'official');
  assert.equal(classifyReferral({ link_url: 'https://example.jp/', link_provider: 'rockinstar-official', paid: 0 }), 'official');
  assert.equal(classifyReferral({ link_url: 'https://example.jp/t/', link_provider: 'rockinstar-ticket', paid: 0 }), 'non-partner-candidate');
  assert.equal(classifyReferral({ link_url: A8, link_provider: 'jalan', paid: 0 }), 'paid');
  assert.equal(classifyReferral({ link_url: 'https://example.jp/', link_provider: 'jalan', paid: 2 }), 'paid');
  assert.equal(classifyReferral({ link_url: 'https://www.jalan.net/', link_provider: 'jalan', partner_status: 'active', paid: 0 }), 'active-unmapped');
});

test('送客先別：28日と7日を同じ行に、提携は内数、(not set) は行にせず件数を残す', () => {
  const rows = [
    r([OUT, '/events/a/', 'https://kanko.example.jp/', 'official', 'date_range_0'], 12),
    r([OUT, '/events/a/', 'https://kanko.example.jp/', 'official', 'date_range_1'], 5),
    r([OUT, '/events/a/', A8, 'jalan', 'date_range_0'], 3),
    r([PAID, '/events/a/', A8, 'jalan', 'date_range_0'], 3),
    r([PAID, '/events/a/', A8, 'jalan', 'date_range_1'], 1),
    r([OUT, '/events/b/', '(not set)', '(not set)', 'date_range_0'], 2),
    r([OUT, '/events/b/', '(not set)', '(not set)', 'date_range_1'], 1),
  ];
  const got = buildByProviderPage(rows);
  assert.deepEqual(got.rows, [
    { path: '/events/a/', link_url: 'https://kanko.example.jp/', link_provider: 'official', partner_status: null, event_count: 12, event_count7: 5, paid_count: 0, classification: 'official' },
    { path: '/events/a/', link_url: A8, link_provider: 'jalan', partner_status: null, event_count: 3, event_count7: 0, paid_count: 3, classification: 'paid' },
  ]);
  assert.deepEqual(got.unattributed, { recent28: 2, recent7: 1 });
  assert.deepEqual(got.sums, { recent28: 17, recent7: 6 });
  assert.equal(got.dropped, 0);
});

test('送客先別：partner_status が登録されていれば使う', () => {
  const got = buildByProviderPage([r([OUT, '/events/a/', 'https://www.jalan.net/x', 'jalan', 'active', 'date_range_0'], 4)], { partnerStatus: true });
  assert.equal(got.rows[0].partner_status, 'active');
  assert.equal(got.rows[0].classification, 'active-unmapped');
});

test('ページ別：既存の項目名（monetized_booking_click）のまま', () => {
  const got = buildByPage([r([VIEW, '/events/a/'], 100), r([OUT, '/events/a/'], 7), r([PAID, '/events/a/'], 2), r([VIEW, '/events/b/'], 30), r([OUT, '(not set)'], 1)]);
  assert.deepEqual(got, [
    { path: '/events/a/', booking_guide_view: 100, outbound_booking_click: 7, monetized_booking_click: 2 },
    { path: '/events/b/', booking_guide_view: 30, outbound_booking_click: 0, monetized_booking_click: 0 },
  ]);
});

const good = () => ({
  source: 'Google official GA4 Data API: pagePath × link_url × link_provider',
  periods: referralWindows('2026-11-12'), partnerStatus: false,
  totals: { recent28: { booking_guide_view: 500, outbound_booking_click: 17, paid_booking_click: 3 }, recent7: { booking_guide_view: 120, outbound_booking_click: 6, paid_booking_click: 1 } },
  byProviderPage: [
    { path: '/events/a/', link_url: 'https://kanko.example.jp/', link_provider: 'official', partner_status: null, event_count: 12, event_count7: 5, paid_count: 0, classification: 'official' },
    { path: '/events/a/', link_url: A8, link_provider: 'jalan', partner_status: null, event_count: 3, event_count7: 0, paid_count: 3, classification: 'paid' },
  ],
  unattributed: { recent28: 2, recent7: 1 }, dropped: 0,
  byPage: [{ path: '/events/a/', booking_guide_view: 100, outbound_booking_click: 5, monetized_booking_click: 1 }],
});

test('検査：整合する結果は合格。無い（null）のも合格（前の値を残す）', () => {
  assert.deepEqual(checkBookingReferrals(good(), { confirmedThrough: '2026-11-12' }), []);
  assert.deepEqual(checkBookingReferrals(null, { confirmedThrough: '2026-11-12' }), []);
  assert.deepEqual(checkBookingReferrals(undefined, { confirmedThrough: '2026-11-12' }), []);
});

test('検査：期間のずれ・内訳がサイト全体を超える・提携が全体を超える・空での上書きを拒否', () => {
  const bad = (edit) => { const x = good(); edit(x); return checkBookingReferrals(x, { confirmedThrough: '2026-11-12' }); };
  assert.ok(checkBookingReferrals(good(), { confirmedThrough: '2026-11-11' }).length >= 1);
  assert.ok(bad((x) => { x.totals.recent28.outbound_booking_click = 16; }).some((e) => e.includes('28日合計')));
  assert.ok(bad((x) => { x.totals.recent7.outbound_booking_click = 5; }).some((e) => e.includes('7日合計')));
  assert.ok(bad((x) => { x.totals.recent7.paid_booking_click = 7; }).some((e) => e.includes('paid_booking_click')));
  assert.ok(bad((x) => { x.byProviderPage = []; x.unattributed = { recent28: 0, recent7: 0 }; }).some((e) => e.includes('空')));
  assert.ok(bad((x) => { x.byProviderPage[1].paid_count = 9; }).length >= 1);
  assert.ok(bad((x) => { x.byPage[0].monetized_booking_click = 9; }).length >= 1);
  assert.ok(bad((x) => { x.byPage[0].outbound_booking_click = 7; }).some((e) => e.includes('ページ別')));
  assert.ok(bad((x) => { x.byProviderPage[0].link_url = ''; }).length >= 1);
});

test('送客イベントが返らない場合は真の0と未取得を区別できないため更新しない', () => {
  const x = good();
  x.totals = { recent28: { booking_guide_view: 10, outbound_booking_click: null, paid_booking_click: null }, recent7: { booking_guide_view: null, outbound_booking_click: null, paid_booking_click: null } };
  x.byProviderPage = []; x.byPage = []; x.unattributed = { recent28: 0, recent7: 0 };
  const errors = checkBookingReferrals(x, { confirmedThrough: '2026-11-12' });
  assert.ok(errors.some((e) => e.includes('28日の送客クリック合計が未取得')));
  assert.ok(errors.some((e) => e.includes('7日の送客クリック合計が未取得')));
  const only7Missing = good();
  only7Missing.totals.recent7.outbound_booking_click = null;
  assert.ok(checkBookingReferrals(only7Missing, { confirmedThrough: '2026-11-12' }).some((e) => e.includes('7日の送客クリック合計が未取得')));
});

test('GA4送客レポート：欠落・しきい値・サンプリング・切り詰めを検知する', () => {
  const base = { rowCount: 1, rows: [r([OUT], 2)], metadata: {} };
  assert.deepEqual(referralReportQualityIssues(base, 'provider'), []);
  assert.ok(referralReportQualityIssues({ ...base, rowCount: 2 }, 'provider').some((e) => e.includes('行数')));
  assert.ok(referralReportQualityIssues({ ...base, metadata: { dataLossFromOtherRow: true } }).some((e) => e.includes('(other)')));
  assert.ok(referralReportQualityIssues({ ...base, metadata: { subjectToThresholding: true } }).some((e) => e.includes('しきい値')));
  assert.ok(referralReportQualityIssues({ ...base, metadata: { samplingMetadatas: [{ samplesReadCount: '100' }] } }).some((e) => e.includes('サンプリング')));
  assert.ok(referralReportQualityIssues({ ...base, metadata: { dataTruncationReasons: [{ reason: 'DATA_TRUNCATION_REASON_USER_ID_LIMIT' }] } }).some((e) => e.includes('切り詰め')));
  assert.deepEqual(referralReportQualityIssues({ ...base, metadata: { dataTruncationReasons: [{ reason: 'DATA_TRUNCATION_REASON_UNSPECIFIED' }] } }), []);
  assert.ok(referralReportQualityIssues(null).length > 0);
});

test('スナップショットの項目：既存のレポート（local-revenue）がそのまま読める', () => {
  const fields = referralSnapshotFields(good(), '2026-11-15T08:30:00.000Z');
  assert.deepEqual(fields.byProviderPagePeriod, { start: '2026-10-16', end: '2026-11-12' });
  assert.deepEqual(fields.byPagePeriod, { start: '2026-11-06', end: '2026-11-12' });
  assert.equal(fields.byProviderPageTotals.unattributed.recent28, 2);
  const ref = businessReferrals({ snapshot: { conversionDetail: fields } });
  assert.equal(ref.period, '2026-10-16..2026-11-12');
  assert.deepEqual(ref.totals, { official: 12, paid: 3, other: 0, destinations: 2 });
  assert.equal(ref.destinations[0].destination, 'kanko.example.jp');
});

test('鮮度：期間が無ければ missing、確定日から遅れていれば stale', () => {
  const snap = (end) => ({ conversionDetail: { byProviderPagePeriod: { start: '2026-01-01', end } } });
  assert.equal(referralFreshness({}, '2026-11-15').status, 'missing');
  assert.equal(referralFreshness(snap('2026-10-03'), '2026-11-15').status, 'stale');
  assert.equal(referralFreshness(snap('2026-11-12'), '2026-11-15').status, 'fresh');
});
