/**
 * 公開中の記事（events / news）の frontmatter を、Growth Engine と鮮度チェックが共通で使う形に読む。
 * 下書き（draft: true）は除く。日付は YYYY-MM-DD の文字列のまま扱う（日本の暦日）。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const COLLECTIONS = [
  { dir: 'src/content/events', base: '/events/', type: 'event' },
  { dir: 'src/content/news', base: '/news/', type: 'news' },
];

/** YAML が日付を Date にしても、文字列のままでも、YYYY-MM-DD にそろえる */
export function dateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
}

/** @returns {Map<string, any>} path → page */
export function loadContentPages(root = process.cwd()) {
  const pages = new Map();
  for (const { dir, base, type } of COLLECTIONS) {
    for (const file of readdirSync(join(root, dir))) {
      if (!file.endsWith('.md') || file.startsWith('_')) continue;
      const raw = readFileSync(join(root, dir, file), 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;
      let fm;
      try {
        fm = parse(match[1]) ?? {};
      } catch {
        continue;
      }
      if (fm.draft === true) continue;
      const slug = file.replace(/\.md$/, '');
      const info = fm.eventInfo ?? fm.event ?? null;
      const slugYear = slug.match(/(?:^|-)(20\d{2})(?:-|$)/)?.[1];
      pages.set(`${base}${slug}/`, {
        path: `${base}${slug}/`,
        file: `${dir}/${file}`,
        type,
        slug,
        title: fm.title ?? '',
        description: fm.description ?? '',
        articleType: fm.articleType ?? null,
        lifespan: fm.lifespan ?? null,
        keyword: fm.keyword ?? null,
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        municipalities: Array.isArray(fm.municipalities) ? fm.municipalities.map(String) : [],
        pubDate: dateString(fm.pubDate),
        updatedDate: dateString(fm.updatedDate),
        startDate: dateString(info?.startDate),
        endDate: dateString(info?.endDate),
        dateStatus: info?.dateStatus ?? null,
        year: slugYear ? Number(slugYear) : null,
        noindex: fm.noindex === true,
        sourceUrls: Array.isArray(fm.sourceUrls) ? fm.sourceUrls.map((s) => (typeof s === 'string' ? { url: s } : { label: s.label, url: s.url, accessedAt: dateString(s.accessedAt) })) : [],
        frontmatter: fm,
      });
    }
  }
  return pages;
}
