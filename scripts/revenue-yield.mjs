#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS = join(ROOT, 'src/content/events');
const PERF = join(ROOT, 'data/editorial/performance-snapshot.json');
const LEDGER = join(ROOT, 'data/editorial/revenue-ledger.json');
const REPORT = join(ROOT, 'reports/editorial/revenue-yield.md');
const JSON_OUT = join(ROOT, 'reports/editorial/revenue-yield.json');
const write = process.argv.includes('--write');

for (const path of [EVENTS, PERF, LEDGER]) {
  if (!existsSync(path)) {
    console.error(`Revenue Yield Engine: required file missing: ${path}`);
    process.exit(1);
  }
}

const performance = JSON.parse(readFileSync(PERF, 'utf8'));
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));

function fm(raw) {
  return raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? '';
}
function scalar(front, key) {
  const m = front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}
function bool(front, key) {
  const v = scalar(front, key);
  return v === 'true' ? true : v === 'false' ? false : null;
}
function block(front, key) {
  const lines = front.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^[A-Za-z][A-Za-z0-9]*:\s*/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}
function nestedBools(front, key) {
  return Object.fromEntries(
    [...block(front, key).matchAll(/^\s{2}([A-Za-z]+):\s*(true|false)$/gm)]
      .map((m) => [m[1], m[2] === 'true'])
  );
}

const ga7 = new Map((performance.ga4TopPages?.recent7 ?? []).map((x) => [x.path, Number(x.views ?? 0)]));
const ga28 = new Map((performance.ga4TopPages?.recent28 ?? []).map((x) => [x.path, Number(x.views ?? 0)]));

// 将来のページ別ファネルをそのまま受けられる。まだ無ければ空。
const pageFunnels = new Map(
  (performance.conversionDetail?.byPage ?? []).map((row) => [row.path, {
    bookingGuideViews: Number(row.booking_guide_view ?? 0),
    bookingClicks: Number(row.outbound_booking_click ?? 0),
    monetizedClicks: Number(row.monetized_booking_click ?? row.paid_outbound_booking_click ?? 0),
  }])
);

const revenueByPage = new Map();
let totalConfirmedRevenue = 0;
let unattributedConfirmedRevenue = 0;
for (const entry of ledger.entries ?? []) {
  if (entry.status !== 'confirmed') continue;
  const amount = Number(entry.revenueYen ?? 0);
  if (!Number.isFinite(amount) || amount < 0) continue;
  totalConfirmedRevenue += amount;
  if (!entry?.page) {
    unattributedConfirmedRevenue += amount;
    continue;
  }
  revenueByPage.set(entry.page, (revenueByPage.get(entry.page) ?? 0) + amount);
}

const pages = [];
for (const file of readdirSync(EVENTS).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
  const raw = readFileSync(join(EVENTS, file), 'utf8');
  const front = fm(raw);
  if (bool(front, 'draft') !== false || bool(front, 'reviewed') !== true || bool(front, 'noindex') === true) continue;

  const path = `/events/${basename(file, '.md')}/`;
  const title = scalar(front, 'title') ?? path;
  const intents = nestedBools(front, 'businessIntent');
  const commercialPriority = scalar(front, 'commercialPriority');
  const views7 = ga7.get(path) ?? 0;
  const views28 = ga28.get(path) ?? 0;
  const funnel = pageFunnels.get(path) ?? { bookingGuideViews: 0, bookingClicks: 0, monetizedClicks: 0 };
  const revenueYen = revenueByPage.get(path) ?? 0;

  const actualRpm = views28 > 0 && revenueYen > 0 ? revenueYen / views28 * 1000 : null;
  const monetizedClickRpm = views28 > 0 ? funnel.monetizedClicks / views28 * 1000 : null;
  const bookingClickRpm = views28 > 0 ? funnel.bookingClicks / views28 * 1000 : null;
  const bookingCtr = funnel.bookingGuideViews > 0 ? funnel.bookingClicks / funnel.bookingGuideViews : null;

  const intentWeight = [
    intents.accommodation ? 3 : 0,
    intents.parking ? 3 : 0,
    intents.experience ? 2 : 0,
    intents.food ? 2 : 0,
    intents.booking ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const trafficWeight = views7 >= 500 ? 5 : views7 >= 100 ? 4 : views7 >= 30 ? 3 : views28 >= 100 ? 2 : views28 > 0 ? 1 : 0;
  const commercialWeight = commercialPriority === 'high' ? 3 : commercialPriority === 'medium' ? 2 : commercialPriority === 'low' ? 1 : 0;

  let tier = 'intent-proxy';
  let yieldScore = intentWeight * 2 + trafficWeight + commercialWeight;
  if (funnel.monetizedClicks > 0 && monetizedClickRpm != null) {
    tier = 'monetized-click-proxy';
    yieldScore = Math.min(30, monetizedClickRpm * 2) + intentWeight + trafficWeight;
  }
  if (actualRpm != null) {
    tier = 'actual-revenue';
    yieldScore = Math.min(60, actualRpm / 20) + trafficWeight;
  }

  pages.push({
    path,
    title,
    tier,
    revenueYen,
    actualRpm,
    monetizedClickRpm,
    bookingClickRpm,
    bookingCtr,
    views7,
    views28,
    bookingGuideViews: funnel.bookingGuideViews,
    bookingClicks: funnel.bookingClicks,
    monetizedClicks: funnel.monetizedClicks,
    intentWeight,
    commercialPriority,
    yieldScore: Number(yieldScore.toFixed(2)),
  });
}

pages.sort((a, b) => {
  const rank = { 'actual-revenue': 0, 'monetized-click-proxy': 1, 'intent-proxy': 2 };
  const tierDiff = rank[a.tier] - rank[b.tier];
  if (tierDiff !== 0) return tierDiff;
  return b.yieldScore - a.yieldScore || b.views28 - a.views28;
});

const totalRevenue = totalConfirmedRevenue;
const totalViews28 = Number(performance.windows?.ga4?.recent28?.views ?? 0);
const siteActualRpm = totalViews28 > 0 ? totalRevenue / totalViews28 * 1000 : 0;

const top = pages.slice(0, 15);
const state = {
  generatedAt: new Date().toISOString(),
  asOf: performance.asOf ?? null,
  totalConfirmedRevenueYen: totalRevenue,
  unattributedConfirmedRevenueYen: unattributedConfirmedRevenue,
  siteActualRpmYen: Number(siteActualRpm.toFixed(2)),
  hasPageFunnel: pageFunnels.size > 0,
  pages: top,
};

function metricLine(p) {
  if (p.tier === 'actual-revenue') {
    return `確定売上 ¥${p.revenueYen} / RPM ¥${p.actualRpm.toFixed(0)} / 28日Views ${p.views28}`;
  }
  if (p.tier === 'monetized-click-proxy') {
    return `Monetized Click/1,000PV ${p.monetizedClickRpm.toFixed(2)} / paid clicks ${p.monetizedClicks} / 28日Views ${p.views28}`;
  }
  return `購入意図Score ${p.intentWeight} / 7日Views ${p.views7} / 28日Views ${p.views28}`;
}

function actionFor(p) {
  if (p.tier === 'actual-revenue') return '実RPM上位。検索順位・流入・同系統ページへの展開を優先';
  if (p.tier === 'monetized-click-proxy') return '成果リンククリックは発生。確定成果が入るまでCTA実験と提携導線を維持';
  if (p.intentWeight >= 6 && p.views28 >= 100) return '高意図×流入あり。既存提携で自動収益化できるか確認';
  if (p.intentWeight >= 5) return '高意図だが流入不足。SEO/Discoveryで需要獲得を先に伸ばす';
  return '収益より検索・回遊価値を優先';
}

const lines = [
  '# Revenue Yield Engine',
  '',
  `- 基準日: ${performance.asOf ?? 'unknown'}`,
  `- 確定売上合計: **¥${totalRevenue}**`,
  `- Site Actual RPM: **¥${siteActualRpm.toFixed(0)} / 1,000 Views**`,
  `- ページ未帰属の確定売上: **¥${unattributedConfirmedRevenue}**`,
  `- ページ別ファネル: **${pageFunnels.size > 0 ? '利用可能' : '未取得'}**`,
  '',
  '## 伸ばすべきページ TOP15',
  '',
  ...top.map((p, i) =>
    `${i + 1}. **${p.title}** — ${p.tier} / Score ${p.yieldScore}\n   - ${p.path}\n   - ${metricLine(p)}\n   - 次アクション: ${actionFor(p)}`
  ),
  '',
  '## 指標の優先順位',
  '',
  '1. **Actual RPM** — 確定売上 ÷ Views × 1,000。最優先。',
  '2. **Monetized Click / 1,000PV** — 確定売上前の代理指標。売上とは呼ばない。',
  '3. **Intent Proxy** — 購入意図 × 流入 × commercialPriority。需要探索用。',
  '',
  '## ガードレール',
  '',
  '- クリック、CV推定、ASP未確定成果を売上へ置き換えない。',
  '- 実売上RPMが存在するページを代理指標より上位に扱う。',
  '- 高RPMでも一次情報・検索意図・読者体験を壊す広告増量はしない。',
  '- RPMが高い1ページへの依存を避け、同じ意図クラスターへ横展開する。',
  '- 追加費用が必要な計測基盤は導入しない。',
  '',
];

const output = lines.join('\n');
console.log(output);

if (write) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${output}\n`, 'utf8');
  writeFileSync(JSON_OUT, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
