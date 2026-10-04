#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function fm(raw) {
  return raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? '';
}
function scalar(front, key) {
  const m = front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}
function bool(front, key) {
  const value = scalar(front, key);
  return value === 'true' ? true : value === 'false' ? false : null;
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
function bookingItems(front) {
  const b = block(front, 'booking');
  const chunks = b.split(/^\s{4}-\s+/m).slice(1);
  return chunks.map((chunk) => ({
    provider: /^provider:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim() ?? '',
    label: /^label:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim() ?? '',
    url: /^\s{2}url:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim() ?? '',
    kind: /^\s{2}kind:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim() ?? 'official',
  })).filter((x) => x.provider && x.url);
}

const providerStatus = new Map(
  [...affiliates.matchAll(/^\s{2}['"]?([a-z0-9-]+)['"]?:\s*\{[^{}]*status:\s*'([^']+)'/gm)]
    .map((m) => [m[1], m[2]])
);

const ga7 = new Map((performance.ga4TopPages?.recent7 ?? []).map((x) => [x.path, Number(x.views ?? 0)]));
const ga28 = new Map((performance.ga4TopPages?.recent28 ?? []).map((x) => [x.path, Number(x.views ?? 0)]));
const gsc = new Map();
for (const f of performance.gscDiscovery?.findings ?? []) {
  if (!f.page) continue;
  const row = gsc.get(f.page) ?? { impressions: 0, clicks: 0 };
  row.impressions += Number(f.impressions ?? 0);
  row.clicks += Number(f.clicks ?? 0);
  gsc.set(f.page, row);
}

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
  const front = fm(raw);
  if (bool(front, 'draft') !== false || bool(front, 'reviewed') !== true || bool(front, 'noindex') === true) continue;

  const path = `/events/${basename(file, '.md')}/`;
  const title = scalar(front, 'title') ?? path;
  const intents = nestedBools(front, 'businessIntent');
  const items = bookingItems(front);
  const nonActive = items.filter((item) => !['official', ''].includes(item.provider) && providerStatus.get(item.provider) !== 'active');
  const active = items.filter((item) => providerStatus.get(item.provider) === 'active');
  const g = gsc.get(path) ?? { impressions: 0, clicks: 0 };
  const views7 = ga7.get(path) ?? 0;
  const views28 = ga28.get(path) ?? 0;

  pages.push({ path, title, intents, items, nonActive, active, views7, views28, impressions: g.impressions, clicks: g.clicks });
}

const providerMap = new Map();
for (const page of pages) {
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
    row.views7 += page.views7;
    row.views28 += page.views28;
    row.impressions += page.impressions;
    row.score += Math.min(8, page.views7 / 50) + Math.min(6, page.views28 / 200) + Math.min(5, page.impressions / 300);
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
    row.views7 += page.views7;
    row.views28 += page.views28;
    row.impressions += page.impressions;
    row.score += meta.value
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
  `- 基準日: ${performance.asOf ?? 'unknown'}`,
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
