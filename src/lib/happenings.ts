/**
 * 「今日・明日・今週末、茨城で何があるか」を、既存のデータだけから組み立てる。
 *
 * ## なぜ3つのデータを混ぜるのか
 * イベント記事だけでは足りない。日付を持つ公開イベントは6本しかなく、
 * ほとんどの日が「今日は何もない」になってしまう。
 * 実際には、同じ週に試合（天皇杯）や期間もののイベント（コキアカーニバル）がある。
 * 読者にとってはどれも「今週できること」なので、同じ場所に出す。
 *
 * ## 作らないもの
 * 毎日の記事を自動生成しない。既存データを毎ビルド読み直すだけ。
 * 該当が無い区分は出さない（空の「今日の茨城」を作らない）。
 */
import { getCollection } from 'astro:content';
import { SPORTS_TEAM_BY_SLUG, type SportsTeamSlug } from '../data/sports';
// 試合データは明示的に読み込む。動的importだと、試合データを持たないチーム
// （茨城ロボッツ）でビルドが落ちる。チームを増やすときはここに足す。
import kashimaMatches from '../data/sports/matches/kashima-antlers.json';
import mitoMatches from '../data/sports/matches/mito-hollyhock.json';
import { THEMES } from '../data/themes';
import { MUNI_BY_SLUG } from '../data/areas';
import { addDateOnlyDays, dateOnlyFromCoercedDate, dateOnlyWeekday, parseDateOnly } from './date-only.js';
import { startOfTodayJst } from './lifecycle';

export type HappeningKind = 'event' | 'sports' | 'season';
export type WhenBucket = 'today' | 'tomorrow' | 'weekend' | 'thisWeek';

export interface Happening {
  kind: HappeningKind;
  /** 画面に出す見出し */
  title: string;
  /** サイト内の行き先。必ず実在するページ */
  href: string;
  /** 開始日。期間ものは開始日 */
  start: Date;
  /** 終了日（無ければ開始日と同じ） */
  end: Date;
  /** 「9月23日(水) 17:00」のような表示用の文字列 */
  dateLabel: string;
  /** 市町村名。分かるものだけ */
  place?: string;
  /** 市町村slug。街のページで絞り込むのに使う */
  municipality?: string;
  /** 期間ものかどうか（今日も開催中、の表示に使う） */
  ongoing: boolean;
}

/** ホームスタジアムのある市町村。街のページに試合を出すために使う */
const HOME_MUNICIPALITY: Partial<Record<SportsTeamSlug, string>> = {
  'kashima-antlers': 'kashima',
  'mito-hollyhock': 'naka',
};

const JP_DATE = new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Tokyo' });

/**
 * 今週末（次に来る土曜と日曜）。
 * 今日が土日なら「今日を含む週末」を指す。
 */
export function weekendRange(today: Date): { start: Date; end: Date } {
  const dow = dateOnlyWeekday(today); // 0=日（日本の暦日をUTC固定で保持）
  if (dow === 0) return { start: addDateOnlyDays(today, -1), end: today };
  if (dow === 6) return { start: today, end: addDateOnlyDays(today, 1) };
  const toSat = 6 - dow;
  const sat = addDateOnlyDays(today, toSat);
  return { start: sat, end: addDateOnlyDays(sat, 1) };
}

function bucketOf(h: Happening, today: Date): WhenBucket | null {
  const tomorrow = addDateOnlyDays(today, 1);
  const weekend = weekendRange(today);
  const weekEnd = addDateOnlyDays(today, 7);
  const covers = (d: Date) => h.start <= d && d <= h.end;

  if (covers(today)) return 'today';
  if (covers(tomorrow)) return 'tomorrow';
  if (h.start <= weekend.end && h.end >= weekend.start) return 'weekend';
  if (h.start <= weekEnd && h.end >= today) return 'thisWeek';
  return null;
}

/** 今日から1週間のあいだに関係するものを集める */
export async function getHappenings(now: Date = new Date()): Promise<Happening[]> {
  const today = startOfTodayJst(now);
  const horizon = addDateOnlyDays(today, 7);
  const out: Happening[] = [];

  // 1) イベント記事（開催日が決まっているものだけ）
  const events = await getCollection('events', ({ data }) => !data.draft && data.reviewed && !data.noindex);
  for (const entry of events) {
    const info = entry.data.eventInfo;
    if (entry.data.articleType !== 'event' || !info?.startDate) continue;
    const start = dateOnlyFromCoercedDate(info.startDate);
    const end = info.endDate ? dateOnlyFromCoercedDate(info.endDate) : start;
    if (end < today || start > horizon) continue;
    const muni = entry.data.municipalities[0];
    out.push({
      kind: 'event',
      title: entry.data.title.split('｜')[0]!,
      href: `/events/${entry.id.split('/').pop()}/`,
      start, end,
      dateLabel: info.startTime ? `${JP_DATE.format(start)} ${info.startTime}` : JP_DATE.format(start),
      place: muni ? MUNI_BY_SLUG.get(muni)?.name : undefined,
      municipality: muni,
      ongoing: end > start,
    });
  }

  // 2) 試合（鹿島・水戸）
  const MATCH_FILES: [SportsTeamSlug, { matches: unknown[] }][] = [
    ['kashima-antlers', kashimaMatches],
    ['mito-hollyhock', mitoMatches],
  ];
  for (const [slug, file] of MATCH_FILES) {
    const team = SPORTS_TEAM_BY_SLUG[slug];
    if (!team) continue;
    const matches = file.matches as {
      date: string; kickoff?: string; opponent: string; homeAway: string; venue?: string; status: string;
    }[];
    for (const m of matches) {
      if (m.status !== 'scheduled') continue;
      const start = parseDateOnly(m.date);
      if (start < today || start > horizon) continue;
      out.push({
        kind: 'sports',
        title: `${team.name} vs ${m.opponent}`,
        href: `/sports/${slug}/`,
        start, end: start,
        dateLabel: m.kickoff ? `${JP_DATE.format(start)} ${m.kickoff}` : JP_DATE.format(start),
        place: m.homeAway === 'home' ? m.venue : `アウェイ・${m.venue ?? ''}`,
        // ホームゲームだけ、その街の出来事として扱う（アウェイは県外のため）
        municipality: m.homeAway === 'home' ? HOME_MUNICIPALITY[slug] : undefined,
        ongoing: false,
      });
    }
  }

  // 3) 季節のもの（テーマページが期間を持っている場合だけ）
  for (const theme of Object.values(THEMES)) {
    const period = theme.status?.period;
    if (!period) continue;
    const start = parseDateOnly(period.from);
    const end = parseDateOnly(period.to);
    if (end < today || start > horizon) continue;
    out.push({
      kind: 'season',
      title: period.label,
      href: period.href ?? `/${theme.slug}/`,
      start, end,
      dateLabel: `${JP_DATE.format(start)} 〜 ${JP_DATE.format(end)}`,
      place: period.place,
      municipality: period.municipality,
      ongoing: true,
    });
  }

  return out.sort((a, b) => a.start.valueOf() - b.start.valueOf());
}

/** 表示用に「今日 / 明日 / 今週末 / 今週」へ振り分ける。空の区分は返さない */
export async function getWeekBoard(now: Date = new Date()): Promise<{ bucket: WhenBucket; label: string; items: Happening[] }[]> {
  const today = startOfTodayJst(now);
  const all = await getHappenings(now);
  const grouped = new Map<WhenBucket, Happening[]>();
  for (const h of all) {
    const b = bucketOf(h, today);
    if (!b) continue;
    if (!grouped.has(b)) grouped.set(b, []);
    grouped.get(b)!.push(h);
  }
  const LABEL: Record<WhenBucket, string> = {
    today: '今日',
    tomorrow: '明日',
    weekend: '今週末',
    thisWeek: 'この先1週間',
  };
  return (['today', 'tomorrow', 'weekend', 'thisWeek'] as WhenBucket[])
    .filter((b) => grouped.get(b)?.length)
    .map((b) => ({ bucket: b, label: LABEL[b], items: grouped.get(b)! }));
}

/** その街で今週あることだけを返す。街のページ用 */
export async function getHappeningsForMunicipality(slug: string, now: Date = new Date()): Promise<Happening[]> {
  return (await getHappenings(now)).filter((h) => h.municipality === slug);
}
