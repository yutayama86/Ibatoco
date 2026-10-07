/**
 * Index Health Check：sitemap.xml と、ビルド結果（dist）の HTML・記事の frontmatter を突き合わせる。
 *
 * ネットワークには触れない（本番に配信されるのは dist そのものなので、dist を見れば足りる。外部HTTPの一時エラーで CI が揺れない）。
 * npm run build の最後に実行される。--write で /control/ の Index Health カードに結果を書き込む（dist/control/index.html）。
 *
 * CI を止めるもの（終了コード1）
 *   - sitemap の重複 URL
 *   - sitemap に存在しない URL（dist に HTML が無い）
 *   - sitemap に noindex のページ
 *   - sitemap に draft・未レビューの記事
 *   - canonical 不整合（sitemap の URL の canonical が自分自身でない・canonical が無い）
 *   - 公開記事（draft:false・reviewed・noindex:false で、canonical が自分自身）が sitemap に無い
 * 参考（止めない）
 *   - 記事以外で、noindex でも canonical 違いでもないのに sitemap に無いページ（一覧の2ページ目など。意図した除外か確認する）
 *
 * 使い方：node scripts/index-health.mjs [--write] [--json]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SITE = 'https://ibatoco.jp';
// sitemap の対象外にしているもの（検索に出さない管理・確認用・機械向け）
const EXCLUDED_PREFIXES = ['/control/', '/preview/', '/og/', '/reserve/', '/submit/', '/search/', '/404'];

const decode = (value) => value.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] ?? null;
const normalize = (href) => {
  try {
    const url = new URL(decode(href), SITE);
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
};

/** dist の中の HTML ファイル → URL パス */
function htmlPaths(dir = DIST, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...htmlPaths(full, `${base}/${name}`));
    else if (name === 'index.html') out.push(`${base}/`);
    else if (name.endsWith('.html')) out.push(`${base}/${name.replace(/\.html$/, '')}`);
  }
  return out;
}

function fileFor(path) {
  const clean = decodeURIComponent(path);
  const candidates = clean.endsWith('/') ? [join(DIST, clean, 'index.html')] : [join(DIST, `${clean}.html`), join(DIST, clean, 'index.html')];
  return candidates.find((file) => existsSync(file)) ?? null;
}

/** HTML の head から canonical と robots を読む */
function headOf(file) {
  const html = readFileSync(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>') > 0 ? html.indexOf('</head>') : 20000);
  const canonicalTag = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((tag) => /rel\s*=\s*["']canonical["']/i.test(tag));
  const robotsTags = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => /name\s*=\s*["'](robots|googlebot)["']/i.test(tag));
  const noindex = robotsTags.some((tag) => /noindex/i.test(attr(tag, 'content') ?? ''));
  const redirect = /<meta\b[^>]*http-equiv\s*=\s*["']refresh["']/i.test(head);
  return { canonical: canonicalTag ? normalize(attr(canonicalTag, 'href') ?? '') : null, noindex, redirect };
}

/** 記事（events・news・articles）の URL と公開状態。draft も含めて frontmatter を直接読む（places・stores は dist 側の検査で扱う） */
function contentEntries() {
  const flags = (file) => {
    const fm = readFileSync(file, 'utf8').split(/^---\s*$/m)[1] ?? '';
    const flag = (key) => fm.match(new RegExp(`^${key}:\\s*(true|false)\\s*$`, 'm'))?.[1];
    return { published: flag('draft') !== 'true' && flag('reviewed') === 'true', indexable: flag('noindex') !== 'true' && flag('sample') !== 'true' };
  };
  const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.mdx?$/.test(name) && !name.startsWith('_') ? [full] : [];
  }) : []);
  const slugOf = (file) => file.split('/').pop().replace(/\.mdx?$/, '');
  const entries = [];
  for (const [dir, base] of [['src/content/events', '/events/'], ['src/content/news', '/news/']]) {
    for (const file of walk(join(ROOT, dir))) entries.push({ path: `${base}${slugOf(file)}/`, ...flags(file) });
  }
  // articles は URL がカテゴリの表示用パスになる（src/data/site.ts）。slug だけで照合する
  for (const file of walk(join(ROOT, 'src/content/articles'))) entries.push({ slug: slugOf(file), articleSlug: true, ...flags(file) });
  return entries;
}

export function checkIndexHealth() {
  const issues = [];
  const add = (type, path, detail, blocker = true) => issues.push({ type, path, detail, blocker });
  const sitemapFile = join(DIST, 'sitemap.xml');
  if (!existsSync(sitemapFile)) {
    add('sitemap-missing', '/sitemap.xml', 'dist/sitemap.xml がありません（npm run build の後に実行する）');
    return summarize([], issues, 0);
  }
  const locs = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim()));
  const seen = new Map();
  const sitemapPaths = new Set();
  for (const loc of locs) {
    const url = normalize(loc);
    if (!url || !url.startsWith(`${SITE}/`)) { add('foreign-url', loc, `サイト外・不正な URL（${SITE} 以外）`); continue; }
    const path = new URL(url).pathname;
    // 末尾スラッシュの有無だけが違うものも重複として扱う
    const key = path.endsWith('/') ? path : `${path}/`;
    if (seen.has(key)) add('duplicate', path, `sitemap に重複（${seen.get(key)} と同じ）`);
    seen.set(key, path);
    sitemapPaths.add(path);
    const file = fileFor(path);
    if (!file) { add('not-found', path, 'dist に HTML が無い（存在しない URL）'); continue; }
    const head = headOf(file);
    if (head.redirect) add('redirect', path, 'リダイレクト用のページが sitemap に入っている');
    if (head.noindex) add('noindex-in-sitemap', path, 'noindex のページが sitemap に入っている');
    if (!head.canonical) add('canonical', path, 'canonical が無い');
    else if (head.canonical !== url) add('canonical', path, `canonical が自分自身ではない（${head.canonical}）`);
  }

  // 記事：draft・未レビューの混入と、公開記事の欠落
  const entries = contentEntries();
  const sitemapSlugs = new Set([...sitemapPaths].map((p) => p.split('/').filter(Boolean).pop()));
  for (const entry of entries) {
    const inSitemap = entry.articleSlug ? sitemapSlugs.has(entry.slug) : sitemapPaths.has(entry.path);
    const label = entry.path ?? `（articles）${entry.slug}`;
    if (!entry.published && inSitemap) add('draft-in-sitemap', label, 'draft または未レビューの記事が sitemap に入っている');
    if (entry.published && entry.indexable && !inSitemap && entry.path) {
      const file = fileFor(entry.path);
      if (!file) { add('missing-from-sitemap', entry.path, '公開記事なのに dist に HTML も無い'); continue; }
      const head = headOf(file);
      if (!head.noindex && head.canonical === normalize(entry.path)) add('missing-from-sitemap', entry.path, '公開記事（draft:false・noindex:false・canonical が自分自身）なのに sitemap に無い');
    }
  }

  // 参考：記事以外で、検索に出す設定なのに sitemap に無いページ
  const contentPaths = new Set(entries.filter((e) => e.path).map((e) => e.path));
  const pages = htmlPaths();
  let otherMissing = 0;
  for (const path of pages) {
    if (sitemapPaths.has(path) || contentPaths.has(path) || EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
    const head = headOf(fileFor(path));
    if (head.noindex || head.redirect || head.canonical !== normalize(path)) continue;
    otherMissing += 1;
    add('not-in-sitemap', path, '記事以外で、noindex でも canonical 違いでもないのに sitemap に無い（意図した除外か確認）', false);
  }
  return summarize(locs, issues, pages.length, otherMissing);
}

function summarize(locs, issues, htmlPages, otherMissing = 0) {
  const count = (...types) => issues.filter((i) => types.includes(i.type) && i.blocker).length;
  const checkedAt = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  return {
    checkedAt: `${checkedAt}（JST・ビルド時）`,
    sitemapUrls: locs.length,
    htmlPages,
    counts: {
      missingFromSitemap: count('missing-from-sitemap'),
      noindexInSitemap: count('noindex-in-sitemap'),
      duplicateUrls: count('duplicate'),
      canonicalErrors: count('canonical'),
      draftInSitemap: count('draft-in-sitemap'),
      notFound: count('not-found', 'foreign-url', 'redirect', 'sitemap-missing'),
      otherNotInSitemap: otherMissing,
    },
    blockers: issues.filter((i) => i.blocker),
    notes: issues.filter((i) => !i.blocker),
  };
}

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** /control/ の Index Health カードの中身（src/components/control/IndexHealthCard.astro の差し込み位置） */
function cardHtml(result) {
  const rows = [
    ['Sitemap URLs', result.sitemapUrls, false],
    ['Missing from Sitemap', result.counts.missingFromSitemap, true],
    ['noindex in Sitemap', result.counts.noindexInSitemap, true],
    ['Duplicate URLs', result.counts.duplicateUrls, true],
    ['Canonical Errors', result.counts.canonicalErrors, true],
    ['draft in Sitemap', result.counts.draftInSitemap, true],
    ['存在しない URL', result.counts.notFound, true],
  ];
  const ok = result.blockers.length === 0;
  const items = rows.map(([label, value, isProblem]) => `<div class="ih-row${isProblem && value > 0 ? ' is-bad' : ''}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value.toLocaleString('ja-JP'))}</dd></div>`).join('');
  const detail = result.blockers.slice(0, 5).map((i) => `<li>${escapeHtml(i.path)}：${escapeHtml(i.detail)}</li>`).join('');
  return `<p class="ih-status ${ok ? 'is-good' : 'is-bad'}">${ok ? '正常' : `問題 ${result.blockers.length} 件`}</p>`
    + `<dl class="ih-grid">${items}</dl>`
    + (detail ? `<ul class="ih-issues">${detail}</ul>` : '')
    + `<p class="ih-note">最終チェック：${escapeHtml(result.checkedAt)}。参考：記事以外で sitemap に無い公開ページ ${escapeHtml(result.counts.otherNotInSitemap)} 件（意図した除外を含む）</p>`;
}

function writeCard(result) {
  const file = join(DIST, 'control', 'index.html');
  if (!existsSync(file)) return false;
  const html = readFileSync(file, 'utf8');
  const re = /(<div\b[^>]*data-index-health-body[^>]*>)[\s\S]*?(<\/div>\s*<span\b[^>]*data-index-health-end)/;
  if (!re.test(html)) return false;
  writeFileSync(file, html.replace(re, (_, open, close) => `${open}${cardHtml(result)}${close}`));
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = checkIndexHealth();
  if (process.argv.includes('--write') && !writeCard(result)) console.warn('Index Health：/control/ のカードに書き込めませんでした（dist/control/index.html の差し込み位置が見つからない）');
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    const c = result.counts;
    console.log(`Index Health：sitemap ${result.sitemapUrls} URL・HTML ${result.htmlPages} ページを検査`);
    console.log(`  欠落 ${c.missingFromSitemap}・noindex 混入 ${c.noindexInSitemap}・重複 ${c.duplicateUrls}・canonical 不整合 ${c.canonicalErrors}・draft 混入 ${c.draftInSitemap}・存在しない URL ${c.notFound}`);
    for (const issue of result.blockers) console.error(`  [error] ${issue.type}：${issue.path} ${issue.detail}`);
    if (result.notes.length) console.log(`  参考：記事以外で sitemap に無い公開ページ ${result.notes.length} 件（${result.notes.slice(0, 8).map((n) => n.path).join('、')}${result.notes.length > 8 ? ' ほか' : ''}）`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const c = result.counts;
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### Index Health\n\nsitemap ${result.sitemapUrls} URL・欠落 ${c.missingFromSitemap}・noindex 混入 ${c.noindexInSitemap}・重複 ${c.duplicateUrls}・canonical 不整合 ${c.canonicalErrors}・draft 混入 ${c.draftInSitemap}・存在しない URL ${c.notFound}\n`, { flag: 'a' });
  }
  for (const issue of result.blockers) if (process.env.GITHUB_ACTIONS) console.log(`::error title=Index Health::${issue.path} ${issue.detail}`);
  process.exit(result.blockers.length ? 1 : 0);
}
