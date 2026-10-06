/**
 * 本番（https://ibatoco.jp）の主要ページが、デプロイした版のとおりに出ているかを確かめる。
 * 「Deploy 成功」や HTTP 200 だけでは完了にしない。
 *
 * 見るページ：scripts/qa-pages.mjs と同じ（TOP・ニュース一覧・最新ニュース・重点イベント・検索・市町村）
 * 見るもの：
 *   - HTTP 200
 *   - <title> が空でない。dist があれば、ビルドした版の title と一致する
 *   - canonical が https://ibatoco.jp/<path>
 *   - h1 がちょうど1つ
 *   - 主要DOM（qa-pages.mjs の required。HTMLで判定できるもの）
 *   - ページ内の画像（先頭8件）と og:image が 200 で、画像として返る
 *   - 検索の索引（/search-index.json）が返る
 *
 * --wait：本番の /build.json のコミットIDが dist/build.json と一致するまで待ってから確かめる
 *         （デプロイ直後は古い版が返るため。最大 --timeout 秒、既定 420）
 *
 * 実行：node scripts/verify-production.mjs [--wait] [--timeout 420]
 *       （npm run deploy の最後でも実行される）
 */
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { qaPages } from './qa-pages.mjs';

const BASE = 'https://ibatoco.jp';
const args = process.argv.slice(2);
const WAIT = args.includes('--wait');
const TIMEOUT = Number(args[args.indexOf('--timeout') + 1]) || 420;
const inCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

const bust = () => `c=${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const withBust = (path) => `${BASE}${path}${path.includes('?') ? '&' : '?'}${bust()}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Node の fetch は HTTPS_PROXY を使わない。プロキシ越しの環境（ローカルのサンドボックス等）では curl で取る。
 * CI（GitHub Actions）はプロキシが無いので fetch を使う。
 */
const VIA_PROXY = Boolean(process.env.HTTPS_PROXY || process.env.https_proxy);
const execFileAsync = promisify(execFile);
async function getWithCurl(url) {
  try {
    const { stdout } = await execFileAsync('curl', ['-sS', '-L', '--max-time', '40', '-A', 'ibatoco-verify-production', '-w', '\n__META__%{http_code} %{content_type}', url], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
    const marker = stdout.lastIndexOf(Buffer.from('\n__META__'));
    const [status, type = ''] = stdout.subarray(marker + 9).toString('utf8').trim().split(' ');
    const isImage = type.startsWith('image/');
    return { status: Number(status), type, body: isImage ? '' : stdout.subarray(0, marker).toString('utf8'), size: marker };
  } catch (error) {
    return { status: 0, type: '', body: '', size: 0, error: String(error.message).split('\n')[0] };
  }
}

async function get(url, { method = 'GET' } = {}) {
  if (VIA_PROXY && method === 'GET') return getWithCurl(url);
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': 'ibatoco-verify-production', 'cache-control': 'no-cache' } });
      const isImage = (res.headers.get('content-type') ?? '').startsWith('image/');
      if (method === 'HEAD' || isImage) await res.body?.cancel();
      const body = method === 'HEAD' || isImage ? '' : await res.text();
      const size = Number(res.headers.get('content-length') ?? 0);
      return { status: res.status, type: res.headers.get('content-type') ?? '', body, size };
    } catch (error) {
      if (attempt >= 3) return { status: 0, type: '', body: '', size: 0, error: String(error.message) };
      await sleep(2000 * attempt);
    }
  }
}

const assetsOf = (html) => [...new Set(html.match(/\/_astro\/[^"'\s)]+\.(?:css|js)/g) ?? [])].sort().join('\n');
const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const distHtml = (path) => {
  const file = join('dist', path.split('?')[0], 'index.html');
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};

// ---- 1) 新しい版が出るまで待つ ----
// 目印は dist/build.json のコミットID（astro.config.mjs が書く）。無ければTOPの /_astro/ 資産名の一致で代用する
if (WAIT) {
  const expected = distHtml('/');
  if (!expected) {
    console.error('--wait には dist/index.html が必要です（デプロイしたビルドの出力）');
    process.exit(1);
  }
  const marker = existsSync('dist/build.json') ? JSON.parse(readFileSync('dist/build.json', 'utf8')).commit : 'unknown';
  const want = assetsOf(expected);
  const isLive = async () => {
    if (marker !== 'unknown') {
      const res = await get(withBust('/build.json'));
      try { return res.status === 200 && JSON.parse(res.body).commit === marker; } catch { return false; }
    }
    const res = await get(withBust('/'));
    return res.status === 200 && assetsOf(res.body) === want;
  };
  const started = Date.now();
  for (;;) {
    if (await isLive()) {
      console.log(`本番がデプロイした版になりました（${Math.round((Date.now() - started) / 1000)}秒）`);
      break;
    }
    if (Date.now() - started > TIMEOUT * 1000) {
      const message = `本番が ${TIMEOUT} 秒たってもデプロイした版（${marker.slice(0, 8)}）になりません`;
      if (inCI) console.error(`::error title=Production verification::${message}`);
      console.error(message);
      process.exit(1);
    }
    await sleep(15000);
  }
}

// ---- 2) 主要ページを確かめる ----
/** HTMLだけで判定できる required（属性・id・要素名）を、件数の数え方に置き換える */
function countInHtml(html, selector) {
  let total = 0;
  for (const part of selector.split(',').map((s) => s.trim())) {
    const last = part.split(/\s+/).pop();
    let re;
    if (last === 'h1') re = /<h1[\s>]/g;
    else if (/^#[\w-]+$/.test(last)) re = new RegExp(`id="${last.slice(1)}"`, 'g');
    else if (/^\[data-[\w-]+(="[^"]*")?\]$/.test(last)) re = new RegExp(last.slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    else {
      const m = last.match(/^(\w+)?(?:\.[\w-]+)?\[(\w+)([\^]?)="([^"]*)"\]$/);
      if (!m) return null; // HTMLだけでは数えられない（検索結果などJSで描くもの）
      const [, tag = '\\w+', attr, op, value] = m;
      const v = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="${v}${op === '^' ? '' : '"'}`, 'g');
    }
    total += (html.match(re) ?? []).length;
  }
  return total;
}

const failures = [];
const notes = [];
// /control/ など本番ではログインが必要なページは、認証の転送を scripts/ui-smoke.mjs --production で確かめる
const productionPages = qaPages().filter((page) => !page.localOnly);
for (const target of productionPages) {
  const where = `${target.name}（${target.path}）`;
  const res = await get(withBust(target.path));
  if (res.status !== 200) {
    failures.push(`${where}: HTTP ${res.status}${res.error ? ` ${res.error}` : ''}`);
    continue;
  }
  const html = res.body;
  const title = decode(titleOf(html));
  if (!title) failures.push(`${where}: title が空`);
  const local = distHtml(target.path);
  if (local && decode(titleOf(local)) !== title) failures.push(`${where}: title がビルドした版と違う（本番「${title}」）`);

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== `${BASE}${target.canonical}`) failures.push(`${where}: canonical が ${canonical ?? 'なし'}（期待 ${BASE}${target.canonical}）`);

  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) failures.push(`${where}: h1 が ${h1} 個`);

  for (const [selector, min, mode] of target.required) {
    // 骨格（nav・main・footer）はブラウザでだけ数える。全ページ同じなので注記は出さない
    if (mode === 'js') { if (!['nav', 'main', 'footer'].includes(selector)) notes.push(`${where}: ${selector} はJSで描くため本番HTMLでは数えない（UIスモークテストで確認）`); continue; }
    const count = countInHtml(html, selector);
    if (count === null) { notes.push(`${where}: ${selector} はJSで描くため本番HTMLでは数えない（UIスモークテストで確認）`); continue; }
    if (count < min) failures.push(`${where}: 主要要素の欠損 — ${selector} が ${count} 件（${min} 件以上必要）`);
  }

  const images = [...new Set([...html.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]))].filter((src) => src.startsWith('/') && !src.startsWith('//')).slice(0, 8);
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  if (!og) failures.push(`${where}: og:image なし`);
  for (const src of [...images.map((s) => `${BASE}${s}`), ...(og ? [og] : [])]) {
    const img = await get(src);
    if (img.status !== 200 || !/^image\//.test(img.type)) failures.push(`${where}: 画像が返らない — ${src}（HTTP ${img.status} ${img.type}）`);
  }
}

const index = await get(withBust('/search-index.json'));
let entries = 0;
try { entries = JSON.parse(index.body).length; } catch { entries = 0; }
if (index.status !== 200 || entries === 0) failures.push(`検索の索引（/search-index.json）: HTTP ${index.status}、${entries} 件`);

for (const note of notes) console.log(`  ・${note}`);
if (failures.length > 0) {
  console.error(`本番確認で ${failures.length} 件の問題`);
  for (const line of failures) {
    console.error(`  - ${line}`);
    if (inCI) console.error(`::error title=Production verification::${line}`);
  }
  process.exit(1);
}
console.log(`本番確認通過：${productionPages.length} ページ（HTTP・title・canonical・h1・主要DOM・画像・og:image）と検索の索引`);
