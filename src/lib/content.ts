import { getCollection, type CollectionEntry } from 'astro:content';
import { articleTeamSlugs } from '../data/sports';

/** 公開記事を新しい順に。draft または未レビューは環境に関係なく除外。 */
export async function getArticles(): Promise<CollectionEntry<'articles'>[]> {
  const all = await getCollection('articles', ({ data }) => !data.draft && data.reviewed);
  return all.sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}

export async function getArticlesByCategory(category: string) {
  return (await getArticles()).filter((a) => a.data.category === category);
}

export async function getFeatured() {
  return (await getArticles()).filter((a) => a.data.featured);
}

export async function getPlaces(): Promise<CollectionEntry<'places'>[]> {
  const all = await getCollection('places', ({ data }) => !data.draft && data.reviewed);
  return all.sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}

/** 公開可能なニュースを新しい順に。サンプルは表示できるが、検索面では noindex とする。 */
export async function getNews(): Promise<CollectionEntry<'news'>[]> {
  const all = await getCollection('news', ({ data }) => !data.draft && data.reviewed);
  return all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** sitemap / RSS / TOPに載せられる通常ニュース。 */
export async function getIndexableNews(): Promise<CollectionEntry<'news'>[]> {
  return (await getNews()).filter((item) => !item.data.noindex && !item.data.sample);
}

export async function getRelatedNews(current: CollectionEntry<'news'>, limit = 3) {
  const municipalitySet = new Set(current.data.municipalities);
  const tagSet = new Set(current.data.tags);
  return (await getIndexableNews())
    .filter((item) => item.id !== current.id)
    .map((item) => ({
      item,
      score:
        item.data.municipalities.filter((slug) => municipalitySet.has(slug)).length * 4 +
        item.data.tags.filter((tag) => tagSet.has(tag)).length * 2 +
        (item.data.category === current.data.category ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.data.pubDate.valueOf() - a.item.data.pubDate.valueOf())
    .slice(0, limit)
    .map(({ item }) => item);
}

import { areaToSlug } from '../data/areas';

/**
 * 手書き店舗(places.md)と無料一括掲載(stores.csv)を統合した「店舗」正規化型。
 * ディレクトリ /place/・詳細 /place/[id]・エリア/ジャンルページはこれを使う。
 * source==='md' のときだけ本文(entry)を render できる。
 */
export type Store = {
  id: string;
  source: 'md' | 'csv';
  entry?: CollectionEntry<'places'>;
  data: {
    name: string;
    kana?: string;
    category: string;
    tagline: string;
    description: string;
    cover?: string;
    gallery: string[];
    recommend?: string;
    area: string;
    address?: string;
    access?: string;
    hours?: string;
    holiday?: string;
    tel?: string;
    budget?: string;
    features: string[];
    website?: string;
    instagram?: string;
    map?: string;
    menu: { name: string; price: string; note?: string }[];
    faq: { q: string; a: string }[];
    reserveUrl?: string;
    plan: 'free' | 'official' | 'growth' | 'partner';
    publishedAt: Date;
    reviewed: boolean;
    verifiedAt?: Date;
    disclosure: 'editorial' | 'partner' | 'pr';
    disclosureNote?: string;
    sources?: { label: string; url?: string; accessedAt?: Date }[];
  };
};

/** 全店舗（md＋csv）を新しい順に統合。同一slugはmd（作り込み）を優先。 */
export async function getStores(): Promise<Store[]> {
  const [mdPlaces, csvRows] = await Promise.all([
    getPlaces(),
    getCollection('stores', ({ data }) => !(data as { draft?: boolean }).draft && !!(data as { reviewed?: boolean }).reviewed),
  ]);
  const md: Store[] = mdPlaces.map((p) => ({
    id: p.id.split('/').pop()!,
    source: 'md',
    entry: p,
    data: p.data as unknown as Store['data'],
  }));
  const csv: Store[] = csvRows.map((s) => ({
    id: s.id,
    source: 'csv',
    data: { gallery: [], menu: [], faq: [], ...(s.data as object) } as unknown as Store['data'],
  }));
  const seen = new Set(md.map((s) => s.id));
  const merged = [...md, ...csv.filter((s) => !seen.has(s.id))];
  return merged.sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}

/**
 * preview を含め、公開確認済みデータだけを返す。
 * 開発環境で draft の架空記事・店舗を視覚確認用に露出させないための境界。
 */
export async function getPublishedArticles(): Promise<CollectionEntry<'articles'>[]> {
  return getArticles();
}

export async function getPublishedStores(): Promise<Store[]> {
  return (await getStores()).filter((store) => {
    if (store.source === 'md') return !store.entry?.data.draft && !!store.entry?.data.reviewed;
    return !(store.data as Store['data'] & { draft?: boolean }).draft && !!store.data.reviewed;
  });
}

export async function getStoresByArea(slug: string): Promise<Store[]> {
  return (await getStores()).filter((s) => areaToSlug(s.data.area) === slug);
}

/** 市町村slugごとの記事・店舗件数（コンテンツのある市町村を把握） */
export async function getAreaCounts(): Promise<Map<string, number>> {
  const [articles, stores] = await Promise.all([getArticles(), getStores()]);
  const counts = new Map<string, number>();
  for (const a of articles) {
    const s = areaToSlug(a.data.area);
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  for (const p of stores) {
    const s = areaToSlug(p.data.area);
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return counts;
}

/** 通常記事とニュースを横断したタグ一覧（重複除去・件数付き）。 */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const [articles, news] = await Promise.all([getArticles(), getIndexableNews()]);
  const map = new Map<string, number>();
  for (const a of articles) for (const t of a.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  for (const item of news) for (const t of item.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

export async function getArticlesByTag(tag: string) {
  return (await getArticles()).filter((a) => a.data.tags.includes(tag));
}

export async function getNewsByTag(tag: string) {
  return (await getIndexableNews()).filter((item) => item.data.tags.includes(tag));
}

/** カテゴリ別のニュース。/news/category/<key>/ とヘッダーのプルダウンで使う。 */
export async function getNewsByCategory(category: string) {
  return (await getIndexableNews()).filter((item) => item.data.category === category);
}

/**
 * カテゴリごとの記事数。0件のカテゴリは返さない。
 * 中身の無いカテゴリページやプルダウン項目を作らないための土台。
 */
export async function getNewsCategoryCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const item of await getIndexableNews()) {
    counts.set(item.data.category, (counts.get(item.data.category) ?? 0) + 1);
  }
  return counts;
}

/** Cloudflare静的配信でも安定するASCIIタグslug。表示名は元の日本語を使う。 */
export function tagToSlug(tag: string): string {
  const bytes = new TextEncoder().encode(tag.normalize('NFC'));
  return `t-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function getArticlesByArea(slug: string) {
  return (await getArticles()).filter((a) => areaToSlug(a.data.area) === slug);
}

/** 指定レポーター（表示名）が取材した記事 */
export async function getArticlesByReporter(name: string) {
  return (await getArticles()).filter((a) => a.data.reporter === name);
}

export async function getPlacesByArea(slug: string) {
  return (await getPlaces()).filter((p) => areaToSlug(p.data.area) === slug);
}

// === 2026 Renewal：市町村 ↔ Story / Person / Place を接続するデータ構造 ===
// AreaExplorer（M3の隣接パネル）が、選択中の市町村の代表コンテンツと最終更新日を
// 表示するための集約。実データが無ければ空を返す（架空コンテンツは出さない）。
import { VISIBLE_REPORTERS, type Reporter } from '../data/reporters';
import { MUNI_BY_SLUG, REGIONS } from '../data/areas';

export interface AreaSummary {
  slug: string;
  name: string;
  region: string; // 5地域ラベル
  stories: CollectionEntry<'articles'>[];
  places: Store[];
  people: Reporter[];
  lastUpdated: Date | null;
  hasContent: boolean;
}

export async function getAreaSummary(slug: string): Promise<AreaSummary> {
  const muni = MUNI_BY_SLUG.get(slug);
  const regionLabel = muni ? REGIONS[muni.region].label : '';
  const [allStories, allPlaces] = await Promise.all([getPublishedArticles(), getPublishedStores()]);
  const stories = allStories.filter((article) => areaToSlug(article.data.area) === slug);
  const places = allPlaces.filter((store) => areaToSlug(store.data.area) === slug);
  // 担当エリアに市町村名・地域名・「全域」を含むレポーターを紐付け
  const people = VISIBLE_REPORTERS.filter((r) => {
    const a = r.area ?? '';
    return a.includes('全域') || (!!muni && a.includes(muni.name)) || (!!regionLabel && a.includes(regionLabel));
  });
  const dates: number[] = [];
  for (const s of stories) dates.push((s.data.updatedAt ?? s.data.publishedAt).valueOf());
  for (const p of places) dates.push(p.data.publishedAt.valueOf());
  const lastUpdated = dates.length ? new Date(Math.max(...dates)) : null;
  return {
    slug,
    name: muni?.name ?? slug,
    region: regionLabel,
    stories,
    places,
    people,
    lastUpdated,
    hasContent: stories.length + places.length > 0,
  };
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * スポーツ記事。sportsTeam が指定された公開記事だけを新しい順で返す。
 * team を渡すとそのチームに絞る。まだ0件でも落ちない。
 */
export async function getSportsNews(team?: string): Promise<CollectionEntry<'news'>[]> {
  const all = await getIndexableNews();
  return all.filter((item) => {
    // sportsTeam（単体）と sportsTeams（複数）の両方を見る。
    // 1記事を複数チームのページへ出すため（例：水戸 vs 鹿島）。
    const teams = articleTeamSlugs(item.data);
    if (teams.length === 0) return false;
    return team ? teams.includes(team as (typeof teams)[number]) : true;
  });
}

/**
 * チームに関係する記事を、sportsTeam が未設定の既存記事も含めて拾う。
 * 既存記事を書き換えずに /sports/ から参照するための、当面の橋渡し。
 * 判定はタグとタイトルの一致だけで、推測はしない。
 */
export async function getSportsNewsByKeyword(keywords: string[]): Promise<CollectionEntry<'news'>[]> {
  if (keywords.length === 0) return [];
  const all = await getIndexableNews();
  return all.filter((item) => {
    const haystack = [item.data.title, ...(item.data.tags ?? [])].join(' ');
    return keywords.some((k) => haystack.includes(k));
  });
}

/** イベント・おでかけ記事（/events/）。公開済みのみ。新しい開催日が先。 */
export async function getEvents(): Promise<CollectionEntry<'events'>[]> {
  const all = await getCollection('events', ({ data }) => !data.draft && data.reviewed);
  return all.sort((a, b) => {
    const ad = a.data.eventInfo?.startDate?.valueOf() ?? a.data.pubDate.valueOf();
    const bd = b.data.eventInfo?.startDate?.valueOf() ?? b.data.pubDate.valueOf();
    return ad - bd;
  });
}

/** sitemap・一覧に載せるもの（noindex を除く） */
export async function getIndexableEvents(): Promise<CollectionEntry<'events'>[]> {
  return (await getEvents()).filter((item) => !item.data.noindex);
}

/** その市町村のイベント記事。/area/<slug>/ から引く */
export async function getEventsByMunicipality(slug: string) {
  return (await getIndexableEvents()).filter((item) => item.data.municipalities.includes(slug as never));
}
