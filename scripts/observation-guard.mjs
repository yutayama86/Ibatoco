/**
 * Observation Window Guard（CI）：観測期間中のページを、許されない種類の変更で変える PR を止める。
 *
 * 観測期限は Growth Engine と同じ計算（src/lib/growth-engine.mjs の observationWindows、docs/GROWTH_ENGINE.md の 5.）。
 *   事実・計測の修正 0日 / CTA・小さなUI 7日 / title・description・内部リンク 14日 / 本文・テンプレート・構成 28日
 * 期限は PR 側ではなく base（main）側の変更履歴（src/data/seo-changes.ts）で計算する。PR が自分で足した記録で止まらないように。
 *
 * 変更の種類は差分から判定する（記事の frontmatter の項目と本文）。
 *   title / description / ogImage / ogImageAlt / keyword だけ → metadata
 *   relatedArticleUrls だけ → internal-link
 *   それ以外（本文・要点・FAQ など）→ body
 *   updatedDate だけの変更は数えない
 *
 * 例外（観測中でも変えてよい）は、PR 本文に1行で宣言する：
 *   observation-exception: fact — 公式発表で日付が変わったため
 *   種類：fact（事実の誤り・訂正）/ measurement（計測の不具合）/ seasonal-official（季節イベントの公式発表・期限変更の反映）
 *
 * テンプレート・共通部品（src/pages/{events,news}/[slug]・src/components・src/layouts・src/styles）の変更は、観測中のページ数を警告として出す（止めない）。
 *
 * 実行：npm run verify の中で自動（pull_request のときだけ動く）
 * 手元で試す：node scripts/observation-guard.mjs --base <ref> [--body-file <PR本文のファイル>]
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { observationWindows, todayJst } from '../src/lib/growth-engine.mjs';
import { parseSeoChanges } from './lib/seo-changes.mjs';

const args = process.argv.slice(2);
const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const inCI = process.env.GITHUB_ACTIONS === 'true';
const EXEMPT = new Set(['fact', 'measurement', 'seasonal-official']);
const METADATA_KEYS = new Set(['title', 'description', 'ogImage', 'ogImageAlt', 'keyword']);
const LINK_KEYS = new Set(['relatedArticleUrls']);
const IGNORED_KEYS = new Set(['updatedDate']);

function finish(message) {
  console.log(`観測窓ガード：${message}`);
  process.exit(0);
}

// ---- base（main）と PR 本文 ----
let baseSha = argValue('--base');
let body = argValue('--body-file') ? readFileSync(argValue('--body-file'), 'utf8') : '';
if (!baseSha && process.env.GITHUB_EVENT_NAME === 'pull_request' && process.env.GITHUB_EVENT_PATH && existsSync(process.env.GITHUB_EVENT_PATH)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  baseSha = event.pull_request?.base?.sha ?? null;
  body = event.pull_request?.body ?? '';
}
if (!baseSha) finish('PR の検査ではないため飛ばしました');

const git = (...cmd) => execFileSync('git', cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  git('cat-file', '-e', `${baseSha}^{commit}`);
} catch {
  // actions/checkout は既定で1コミットだけ取得する。公開リポジトリなので認証なしで base を取りにいける
  try {
    git('fetch', '--no-tags', '--depth=1', 'origin', baseSha);
  } catch (error) {
    finish(`base（${String(baseSha).slice(0, 8)}）を取得できないため飛ばしました：${String(error.message).split('\n')[0]}`);
  }
}

const changed = git('diff', '--name-only', '--diff-filter=AMR', baseSha, 'HEAD').split('\n').filter(Boolean);
if (!changed.length) finish('変更ファイルなし');

const showBase = (path) => {
  try { return git('show', `${baseSha}:${path}`); } catch { return null; }
};
const config = JSON.parse(readFileSync('data/editorial/growth-engine.json', 'utf8'));
const baseChanges = parseSeoChanges(showBase('src/data/seo-changes.ts') ?? '');
const today = process.env.GROWTH_TODAY ?? todayJst();
const observing = new Map(observationWindows({ changes: baseChanges, config, today }).filter((o) => o.status === 'observing').map((o) => [o.path, o]));

// ---- 宣言された例外 ----
const declared = [...String(body).matchAll(/observation-exception:\s*([a-z-]+)\s*[—\-–:：]?\s*(.*)/gi)].map((m) => ({ type: m[1].toLowerCase(), reason: m[2].trim() }));
const exception = declared.find((d) => EXEMPT.has(d.type) && d.reason.length >= 4);

// ---- 差分 → ページと変更の種類 ----
function splitDoc(text) {
  const m = text?.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text ?? '' };
  let fm = {};
  try { fm = parse(m[1]) ?? {}; } catch { fm = {}; }
  return { fm, body: m[2] };
}
function changeType(path) {
  const before = splitDoc(showBase(path));
  const after = splitDoc(readFileSync(path, 'utf8'));
  const keys = new Set([...Object.keys(before.fm), ...Object.keys(after.fm)]);
  const changedKeys = [...keys].filter((k) => JSON.stringify(before.fm[k]) !== JSON.stringify(after.fm[k]) && !IGNORED_KEYS.has(k));
  const bodyChanged = before.body.trim() !== after.body.trim();
  if (!changedKeys.length && !bodyChanged) return { type: null, keys: [] };
  if (!bodyChanged && changedKeys.every((k) => LINK_KEYS.has(k))) return { type: 'internal-link', keys: changedKeys };
  if (!bodyChanged && changedKeys.every((k) => METADATA_KEYS.has(k) || LINK_KEYS.has(k))) return { type: 'metadata', keys: changedKeys };
  return { type: 'body', keys: bodyChanged ? [...changedKeys, '本文'] : changedKeys };
}
function pagePathOf(file) {
  let m = file.match(/^src\/content\/(events|news)\/([^/]+)\.md$/);
  if (m) return `/${m[1]}/${m[2]}/`;
  m = file.match(/^src\/pages\/(.+?)(?:\/index)?\.astro$/);
  if (m && !m[1].includes('[')) return m[1] === 'index' ? '/' : `/${m[1]}/`;
  return null;
}

const violations = [];
const allowed = [];
const templateWarnings = [];
for (const file of changed) {
  const path = pagePathOf(file);
  const isContent = /^src\/content\/(events|news)\//.test(file);
  if (path && observing.has(path)) {
    const row = observing.get(path);
    const { type, keys } = isContent ? changeType(file) : { type: 'template', keys: ['ページの実装'] };
    if (!type) continue;
    const entry = { path, file, type, keys, until: row.observeUntil, lastChange: row.lastChange, lastType: row.experimentType };
    if (exception) allowed.push({ ...entry, by: exception });
    else violations.push(entry);
    continue;
  }
  // テンプレート・共通部品：観測中のページへの影響を警告だけ出す
  const group = file.match(/^src\/pages\/(events|news)\/\[/)?.[1] ?? (/^src\/(components|layouts|styles)\//.test(file) ? 'all' : null);
  if (group) {
    const affected = [...observing.keys()].filter((p) => group === 'all' || p.startsWith(`/${group}/`));
    if (affected.length) templateWarnings.push(`${file}：観測中のページ ${affected.length} 件に影響しうる（${affected.slice(0, 3).join('、')}${affected.length > 3 ? ' ほか' : ''}）`);
  }
}

// ---- 結果 ----
const lines = ['### 観測窓ガード（Observation Window）', ''];
if (violations.length) {
  lines.push('観測期間中のページを変更しています。期限まで待つか、例外に当たる場合は PR 本文に宣言してください。', '');
  for (const v of violations) lines.push(`- ${v.path}（${v.type}：${v.keys.join('・')}）は ${v.until} まで観測中（${v.lastChange} の ${v.lastType} 変更）`);
  lines.push('', '例外の宣言（PR 本文に1行）：`observation-exception: fact — 理由` / `measurement` / `seasonal-official`');
}
for (const a of allowed) lines.push(`- 例外として許可：${a.path}（${a.type}）— ${a.by.type}：${a.by.reason}`);
for (const w of templateWarnings.slice(0, 10)) lines.push(`- 注意：${w}`);
if (!violations.length && !allowed.length && !templateWarnings.length) lines.push('観測中のページへの変更はありません。');
const summary = `${lines.join('\n')}\n`;
if (process.env.GITHUB_STEP_SUMMARY) {
  try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`); } catch {}
}
console.log(summary);
if (declared.length && !exception) console.log('観測窓ガード：例外の宣言が読み取れません（種類は fact / measurement / seasonal-official、理由も書く）');
if (violations.length) {
  for (const v of violations) if (inCI) console.error(`::error title=観測窓ガード::${v.path} は ${v.until} まで観測中（${v.type} の変更）。例外なら PR 本文に observation-exception: fact — 理由`);
  console.error(`観測窓ガード：観測中のページへの変更 ${violations.length} 件`);
  process.exit(1);
}
console.log(`観測窓ガード通過：変更ファイル ${changed.length} 件、観測中のページ ${observing.size} 件`);
