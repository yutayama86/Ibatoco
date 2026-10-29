/**
 * 記事1本を、ビルド成果物と（あれば）本番の両方で検証する。
 *
 *   node scripts/verify-article.mjs <slug> [--prod]
 *
 * 毎回その場でgrepを書くのをやめるために作った。
 * 今日だけで4回、手書きの確認コマンドのほうが間違っていて、
 * 直っているものを「直っていない」と誤判定した。原因は毎回同じ系統で、
 * ここに閉じ込めてある。
 *
 *  - Astroはスコープ付きCSSのため生成HTMLへ data-astro-cid-… を付ける。
 *    `<br>` や `<dt>リーグ</dt>` のようなタグ直打ちのgrepは一致しない。
 *    → このスクリプトは属性を許容した正規表現だけを使う。
 *  - `_` 始まりのファイルはAstroが無視する。テスト記事が検証されない。
 *    → slugの先頭が `_` なら警告する。
 *  - draft記事はページが生成されない。「無い」ことが正しい場合がある。
 *    → draft状態を先に読み、期待する結果を切り替える。
 */
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const SITE = 'https://ibatoco.jp';
const DIST = 'dist';

const [, , slugArg, ...flags] = process.argv;
const checkProd = flags.includes('--prod');

if (!slugArg) {
  console.error('使い方: node scripts/verify-article.mjs <slug> [--prod]');
  process.exit(2);
}
const slug = slugArg.replace(/^\/?(news\/)?/, '').replace(/\/$/, '');

const ok = (s) => `\x1b[32m✓\x1b[0m ${s}`;
const ng = (s) => `\x1b[31m✗\x1b[0m ${s}`;
const warn = (s) => `\x1b[33m!\x1b[0m ${s}`;
let failures = 0;
const fail = (msg) => { failures += 1; console.log(ng(msg)); };
const pass = (msg) => console.log(ok(msg));

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

/** タグ直打ちを避け、属性が挟まっても一致する形にする */
const tag = (name, attrs = '') =>
  new RegExp(`<${name}\\b[^>]*${attrs}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
/**
 * content の値は、開いた引用符と同じ引用符で閉じるまで読む。
 * 以前は ["']([^"']*) だったため、値にアポストロフィを含む description
 * （「BREWERS' GATE HITACHINAKA」など）がそこで切れ、実際は123字でも「51字」と出た。
 * これだと180字を超えていても短く読めてしまい、範囲外を見逃す。
 */
const meta = (key, kind = 'name') =>
  new RegExp(`<meta\\s+${kind}=["']${key}["']\\s+content=["']((?:(?<=")[^"]*|(?<=')[^']*))["']`, 'i');

console.log(`\n\x1b[1m記事の検証: ${slug}\x1b[0m`);

if (slug.startsWith('_')) {
  console.log(warn('slugが _ で始まっています。Astroはこのファイルを無視するため、記事として生成されません。'));
}

// ── 1. ソースの frontmatter ───────────────────────────────
// news と events の両方を見る。どちらに置いたかを呼び出し側が意識しなくてよいように。
const CANDIDATES = [
  { dir: 'src/content/news', route: 'news' },
  { dir: 'src/content/events', route: 'events' },
];
let srcPath = '';
let route = 'news';
for (const c of CANDIDATES) {
  const p = join(c.dir, `${slug}.md`);
  if (await exists(p)) { srcPath = p; route = c.route; break; }
}
if (!srcPath) {
  console.log(ng(`記事ファイルが見つかりません（news / events のどちらにも）: ${slug}.md`));
  process.exit(1);
}
console.log(`  コレクション        ${route}`);
const src = await readFile(srcPath, 'utf8');
const fm = src.split(/^---$/m)[1] ?? '';
const field = (k) => fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim();

const isDraft = field('draft') !== 'false';
const reviewed = field('reviewed') === 'true';
console.log(`\n  draft状態          ${isDraft ? '\x1b[33mtrue（下書き・未公開）\x1b[0m' : 'false（公開）'}`);
if (!isDraft && !reviewed) fail('draft:false なのに reviewed:true がありません（スキーマが弾きます）');

// 出典
const sourceCount = (fm.match(/^\s{2}- label:/gm) ?? []).length;
if (!isDraft && sourceCount === 0) fail('公開記事に sourceUrls がありません');
else console.log(`  出典               ${sourceCount}件`);

// description の長さはビルド前に見る。スキーマも弾くが、
// ビルドを1回回すより先に分かるほうが早い
const fmDesc = fm.match(/^description:\s*["']([\s\S]*?)["']\s*$/m)?.[1];
if (fmDesc !== undefined) {
  const n = [...fmDesc].length;
  if (n < 40 || n > 180) fail(`description が ${n}字（40〜180字の範囲外）`);
}

// OG画像の実体。パスだけ書いてファイルが無いと、本番で画像が出ない
const ogLocalPath = field('ogImage')?.replace(/["']/g, '');
if (ogLocalPath && !(await exists(join('public', ogLocalPath)))) {
  fail(`ogImage のファイルがありません: public${ogLocalPath}`);
}
if (ogLocalPath && !field('ogImageAlt')) fail('ogImage があるのに ogImageAlt がありません');

// events だけの必須項目。あとでGSCと突き合わせる軸なので、空だと分析できない
if (route === 'events') {
  for (const k of ['articleType', 'searchIntent', 'keyword']) {
    if (!field(k)) fail(`${k} が設定されていません（GSC分析の軸になるため必須）`);
  }
}

// 内部リンクのラベル漏れ（未登録だと「関連情報」という汎用表示になる）
const relBlock = fm.split('relatedArticleUrls:')[1] ?? '';
const relUrls = [...relBlock.matchAll(/^\s{2}- ["'](\/[^"']+)["']/gm)].map((m) => m[1]);
if (relUrls.length > 0) {
  // ラベルは src/data/internal-links.ts に集約した（ニュースとイベントの共通置き場）
  const slugPage = await readFile('src/data/internal-links.ts', 'utf8');
  const labels = new Set([...slugPage.matchAll(/'(\/[^']+)':\s*'/g)].map((m) => m[1]));
  const missing = relUrls.filter((u) => !labels.has(u));
  if (missing.length > 0) fail(`内部リンクのラベル未登録 ${missing.length}件 → ${missing.join(', ')}`);
  else console.log(`  内部リンク          ${relUrls.length}本 ／ ラベル漏れ 0`);
}

// ── 2. ビルド成果物 ───────────────────────────────────────
const distPath = join(DIST, route, slug, 'index.html');
const built = await exists(distPath);

if (isDraft) {
  if (built) fail('draft:true なのにページが生成されています');
  else pass('draft記事のためページ未生成（想定どおり）');
  const list = await readFile(join(DIST, route, 'index.html'), 'utf8').catch(() => '');
  if (list.includes(slug)) fail(`draft記事が /${route}/ 一覧に出ています`);
} else {
  if (!built) {
    fail(`ページが生成されていません: ${distPath}（先に npm run audit:site を実行してください）`);
  } else {
    const html = await readFile(distPath, 'utf8');
    const title = html.match(tag('title'))?.[1] ?? '';
    const h1 = html.match(tag('h1'))?.[1]?.replace(/<[^>]+>/g, '') ?? '';
    const desc = html.match(meta('description'))?.[1] ?? '';
    const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1] ?? '';
    const ogImage = html.match(meta('og:image', 'property'))?.[1] ?? '';
    const ogType = html.match(meta('og:type', 'property'))?.[1] ?? '';

    console.log(`\n  title              ${title.length}字`);
    if (!title) fail('title がありません');
    if (!h1) fail('h1 がありません');
    const h1Count = (html.match(/<h1\b/g) ?? []).length;
    if (h1Count !== 1) fail(`h1が${h1Count}個あります（1個であるべき）`);

    // description は 40〜180字（スキーマの検証と同じ範囲）
    console.log(`  description        ${desc.length}字  ${desc.length >= 40 && desc.length <= 180 ? 'OK' : '\x1b[31m範囲外\x1b[0m'}`);
    if (desc.length < 40 || desc.length > 180) fail('description が 40〜180字の範囲外です');

    const wantCanonical = `${SITE}/${route}/${slug}/`;
    if (canonical !== wantCanonical) fail(`canonical が想定と違います: ${canonical}`);
    else console.log(`  canonical          ${canonical}`);

    console.log(`  OGP                og:type ${ogType || 'なし'} ／ og:image ${ogImage ? ogImage.split('/').pop() : 'なし'}`);
    if (ogType !== 'article') fail(`og:type が article ではありません（${ogType}）`);
    if (!ogImage) fail('og:image がありません');

    // JSON-LD は構文まで見る
    const lds = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
    const types = [];
    for (const [, body] of lds) {
      try {
        const parsed = JSON.parse(body);
        for (const node of Array.isArray(parsed) ? parsed : [parsed]) types.push(node['@type']);
      } catch (e) {
        fail(`JSON-LD が壊れています: ${e.message}`);
      }
    }
    console.log(`  JSON-LD            ${types.join(', ') || 'なし'}`);
    // 必要な型はコレクションで違う。news は NewsArticle、events は
    // BreadcrumbList（個別イベントはさらに Event）
    const requiredTypes = route === 'news' ? ['NewsArticle', 'BreadcrumbList'] : ['BreadcrumbList'];
    for (const required of requiredTypes) {
      if (!types.includes(required)) fail(`JSON-LD に ${required} がありません`);
    }
    if (route === 'events' && field('articleType')?.includes('event') && !types.includes('Event')) {
      fail('articleType が event なのに JSON-LD に Event がありません');
    }

    if (html.includes('name="robots"') && html.includes('noindex')) {
      console.log(warn('noindex が付いています'));
    }

    // 汎用ラベルへの落ち込み
    const linksNav = html.match(/class=["']editorial-links["'][\s\S]*?<\/nav>/)?.[0] ?? '';
    if (linksNav.includes('関連情報')) fail('内部リンクに汎用ラベル「関連情報」が出ています');

    // 掲載先
    const where = [];
    for (const [p, label] of [
      [`${route}/index.html`, `/${route}/`],
      ['sports/index.html', '/sports/'],
      ['sitemap.xml', 'sitemap'],
    ]) {
      const body = await readFile(join(DIST, p), 'utf8').catch(() => '');
      if (body.includes(slug)) where.push(label);
    }
    const category = route === 'news' ? field('category')?.replace(/["']/g, '') : undefined;
    if (category) {
      const catBody = await readFile(join(DIST, 'news/category', category, 'index.html'), 'utf8').catch(() => '');
      if (catBody.includes(slug)) where.push(`/news/category/${category}/`);
    }
    console.log(`  掲載先              ${where.join('  ') || 'なし'}`);
    if (!where.includes('sitemap')) fail('sitemap に登録されていません');

  }
}

// ── 3. 本番（--prod のときだけ） ──────────────────────────
if (checkProd && !isDraft) {
  console.log('\n  本番の確認');
  const url = `${SITE}/${route}/${slug}/`;
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) fail(`本番が ${res ? res.status : '取得失敗'} です: ${url}`);
  else {
    const body = await res.text();
    const prodTitle = body.match(tag('title'))?.[1] ?? '';
    console.log(`    記事ページ        200`);
    console.log(`    title            ${prodTitle.slice(0, 46)}…`);
    const ogLocal = ogLocalPath;
    for (const path of [ogLocal, `/og/${route}/${slug}.png`].filter(Boolean)) {
      const r = await fetch(`${SITE}${path}`, { method: 'HEAD' }).catch(() => null);
      const label = path.endsWith('.svg') ? 'OG画像(SVG)' : 'OG画像(PNG)';
      if (!r || !r.ok) fail(`${label} が ${r ? r.status : '取得失敗'} です: ${path}`);
      else console.log(`    ${label}      200`);
    }
  }
}

console.log('');
if (failures > 0) {
  console.log(`\x1b[31m${failures}件の問題があります\x1b[0m\n`);
  process.exit(1);
}
console.log('\x1b[32m問題なし\x1b[0m\n');
