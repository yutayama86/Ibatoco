/**
 * 「今週できること」の日付表示・区分を、実行環境に依存せず決める。
 * Date は date-only.js と同じく UTC 00:00 の暦日として扱う。
 */
import { addDateOnlyDays, dateOnlyWeekday } from './date-only.js';

const JP_DATE = new Intl.DateTimeFormat('ja-JP', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  timeZone: 'Asia/Tokyo',
});

/** @param {Date} start @param {Date} end @param {Date} today */
export function isHappeningActive(start, end, today) {
  return start <= today && today <= end;
}

/** @param {Date} today */
export function happeningWeekendRange(today) {
  const dow = dateOnlyWeekday(today);
  if (dow === 0) return { start: addDateOnlyDays(today, -1), end: today };
  if (dow === 6) return { start: today, end: addDateOnlyDays(today, 1) };
  const saturday = addDateOnlyDays(today, 6 - dow);
  return { start: saturday, end: addDateOnlyDays(saturday, 1) };
}

/**
 * @param {Date} start
 * @param {Date} end
 * @param {Date} today
 * @returns {'today'|'tomorrow'|'weekend'|'thisWeek'|null}
 */
export function happeningBucket(start, end, today) {
  const tomorrow = addDateOnlyDays(today, 1);
  const weekend = happeningWeekendRange(today);
  const weekEnd = addDateOnlyDays(today, 7);
  const covers = (date) => start <= date && date <= end;

  if (covers(today)) return 'today';
  if (covers(tomorrow)) return 'tomorrow';
  if (start <= weekend.end && end >= weekend.start) return 'weekend';
  if (start <= weekEnd && end >= today) return 'thisWeek';
  return null;
}

/**
 * 今日の欄で、過去の開始日を「今日の日時」のように見せない。
 * @param {Date} start
 * @param {Date} end
 * @param {Date} today
 * @param {string|undefined} startTime
 */
export function happeningDateLabel(start, end, today, startTime = undefined) {
  const multiDay = end > start;
  const active = isHappeningActive(start, end, today);

  if (active && start < today && multiDay) return `開催中｜${JP_DATE.format(end)}まで`;
  if (active && start.valueOf() === today.valueOf() && multiDay) return `本日開始｜${JP_DATE.format(end)}まで`;
  if (active && start.valueOf() === today.valueOf()) return startTime ? `本日 ${startTime}` : '本日';
  if (multiDay) return `${JP_DATE.format(start)} 〜 ${JP_DATE.format(end)}`;
  return startTime ? `${JP_DATE.format(start)} ${startTime}` : JP_DATE.format(start);
}

/**
 * テーマの期間情報と専用イベント記事が同じURLを指す場合は、記事を1件だけ残す。
 * 同じチームの試合など、同種でURLが共通する別イベントは消さない。
 * @template T
 * @param {(T & {kind:string, href:string})[]} items
 */
export function dedupeSeasonHappenings(items) {
  const result = [];
  for (const item of items) {
    const sameUrlIndex = result.findIndex((existing) => existing.href === item.href);
    if (sameUrlIndex < 0) {
      result.push(item);
      continue;
    }
    const existing = result[sameUrlIndex];
    if (item.kind === 'season' && existing.kind !== 'season') continue;
    if (existing.kind === 'season' && item.kind !== 'season') {
      result[sameUrlIndex] = item;
      continue;
    }
    result.push(item);
  }
  return result;
}
