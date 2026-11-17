/**
 * /control/ 用：44市町村ごとの記事数と検索流入（reports/editorial/area-coverage.md と同じ計算）。
 * 計算は src/lib/area-coverage.mjs。記事はビルド時のコレクション、数字は performance-snapshot の pageMetrics。
 */
import { getCollection } from 'astro:content';
import { MUNICIPALITIES } from '../data/areas';
import { buildAreaCoverage } from './area-coverage.mjs';

const AREAS = MUNICIPALITIES.map((a) => ({ slug: a.slug as string, name: a.name as string, region: a.region as string }));
const byName = new Map<string, string>(AREAS.map((a) => [a.name, a.slug]));
const dateOnly = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : null);
const isPublished = (d: Record<string, unknown>) => d.draft !== true && d.noindex !== true && d.sample !== true;
const munis = (d: Record<string, unknown>) => {
  const set = new Set<string>(Array.isArray(d.municipalities) ? (d.municipalities as string[]) : []);
  for (const key of ['area', 'municipality']) {
    const v = d[key];
    if (typeof v === 'string' && byName.has(v)) set.add(byName.get(v)!);
  }
  return [...set];
};

export async function loadAreaCoverage(snapshot: unknown) {
  const raw = [
    ...(await getCollection('events')).map((e) => ({ path: `/events/${e.id}/`, data: e.data as Record<string, unknown>, collection: 'events' })),
    ...(await getCollection('news')).map((e) => ({ path: `/news/${e.id}/`, data: e.data as Record<string, unknown>, collection: 'news' })),
    ...(await getCollection('articles')).map((e) => ({ path: `/${(e.data as Record<string, unknown>).category}/${e.id.split('/').pop()}/`, data: e.data as Record<string, unknown>, collection: 'articles' })),
  ];
  const entries = raw.map(({ path, data, collection }) => ({
    path,
    title: String(data.title ?? path),
    collection,
    pubDate: dateOnly(data.pubDate ?? data.publishedAt),
    municipalities: munis(data),
    published: isPublished(data),
  }));
  return buildAreaCoverage(AREAS, entries, snapshot);
}
