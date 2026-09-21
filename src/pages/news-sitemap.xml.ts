import type { APIRoute } from 'astro';
import { getIndexableNews } from '../lib/content';
import { SITE_CONFIG } from '../data/site';

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export const GET: APIRoute = async () => {
  const news = await getIndexableNews();
  const now = Date.now();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

  const recent = news
    .filter((item) => {
      const published = item.data.pubDate.valueOf();
      return published <= now && now - published <= twoDaysMs;
    })
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, 1000);

  const urls = recent.map((item) => {
    const slug = item.id.split('/').pop();
    const loc = escapeXml(new URL(`/news/${slug}/`, SITE_CONFIG.domain).href);
    const date = item.data.pubDate.toISOString();
    const title = escapeXml(item.data.title);
    return `<url><loc>${loc}</loc><news:news><news:publication><news:name>イバトコ</news:name><news:language>ja</news:language></news:publication><news:publication_date>${date}</news:publication_date><news:title>${title}</news:title></news:news></url>`;
  }).join('');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
