/**
 * 収益・送客レポート（monetization-audit・partner-opportunity・revenue-engine・booking-experiment）が共通で使う読み取り。
 *
 * 2026-10-27 まで、各レポートは記事の frontmatter を正規表現で読んでいた。予約リンク（booking.items）の字下げが
 * 変わったあと、monetization-audit と partner-opportunity は1本もリンクを数えられず「収益化ギャップなし」
 * 「新規提携の候補なし」と出していた（docs/CHATGPT_MIGRATION_AUDIT.md）。frontmatter は YAML として読む。
 *
 * 数値の約束（docs/REVENUE_OS.md）：取得できない値は null。0 で埋めない。表示は formatCount で「未取得」と書く。
 */
import { parse } from 'yaml';

/** 記事の frontmatter を YAML として読む。無い・壊れているときは null */
export function readFrontmatter(raw) {
  const m = String(raw).match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  try {
    const data = parse(m[1]);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/** 公開中（draft: false・reviewed: true・noindex でない）か */
export function isPublished(data) {
  return Boolean(data) && data.draft === false && data.reviewed === true && data.noindex !== true;
}

/** 予約案内のリンク（booking.items）。provider と url のあるものだけ */
export function bookingItems(data) {
  const items = data?.booking?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.provider && item.url)
    .map((item) => ({
      provider: String(item.provider).trim(),
      url: String(item.url).trim(),
      label: item.label == null ? '' : String(item.label).trim(),
      kind: item.kind == null ? 'official' : String(item.kind).trim(),
    }));
}

/** YYYY-MM-DD（日本の暦日）にそろえる。Date で来たときは UTC の日付部分（YAML の日付は UTC 0時） */
function dateOnlyString(value) {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const s = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** イベントの最終日（eventInfo.endDate、無ければ eventInfo.startDate）。イベントでなければ null */
export function eventLastDate(data) {
  const info = data?.eventInfo;
  if (!info || typeof info !== 'object') return null;
  return dateOnlyString(info.endDate) ?? dateOnlyString(info.startDate);
}

/** 最終日が today（YYYY-MM-DD）より前なら終了 */
export function isEventEnded(data, today) {
  const last = eventLastDate(data);
  return Boolean(last && today && last < today);
}

/**
 * GA4 上位ページの一覧（[{ path, views }]）を Map にする。
 * 一覧に無いページは「0 Views」ではなく「上位に入っていない＝値を持っていない」なので、lookup では null を返す。
 */
export function viewsByPath(list) {
  const map = new Map();
  for (const row of Array.isArray(list) ? list : []) {
    if (!row?.path || row.views == null || row.views === '') continue;
    const views = Number(row.views);
    if (Number.isFinite(views)) map.set(row.path, views);
  }
  return map;
}

export function lookup(map, key) {
  return map.has(key) ? map.get(key) : null;
}

/** 並べ替えなど計算のためだけに使う（null を 0 として扱う）。表示には使わない */
export function orZero(value) {
  return value == null ? 0 : value;
}

/** 表示用。null は「未取得」と書く（0 と区別する） */
export function formatCount(value, missing = '未取得') {
  return value == null ? missing : String(value);
}

/** 計測データの鮮度。asOf（YYYY-MM-DD）から today までの日数。2日を超えたら古い */
export function dataFreshness(asOf, today, { maxAgeDays = 2 } = {}) {
  const a = dateOnlyString(asOf);
  const t = dateOnlyString(today);
  if (!a || !t) return { asOf: a, ageDays: null, stale: true, line: '- 計測データの基準日: **未取得**（performance-snapshot.json に asOf が無い）' };
  const ageDays = Math.round((Date.parse(`${t}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
  const stale = ageDays > maxAgeDays;
  const line = `- 計測データの基準日: **${a}**（${ageDays}日前${stale ? '。古いので、数値は判断に使う前に最新の取得を確認する' : ''}）`;
  return { asOf: a, ageDays, stale, line };
}

/**
 * 予約ボタンの A/B の件数。Google 公式 API の同期（windows.ga4.bookingCtaExperiment）を優先し、無ければ
 * ChatGPT の日次取得（conversionDetail.recent7）を見る。4件そろわないうちは hasData: false（判定しない）。
 */
export function bookingAbCounts(performance) {
  const keys = ['booking_guide_view_a', 'booking_guide_view_b', 'outbound_booking_click_a', 'outbound_booking_click_b'];
  const official = performance?.windows?.ga4?.bookingCtaExperiment;
  const source = official?.counts ? 'windows.ga4.bookingCtaExperiment（Google 公式 API）' : 'conversionDetail.recent7';
  const raw = official?.counts ?? performance?.conversionDetail?.recent7 ?? {};
  const period = official?.counts ? { start: official.start ?? null, end: official.end ?? null } : { start: performance?.conversionDetail?.recent7?.start ?? null, end: performance?.conversionDetail?.recent7?.end ?? null };
  const counts = Object.fromEntries(keys.map((k) => {
    const v = raw[k];
    return [k, v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)];
  }));
  const missingKeys = keys.filter((k) => counts[k] == null);
  return { counts, missingKeys, hasData: missingKeys.length === 0, source, period };
}

