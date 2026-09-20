/**
 * データの整合を、ビルドとは別に検査する。
 *
 * ビルドは通るが、あとから困るもの（参照先の無いID、重複、確認日の欠落）を
 * ここで落とす。見つかった場合だけ出力し、何も無ければ静かに終わる。
 *
 * 検査するもの：
 *  - business ID の重複／形式
 *  - 記事の relatedBusinesses が実在のIDを指しているか
 *  - 使われていない business（登録したが記事から参照されていない）
 *  - verifiedAt の欠落と、再確認したほうがよいもの
 *  - GA4 イベント名の書き方（送っている名前が想定と違わないか）
 *  - 広告リンクの rel（noreferrer が混ざっていないか）
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const findings = [];
const add = (level, area, message) => findings.push({ level, area, message });

// ---- businesses.ts を読む（TSを実行せず、必要な情報だけ取り出す） ----
const bizSrc = readFileSync('src/data/businesses.ts', 'utf8');
const registrySrc = bizSrc.slice(bizSrc.indexOf('export const BUSINESSES'));
const ids = [...registrySrc.matchAll(/^\s*id:\s*'([^']+)'/gm)].map((m) => m[1]);
const verifiedCount = [...registrySrc.matchAll(/^\s*verifiedAt:\s*'([^']+)'/gm)].length;

const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) add('error', 'business-id', `business ID が重複しています: ${id}`);
  seen.add(id);
  if (!/^[a-z-]+-[a-z]+-\d{3}$/.test(id)) {
    add('error', 'business-id', `business ID が規約の形ではありません: ${id}（<市町村>-<業種>-<3桁>）`);
  }
}
if (verifiedCount < ids.length) {
  add('warn', 'business-verified', `verifiedAt の無い business が ${ids.length - verifiedCount} 件あります`);
}

// ---- 記事の relatedBusinesses ----
const referenced = new Set();
for (const dir of ['src/content/news', 'src/content/events']) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const raw = readFileSync(join(dir, file), 'utf8');
    // 「  - "id"」の形の行だけを拾う。frontmatter 終端の --- を項目と誤認しないため
    const block = raw.match(/^relatedBusinesses:\s*\n((?:[ \t]+-[ \t]+\S.*\n)+)/m);
    if (!block) continue;
    for (const m of block[1].matchAll(/^[ \t]+-[ \t]+"?([A-Za-z0-9-]+)"?/gm)) {
      const id = m[1];
      referenced.add(id);
      if (!seen.has(id)) {
        add('error', 'related-business', `${dir}/${file} が存在しない business ID を参照しています: ${id}`);
      }
    }
  }
}
for (const id of seen) {
  if (!referenced.has(id)) {
    add('warn', 'business-unused', `${id} はどの記事からも参照されていません`);
  }
}

// ---- GA4 イベント名 ----
// 送ってよい名前を明示する。増やすときはここも直す（名前のゆらぎを防ぐ）
const ALLOWED_EVENTS = new Set([
  'outbound_booking_click',
  'business_cta_view',
  'business_cta_click',
  'contact_form_view',
  'contact_form_start',
  'generate_lead',
  'local_business_click',
  'next_action_click',
]);
const srcFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    try {
      if (readdirSync(p).length >= 0) { walk(p); continue; }
    } catch {
      if (/\.(astro|ts)$/.test(entry)) srcFiles.push(p);
    }
  }
})('src');
for (const file of srcFiles) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/track(?:Event|Once)\(\s*(?:`[^`]*`|['"]([a-z_]+)['"])/g)) {
    const name = m[1];
    if (name && !ALLOWED_EVENTS.has(name)) {
      add('error', 'ga4-event', `${file} が未登録のイベント名を送っています: ${name}`);
    }
  }
  for (const m of code.matchAll(/gtag\('event',\s*'([a-z_]+)'/g)) {
    if (!ALLOWED_EVENTS.has(m[1])) add('error', 'ga4-event', `${file} が未登録のイベント名を送っています: ${m[1]}`);
  }
}

// ---- 広告リンクの rel ----
// ASPの条件で noreferrer を付けてはいけない（参照元が消えると成果が否認されうる）
const booking = readFileSync('src/components/BookingGuide.astro', 'utf8');
// rel は三項演算子で「広告のとき : そうでないとき」を出し分けている。
// 広告側（? の直後）に noreferrer が入っていないことを見る。
// 広告でないリンクに noreferrer が付くのは正しいので、そちらは対象外。
const relExpr = booking.match(/rel=\{isPaidLink\([^)]*\)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\}/);
if (!relExpr) {
  add('error', 'affiliate-rel', 'BookingGuide の rel の出し分けを確認できませんでした');
} else {
  const [, paid] = relExpr;
  if (paid.includes('noreferrer')) add('error', 'affiliate-rel', `広告リンクの rel に noreferrer が入っています: ${paid}`);
  if (paid !== 'nofollow sponsored noopener') {
    add('error', 'affiliate-rel', `広告リンクの rel が想定と違います: ${paid}`);
  }
}

// ---- 広告表示と本文の食い違い ----
// 記事の booking.basis に「提携していません」と書いてあるのに、
// その記事の booking.items に status: 'active' の提供元が入っていると、
// 画面には「アフィリエイト広告を含みます」と「提携していません」が同時に出る。
// 実際にこれが4記事で公開されていた（2026-09-20に修正）。二度目を防ぐ。
const affiliatesSrc = readFileSync('src/data/affiliates.ts', 'utf8');
// [^{}]* にしているのは、提供元ブロックの境界をまたがせないため。
// [\s\S]*? だと official（status: 'none'）から次のブロックの 'active' まで
// 読みにいってしまい、提携していない提供元まで提携済みと判定する。
const activeProviders = [...affiliatesSrc.matchAll(/'?([a-z0-9-]+)'?:\s*\{[^{}]*status:\s*'active'/g)]
  .map((m) => m[1]);
// 記事は .md なので srcFiles（.astro / .ts）には入っていない。別に集める
const contentFiles = [];
(function walkMd(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    try {
      if (readdirSync(p).length >= 0) { walkMd(p); continue; }
    } catch {
      if (/\.mdx?$/.test(entry)) contentFiles.push(p);
    }
  }
})('src/content');
for (const file of contentFiles) {
  const src = readFileSync(file, 'utf8');
  // 「いずれも提携していません」という一括の否定だけを見る。
  // 「akippaとは提携していません」のように提供元を名指しした否定は正しいので通す。
  if (!/^\s*basis:.*いずれも提携して(い|お)?ま?せん/m.test(src)) continue;
  const used = activeProviders.filter((p) => src.includes(`provider: "${p}"`));
  if (used.length > 0) {
    add('error', 'affiliate-disclosure',
      `${file} は basis で「提携していません」と書いていますが、提携済みの提供元を使っています: ${used.join(', ')}`);
  }
}

// ---- 出力 ----
const errors = findings.filter((f) => f.level === 'error');
const warns = findings.filter((f) => f.level === 'warn');
console.log(`データ監査：business ${ids.length}件（参照されている ${referenced.size}件）`);
if (findings.length === 0) {
  console.log('問題は見つかりませんでした。');
  process.exit(0);
}
for (const f of [...errors, ...warns]) console.log(`  [${f.level}] ${f.area}: ${f.message}`);
console.log(`\nエラー ${errors.length} 件 ／ 警告 ${warns.length} 件`);
process.exit(errors.length > 0 ? 1 : 0);
