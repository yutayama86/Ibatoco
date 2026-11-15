/**
 * 送客クリックの内訳（performance-snapshot の conversionDetail.byProviderPage・byPage）を、
 * GA4 Data API の応答から作る（Issue #612）。純粋関数（ファイルもネットワークも触らない）。
 * 取得は scripts/google-api-daily.mjs、反映は scripts/google-analytics-sync.mjs。
 *
 * なぜ必要か：送客先別の内訳は Windsor.ai の手取得（2026-09-27〜10-03 の1週間分）のまま止まっていた。
 * 協賛の候補を選ぶ材料なので、日次同期と同じ公式 API・同じ確定日で取り直す。
 *
 * 原則（日次同期と同じ）：
 *   - 確定日（confirmedThrough）までの期間だけ。期間を必ず記録する
 *   - 新しい計測・カスタムディメンションは足さない。登録済みのもの（link_url・link_provider）だけを使う
 *   - 取れなかったら null のまま（前の値と期間を残す）。0 で埋めない
 *     GA4 は件数0の行を返さない。応答が上限未満で、同じページに別のイベントの行があるときだけ「行が無い＝0」と扱う
 *   - paid_booking_click は outbound_booking_click の内数。内訳の合計がサイト全体の件数を超えたら反映しない
 */
import { addDays } from './growth-engine.mjs';

export const REFERRAL_EVENTS = ['booking_guide_view', 'outbound_booking_click', 'paid_booking_click'];
export const CLICK_EVENTS = ['outbound_booking_click', 'paid_booking_click'];
/** 送客先別に必須の、登録済みカスタムディメンション（docs/SPONSORSHIP.md「4. 計測と報告」） */
export const REQUIRED_DIMENSIONS = ['customEvent:link_url', 'customEvent:link_provider'];
/** 登録されていれば使う（無くても取得は続ける） */
export const OPTIONAL_DIMENSIONS = ['customEvent:partner_status'];
/** スナップショットに残す行数（容量のため。28日のクリックの多い順） */
export const REFERRAL_ROWS_KEEP = 300;

const WINDOW_NAMES = ['recent28', 'recent7'];
const UNSET = new Set(['', '(not set)', '(other)']);
const PAID_HOSTS = /(^|\.)(a8\.net|afl\.rakuten\.co\.jp|valuecommerce\.(com|ne\.jp))$/;

/** 2つの窓（直近28日・直近7日）。終わりは確定日。API へ渡す dateRanges もこの順 */
export function referralWindows(through) {
  return {
    recent28: { start: addDays(through, -27), end: through },
    recent7: { start: addDays(through, -6), end: through },
  };
}

/** メタデータ API の応答から、使えるディメンションを判定する。必須が欠けていれば missing に入る */
export function referralDimensions(metadata) {
  const names = new Set((metadata?.dimensions ?? []).map((d) => d?.apiName));
  return {
    missing: REQUIRED_DIMENSIONS.filter((name) => !names.has(name)),
    partnerStatus: names.has(OPTIONAL_DIMENSIONS[0]),
  };
}

const count = (row, label) => {
  const value = Number(row?.metricValues?.[0]?.value);
  if (!Number.isInteger(value) || value < 0) throw new Error(`GA4 ${label}: invalid eventCount`);
  return value;
};
/** 複数の dateRanges を渡すと GA4 が最後に付ける dateRange 次元（date_range_0 …）を窓の名前にする */
const windowOf = (row) => {
  const idx = /^date_range_(\d)$/.exec(row?.dimensionValues?.at(-1)?.value ?? '')?.[1];
  return idx != null ? WINDOW_NAMES[Number(idx)] ?? null : null;
};
const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
};

/**
 * 区分（既存のレポートと同じ値）。
 *   paid：提携リンク（paid_booking_click が出た、または ASP のホスト）
 *   active-unmapped：提携先だが提携リンクになっていない（partner_status が取れるときだけ判定できる）
 *   official：事業者・団体の公式（link_provider が official / *-official）
 *   non-partner-candidate：それ以外（未提携の予約・チケット等）
 */
export function classifyReferral({ link_url, link_provider, partner_status, paid }) {
  const host = hostOf(link_url);
  if (paid > 0 || (host && PAID_HOSTS.test(host))) return 'paid';
  if (partner_status === 'active') return 'active-unmapped';
  if (/(^|-)official$/.test(link_provider ?? '')) return 'official';
  return 'non-partner-candidate';
}

/** eventName（＋dateRange）の応答 → 窓別・イベント別の件数。行が無いイベントは null（0 にしない） */
export function referralTotals(rows) {
  const out = Object.fromEntries(WINDOW_NAMES.map((w) => [w, Object.fromEntries(REFERRAL_EVENTS.map((e) => [e, null]))]));
  for (const row of rows ?? []) {
    const name = row?.dimensionValues?.[0]?.value;
    const win = windowOf(row);
    if (!win || !REFERRAL_EVENTS.includes(name)) continue;
    out[win][name] = (out[win][name] ?? 0) + count(row, 'totals');
  }
  return out;
}

/**
 * GA4 Data API の集計品質。行数制限だけでなく (other) 集約、しきい値、
 * サンプリング、切り詰めを検知する。URL 単位の営業実績は欠落した集計を使わない。
 * 実データ（URL・トークン）はエラーメッセージへ含めない。
 */
export function referralReportQualityIssues(report, label = 'GA4') {
  const errors = [];
  if (!report || typeof report !== 'object') return [`${label}: API応答がありません`];
  if (Number(report.rowCount ?? 0) > (report.rows ?? []).length)
    errors.push(`${label}: 行数の上限に達した`);
  const metadata = report.metadata ?? {};
  if (metadata.dataLossFromOtherRow === true)
    errors.push(`${label}: (other) 行への集約により一部の送り先が欠落`);
  if (metadata.subjectToThresholding === true)
    errors.push(`${label}: プライバシーしきい値により一部データが除外`);
  if (Array.isArray(metadata.samplingMetadatas) && metadata.samplingMetadatas.length)
    errors.push(`${label}: サンプリング集計`);
  const truncations = [...(metadata.dataTruncationReasons ?? []), ...(report.dataTruncationReasons ?? [])];
  if (truncations.some((reason) => {
    const value = typeof reason === 'string' ? reason : reason?.reason;
    return value && value !== 'DATA_TRUNCATION_REASON_UNSPECIFIED';
  })) errors.push(`${label}: データが切り詰められています`);
  return errors;
}

/**
 * eventName × pagePath × link_url × link_provider（× partner_status）（＋dateRange）の応答 → 送客先別の行。
 * event_count は直近28日の outbound_booking_click、event_count7 は直近7日。paid_count は28日の paid_booking_click（内数）。
 * link_url が (not set) の行は送り先が分からないので行にせず、unattributed に件数を残す。
 */
export function buildByProviderPage(rows, { partnerStatus = false } = {}) {
  const map = new Map();
  const unattributed = { recent28: 0, recent7: 0 };
  const sums = { recent28: 0, recent7: 0 };
  for (const row of rows ?? []) {
    const [event, path, url, provider, status] = (row?.dimensionValues ?? []).map((d) => d?.value);
    const win = windowOf(row);
    if (!win || !CLICK_EVENTS.includes(event)) continue;
    const n = count(row, 'byProviderPage');
    if (event === 'outbound_booking_click') sums[win] += n;
    if (typeof path !== 'string' || !path.startsWith('/') || UNSET.has(url ?? '')) {
      if (event === 'outbound_booking_click') unattributed[win] += n;
      continue;
    }
    const partner = partnerStatus && !UNSET.has(status ?? '') ? status : null;
    const linkProvider = UNSET.has(provider ?? '') ? null : provider;
    const key = [path, url, linkProvider ?? '', partner ?? ''].join('\u0000');
    const cur = map.get(key) ?? { path, link_url: url, link_provider: linkProvider, partner_status: partner, event_count: 0, event_count7: 0, paid_count: 0 };
    if (event === 'outbound_booking_click') cur[win === 'recent28' ? 'event_count' : 'event_count7'] += n;
    else if (win === 'recent28') cur.paid_count += n;
    map.set(key, cur);
  }
  const all = [...map.values()]
    .filter((r) => r.event_count > 0) // 28日の窓に無い行は作らない（7日は28日の内側）
    .map((r) => ({ ...r, classification: classifyReferral({ ...r, paid: r.paid_count }) }))
    .sort((a, b) => b.event_count - a.event_count || a.path.localeCompare(b.path) || a.link_url.localeCompare(b.link_url));
  return { rows: all.slice(0, REFERRAL_ROWS_KEEP), dropped: Math.max(0, all.length - REFERRAL_ROWS_KEEP), unattributed, sums };
}

/**
 * eventName × pagePath（直近7日だけ）の応答 → ページ別（既存の byPage の形）。
 * monetized_booking_click は paid_booking_click の件数（既存の項目名を変えない）。
 */
export function buildByPage(rows) {
  const map = new Map();
  for (const row of rows ?? []) {
    const [event, path] = (row?.dimensionValues ?? []).map((d) => d?.value);
    if (!REFERRAL_EVENTS.includes(event) || typeof path !== 'string' || !path.startsWith('/')) continue;
    const cur = map.get(path) ?? { path, booking_guide_view: 0, outbound_booking_click: 0, monetized_booking_click: 0 };
    cur[event === 'paid_booking_click' ? 'monetized_booking_click' : event] += count(row, 'byPage');
    map.set(path, cur);
  }
  return [...map.values()].sort((a, b) => b.outbound_booking_click - a.outbound_booking_click || b.booking_guide_view - a.booking_guide_view || a.path.localeCompare(b.path));
}

/**
 * 取得結果（export の bookingReferrals）の検査。preflight と sync の両方で使う。
 * @returns {string[]} エラー（空なら合格）
 */
export function checkBookingReferrals(ref, { confirmedThrough } = {}) {
  const errors = [];
  if (ref == null) return errors; // 任意（取れなかった日は前の値と期間を残す）
  const expected = referralWindows(confirmedThrough);
  for (const [name, w] of Object.entries(expected)) {
    const got = ref.periods?.[name];
    if (!got || got.start !== w.start || got.end !== w.end) errors.push(`bookingReferrals: ${name} の期間が確定日（${confirmedThrough}）と合わない`);
  }
  if (!Array.isArray(ref.byProviderPage) || !Array.isArray(ref.byPage)) { errors.push('bookingReferrals: byProviderPage・byPage が配列でない'); return errors; }
  const total28 = ref.totals?.recent28?.outbound_booking_click;
  const total7 = ref.totals?.recent7?.outbound_booking_click;
  // GA4 は0件のイベント行を返さない。null は真の0と区別できないため、
  // この export で期間だけを新しくして空の内訳を上書きしない。
  if (total28 == null) errors.push('bookingReferrals: 28日の送客クリック合計が未取得（0と区別できないため更新保留）');
  if (total7 == null) errors.push('bookingReferrals: 7日の送客クリック合計が未取得（0と区別できないため更新保留）');
  // サイト全体で送客クリックがあるのに内訳が空なら、ディメンションが効いていない疑い。0行で上書きしない
  if ((total28 ?? 0) > 0 && ref.byProviderPage.length === 0 && !(ref.unattributed?.recent28 > 0)) errors.push('bookingReferrals: 送客クリックがあるのに送客先別が空（0行で上書きしない）');
  if (total28 == null && ref.byProviderPage.length > 0) errors.push('bookingReferrals: サイト全体の件数が無いのに内訳がある');
  const isCount = (v) => Number.isInteger(v) && v >= 0;
  let sum28 = ref.unattributed?.recent28 ?? 0, sum7 = ref.unattributed?.recent7 ?? 0;
  for (const r of ref.byProviderPage) {
    if (typeof r.path !== 'string' || !r.path.startsWith('/') || typeof r.link_url !== 'string' || !r.link_url) { errors.push('bookingReferrals: path/link_url が不正な行がある'); break; }
    if (!isCount(r.event_count) || !isCount(r.event_count7) || !isCount(r.paid_count)) { errors.push(`bookingReferrals: 不正な件数（${r.path}）`); break; }
    if (r.event_count7 > r.event_count || r.paid_count > r.event_count) { errors.push(`bookingReferrals: 7日または提携の件数が28日の件数を超える（${r.path}）`); break; }
    sum28 += r.event_count; sum7 += r.event_count7;
  }
  // 行数の上限で落とした分があるので「下回る」は正常。超えることはない
  if (total28 != null && sum28 > total28) errors.push(`bookingReferrals: 送客先別の28日合計（${sum28}）がサイト全体（${total28}）を超える`);
  if (total7 != null && sum7 > total7) errors.push(`bookingReferrals: 送客先別の7日合計（${sum7}）がサイト全体（${total7}）を超える`);
  for (const w of ['recent28', 'recent7']) {
    const t = ref.totals?.[w] ?? {};
    if (t.paid_booking_click != null && (t.outbound_booking_click == null || t.paid_booking_click > t.outbound_booking_click)) errors.push(`bookingReferrals: ${w} の paid_booking_click が outbound_booking_click を超える`);
  }
  for (const r of ref.byPage) {
    if (typeof r.path !== 'string' || !r.path.startsWith('/')) { errors.push('bookingReferrals: byPage の path が不正'); break; }
    if (![r.booking_guide_view, r.outbound_booking_click, r.monetized_booking_click].every(isCount) || r.monetized_booking_click > r.outbound_booking_click) { errors.push(`bookingReferrals: byPage の件数が不正（${r.path}）`); break; }
  }
  const page7 = ref.byPage.reduce((s, r) => s + r.outbound_booking_click, 0);
  if (total7 != null && page7 > total7) errors.push(`bookingReferrals: ページ別の7日合計（${page7}）がサイト全体（${total7}）を超える`);
  return errors;
}

/** スナップショットの conversionDetail へ入れる項目（既存の項目名・形を保つ） */
export function referralSnapshotFields(ref, fetchedAt) {
  return {
    byProviderPage: ref.byProviderPage,
    byProviderPagePeriod: ref.periods.recent28,
    byProviderPagePeriod7: ref.periods.recent7,
    byProviderPageSource: ref.source,
    byProviderPageCheckedAt: fetchedAt,
    byProviderPageTotals: { ...ref.totals, unattributed: ref.unattributed, droppedRows: ref.dropped, partnerStatusAvailable: ref.partnerStatus },
    byPage: ref.byPage,
    byPagePeriod: ref.periods.recent7,
    byPageSource: 'Google official GA4 Data API: pagePath × eventName',
    byPageCheckedAt: fetchedAt,
  };
}
