#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataFreshness, formatCount, lookup, orZero, viewsByPath } from './lib/report-data.mjs';
import { revenueFunnel } from '../src/lib/revenue-funnel.mjs';
import { todayJst } from '../src/lib/growth-engine.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS_DIR = join(ROOT, 'src/content/events');
const PERF = join(ROOT, 'data/editorial/performance-snapshot.json');
const REVENUE = join(ROOT, 'data/editorial/revenue-opportunities.json');
const AFFILIATES = join(ROOT, 'src/data/affiliates.ts');
const LEDGER = join(ROOT, 'data/editorial/revenue-ledger.json');
const ASP = join(ROOT, 'data/editorial/asp-results.json');
const AUTO_MONETIZATION = join(ROOT, 'src/lib/auto-monetization.ts');
const REPORT = join(ROOT, 'reports/editorial/revenue-engine.md');
const write = process.argv.includes('--write');

for (const path of [EVENTS_DIR, PERF, REVENUE, AFFILIATES, AUTO_MONETIZATION]) {
  if (!existsSync(path)) {
    console.error(`Revenue Engine: required file missing: ${path}`);
    process.exit(1);
  }
}

const performance = JSON.parse(readFileSync(PERF, 'utf8'));
const revenue = JSON.parse(readFileSync(REVENUE, 'utf8'));
const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null);
// クリック・発生成果・未確定報酬・確定売上を分けて出す（既存の Revenue Funnel をそのまま使う）
const funnel = revenueFunnel({ snapshot: performance, ledger: readJson(LEDGER), asp: readJson(ASP) });
const freshness = dataFreshness(performance.asOf, todayJst());
const affiliatesSource = readFileSync(AFFILIATES, 'utf8');
const autoMonetizationSource = readFileSync(AUTO_MONETIZATION, 'utf8');
const autoLodgingMunicipalities = new Set(
  [...autoMonetizationSource.matchAll(/^\s{2}([a-z0-9-]+):\s*\{/gm)].map((m) => m[1])
);

function frontmatter(raw) {
  return raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? '';
}
function scalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}
function bool(fm, key) {
  const v = scalar(fm, key);
  return v === 'true' ? true : v === 'false' ? false : null;
}
function block(fm, key) {
  const lines = fm.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^[A-Za-z][A-Za-z0-9]*:\s*/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}
function nestedBools(fm, key) {
  const b = block(fm, key);
  return Object.fromEntries(
    [...b.matchAll(/^\s{2}([A-Za-z]+):\s*(true|false)$/gm)].map((m) => [m[1], m[2] === 'true'])
  );
}
function listProviders(fm) {
  const b = block(fm, 'booking');
  return [...b.matchAll(/^\s{6}provider:\s*['"]?([^'"\n]+)['"]?$/gm)].map((m) => m[1].trim());
}
function listKinds(fm) {
  const b = block(fm, 'booking');
  return [...b.matchAll(/^\s{6}kind:\s*['"]?([^'"\n]+)['"]?$/gm)].map((m) => m[1].trim());
}
function municipalities(fm) {
  const b = block(fm, 'municipalities');
  return [...b.matchAll(/^\s{2}-\s+['"]?([^'"\n]+)['"]?$/gm)].map((m) => m[1].trim());
}

const providerStatuses = new Map();
for (const m of affiliatesSource.matchAll(/^\s{2}['"]?([a-z0-9-]+)['"]?:\s*\{[\s\S]*?^\s{4}status:\s*'([^']+)'/gm)) {
  providerStatuses.set(m[1], m[2]);
}

// GA4 上位ページに無いページは 0 ではなく「値なし」。点数の計算のときだけ 0 として扱う
const gaRecent7 = viewsByPath(performance.ga4TopPages?.recent7);
const gaRecent28 = viewsByPath(performance.ga4TopPages?.recent28);
const gscByPage = new Map();
for (const f of performance.gscDiscovery?.findings ?? []) {
  if (!f.page) continue;
  const row = gscByPage.get(f.page) ?? { impressions: 0, clicks: 0, bestPosition: 99, signals: [] };
  row.impressions += Number(f.impressions ?? 0);
  row.clicks += Number(f.clicks ?? 0);
  row.bestPosition = Math.min(row.bestPosition, Number(f.position ?? 99));
  row.signals.push(f.signalType ?? '');
  gscByPage.set(f.page, row);
}

const pages = [];
for (const file of readdirSync(EVENTS_DIR).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
  const raw = readFileSync(join(EVENTS_DIR, file), 'utf8');
  const fm = frontmatter(raw);
  if (bool(fm, 'draft') !== false || bool(fm, 'reviewed') !== true || bool(fm, 'noindex') === true) continue;

  const slug = basename(file, '.md');
  const path = `/events/${slug}/`;
  const intents = nestedBools(fm, 'businessIntent');
  const providers = listProviders(fm);
  const kinds = listKinds(fm);
  const activeProviders = providers.filter((p) => providerStatuses.get(p) === 'active');
  // 公式・主催者のリンクは提携の対象ではない（収益の損失として数えない。docs/REVENUE_OS.md）
  const nonActiveProviders = providers.filter((p) => p !== 'official' && providerStatuses.get(p) !== 'active');
  const hasBooking = /^booking:\s*$/m.test(fm);
  const municipalityList = municipalities(fm);
  const hasAutoBooking = !hasBooking
    && intents.accommodation === true
    && municipalityList.some((m) => autoLodgingMunicipalities.has(m))
    && /officialUrl:\s*['"]?https?:\/\//m.test(fm);
  const effectiveHasBooking = hasBooking || hasAutoBooking;
  const commercialPriority = scalar(fm, 'commercialPriority');
  const title = scalar(fm, 'title') ?? slug;
  const keyword = scalar(fm, 'keyword') ?? '';
  const searchIntent = scalar(fm, 'searchIntent') ?? '';
  const gsc = gscByPage.get(path) ?? { impressions: 0, clicks: 0, bestPosition: 99, signals: [] };
  const views7 = lookup(gaRecent7, path);
  const views28 = lookup(gaRecent28, path);
  const v7 = orZero(views7);
  const v28 = orZero(views28);

  const purchaseIntent = [
    intents.booking,
    intents.accommodation,
    intents.parking,
    intents.food,
    intents.experience,
  ].filter(Boolean).length;

  const commercialBase =
    commercialPriority === 'high' ? 4 :
    commercialPriority === 'medium' ? 2 :
    commercialPriority === 'low' ? 1 : 0;

  const trafficScore = v7 >= 500 ? 5 : v7 >= 100 ? 4 : v7 >= 30 ? 3 : v28 >= 100 ? 2 : v28 > 0 ? 1 : 0;
  const searchScore = gsc.impressions >= 1000 ? 5 : gsc.impressions >= 300 ? 4 : gsc.impressions >= 100 ? 3 : gsc.impressions >= 30 ? 2 : gsc.impressions > 0 ? 1 : 0;
  const intentScore = Math.min(5, purchaseIntent + (effectiveHasBooking ? 2 : 0));
  const monetizationGap =
    hasAutoBooking ? 0 :
    hasBooking && activeProviders.length === 0 ? 5 :
    hasBooking && nonActiveProviders.length > activeProviders.length ? 3 :
    purchaseIntent > 0 && !effectiveHasBooking ? 4 :
    0;

  const score = trafficScore * 2 + searchScore + intentScore * 2 + commercialBase + monetizationGap * 2;

  pages.push({
    path, title, keyword, searchIntent,
    intents, providers, activeProviders, nonActiveProviders, kinds,
    hasBooking, hasAutoBooking, effectiveHasBooking, commercialPriority,
    views7, views28,
    gscImpressions: gsc.impressions,
    gscClicks: gsc.clicks,
    bestPosition: gsc.bestPosition,
    trafficScore, searchScore, intentScore, commercialBase, monetizationGap, score,
  });
}

pages.sort((a, b) => b.score - a.score || orZero(b.views7) - orZero(a.views7) || b.gscImpressions - a.gscImpressions);

const opportunities = pages.filter((p) => p.monetizationGap > 0 || p.score >= 14).slice(0, 20);

function actionFor(p) {
  if (p.hasAutoBooking) return '既存提携先の宿泊導線を自動配置済み。Monetized Click Shareを観測';
  if (p.intents.parking && !p.effectiveHasBooking) return '駐車場需要の公式導線を確認し、承認済み提携がある場合だけ予約導線を追加';
  if (p.intents.accommodation && !p.effectiveHasBooking) return '宿泊需要の公式/比較導線を確認し、既存提携URLが使える場合だけBookingGuideを追加';
  if (p.hasBooking && p.activeProviders.length === 0) return 'クリック需要を計測しつつ、未提携提供元は提携候補として整理。承認前に広告化しない';
  if (p.hasBooking && p.nonActiveProviders.length > 0) return '未提携リンクのクリックをprovider別に確認し、需要が高い提供元だけ提携候補化';
  if (p.intents.food || p.intents.experience) return '現地消費意図が高い。予約・体験・店舗送客のうち計測可能な1導線だけテスト';
  return '既存収益導線のCTRとpartner_status別クリックを確認し、最も近い収益ボトルネックを1つだけ改善';
}

const lines = [
  '# Ibatoco Revenue Engine',
  '',
  freshness.line,
  `- 公開イベント/ガイド評価数: **${pages.length}件**`,
  '',
  '## 収益の段階（クリックは売上ではない）',
  '',
  ...funnel.stages.map((s) => `- ${s.label}: **${formatCount(s.value)}**（${s.period ?? '期間不明'}・${s.source}）`),
  `- 未確定報酬: **${funnel.metrics.pendingRewardYen == null ? '未取得' : `¥${funnel.metrics.pendingRewardYen}`}**（売上ではない。ASPごとに期間が違う）`,
  '- 入金: このリポジトリでは記録していない（確定売上と入金は別）',
  '',
  '## 今日の収益機会 TOP10',
  '',
  ...opportunities.slice(0, 10).map((p, i) =>
    `${i + 1}. **${p.title}** — Score ${p.score}\n   - URL: ${p.path}\n   - 直近7日Views: ${formatCount(p.views7, '上位外')} / 28日Views: ${formatCount(p.views28, '上位外')} / GSC表示: ${p.gscImpressions}\n   - 意図: ${Object.entries(p.intents).filter(([,v]) => v).map(([k]) => k).join(', ') || '未設定'}\n   - Booking: ${p.hasBooking ? '手動' : p.hasAutoBooking ? '自動' : 'なし'} / Active: ${p.activeProviders.join(', ') || (p.hasAutoBooking ? '既存承認済み自動ルート' : 'なし')} / 未提携: ${p.nonActiveProviders.join(', ') || 'なし'}\n   - 次アクション: ${actionFor(p)}`
  ),
  '',
  '## 収益化ギャップ',
  '',
  ...pages.filter((p) => p.monetizationGap > 0).slice(0, 20).map((p) =>
    `- **${p.title}**｜gap ${p.monetizationGap}｜${p.path}｜${actionFor(p)}`
  ),
  '',
  '## ガードレール',
  '',
  '- 確定成果・確定売上だけを実績として扱う。推定CVやクリックを売上に置き換えない。',
  '- 公式情報を必ず先に出し、報酬額でリンク順を変えない。',
  '- 未提携サービスを広告リンクとして表示しない。',
  '- 1ページに複数の収益導線を無制限に増やさず、検索意図に最も近い導線を優先する。',
  '- スポンサー/PRは編集順位から分離し、PR表示を必須にする。',
  '- Revenue Engineは候補抽出まで。外部ASP申請・契約・有料サービス導入は自動実行しない。',
  '',
];

const report = lines.join('\n');
console.log(report);
if (write) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${report}\n`, 'utf8');
}
