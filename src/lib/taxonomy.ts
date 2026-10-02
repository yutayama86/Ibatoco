/**
 * 記事を「どの地域・どのテーマ・どの商業意図に属するか」で扱うための共通の見方。
 *
 * news と events は別のコレクションで、持っているフィールドも違う。
 * 集計や関連付けのたびに両方の差を書き分けると、片方だけ直し忘れる。
 * ここで1つの形（ContentFacets）に揃えてから使う。
 *
 * 事実を作らないための約束:
 *  - 書いていないものは undefined のまま。false や 0 で埋めない
 *  - businessIntent が未設定の記事は「該当しない」ではなく「未判定」
 *  - 地域は frontmatter の municipalities だけを見る。本文から推測しない
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { MUNI_BY_SLUG, type RegionKey } from '../data/areas';
import { lifecycleOf, type EventLifecycle } from './lifecycle';

export type ContentCollection = 'news' | 'events';

export interface BusinessIntent {
  booking: boolean;
  accommodation: boolean;
  parking: boolean;
  food: boolean;
  experience: boolean;
  businessLead: boolean;
}

export type IntentKey = keyof BusinessIntent;

export interface ContentFacets {
  /** サイト内のパス。集計の主キーとして使う */
  path: string;
  collection: ContentCollection;
  title: string;
  pubDate: Date;
  updatedDate?: Date;
  /** frontmatter の municipalities。県全体の記事は空 */
  municipalities: string[];
  /** 上の市町村から引いた地域区分（県北・県央など）。重複は除く */
  regions: RegionKey[];
  /** news はカテゴリ（tourism など）、events は articleType（event など） */
  category: string;
  /** news の sportsTeam / sportsTeams をまとめたもの */
  sportsTeams: string[];
  /** 未設定なら undefined。false 埋めしない */
  businessIntent?: BusinessIntent;
  commercialPriority?: 'low' | 'medium' | 'high';
  evergreen?: boolean;
  /** events だけ。毎回計算する（保存しない） */
  eventLifecycle?: EventLifecycle;
  /** 予約・確認先ブロックを実際に持っているか */
  hasBooking: boolean;
  noindex: boolean;
  tags: string[];
}

function regionsOf(municipalities: string[]): RegionKey[] {
  const set = new Set<RegionKey>();
  for (const slug of municipalities) {
    const m = MUNI_BY_SLUG.get(slug);
    if (m) set.add(m.region);
  }
  return [...set];
}

export function facetsOfNews(entry: CollectionEntry<'news'>, now?: Date): ContentFacets {
  const d = entry.data;
  const teams = [...(d.sportsTeam ? [d.sportsTeam] : []), ...(d.sportsTeams ?? [])];
  return {
    path: `/news/${entry.id.split('/').pop()}/`,
    collection: 'news',
    title: d.title,
    pubDate: d.pubDate,
    updatedDate: d.updatedDate,
    municipalities: [...d.municipalities],
    regions: regionsOf([...d.municipalities]),
    category: d.category,
    sportsTeams: [...new Set(teams)],
    businessIntent: d.businessIntent,
    commercialPriority: d.commercialPriority,
    evergreen: d.evergreen,
    hasBooking: Boolean(d.booking),
    // 催しの日付を持つニュースも、終わったらおすすめ先から外せるようにする（events と同じ判定）
    eventLifecycle: lifecycleOf(entry, now),
    noindex: d.noindex,
    tags: [...d.tags],
  };
}

export function facetsOfEvent(entry: CollectionEntry<'events'>, now?: Date): ContentFacets {
  const d = entry.data;
  return {
    path: `/events/${entry.id.split('/').pop()}/`,
    collection: 'events',
    title: d.title,
    pubDate: d.pubDate,
    updatedDate: d.updatedDate,
    municipalities: [...d.municipalities],
    regions: regionsOf([...d.municipalities]),
    category: d.articleType,
    sportsTeams: [],
    businessIntent: d.businessIntent,
    commercialPriority: d.commercialPriority,
    evergreen: d.evergreen,
    eventLifecycle: lifecycleOf(entry, now),
    hasBooking: Boolean(d.booking),
    noindex: d.noindex,
    tags: [...d.tags],
  };
}

/**
 * 公開済みの news + events をまとめて1つの形で返す。
 * draft と、reviewed でないものは含めない（公開されていないため）。
 */
export async function getAllFacets(now?: Date): Promise<ContentFacets[]> {
  const [news, events] = await Promise.all([
    getCollection('news', ({ data }) => !data.draft && data.reviewed),
    getCollection('events', ({ data }) => !data.draft && data.reviewed),
  ]);
  return [
    ...news.map((entry) => facetsOfNews(entry, now)),
    ...events.map((entry) => facetsOfEvent(entry, now)),
  ];
}

export interface FacetQuery {
  municipality?: string;
  region?: RegionKey;
  collection?: ContentCollection;
  category?: string;
  sportsTeam?: string;
  /** 指定したすべての意図を持つものに絞る。未設定の記事は当たらない */
  intents?: IntentKey[];
  commercialPriority?: 'low' | 'medium' | 'high';
  hasBooking?: boolean;
  /** 除外したいイベントの状態。既定では終了済みも含む（集計では数えたいため） */
  excludeLifecycle?: EventLifecycle[];
  includeNoindex?: boolean;
}

/**
 * 「水戸 × 宿泊意図」「大洗 × イベント × 駐車場」のような絞り込み。
 * 条件は AND。指定しなかった軸は絞らない。
 */
export function queryFacets(facets: ContentFacets[], q: FacetQuery = {}): ContentFacets[] {
  return facets.filter((f) => {
    if (!q.includeNoindex && f.noindex) return false;
    if (q.collection && f.collection !== q.collection) return false;
    if (q.municipality && !f.municipalities.includes(q.municipality)) return false;
    if (q.region && !f.regions.includes(q.region)) return false;
    if (q.category && f.category !== q.category) return false;
    if (q.sportsTeam && !f.sportsTeams.includes(q.sportsTeam)) return false;
    if (q.commercialPriority && f.commercialPriority !== q.commercialPriority) return false;
    if (q.hasBooking !== undefined && f.hasBooking !== q.hasBooking) return false;
    if (q.intents?.length) {
      if (!f.businessIntent) return false;
      if (!q.intents.every((key) => f.businessIntent![key])) return false;
    }
    if (q.excludeLifecycle?.length && f.eventLifecycle && q.excludeLifecycle.includes(f.eventLifecycle)) return false;
    return true;
  });
}

/**
 * 集計のための数え上げ。管理画面は作らないが、
 * スクリプトから「地域別」「テーマ別」の本数をすぐ出せるようにしておく。
 */
export function countBy(facets: ContentFacets[], key: 'municipalities' | 'regions' | 'category' | 'sportsTeams' | 'collection'): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of facets) {
    const raw = f[key];
    const values = Array.isArray(raw) ? raw : [raw];
    for (const v of values) {
      if (!v) continue;
      counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    }
  }
  return new Map([...counts].sort((a, b) => b[1] - a[1]));
}
