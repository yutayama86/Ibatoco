/**
 * 記事の画像を「どこに出すか」で使い分ける。画像の選び方はこのファイルだけに置く。
 *
 * ## 一覧カード用（listImageOf / listImageForPath）
 * 一覧・おすすめ枠・関連記事のカード。画像の枠を空けない（消さない）ことを優先する。
 *   1. 専用カード画像 … scripts/build-og-backdrop.mjs が作る一覧用カード（src/data/card-images.ts）
 *   2. 記事のビジュアル … frontmatter の ogImage（記事ごとに作った図版）
 *   3. 自動生成OGP   … /og/<collection>/<slug>.png（公開記事はすべてビルド時に生成される）
 *   4. デザインの代替 … 記事に対応しないパス（listImageForPath が null）。呼び出し側がブランドの面を描く
 *
 * ## SNS共有用（shareImageOf）
 * og:image / twitter:image。SNSはSVGを表示できないため、ラスター画像の ogImage → 自動生成OGP。
 * 一覧用のカード画像（地図だけで見出しが無い）はSNS共有には使わない。
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { CARD_IMAGES } from '../data/card-images';

export type ImageCollection = 'news' | 'events';
export type CardImageSource = 'card' | 'visual' | 'generated-og';
export interface CardImage {
  src: string;
  alt: string;
  source: CardImageSource;
}

type Entry = CollectionEntry<'news'> | CollectionEntry<'events'>;

const slugOf = (entry: Entry) => entry.id.split('/').pop()!;
const generatedOg = (collection: ImageCollection, slug: string) => `/og/${collection}/${slug}.png`;
const RASTER = /\.(png|jpe?g|webp)$/i;

/** 一覧カード用の画像 */
export function listImageOf(entry: Entry): CardImage {
  const slug = slugOf(entry);
  const card = CARD_IMAGES[slug];
  if (card) return { src: card, alt: '', source: 'card' };
  if (entry.data.ogImage) return { src: entry.data.ogImage, alt: entry.data.ogImageAlt ?? '', source: 'visual' };
  return { src: generatedOg(entry.collection, slug), alt: '', source: 'generated-og' };
}

/** SNS共有用の画像（og:image）。SVG は使わない */
export function shareImageOf(entry: Entry): string {
  const visual = entry.data.ogImage;
  if (visual && RASTER.test(visual)) return visual;
  return generatedOg(entry.collection, slugOf(entry));
}

let byPath: Map<string, Entry> | undefined;
async function entriesByPath(): Promise<Map<string, Entry>> {
  if (byPath) return byPath;
  const [news, events] = await Promise.all([
    getCollection('news', ({ data }) => !data.draft),
    getCollection('events', ({ data }) => !data.draft),
  ]);
  byPath = new Map<string, Entry>();
  for (const item of news) byPath.set(`/news/${slugOf(item)}/`, item);
  for (const item of events) byPath.set(`/events/${slugOf(item)}/`, item);
  return byPath;
}

/**
 * パスだけ分かっているカード（手で並べたおすすめ枠など）の画像。
 * 記事のページでなければ null（呼び出し側がデザインの代替を描く）。
 */
export async function listImageForPath(path: string): Promise<CardImage | null> {
  const entry = (await entriesByPath()).get(path);
  return entry ? listImageOf(entry) : null;
}
