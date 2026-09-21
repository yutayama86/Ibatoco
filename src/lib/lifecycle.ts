/**
 * イベント記事が「いまどの段階か」を判定する。
 *
 * **保存せず、毎ビルド計算する。** 保存した値は必ず古くなるため。
 * 実際、街のページでは開催済みのイベントが残り続ける不具合が起きていた。
 *
 * 判定の順番（上から先に決まる）:
 *  1. frontmatter に eventLifecycle がある → それを使う（人が決めた例外）
 *  2. evergreen: true → 'evergreen'
 *  3. articleType が 'event' 以外 → 'evergreen'
 *     ガイドや開業情報の startDate は「情報の基準日」であって開催日ではない
 *  4. eventInfo の日付と今日を比べる
 */
import type { CollectionEntry } from 'astro:content';
import { dateOnlyFromCoercedDate, dateOnlyFromInstant } from './date-only.js';

export type EventLifecycle = 'upcoming' | 'today' | 'ended' | 'evergreen';

/** 今日の0時（日本時間）。日付だけで比べるため、時刻は落とす */
export function startOfTodayJst(now: Date = new Date()): Date {
  return dateOnlyFromInstant(now, 'Asia/Tokyo');
}

export function lifecycleOf(entry: CollectionEntry<'events'>, now: Date = new Date()): EventLifecycle {
  const data = entry.data;
  if (data.eventLifecycle) return data.eventLifecycle;
  if (data.evergreen) return 'evergreen';
  if (data.articleType !== 'event') return 'evergreen';

  const info = data.eventInfo;
  if (!info?.startDate) return 'evergreen';

  const today = startOfTodayJst(now);
  const start = dateOnlyFromCoercedDate(info.startDate);
  const end = info.endDate ? dateOnlyFromCoercedDate(info.endDate) : start;

  if (today < start) return 'upcoming';
  if (today > end) return 'ended';
  return 'today';
}

/** 画面に出す短いラベル。'upcoming' は何も足さない（既定の状態なので） */
export const LIFECYCLE_LABEL: Record<EventLifecycle, string | null> = {
  upcoming: null,
  today: '本日開催',
  ended: '終了しました',
  evergreen: null,
};

/**
 * 関連記事として出す価値があるか。
 * 終了したイベントは、読者が次に取れる行動が無いので候補から外せるようにする。
 * （記事自体は消さない。URLも変えない。あくまで「おすすめ先に選ばない」だけ）
 */
export function isWorthLinking(lifecycle: EventLifecycle): boolean {
  return lifecycle !== 'ended';
}
