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

/**
 * ある瞬間を指定タイムゾーンの暦日に変換する。
 * @param {Date} value
 * @param {string} [timeZone]
 */
export function dateOnlyFromInstant(value, timeZone = 'Asia/Tokyo') {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return parseDateOnly(`${pick('year')}-${pick('month')}-${pick('day')}`);
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
