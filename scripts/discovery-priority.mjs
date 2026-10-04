#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PERFORMANCE = join(ROOT, 'data/editorial/performance-snapshot.json');
const REVENUE = join(ROOT, 'data/editorial/revenue-opportunities.json');
const DISCOVER_HTML = join(ROOT, 'dist/discover/index.html');
const REPORT = join(ROOT, 'reports/editorial/discovery-priorities.md');
const write = process.argv.includes('--write');

for (const path of [PERFORMANCE, REVENUE, DISCOVER_HTML]) {
  if (!existsSync(path)) {
    console.error(`Discovery priority: required file missing: ${path}`);
    process.exit(1);
  }
}

const performance = JSON.parse(readFileSync(PERFORMANCE, 'utf8'));
const revenue = JSON.parse(readFileSync(REVENUE, 'utf8'));
const html = readFileSync(DISCOVER_HTML, 'utf8');

const decode = (value = '') => value
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');

const cards = [...html.matchAll(/<li\s+[^>]*data-discovery-card[^>]*>/g)].map((match) => {
  const tag = match[0];
  const attr = (name) => decode(tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '');
  return {
    search: attr('data-search').toLowerCase(),
    area: attr('data-area'),
    tags: attr('data-tags').toLowerCase(),
    kind: attr('data-kind') || 'unknown',
  };
});

const REGIONS = ['県北', '県央', '県南', '鹿行', '県西'];
const INTENTS = [
  { key: 'kids', label: '子連れ', terms: ['子連れ', '家族', 'ファミリー', '子ども'], revenue: 1 },
  { key: 'date', label: 'デート', terms: ['デート', '恋人', 'カップル'], revenue: 2 },
  { key: 'rain', label: '雨の日', terms: ['雨の日', '屋内', '室内'], revenue: 2 },
  { key: 'autumn', label: '紅葉', terms: ['紅葉', 'コキア'], revenue: 2 },
  { key: 'fireworks', label: '花火', terms: ['花火'], revenue: 2 },
  { key: 'park', label: '公園', terms: ['公園'], revenue: 1 },
  { key: 'aquarium', label: '水族館', terms: ['水族館'], revenue: 2 },
  { key: 'onsen', label: '温泉', terms: ['温泉', '入浴'], revenue: 3 },
  { key: 'food', label: 'グルメ', terms: ['グルメ', '食', '海鮮', 'カフェ', 'レストラン'], revenue: 3 },
];

const now = new Date();
const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', month: 'numeric' }).format(now));

function seasonScore(intent) {
  if (intent.key === 'autumn') return [9,10,11].includes(month) ? 3 : 0;
  if (intent.key === 'fireworks') return [6,7,8,9,10,11].includes(month) ? 2 : 0;
  if (intent.key === 'rain') return [6,7,9,10].includes(month) ? 1 : 0;
  if (intent.key === 'onsen') return [10,11,12,1,2,3].includes(month) ? 2 : 0;
  return 0;
}

const containsAny = (card, terms) => {
  const text = `${card.search} ${card.tags}`;
  return terms.some((term) => text.includes(term.toLowerCase()));
};

const coverage = [];
for (const region of REGIONS) {
  const inRegion = cards.filter((card) => card.area.includes(region));
  for (const intent of INTENTS) {
    const count = inRegion.filter((card) => containsAny(card, intent.terms)).length;
    const gapScore = count === 0 ? 5 : count === 1 ? 4 : count === 2 ? 3 : count === 3 ? 1 : 0;
    const score = gapScore * 2 + intent.revenue + seasonScore(intent);
    coverage.push({
      region,
      intent: intent.label,
      count,
      gapScore,
      revenueScore: intent.revenue,
      seasonScore: seasonScore(intent),
      score,
    });
  }
}

const coveragePriority = coverage
  .filter((row) => row.count < 4)
  .sort((a, b) => b.score - a.score || a.count - b.count || a.region.localeCompare(b.region, 'ja'));

const ga4Top = new Map([
  ...(performance.ga4TopPages?.recent7 ?? []).map((row) => [row.path, Number(row.views ?? 0)]),
  ...(performance.ga4TopPages?.recent28 ?? []).map((row) => [row.path, Number(row.views ?? 0)]),
]);

const existing = (performance.gscDiscovery?.findings ?? [])
  .filter((finding) => finding.page && (finding.impressions != null || finding.clicks != null || finding.position != null))
  .map((finding) => {
    const impressions = Number(finding.impressions ?? 0);
    const clicks = Number(finding.clicks ?? 0);
    const ctr = Number(finding.ctr ?? 0);
    const position = Number(finding.position ?? 99);
    const views = ga4Top.get(finding.page) ?? 0;

    // 露出があるのにCTRが弱い、かつ1ページ目付近のページを優先。
    const impressionScore = Math.min(5, Math.log10(Math.max(1, impressions)) * 1.6);
    const ctrScore = impressions >= 50 && ctr < 0.02 ? 4 : impressions >= 50 && ctr < 0.05 ? 2 : 0;
    const positionScore = position <= 4 ? 1 : position <= 10 ? 4 : position <= 20 ? 2 : 0;
    const trafficScore = views >= 500 ? 3 : views >= 100 ? 2 : views > 0 ? 1 : 0;
    const score = impressionScore + ctrScore + positionScore + trafficScore;

    return {
      page: finding.page,
      query: finding.query ?? finding.signalType ?? 'multiple',
      signalType: finding.signalType ?? '',
      clicks,
      impressions,
      ctr,
      position,
      views,
      score,
      recommendedAction: finding.recommendedAction ?? '',
    };
  })
  .sort((a, b) => b.score - a.score);

const revenueLanes = revenue.revenueLanes ?? [];
const highRevenueLanes = revenueLanes.filter((lane) => lane.priority === 'high').map((lane) => lane.name);

const topTen = [];
for (const item of existing.slice(0, 5)) {
  topTen.push({
    type: '既存改善',
    label: `${item.query} → ${item.page}`,
    score: Number(item.score.toFixed(1)),
    reason: `GSC ${item.impressions}表示 / CTR ${(item.ctr * 100).toFixed(2)}% / 平均${item.position.toFixed(1)}位${item.views ? ` / GA4 ${item.views} Views` : ''}`,
    action: item.recommendedAction || '検索意図・title・冒頭回答・内部リンクを観測窓に従って見直す',
  });
}
for (const item of coveragePriority) {
  if (topTen.length >= 10) break;
  topTen.push({
    type: '新規補強',
    label: `${item.region} × ${item.intent}`,
    score: item.score,
    reason: `Discovery候補 ${item.count}件 / 穴スコア ${item.gapScore} / 収益性 ${item.revenueScore} / 季節性 ${item.seasonScore}`,
    action: '公式確認済みスポット・既存記事・新規記事の順で候補を増やす。需要未確認なら長文記事を量産しない',
  });
}

topTen.sort((a, b) => b.score - a.score);

const lines = [
  '# Discovery Growth Priority',
  '',
  `- 基準日: ${performance.asOf ?? 'unknown'}`,
  `- Discovery検索対象: **${cards.length}件**`,
  `- GA4 28日Views: **${performance.windows?.ga4?.recent28?.views ?? 'unknown'}**`,
  `- GSC 28日impressions: **${performance.windows?.gsc?.recent28?.impressions ?? 'unknown'}**`,
  `- 高優先収益レーン: ${highRevenueLanes.join(' / ') || '未設定'}`,
  '',
  '## 今日のTOP10',
  '',
  ...topTen.slice(0, 10).map((item, index) =>
    `${index + 1}. **[${item.type}] ${item.label}** — Score ${item.score}\n   - 根拠: ${item.reason}\n   - 次アクション: ${item.action}`
  ),
  '',
  '## 既存ページの検索機会',
  '',
  ...(existing.length ? existing.slice(0, 10).map((item) =>
    `- **${item.query}**｜${item.page}｜${item.impressions} imp / ${item.clicks} click / CTR ${(item.ctr * 100).toFixed(2)}% / ${item.position.toFixed(1)}位 / Score ${item.score.toFixed(1)}`
  ) : ['- GSCのページ単位シグナルがありません。']),
  '',
  '## Discoveryの薄い領域',
  '',
  ...(coveragePriority.length ? coveragePriority.slice(0, 20).map((item) =>
    `- **${item.region} × ${item.intent}**｜${item.count}件｜Score ${item.score}（穴${item.gapScore} / 収益${item.revenueScore} / 季節${item.seasonScore}）`
  ) : ['- 主要条件は十分な候補数があります。']),
  '',
  '## 実行ルール',
  '',
  '- 既にGSC露出がある検索意図は、重複する新規URLより既存ページ改善を優先する。',
  '- Discoveryの穴は、まず既存の確認済みスポットをタグ・ミニガイドで活用し、それでも不足し需要が確認できる場合だけ新規長文記事を作る。',
  '- 収益性が高くても公式情報や提携条件が未確認なら実装しない。',
  '- 観測窓内の既存SEOページは、事実誤り・開催期限などの例外を除き連続改修しない。',
  '- TOP10は意思決定補助であり、機械的な自動公開はしない。',
  '',
];

const output = lines.join('\n');
console.log(output);

if (write) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${output}\n`, 'utf8');
}
