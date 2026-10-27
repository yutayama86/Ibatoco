#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookingItems, isEventEnded, isPublished, lookup, orZero, readFrontmatter, viewsByPath, dataFreshness } from './lib/report-data.mjs';
import { todayJst } from '../src/lib/growth-engine.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS = join(ROOT, 'src/content/events');
const PERF = join(ROOT, 'data/editorial/performance-snapshot.json');
const AFFILIATES = join(ROOT, 'src/data/affiliates.ts');
const REPORT = join(ROOT, 'reports/editorial/partner-opportunities.md');
const JSON_OUT = join(ROOT, 'reports/editorial/partner-opportunities.json');
const write = process.argv.includes('--write');

for (const path of [EVENTS, PERF, AFFILIATES]) {
  if (!existsSync(path)) {
    console.error(`Partner Opportunity Engine: required file missing: ${path}`);
    process.exit(1);
  }
}

const performance = JSON.parse(readFileSync(PERF, 'utf8'));
const affiliates = readFileSync(AFFILIATES, 'utf8');

const providerStatus = new Map(
  [...affiliates.matchAll(/^\s{2}['"]?([a-z0-9-]+)['"]?:\s*\{[^{}]*status:\s*'([^']+)'/gm)]
    .map((m) => [m[1], m[2]])
);

// GA4 上位ページに無いページは 0 ではなく「値なし」。合算・スコアのときだけ 0 として扱う
const ga7 = viewsByPath(performance.ga4TopPages?.recent7);
const ga28 = viewsByPath(performance.ga4TopPages?.recent28);
const gsc = new Map();
for (const f of performance.gscDiscovery?.findings ?? []) {
  if (!f.page) continue;
  const row = gsc.get(f.page) ?? { impressions: 0, clicks: 0 };
  row.impressions += Number(f.impressions ?? 0);
  row.clicks += Number(f.clicks ?? 0);
  gsc.set(f.page, row);
}

const pageFunnel = new Map(
  (performance.conversionDetail?.byPage ?? []).map((row) => [row.path, {
    bookingClicks: Number(row.outbound_booking_click ?? 0),
    monetizedClicks: Number(row.monetized_booking_click ?? 0),
  }])
);
const actualCandidateClicks = new Map();
for (const row of performance.conversionDetail?.byProviderPage ?? []) {
  if (row.classification !== 'non-partner-candidate') continue;
  const key = `${row.path}::${row.link_provider}`;
  actualCandidateClicks.set(key, (actualCandidateClicks.get(key) ?? 0) + Number(row.event_count ?? 0));
}
// 終了判定は「今日」（日本時間）で行う。計測データの基準日が古くても、終わったイベントは終わっている
const today = todayJst();
const freshness = dataFreshness(performance.asOf, today);

const categoryMeta = {
  parking: { label: '駐車場', value: 4 },
  accommodation: { label: '宿泊', value: 5 },
  experience: { label: '体験・チケット', value: 4 },
  food: { label: '飲食・予約', value: 3 },
  booking: { label: '予約全般', value: 2 },
};

const pages = [];
for (const file of readdirSync(EVENTS).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
  const raw = readFileSync(join(EVENTS, file), 'utf8');
  const data = readFrontmatter(raw);
  if (!isPublished(data)) continue;

  const path = `/events/${basename(file, '.md')}/`;
  const title = data.title ?? path;
  const intents = Object.fromEntries(Object.entries(data.businessIntent ?? {}).filter(([, v]) => v === true));
  const isEnded = isEventEnded(data, today);
  const items = bookingItems(data);
  const nonActive = items.filter((item) => !['official', ''].includes(item.provider) && providerStatus.get(item.provider) !== 'active');
  const active = items.filter((item) => providerStatus.get(item.provider) === 'active');
  const g = gsc.get(path) ?? { impressions: 0, clicks: 0 };
  const views7 = orZero(lookup(ga7, path));
  const views28 = orZero(lookup(ga28, path));

  const funnel = pageFunnel.get(path) ?? { bookingClicks: 0, monetizedClicks: 0 };
  pages.push({
    path, title, intents, items, nonActive, active, views7, views28,
    impressions: g.impressions, clicks: g.clicks,
    bookingClicks: funnel.bookingClicks,
    monetizedClicks: funnel.monetizedClicks,
    isEnded,
  });
}

const providerMap = new Map();
for (const page of pages) {
  if (page.isEnded) continue;
  for (const item of page.nonActive) {
    const key = item.provider;
    const row = providerMap.get(key) ?? {
      provider: key,
      pages: new Set(),
      labels: new Set(),
      urls: new Set(),
      views7: 0,
      views28: 0,
      impressions: 0,
      score: 0,
    };
    row.pages.add(page.path);
    row.labels.add(item.label);
    row.urls.add(item.url);
    const candidateClicks = actualCandidateClicks.get(`${page.path}::${item.provider}`) ?? 0;
    row.views7 += page.views7;
    row.views28 += page.views28;
    row.impressions += page.impressions;
    row.bookingClicks = (row.bookingClicks ?? 0) + page.bookingClicks;
    row.candidateClicks = (row.candidateClicks ?? 0) + candidateClicks;
    row.score += candidateClicks * 8
      + Math.min(8, page.views7 / 50)
      + Math.min(6, page.views28 / 200)
      + Math.min(5, page.impressions / 300);
    providerMap.set(key, row);
  }
}

const providerOpportunities = [...providerMap.values()]
  .map((row) => ({
    ...row,
    pages: [...row.pages],
    labels: [...row.labels],
    urls: [...row.urls],
    score: Number(row.score.toFixed(1)),
  }))
  .sort((a, b) => b.score - a.score || b.views7 - a.views7);

const categoryMap = new Map();
for (const page of pages) {
  if (page.isEnded) continue;
  for (const [key, meta] of Object.entries(categoryMeta)) {
    if (!page.intents[key]) continue;
    const hasActiveRelevant = page.active.length > 0;
    if (hasActiveRelevant && key === 'accommodation') continue;

    const row = categoryMap.get(key) ?? {
      category: key,
      label: meta.label,
      pages: new Set(),
      views7: 0,
      views28: 0,
      impressions: 0,
      valueWeight: meta.value,
      score: 0,
    };
    row.pages.add(page.path);
    const candidateClicks = page.nonActive.reduce(
      (sum, item) => sum + (actualCandidateClicks.get(`${page.path}::${item.provider}`) ?? 0),
      0,
    );
    row.views7 += page.views7;
    row.views28 += page.views28;
    row.impressions += page.impressions;
    row.bookingClicks = (row.bookingClicks ?? 0) + page.bookingClicks;
    row.candidateClicks = (row.candidateClicks ?? 0) + candidateClicks;
    row.score += meta.value
      + candidateClicks * 6
      + Math.min(8, page.views7 / 50)
      + Math.min(6, page.views28 / 200)
      + Math.min(5, page.impressions / 300);
    categoryMap.set(key, row);
  }
}

const categoryOpportunities = [...categoryMap.values()]
  .map((row) => ({
    ...row,
    pages: [...row.pages],
    score: Number(row.score.toFixed(1)),
  }))
  .sort((a, b) => b.score - a.score);

const state = {
  generatedAt: new Date().toISOString(),
  asOf: performance.asOf ?? null,
  providerOpportunities,
  categoryOpportunities,
};

const lines = [
  '# Partner Opportunity Engine',
  '',
  freshness.line,
  `- 終了判定の基準: 今日（${today}・日本時間）。終了したイベントは候補から外す`,
  '- Views の合計は GA4 上位ページに入ったページの分だけ（上位外は値が無いので足していない）',
  '- 方針: 実需要が見えるまで新規提携を増やさない。追加費用がかかる提携・SaaSは対象外。',
  '',
  '## 新規提携を検討する提供元',
  '',
  ...(providerOpportunities.length
    ? providerOpportunities.slice(0, 10).map((item, i) =>
      `${i + 1}. **${item.provider}** — Score ${item.score}\n   - 対象ページ: ${item.pages.length}件\n   - 合計7日Views: ${item.views7} / 28日Views: ${item.views28} / GSC表示: ${item.impressions}\n   - URL例: ${item.urls[0] ?? 'なし'}\n   - 判断: 無料で提携可能か、成果条件・表示義務を確認してから申請候補化`
    )
    : ['- 現時点で既存記事から明確な未提携提供元は検出されませんでした。']),
  '',
  '## 提携カテゴリの不足',
  '',
  ...(categoryOpportunities.length
    ? categoryOpportunities.slice(0, 10).map((item, i) =>
      `${i + 1}. **${item.label}** — Score ${item.score}\n   - 対象ページ: ${item.pages.length}件\n   - 合計7日Views: ${item.views7} / 28日Views: ${item.views28} / GSC表示: ${item.impressions}`
    )
    : ['- 大きなカテゴリ不足は検出されませんでした。']),
  '',
  '## 申請判断ルール',
  '',
  '- 既存提携で代替できる場合は新規提携しない。',
  '- 追加費用が必要なサービスは候補から除外する。',
  '- 実クリック需要または高いページ需要が確認できるものだけ申請候補にする。',
  '- 申請優先度は実測の未提携候補クリックを最優先し、単なるPVの多さだけで決めない。',
  '- 終了済みイベントの過去クリックは、新規提携の申請優先度に使わない。',
  '- 契約条件・報酬条件・広告表示義務は人間確認後に進める。',
  '- 提携成立後は affiliates.ts に元URL→成果URLを登録し、Monetized Click Shareで効果検証する。',
  '',
];

const output = lines.join('\n');
console.log(output);
if (write) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${output}\n`, 'utf8');
  writeFileSync(JSON_OUT, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
