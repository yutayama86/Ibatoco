/**
 * サイト内検索（/search/）と行き先診断（/shindan/）が読む索引。
 * 中身は src/lib/site-index.ts。キーを短くして転送量を抑える。
 */
import type { APIRoute } from 'astro';
import { getSiteIndex } from '../lib/site-index';

export const GET: APIRoute = async () => {
  const entries = await getSiteIndex();
  const body = entries.map((entry) => ({
    t: entry.title,
    d: entry.desc,
    u: entry.url,
    k: entry.kind,
    p: entry.places,
    r: entry.regions,
    g: entry.tags,
    i: entry.interests,
    y: entry.yomi,
    ...(entry.months ? { m: entry.months } : {}),
    ...(entry.ym ? { ym: entry.ym } : {}),
    ...(entry.start ? { s: entry.start, e: entry.end } : {}),
    ...(entry.ended ? { x: 1 } : {}),
  }));
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
