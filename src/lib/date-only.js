/**
 * 時刻を持たない「暦日」を、環境のタイムゾーンに依存せず扱う。
 *
 * 内部表現は UTC 00:00。画面表示は必ず明示したタイムゾーンで行う。
 * YYYY-MM-DD を new Date() へ直接渡したり、ローカル時刻の getter を使わない。
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** @param {string} value */
export function parseDateOnly(value) {
  const match = DATE_ONLY_RE.exec(value);
  if (!match) throw new TypeError(`日付は YYYY-MM-DD で指定してください: ${value}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(Date.UTC(year, month - 1, day));

  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) {
    throw new RangeError(`存在しない日付です: ${value}`);
  }
  return result;
}

/**
 * Astroの z.coerce.date() が YYYY-MM-DD をUTC日付へ変換した値を、
 * 暦日として復元する。ローカル時刻の getter は使用しない。
 * @param {Date} value
 */
export function dateOnlyFromCoercedDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) {
    throw new TypeError('有効な Date が必要です');
  }
  return parseDateOnly(value.toISOString().slice(0, 10));
}

/** @type {Map<string, Intl.DateTimeFormat>} */
const CALENDAR_PARTS = new Map();
/** @param {string} timeZone */
function calendarParts(timeZone) {
  let format = CALENDAR_PARTS.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    CALENDAR_PARTS.set(timeZone, format);
  }
  return format;
}

/**
 * ある瞬間を指定タイムゾーンの暦日に変換する。
 * @param {Date} value
 * @param {string} [timeZone]
 */
export function dateOnlyFromInstant(value, timeZone = 'Asia/Tokyo') {
  const parts = calendarParts(timeZone).formatToParts(value);
  /** @param {string} type */
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return parseDateOnly(`${pick('year')}-${pick('month')}-${pick('day')}`);
}

/**
 * ある瞬間、または date-only の Date を、日本時間の暦日 YYYY-MM-DD にする。
 * 構造化データの日付・data 属性・文字列での比較に使う。toISOString() は UTC の日付になるので使わない。
 * @param {Date} value
 */
export function toDateOnlyString(value) {
  return dateOnlyFromInstant(value).toISOString().slice(0, 10);
}

/** 日本時間の今日（YYYY-MM-DD）。ブラウザ・ビルド・scripts のどこから呼んでも同じ日付になる */
export function todayDateOnlyString() {
  return toDateOnlyString(new Date());
}

/*
 * 画面に出す日付。どれも日本時間で書く（実行環境のタイムゾーンに依存させない）。
 * 書式を変えるときはここだけを直す。ページ側で Intl.DateTimeFormat を組まない。
 */
const JAPANESE_DATE = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' });
const JAPANESE_DATE_WEEKDAY = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const MONTH_DAY_WEEKDAY = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' });
const NUMERIC_MONTH_DAY_WEEKDAY = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' });

/** 「2026年10月31日」。公開日・更新日・出典確認日の共通表示
 * @param {Date} value
 */
export function formatJapaneseDate(value) {
  return JAPANESE_DATE.format(value);
}

/** 「2026年10月31日(土)」。開催日など、曜日が要る日付
 * @param {Date} value
 */
export function formatJapaneseDateWithWeekday(value) {
  return JAPANESE_DATE_WEEKDAY.format(value);
}

/** 「10月31日(土)」。年が文脈で分かる一覧・カード
 * @param {Date} value
 */
export function formatMonthDayWithWeekday(value) {
  return MONTH_DAY_WEEKDAY.format(value);
}

/** 「10/31(土)」。幅の狭い表（試合結果など）
 * @param {Date} value
 */
export function formatNumericMonthDayWithWeekday(value) {
  return NUMERIC_MONTH_DAY_WEEKDAY.format(value);
}

/** @param {Date} value @param {number} amount */
export function addDateOnlyDays(value, amount) {
  const result = new Date(value.valueOf());
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

/** @param {Date} value */
export function dateOnlyWeekday(value) {
  return value.getUTCDay();
}
