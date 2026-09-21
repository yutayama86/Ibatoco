/**
 * サイト全体の技術的な健全性を、ビルド結果から機械的に確認する。
 *
 * 目的は「問題が無いことを確かめる」であって、直すことではない。
 * 見つかった場合だけ出力し、何も無ければ静かに終わる。
 *
 * 既存の quality-audit.mjs（リンク切れ・h1重複・禁止語など）と役割を分ける。
 * こちらは canonical / sitemap / robots / 重複メタ / 構造化データ / 画像・JSの重さ。
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://ibatoco.jp';
/** これを超える画像は、表示の重さとして報告する（バイト） */
const BIG_IMAGE = 400 * 1024;
const BIG_JS = 150 * 1024;

/**
 * 相手側がHTTPSに対応していないと確認できた参照先。
 *
 * **推測で載せない。** 実際に443へ接続し、応答しないことを確かめてから書く。
 * ここに入れるのは「直せないと分かっている」ものだけで、直せるものは直す。
 * 出典として必要なリンクを、警告を消すために外すことはしない。
 *
 * 警告を残し続けると、本当に直すべき http:// が埋もれる。だから消す代わりに、
 * いつ・何を確認したかをここに残す。相手がHTTPS化したら行ごと削除すること。
 */
const HTTP_ONLY_HOSTS = [
  {
    host: 'www.amabiki.or.jp',
    checkedAt: '2026-09-21',
    // HTTP は 200 を返すのでサイト自体は稼働している。
    // https://www.amabiki.or.jp/ は SSL_ERROR_SYSCALL とタイムアウトで応答なし。
    // 同じ環境から他サイトのHTTPSは通るため、こちら側の遮断ではない。
    reason: '雨引観音（雨引山楽法寺）公式。443が応答せずHTTPS非対応。/hana/ のあじさい祭の出典',
  },
];

// Cloudflareで恒久転送する旧URLは、転送先canonicalが正しい。
// 自己参照canonicalだけを正解にすると、正常な移行ページを警告してしまう。
const redirectCanonicals = new Map();
const redirectsPath = 'public/_redirects';
if (existsSync(redirectsPath)) {
  for (const line of readFileSync(redirectsPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [from, to, status] = trimmed.split(/\s+/);
    if (from?.startsWith('/') && to?.startsWith('/') && ['301', '308'].includes(status)) {
      redirectCanonicals.set(from, new URL(to, SITE).href);
    }
  }
}

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry === 'index.html') pages.push(p);
  }
})(DIST);

const urlOf = (p) => '/' + p.replace(/^dist\//, '').replace(/index\.html$/, '');
const findings = [];
const add = (level, area, message) => findings.push({ level, area, message });

const titles = new Map();
const descriptions = new Map();
let noindexCount = 0;
let jsonLdBlocks = 0;

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const url = urlOf(file);

  const isNoindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);
  if (isNoindex) noindexCount++;

  // canonical
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  // else 節を canonical の有無で分ける前に、noindex 判定を先に済ませている
  if (!canonical) {
    // noindex のページ（管理用・プレビュー）は検索対象ではないので必須にしない
    if (!isNoindex) add('error', 'canonical', `${url} に canonical がありません`);
  }
  else {
    if (!canonical.startsWith('https://')) add('error', 'canonical', `${url} の canonical が https ではありません: ${canonical}`);
    if (canonical.startsWith('https://www.')) add('error', 'canonical', `${url} の canonical が www 付きです: ${canonical}`);
    const expected = `${SITE}${url}`;
    const redirectCanonical = redirectCanonicals.get(url);
    if (canonical !== expected && canonical !== expected.replace(/\/$/, '') && canonical !== redirectCanonical) {
      add('warn', 'canonical', `${url} の canonical が自分自身を指していません: ${canonical}`);
    }
  }

  // title / description（noindex は重複の対象から外す）
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!title) add('error', 'title', `${url} に title がありません`);
  if (!desc && !isNoindex) add('error', 'description', `${url} に description がありません`);
  if (!isNoindex) {
    if (title) (titles.get(title) ?? titles.set(title, []).get(title)).push(url);
    if (desc) (descriptions.get(desc) ?? descriptions.set(desc, []).get(desc)).push(url);
  }

  // OGP
  if (!isNoindex) {
    for (const prop of ['og:title', 'og:description', 'og:image', 'og:url']) {
      if (!html.includes(`property="${prop}"`)) add('warn', 'ogp', `${url} に ${prop} がありません`);
    }
  }

  // 構造化データ（JSON として読めるか）
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    jsonLdBlocks++;
    try {
      JSON.parse(m[1]);
    } catch {
      add('error', 'json-ld', `${url} の JSON-LD が壊れています`);
    }
  }

  // 画像の alt（装飾用の alt="" は正しい使い方なので対象外）
  for (const m of html.matchAll(/<img\b([^>]*)>/g)) {
    // alt="" は値なしの `alt` として出力される。これは正しい（装飾画像の書き方）
    if (!/\balt(=|\s|$)/.test(m[1])) add('error', 'img-alt', `${url} に alt の無い img があります`);
  }

  // http:// のリンク（外部含む）
  for (const m of html.matchAll(/href="(http:\/\/[^"]+)"/g)) {
    const known = HTTP_ONLY_HOSTS.find((h) => m[1].startsWith(`http://${h.host}/`));
    if (known) continue; // 相手側がHTTPS非対応と確認済み（下の一覧）
    add('warn', 'https', `${url} に http:// のリンクがあります: ${m[1]}`);
  }
}

// 重複 title / description
for (const [value, urls] of titles) {
  if (urls.length > 1) add('error', 'duplicate-title', `title が ${urls.length} ページで重複: 「${value.slice(0, 50)}」 → ${urls.slice(0, 4).join(' , ')}`);
}
for (const urls of descriptions.values()) {
  if (urls.length > 1) add('error', 'duplicate-description', `description が ${urls.length} ページで重複 → ${urls.slice(0, 4).join(' , ')}`);
}

// sitemap / robots
const sitemapPath = join(DIST, 'sitemap-index.xml');
const sitemapAlt = join(DIST, 'sitemap.xml');
if (!existsSync(sitemapPath) && !existsSync(sitemapAlt)) add('error', 'sitemap', 'sitemap が出力されていません');
const robotsPath = join(DIST, 'robots.txt');
if (!existsSync(robotsPath)) add('error', 'robots', 'robots.txt がありません');
else {
  const robots = readFileSync(robotsPath, 'utf8');
  if (!/Sitemap:/i.test(robots)) add('warn', 'robots', 'robots.txt に Sitemap の記載がありません');
  if (/^\s*Disallow:\s*\/\s*$/m.test(robots)) add('error', 'robots', 'robots.txt がサイト全体を拒否しています');
}

// 重いアセット
(function walkAssets(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walkAssets(p);
    else {
      if (/\.(png|jpe?g|webp|gif)$/i.test(entry) && st.size > BIG_IMAGE) {
        add('warn', 'heavy-image', `${p.replace(/^dist/, '')} が ${Math.round(st.size / 1024)}KB あります`);
      }
      if (/\.js$/i.test(entry) && st.size > BIG_JS) {
        add('warn', 'heavy-js', `${p.replace(/^dist/, '')} が ${Math.round(st.size / 1024)}KB あります`);
      }
    }
  }
})(DIST);

const errors = findings.filter((f) => f.level === 'error');
const warns = findings.filter((f) => f.level === 'warn');

console.log(`技術監査：${pages.length}ページ／JSON-LD ${jsonLdBlocks}件／noindex ${noindexCount}ページ`);
if (findings.length === 0) {
  console.log('問題は見つかりませんでした。');
  process.exit(0);
}
for (const group of [errors, warns]) {
  for (const f of group.slice(0, 40)) console.log(`  [${f.level}] ${f.area}: ${f.message}`);
  if (group.length > 40) console.log(`  … ほか ${group.length - 40} 件`);
}
console.log(`\nエラー ${errors.length} 件 ／ 警告 ${warns.length} 件`);
process.exit(errors.length > 0 ? 1 : 0);
