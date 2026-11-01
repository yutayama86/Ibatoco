/**
 * 試合が「終わったはず」の時刻を、実行環境のタイムゾーンに依存せず決める。
 *
 * 静的サイトなので、試合当日の朝にビルドしたチームページは、試合が終わっても
 * 次のビルドまでその試合を NEXT MATCH に出し続ける。結果（score）は公式で確認してから入れるため、
 * それまでの間は推測で結果を書かず、「次の試合」から外すか、試合時間を過ぎたことだけを知らせる。
 *
 * 目安はキックオフから3時間（90分・ハーフタイム・延長戦・PK戦まで含める）。
 * kickoff は日本時間の HH:MM（海外の試合も kickoffNote を添えて日本時間で持つ）。
 */
import { toDateOnlyString } from './date-only.js';

const MATCH_OVER_AFTER_MS = 3 * 60 * 60 * 1000;
const KICKOFF_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * キックオフから3時間後の瞬間。キックオフ時刻が無い・形式が違うときは undefined（判定しない）
 * @param {Date} date date-only の Date（parseDateOnly の値）
 * @param {string | undefined} kickoff 日本時間の HH:MM
 */
export function matchOverAt(date, kickoff) {
  if (!kickoff || !KICKOFF_RE.test(kickoff)) return undefined;
  return new Date(Date.parse(`${toDateOnlyString(date)}T${kickoff}:00+09:00`) + MATCH_OVER_AFTER_MS);
}

/**
 * 試合時間を過ぎたのに結果が入っていない。NEXT MATCH・UPCOMING から外す判定に使う
 * @param {{ date: Date, kickoff?: string, score?: unknown }} match
 * @param {Date} now
 */
export function isAwaitingResult(match, now) {
  if (match.score) return false;
  const over = matchOverAt(match.date, match.kickoff);
  return over !== undefined && now.valueOf() >= over.valueOf();
}
