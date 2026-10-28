/**
 * 図鑑の産地地図（/food-library/map/<slug>.svg）。
 * 44市町村の正確な境界（src/data/ibaraki-geo.ts）をそのまま描き、図鑑の産地だけを差し色で塗る。
 * 画像として配信するので、ページの HTML を重くしない（境界データは約220KB）。
 * 文字は入れない（画像の中の字は読み上げられず、フォントも揃わないため）。産地の名前はページの一覧に出す。
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { FOOD_GUIDES, FOOD_BY_SLUG, type FoodSlug } from '../../../data/food-library';
import { IBARAKI_GEO, GEO_VIEW } from '../../../data/ibaraki-geo';
import { compactPath } from '../../../lib/svg-path';

/** all.svg は親ページ用。どれかの図鑑に産地として出てくる市町村を、すべて塗る */
export const getStaticPaths = (() => [...FOOD_GUIDES.map((guide) => guide.slug), 'all'].map((slug) => ({ params: { slug } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const guide = params.slug === 'all' ? null : FOOD_BY_SLUG.get(params.slug as FoodSlug);
  if (params.slug !== 'all' && !guide) return new Response('Not found', { status: 404 });
  const active = new Set((guide ? [guide] : FOOD_GUIDES).flatMap((item) => item.areas.map((area) => area.slug)));
  const accent = guide?.accent ?? '#173c59';
  // 表示は 300px 前後なので、座標は小数点以下1桁で十分（519×660 に対して 0.05 以下の誤差）
  const shapes = Object.entries(IBARAKI_GEO)
    .sort(([a], [b]) => Number(active.has(a)) - Number(active.has(b)))
    .map(([slug, geo]) => `<path d="${compactPath(geo.d, 1)}"${active.has(slug) ? ' class="on"' : ''}/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GEO_VIEW.w} ${GEO_VIEW.h}" width="${GEO_VIEW.w}" height="${GEO_VIEW.h}">`
    + `<style>path{fill:#e7e0d3;stroke:#f6f1e8;stroke-width:1.1;stroke-linejoin:round}.on{fill:${accent};stroke:#f6f1e8}</style>`
    + shapes
    + '</svg>';
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
};
