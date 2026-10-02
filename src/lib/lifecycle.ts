/**
 * 催しを扱う記事（events の eventInfo、news の event）が「いまどの段階か」を判定する。
 * TOP・ランキング・関連記事・次に読む・一覧の振り分けは、すべてこの判定を使う。
 *
 * **保存せず、毎ビルド計算する。** 保存した値は必ず古くなるため。
 * 実際、街のページでは開催済みのイベントが残り続ける不具合が起きていた。
 */
import type { CollectionEntry } from 'astro:content';
import { dateOnlyFromCoercedDate, dateOnlyFromInstant } from './date-only.js';
import { lifecycleForDates } from './lifecycle-dates.js';

export { lifecycleForDates };

/**
 * - upcoming    … 開催前（日程は確定）
 * - today       … 1日だけの催しの開催日
 * - ongoing     … 複数日の催しの開催期間中
 * - ended       … 終了（中止を含む。おすすめ先には選ばない）
 * - unconfirmed … 日程が確定していない（公式が「予定」「未発表」、延期で新日程未定）
 * - evergreen   … 日付で終わらないもの（ガイド・開業情報・催しに紐づかないニュース）
 */
export type EventLifecycle = 'upcoming' | 'today' | 'ongoing' | 'ended' | 'unconfirmed' | 'evergreen';

/** 今日の0時（日本時間）。日付だけで比べるため、時刻は落とす */
export function startOfTodayJst(now: Date = new Date()): Date {
  return dateOnlyFromInstant(now, 'Asia/Tokyo');
}

type DatedEntry = CollectionEntry<'events'> | CollectionEntry<'news'>;

/** 記事が持つ「催しの日付」。events は eventInfo、news は event。無ければ undefined */
function eventDatesOf(entry: DatedEntry): { start: Date; end?: Date; tentative: boolean; status?: string } | undefined {
  if (entry.collection === 'events') {
    if (entry.data.articleType !== 'event') return undefined;
    const info = entry.data.eventInfo;
    if (!info?.startDate) return undefined;
    return { start: info.startDate, end: info.endDate, tentative: info.dateStatus === 'tentative', status: info.status };
  }
  const event = entry.data.event;
  if (!event?.startDate) return undefined;
  return { start: event.startDate, end: event.endDate, tentative: event.dateStatus === 'tentative' };
}

/**
 * 判定の順番（上から先に決まる）:
 *  1. frontmatter に eventLifecycle がある → それを使う（人が決めた例外）
 *  2. evergreen: true → 'evergreen'
 *  3. 催しの日付を持たない → 'evergreen'
 *     （events の articleType が 'event' 以外、news で event が無いもの。ガイドの startDate は情報の基準日であって開催日ではない）
 *  4. 公式が中止を発表 → 'ended'、延期を発表 → 'unconfirmed'
 *  5. 日付と今日（日本時間）を比べる（lifecycleForDates）
 */
export function lifecycleOf(entry: DatedEntry, now: Date = new Date()): EventLifecycle {
  const data = entry.data;
  if (data.eventLifecycle) return data.eventLifecycle;
  if (data.evergreen) return 'evergreen';

  const dates = eventDatesOf(entry);
  if (!dates) return 'evergreen';
  if (dates.status === 'cancelled') return 'ended';
  if (dates.status === 'postponed') return 'unconfirmed';

  return lifecycleForDates(
    dateOnlyFromCoercedDate(dates.start),
    dates.end ? dateOnlyFromCoercedDate(dates.end) : undefined,
    startOfTodayJst(now),
    { tentative: dates.tentative },
  );
}

/** 画面に出す短いラベル。'upcoming' と 'evergreen' は何も足さない（既定の状態なので） */
export const LIFECYCLE_LABEL: Record<EventLifecycle, string | null> = {
  upcoming: null,
  today: '本日開催',
  ongoing: '開催中',
  ended: '終了しました',
  unconfirmed: '日程未確定',
  evergreen: null,
};

/** 公式の中止・延期の発表は、日付から出すラベルより優先して見せる */
export function lifecycleLabelOf(entry: DatedEntry, now: Date = new Date()): string | null {
  if (entry.collection === 'events') {
    const status = entry.data.eventInfo?.status;
    if (status === 'cancelled') return '中止になりました';
    if (status === 'postponed') return '延期（新しい日程は未発表）';
  }
  return LIFECYCLE_LABEL[lifecycleOf(entry, now)];
}

/**
 * おすすめ先（TOP・ランキング・関連記事・次に読む）として出す価値があるか。
 * 終了・中止した催しは、読者が次に取れる行動が無いので外す。
 * （記事自体は消さない。URLも変えない。あくまで「おすすめ先に選ばない」だけ）
 */
export function isWorthLinking(lifecycle: EventLifecycle): boolean {
  return lifecycle !== 'ended';
}
