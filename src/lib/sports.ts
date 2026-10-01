/**
 * チームページの試合まわり（NEXT MATCH / LAST MATCH / RECENT FORM / UPCOMING）を組み立てる。
 *
 * 試合データの出どころは2つある。
 *  1. src/data/sports/matches/*.json（年間日程・結果・観戦ガイド。sports-schedule.ts で検査して読む）
 *  2. 記事frontmatterの sportsMatch（記事を書いた試合は、記事が試合データを兼ねる）
 *
 * 同じ試合が両方にあるときは、年間日程を土台にして記事側の値で上書きする。
 * 記事を1本足せば、その試合の「記事を読む」導線が自動でチームページに出る。
 *
 * 未確認のデータは作らない。日程が無ければ NEXT MATCH は出さないし、
 * スコアが無ければ点差を書かない。空欄を埋めるための推測はしない。
 */
import type { CollectionEntry } from 'astro:content';
import {
  SPORTS_TEAM_BY_SLUG, articleAnchorTeam, articleTeamSlugs,
  type SportsTeam, type SportsTeamSlug,
} from '../data/sports';
import {
  SPORTS_MATCHES, type MatchDayPlan, type MatchGuide, type SportsMatch, type SportsSource,
} from '../data/sports-schedule';
import { getSportsNews } from './content';
import { dateOnlyFromInstant, parseDateOnly } from './date-only.js';

type Score = { own: number; opponent: number };

/** 画面に出す試合1件。記事から来たものは articleUrl と articleTitle を持つ */
export interface ResolvedMatch {
  team: SportsTeamSlug;
  date: Date;
  opponent: string;
  homeAway: 'home' | 'away' | 'neutral';
  id?: string;
  kickoff?: string;
  kickoffNote?: string;
  openTime?: string;
  openTimeNote?: string;
  competition?: string;
  round?: string;
  kind?: 'league' | 'cup' | 'continental';
  venue?: string;
  score?: Score;
  pk?: Score;
  broadcast?: string[];
  officialUrl?: string;
  recap?: string;
  community?: string[];
  guide?: MatchGuide;
  matchDay?: MatchDayPlan;
  sources?: SportsSource[];
  articleUrl?: string;
  articleTitle?: string;
  /** 記事の種類（sportsContentType）。LAST MATCH で「試合結果」と書いてよいかの判定に使う */
  articleType?: string;
}

const newsPath = (id: string) => `/news/${id.split('/').pop()}/`;

/** 値のある項目だけを上書きする。undefined で既存の値を消さないため */
function mergeDefined(base: ResolvedMatch, next: ResolvedMatch): ResolvedMatch {
  const out = { ...base };
  for (const [k, v] of Object.entries(next)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** 同じ試合を2回出さないための鍵。日付と相手が一致すれば同じ試合とみなす */
const matchKey = (m: { team: string; date: Date; opponent: string }) =>
  `${m.team}|${m.date.toISOString().slice(0, 10)}|${m.opponent}`;

function fromSchedule(entry: SportsMatch): ResolvedMatch | null {
  // 中止・延期は日程としても結果としても出さない
  if (entry.status === 'cancelled' || entry.status === 'postponed') return null;
  return {
    team: entry.team,
    date: parseDateOnly(entry.date),
    opponent: entry.opponent,
    homeAway: entry.homeAway,
    id: entry.id,
    kickoff: entry.kickoff,
    kickoffNote: entry.kickoffNote,
    openTime: entry.openTime,
    openTimeNote: entry.openTimeNote,
    competition: entry.competition,
    round: entry.round,
    kind: entry.kind,
    venue: entry.venue,
    score: entry.score,
    pk: entry.pk,
    broadcast: entry.broadcast.length > 0 ? entry.broadcast : undefined,
    officialUrl: entry.officialUrl,
    recap: entry.recap,
    community: entry.community.length > 0 ? entry.community : undefined,
    guide: entry.guide,
    matchDay: entry.matchDay,
    sources: entry.sources,
    articleUrl: entry.articleUrl,
  };
}

const FLIP: Record<ResolvedMatch['homeAway'], ResolvedMatch['homeAway']> = {
  home: 'away',
  away: 'home',
  neutral: 'neutral',
};

/**
 * 記事から、指定チーム視点の試合を取り出す。
 *
 * sportsMatch の opponent / homeAway / score は「視点のチーム」から見た値。
 * 対戦カード記事（水戸 vs 鹿島）を相手側のチームページに出すときは、
 * 相手＝視点のチーム、HOME↔AWAY、スコアの左右を入れ替える。
 * そうしないと鹿島のページに「HOME vs 鹿島アントラーズ」と出てしまう。
 */
function fromArticle(item: CollectionEntry<'news'>, forTeam: SportsTeamSlug): ResolvedMatch | null {
  const match = item.data.sportsMatch;
  if (!match) return null;
  const teams = articleTeamSlugs(item.data);
  if (!teams.includes(forTeam)) return null;

  const anchor = articleAnchorTeam(item.data);
  const base = {
    team: forTeam,
    date: match.date,
    kickoff: match.kickoff,
    competition: match.competition,
    venue: match.venue,
    articleUrl: newsPath(item.id),
    articleTitle: item.data.title,
    articleType: item.data.sportsContentType,
  };

  // 視点のチーム自身、または相手がイバトコの扱うチームでない場合は、書かれたまま
  if (!anchor || anchor === forTeam) {
    return { ...base, opponent: match.opponent, homeAway: match.homeAway, score: match.score };
  }

  return {
    ...base,
    opponent: SPORTS_TEAM_BY_SLUG[anchor].name,
    homeAway: FLIP[match.homeAway],
    score: match.score ? { own: match.score.opponent, opponent: match.score.own } : undefined,
  };
}

/**
 * チームの試合を、年間日程と記事から集めて重複を除く。
 * 同じ試合が両方にあるときは、年間日程を土台に記事側の値（読み先がある）で上書きする。
 */
export async function getTeamMatches(team: SportsTeamSlug): Promise<ResolvedMatch[]> {
  const byKey = new Map<string, ResolvedMatch>();

  for (const entry of SPORTS_MATCHES) {
    if (entry.team !== team) continue;
    const resolved = fromSchedule(entry);
    if (resolved) byKey.set(matchKey(resolved), resolved);
  }

  for (const item of await getSportsNews(team)) {
    const resolved = fromArticle(item, team);
    if (!resolved) continue;
    const key = matchKey(resolved);
    const existing = byKey.get(key);
    // 同じ試合を複数の記事が扱うことがある（プレビューと試合結果など）。
    // 単純に展開すると、スコアを持たないプレビュー側の undefined が
    // 結果側のスコアを消してしまう。値のある項目だけを上書きする。
    const merged = existing ? mergeDefined(existing, resolved) : resolved;
    // 試合結果の記事があるなら、読み先はそれを残す。観戦ガイドやプレビューの記事で上書きしない
    if (existing?.articleType === 'match-result' && resolved.articleType !== 'match-result') {
      merged.articleUrl = existing.articleUrl;
      merged.articleTitle = existing.articleTitle;
      merged.articleType = existing.articleType;
    }
    byKey.set(key, merged);
  }

  return [...byKey.values()].sort((a, b) => a.date.valueOf() - b.date.valueOf());
}

/** 基準日（ビルドした日、日本時間）の暦日。静的サイトなので、試合日を過ぎても再ビルドまで表示は変わらない */
const startOfDay = (now: Date) => dateOnlyFromInstant(now, 'Asia/Tokyo');

/** 次の試合。当日の試合は、結果が入るまで「次の試合」に残す */
export function pickNextMatch(matches: ResolvedMatch[], now = new Date()): ResolvedMatch | undefined {
  const today = startOfDay(now);
  return matches.find((m) => m.date >= today && !m.score);
}

/** 直近の結果。スコアが入っているものだけを「結果」として扱う */
export function pickLatestResult(matches: ResolvedMatch[]): ResolvedMatch | undefined {
  return [...matches].reverse().find((m) => Boolean(m.score));
}

/** 直近の成績。結果の入った試合を古い順に最大 n 件（大会はまたいでよい。表示で大会名を添える） */
export function pickRecentForm(matches: ResolvedMatch[], n = 5): ResolvedMatch[] {
  return matches.filter((m) => Boolean(m.score)).slice(-n);
}

/** 今後の試合。次の試合を除いて、日付の近い順に最大 n 件 */
export function pickUpcoming(
  matches: ResolvedMatch[], next: ResolvedMatch | undefined, n = 5, now = new Date(),
): ResolvedMatch[] {
  const today = startOfDay(now);
  return matches.filter((m) => m !== next && m.date >= today && !m.score).slice(0, n);
}

export const HOME_AWAY_LABEL: Record<ResolvedMatch['homeAway'], string> = {
  home: 'HOME',
  away: 'AWAY',
  neutral: '中立地',
};

/** 勝敗。スコアがあるときだけ返す（順位や連勝などの集計はしない） */
export function resultLabel(match: ResolvedMatch): string | undefined {
  if (!match.score) return undefined;
  const { own, opponent } = match.score;
  if (own > opponent) return '勝';
  if (own < opponent) return '敗';
  return '分';
}

/** 成績の記号。○勝ち △引き分け ●負け */
export function formMark(match: ResolvedMatch): { mark: '○' | '△' | '●'; label: string } | undefined {
  const r = resultLabel(match);
  if (r === '勝') return { mark: '○', label: '勝ち' };
  if (r === '敗') return { mark: '●', label: '負け' };
  if (r === '分') return { mark: '△', label: '引き分け' };
  return undefined;
}

/** PK戦の結果。「PK 4-1 勝ち」のように、自チーム側を左に書く */
export function pkText(match: ResolvedMatch): string | undefined {
  if (!match.pk) return undefined;
  const won = match.pk.own > match.pk.opponent;
  return `PK ${match.pk.own}-${match.pk.opponent} ${won ? '勝ち' : '負け'}`;
}

/** 大会名＋節。記事側の大会名に節が含まれていれば重ねない */
export function competitionLabel(match: ResolvedMatch): string | undefined {
  if (!match.competition) return match.round;
  if (!match.round || match.competition.includes(match.round)) return match.competition;
  return `${match.competition} ${match.round}`;
}

/** 成績の一覧で使う短い大会名。リーグ戦とカップ戦を見分けられることを優先する */
export function competitionShort(match: ResolvedMatch): string {
  const c = match.competition ?? '';
  if (c.includes('ルヴァン')) return 'ルヴァン杯';
  if (c.includes('天皇杯')) return '天皇杯';
  if (c.includes('AFC') || c.includes('ACL')) return 'ACLE';
  if (c.includes('J1')) return 'J1';
  return match.kind === 'league' ? 'リーグ' : '杯';
}

const JST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
export const ymd = (d: Date) => JST_DATE.format(d);

/**
 * SportsEvent の構造化データ。キックオフ時刻と会場が確認できている、これからの試合だけ出す。
 * 未確定の値は入れない（住所は確認していないので載せない）。
 */
export function sportsEventJsonLd(team: SportsTeam, match: ResolvedMatch): Record<string, unknown> | undefined {
  if (!match.kickoff || !match.venue || match.score) return undefined;
  const own = { '@type': 'SportsTeam', name: team.name };
  const opponent = { '@type': 'SportsTeam', name: match.opponent };
  const [homeTeam, awayTeam] = match.homeAway === 'away' ? [opponent, own] : [own, opponent];
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${homeTeam.name} vs ${awayTeam.name}`,
    ...(competitionLabel(match) ? { description: competitionLabel(match) } : {}),
    startDate: `${ymd(match.date)}T${match.kickoff}:00+09:00`,
    eventStatus: 'https://schema.org/EventScheduled',
    sport: team.sport,
    location: { '@type': 'Place', name: match.venue },
    homeTeam,
    awayTeam,
    ...(match.officialUrl ? { url: match.officialUrl } : {}),
  };
}
