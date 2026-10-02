/**
 * 催しの日付から状態を決める純関数。src/lib/lifecycle.ts（ビルド時）と
 * scripts/date-integrity.mjs（回帰テスト）の両方から使うため、型注釈つきの JS で置く。
 *
 * start / end / today はどれも date-only（UTC 0時で持つ暦日）で渡す。
 * 日程が仮（tentative）でも、その日付を過ぎていれば終了として扱う（古い候補をおすすめに残さない）。
 *
 * @param {Date} start
 * @param {Date | undefined} end
 * @param {Date} today
 * @param {{ tentative?: boolean }} [options]
 * @returns {'upcoming' | 'today' | 'ongoing' | 'ended' | 'unconfirmed'}
 */
export function lifecycleForDates(start, end, today, options = {}) {
  const last = end ?? start;
  if (today > last) return 'ended';
  if (options.tentative) return 'unconfirmed';
  if (today < start) return 'upcoming';
  return start.valueOf() === last.valueOf() ? 'today' : 'ongoing';
}
