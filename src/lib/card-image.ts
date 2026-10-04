/**
 * 記事の画像を「どこに出すか」で使い分ける。画像の選び方はこのファイルだけに置く。
 *
 * ## 横長の一覧カード（listImageOf / 16:9 前後で画像全体が見える枠）
 * 一覧・関連記事のカード。画像の枠を空けない（消さない）ことを優先する。
 *   1. 記事のビジュアル … frontmatter の ogImage（記事ごとに作った図版）
 *   2. 地図カード     … scripts/build-og-backdrop.mjs が作る一覧用カード（src/data/card-images.ts）
 *   3. 自動生成OGP   … /og/<collection>/<slug>.png（公開記事はすべてビルド時に生成される）
 *
 * ## 細い・縦長のサムネイル（thumbImageOf / listImageForPath。次に読むのカードなど）
 * 文字入りの図版（ogImage・自動生成OGP）は、細い枠で中央を切り抜くと文字の断片しか見えない
 * （2026-10-04、スマホの「このあと、どこ行く？」で「…ポート」のように切れていた）。
 * ここでは文字の無い地図カードを先に使う。地図は画像の中央にあるので、切り抜いても形と印が残る。
 *   1. 地図カード → 2. 記事のビジュアル → 3. 自動生成OGP
 *   4. デザインの代替 … 記事に対応しないパス（listImageForPath が null）。呼び出し側がブランドの面を描く
 *
 * ## SNS共有用（shareImageOf）
 * og:image / twitter:image。SNSはSVGを表示できないため、ラスター画像の ogImage → 自動生成OGP。
 * 地図カード（見出しが無い）はSNS共有には使わない。
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

/** 横長の一覧カード用の画像（画像全体が見える枠） */
export function listImageOf(entry: Entry): CardImage {
  const slug = slugOf(entry);
  if (entry.data.ogImage) return { src: entry.data.ogImage, alt: entry.data.ogImageAlt ?? '', source: 'visual' };
  const card = CARD_IMAGES[slug];
  if (card) return { src: card, alt: '', source: 'card' };
  return { src: generatedOg(entry.collection, slug), alt: '', source: 'generated-og' };
}

/** 細い・縦長のサムネイル用の画像（中央を切り抜く枠）。文字の無い地図カードを先に使う */
export function thumbImageOf(entry: Entry): CardImage {
  const card = CARD_IMAGES[slugOf(entry)];
  if (card) return { src: card, alt: '', source: 'card' };
  return listImageOf(entry);
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
 * パスだけ分かっているカード（手で並べたおすすめ枠など。TocoCard の細い枠）の画像。
 * 記事のページでなければ null（呼び出し側がデザインの代替を描く）。
 */
export async function listImageForPath(path: string): Promise<CardImage | null> {
  const entry = (await entriesByPath()).get(path);
  return entry ? thumbImageOf(entry) : null;
}
