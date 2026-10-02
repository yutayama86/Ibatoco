/**
 * 自動QA（scripts/ui-smoke.mjs）と本番確認（scripts/verify-production.mjs）が共通で見るページ。
 *
 * - TOP・ニュース一覧・最新ニュース・重点イベント・検索・市町村ページ
 * - required … そのページに無いと困るもの（主要CTA・本文の柱）。[CSSセレクタ, 最低件数, 'js'?]
 *   'js' はブラウザでJSが描くもの（検索結果など）。本番HTMLの確認では数えず、UIスモークテストだけで見る
 *
 * 重点イベントは11月の山（土浦花火・あんこう祭）。入れ替えるときはここだけ直す。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const KEY_EVENT_PATHS = [
  '/events/tsuchiura-hanabi-2026/',
  '/events/oarai-ankou-matsuri-2026/',
];

/** 公開中のニュースで、いちばん新しいもの（pubDate → updatedDate → ファイル名の順） */
export function latestNewsPath(root = process.cwd()) {
  const dir = join(root, 'src/content/news');
  const rows = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const fm = readFileSync(join(dir, file), 'utf8').split('---')[1] ?? '';
    const flag = (key) => new RegExp(`^${key}:\\s*true\\b`, 'm').test(fm);
    const date = (key) => fm.match(new RegExp(`^${key}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1] ?? '';
    if (flag('draft') || flag('noindex') || flag('sample') || !/^reviewed:\s*true\b/m.test(fm)) continue;
    rows.push({ slug: file.replace(/\.md$/, ''), pub: date('pubDate'), upd: date('updatedDate') });
  }
  rows.sort((a, b) => b.pub.localeCompare(a.pub) || b.upd.localeCompare(a.upd) || a.slug.localeCompare(b.slug));
  if (!rows[0]) throw new Error('公開中のニュースが見つかりません');
  return `/news/${rows[0].slug}/`;
}

/** @returns {{ path: string, name: string, required: ([string, number] | [string, number, 'js'])[], waitFor?: string, canonical: string }[]} */
export function qaPages(root = process.cwd()) {
  const latest = latestNewsPath(root);
  return [
    {
      name: 'TOP',
      path: '/',
      canonical: '/',
      required: [
        ['[data-module="home_hero"]', 1],
        ['form[action="/search/"]', 1],
        ['[data-module="home_origin"]', 1],
        ['[data-module="home_discover"]', 1],
        ['[data-module="home_area"] a[href^="/area/"]', 44],
        ['[data-module="home_news"] a[href^="/news/"]', 1],
        ['[data-module="home_process"]', 1],
        ['[data-module="home_partner"] a[href^="/biz/"], [data-module="home_partner"] a[href^="/sponsor/"]', 1],
      ],
    },
    {
      name: 'ニュース一覧',
      path: '/news/',
      canonical: '/news/',
      required: [['h1', 1], ['.news-card h3 a[href^="/news/"]', 5]],
    },
    {
      name: '最新ニュース',
      path: latest,
      canonical: latest,
      required: [['h1', 1], ['#conclusion', 1], ['#sources a[href^="http"]', 1]],
    },
    ...KEY_EVENT_PATHS.map((path) => ({
      name: `重点イベント ${path}`,
      path,
      canonical: path,
      required: [['h1', 1], ['#facts', 1], ['[data-growth-next] a[href^="/"]', 1], ['#sources a[href^="http"]', 1]],
    })),
    {
      name: '検索',
      path: '/search/?q=%E8%8A%B1%E7%81%AB',
      canonical: '/search/',
      required: [['input[name="q"]', 1], ['[data-search-results] a[href^="/"]', 1, 'js']],
      waitFor: '[data-search-results] a[href^="/"]',
    },
    {
      name: '市町村（水戸市）',
      path: '/area/mito/',
      canonical: '/area/mito/',
      required: [['h1', 1], ['a[href^="/events/"]', 1]],
    },
  ];
}
