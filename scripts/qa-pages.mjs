/**
 * 自動QA（scripts/ui-smoke.mjs）と本番確認（scripts/verify-production.mjs）が共通で見るページ。
 *
 * - 主要テンプレートを最低1ページずつ：TOP・ニュース一覧・最新ニュース・重点イベント・イベント一覧・テーマ（紅葉）・
 *   SPORTS・市町村・Discovery・事業者向け・情報送信・検索・Control Center
 * - required … そのページに無いと困るもの（主要CTA・本文の柱）。[CSSセレクタ, 最低件数, 'js'?]
 *   'js' はブラウザでJSが描くもの（検索結果など）。本番HTMLの確認では数えず、UIスモークテストだけで見る
 * - 一般ページは共通の骨格（SITE_FRAME：ヘッダー・ナビ・本文・フッター）も必須にする
 * - localOnly … 本番ではログインが必要なページ（/control/）。ビルド出力でだけ表示を検査し、本番は認証の転送だけを確かめる
 *
 * 重点イベントは11月の山（土浦花火・あんこう祭）と紅葉の代表（袋田の滝）。入れ替えるときはここだけ直す。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const KEY_EVENT_PATHS = [
  '/events/tsuchiura-hanabi-2026/',
  '/events/oarai-ankou-matsuri-2026/',
];

/** 季節の重点ページ（紅葉）。イベント記事だが #facts を持たない型なので別に定義する */
export const SEASONAL_GUIDE_PATHS = [
  '/events/fukuroda-falls-autumn-2026/',
];

/** 一般ページの骨格。ヘッダー・ナビ・本文・フッターが欠けたら表示崩れとして扱う（本番HTMLでは data 属性だけ数える） */
const SITE_FRAME = [['[data-site-header]', 1], ['nav', 1, 'js'], ['main', 1, 'js'], ['footer', 1, 'js']];

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

/** @returns {{ path: string, name: string, required: ([string, number] | [string, number, 'js'])[], waitFor?: string, canonical: string, localOnly?: boolean }[]} */
export function qaPages(root = process.cwd()) {
  const latest = latestNewsPath(root);
  const pages = [
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
      required: [['h1', 1], ['#facts', 1], ['[data-growth-next] a[href^="/"]', 1], ['[data-booking-guide]', 1], ['#sources a[href^="http"]', 1]],
    })),
    ...SEASONAL_GUIDE_PATHS.map((path) => ({
      name: `季節の重点 ${path}`,
      path,
      canonical: path,
      required: [['h1', 1], ['[data-growth-next] a[href^="/"]', 1], ['[data-booking-guide]', 1], ['#sources a[href^="http"]', 1]],
    })),
    {
      name: 'テーマ（紅葉）',
      path: '/kouyou/',
      canonical: '/kouyou/',
      required: [['h1', 1], ['a[href^="/events/"]', 1]],
    },
    {
      name: 'SPORTS',
      path: '/sports/',
      canonical: '/sports/',
      required: [['h1', 1], ['a[href^="/sports/"]', 2]],
    },
    {
      name: 'イベント一覧',
      path: '/events/',
      canonical: '/events/',
      required: [['h1', 1], ['[data-module="events_discovery"] a[href="/discover/"]', 1], ['a[href="/submit/#event"]', 1]],
    },
    {
      name: 'Discovery',
      path: '/discover/',
      canonical: '/discover/',
      required: [['h1', 1], ['[data-discovery-form]', 1], ['[data-discovery-card]', 3]],
    },
    {
      name: '事業者向け',
      path: '/biz/',
      canonical: '/biz/',
      required: [['h1', 1], ['a[href="/submit/#business"]', 1], ['a[href^="/contact/"]', 1]],
    },
    {
      name: '情報送信',
      path: '/submit/',
      canonical: '/submit/',
      required: [['h1', 1], ['#event-submission', 1], ['#business-submission', 1], ['button[type="submit"]', 2]],
    },
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
    {
      name: '市町村（土浦市）',
      path: '/area/tsuchiura/',
      canonical: '/area/tsuchiura/',
      required: [['h1', 1], ['a[href^="/events/"]', 1]],
    },
  ];
  return [
    ...pages.map((page) => ({ ...page, required: [...SITE_FRAME, ...page.required] })),
    {
      name: 'Control Center',
      path: '/control/',
      canonical: '/control/',
      localOnly: true,
      required: [['main', 1, 'js'], ['h1', 1]],
    },
  ];
}
