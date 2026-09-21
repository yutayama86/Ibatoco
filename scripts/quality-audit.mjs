import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url);
const rootPath = root.pathname;
const failures = [];
let checked = 0;

async function walk(dir) {
  const files = [];
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else if (name.endsWith('.html')) files.push(path);
  }
  return files;
}

function pagePath(file) {
  const rel = relative(rootPath, file).replaceAll('\\', '/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  return `/${rel.replace(/index\.html$/, '')}`;
}

function targetExists(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || !clean.startsWith('/')) return true;
  if (/\.[a-z0-9]+$/i.test(clean)) return true;
  const target = clean.endsWith('/') ? `${clean}index.html` : `${clean}/index.html`;
  return Bunless(join(rootPath, target.replace(/^\//, '')));
}

function Bunless(path) {
  try {
    return requireExists(path);
  } catch {
    return false;
  }
}

const existing = new Set();
function requireExists(path) { return existing.has(path); }

const files = await walk(rootPath);
for (const file of files) existing.add(file);

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const path = pagePath(file);
  const noindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);
  const isUtility = path === '/404.html' || path.startsWith('/preview/');
  checked++;

  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (!isUtility && !noindex && h1Count !== 1) failures.push(`${path}: h1 が ${h1Count} 件`);

  if (!isUtility && !noindex) {
    // 引用符は content= の開始記号と同じものだけを終端として扱う。
    // 以前は [^"']{20,} としていたため、description にアポストロフィが入る記事
    // （例「rockin'star Carnival 2026は…」）が7文字目で切れ、
    // 正しく出力されているのに「不足」と誤判定していた。
    const desc = html.match(/<meta\s+name=["']description["']\s+content=(["'])([\s\S]*?)\1/i);
    if (!desc || desc[2].length < 20) failures.push(`${path}: description が不足`);
    if (!/<link\s+rel=["']canonical["']\s+href=["']https:\/\/ibatoco\.jp\//i.test(html)) failures.push(`${path}: canonical が不足`);
  }

  if (path.startsWith('/preview/') && !noindex) failures.push(`${path}: preview に noindex がない`);

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch { failures.push(`${path}: JSON-LD が不正`); }
  }

  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    // 装飾画像の alt="" を Astro は `alt` とだけ出力する。これは正しい空altなので通す。
    // 属性そのものが無いものだけを落とす。
    if (!/(^|\s)alt(\s*=\s*["'][^"']*["'])?(\s|$)/i.test(match[1])) failures.push(`${path}: alt のない画像`);
  }

  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) continue;
    if (!targetExists(href)) failures.push(`${path}: リンク先がない ${href}`);
  }

  if (!noindex && /地域No\.?1|本物だけ|必ず集客|爆発力|全国トップクラス/.test(html)) {
    failures.push(`${path}: 根拠確認が必要な表現`);
  }
}

if (failures.length) {
  console.error(`Quality audit failed (${failures.length})`);
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Quality audit passed: ${checked} HTML pages`);
