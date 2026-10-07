import type { APIRoute } from 'astro';
import { getAreaCounts, getArticles, getIndexableNews, getIndexableEvents, getStores } from '../lib/content';
import { CATEGORIES, SITE_CONFIG } from '../data/site';
import { VISIBLE_GUIDES } from '../data/guides';
import { VISIBLE_REPORTERS } from '../data/reporters';
import { TRANSLATIONS, DEFAULT_LOCALE } from '../data/i18n';
import { MUNICIPALITIES } from '../data/areas';
import { AREA_GUIDES } from '../data/area-guides';
import { THEMES } from '../data/themes';
import { SPORTS_TEAMS } from '../data/sports';

type SitemapEntry = { path: string; lastmod?: Date };

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const GET: APIRoute = async () => {
  const [articles, stores, areaCounts, news] = await Promise.all([getArticles(), getStores(), getAreaCounts(), getIndexableNews()]);
  const entries: SitemapEntry[] = [
    { path: '/' },
    { path: '/about/' },
    { path: '/about/editorial-policy/' },
    { path: '/about/pr-policy/' },
    { path: '/about/corrections/' },
    { path: '/about/team/' },
    { path: '/area/' },
    { path: '/biz/' },
    { path: '/contact/' },
    { path: '/news/' },
    { path: '/events/' },
    { path: '/sports/' },
  ];

  // スポーツのチームページ。チームが増えたら data/sports.ts に足すだけで反映される。
  for (const team of SPORTS_TEAMS) entries.push({ path: `/sports/${team.slug}/` });

  for (const article of articles) {
    const slug = article.id.split('/').pop();
    entries.push({
      path: `/${CATEGORIES[article.data.category].path}/${slug}/`,
      lastmod: article.data.updatedAt ?? article.data.publishedAt,
    });
  }

  for (const item of news) entries.push({ path: `/news/${item.id.split('/').pop()}/`, lastmod: item.data.updatedDate ?? item.data.pubDate });

  // イベント・おでかけ記事。開催日が過ぎても消さない（翌年に更新して使う）。
  for (const item of await getIndexableEvents()) {
    entries.push({ path: `/events/${item.id.split('/').pop()}/`, lastmod: item.data.updatedDate ?? item.data.pubDate });
  }

  // ニュースのカテゴリ別一覧。記事が1本以上あるものだけ（ページ側の生成条件と同じ）。
  // 最終更新はそのカテゴリで一番新しい記事に合わせる。
  const newsCategoryLastmod = new Map<string, Date>();
  for (const item of news) {
    const date = item.data.updatedDate ?? item.data.pubDate;
    const known = newsCategoryLastmod.get(item.data.category);
    if (!known || date > known) newsCategoryLastmod.set(item.data.category, date);
  }
  for (const [category, lastmod] of newsCategoryLastmod) entries.push({ path: `/news/category/${category}/`, lastmod });

  for (const category of Object.values(CATEGORIES)) {
    if (articles.some((article) => CATEGORIES[article.data.category].path === category.path)) entries.push({ path: `/${category.path}/` });
  }

  if (stores.length > 0) entries.push({ path: '/place/' });
  for (const store of stores) entries.push({ path: `/place/${store.id}/`, lastmod: store.data.verifiedAt ?? store.data.publishedAt });
  // 44市町村ページ。以前は「記事・店舗がある街」だけを載せていたため、
  // 記事が未公開のあいだ全件が sitemap から漏れていた。
  // 実際の noindex 判定（area/[slug].astro）と同じ条件で載せる：
  // 出典付きガイドがある街、日立・大子、または記事/店舗がある街。
  for (const municipality of MUNICIPALITIES) {
    const slug = municipality.slug;
    const indexable =
      slug === 'hitachi' ||
      slug === 'daigo' ||
      !!AREA_GUIDES[slug]?.sources?.length ||
      (areaCounts.get(slug) ?? 0) > 0;
    if (indexable) entries.push({ path: `/area/${slug}/` });
  }

  // テーマページ（海・川・公園・山・花・祭り・紅葉・花火）。生成器への登録漏れで未収録だった。
  for (const theme of Object.values(THEMES)) entries.push({ path: `/${theme.slug}/` });
  entries.push({ path: '/hanabi/' });
  entries.push({ path: '/michinoeki/' });
  entries.push({ path: '/odekake/' });
  // 協賛の案内と規約、地域の店・スポットを探すページ（オーナー判断 2026-10-08）。タグ一覧は noindex なので載せない
  entries.push({ path: '/sponsor/' });
  entries.push({ path: '/sponsor/terms/' });
  entries.push({ path: '/discover/' });

  // /reporters/ はローカルエディター（協力者）の案内ページ。公開中の人物が0人でも内容が成立するため常に掲載する。
  entries.push({ path: '/reporters/' });
  for (const person of VISIBLE_REPORTERS) entries.push({ path: `/reporter/${person.slug}/` });

  if (VISIBLE_GUIDES.length > 0) entries.push({ path: '/guide/' });
  for (const guide of VISIBLE_GUIDES) entries.push({ path: `/guide/${guide.slug}/`, lastmod: new Date(guide.publishedAt) });

  // 多言語ページ（TRANSLATIONS に登録＝実在するものだけ）。日本語は上で既に列挙済み。
  for (const locales of Object.values(TRANSLATIONS)) {
    for (const [locale, path] of Object.entries(locales)) {
      if (locale === DEFAULT_LOCALE || !path) continue;
      entries.push({ path });
    }
  }

  const unique = [...new Map(entries.map((entry) => [entry.path, entry])).values()];
  const urls = unique.map((entry) => {
    const loc = escapeXml(new URL(entry.path, SITE_CONFIG.domain).href);
    const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod.toISOString()}</lastmod>` : '';
    return `<url><loc>${loc}</loc>${lastmod}</url>`;
  }).join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
