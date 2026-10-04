#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'dist/discover/index.html');
const REPORT = join(ROOT, 'reports/editorial/discovery-coverage.md');
const write = process.argv.includes('--write');

if (!existsSync(HTML)) {
  console.error('Discovery coverage: dist/discover/index.html がありません。先に npm run build を実行してください。');
  process.exit(1);
}

const html = readFileSync(HTML, 'utf8');
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

if (!cards.length) {
  console.error('Discovery coverage: data-discovery-card が0件です。');
  process.exit(1);
}

const REGIONS = ['県北', '県央', '県南', '鹿行', '県西'];
const INTENTS = [
  { key: 'kids', label: '子連れ', terms: ['子連れ', '家族', 'ファミリー', '子ども'] },
  { key: 'date', label: 'デート', terms: ['デート', '恋人', 'カップル'] },
  { key: 'rain', label: '雨の日', terms: ['雨の日', '屋内', '室内'] },
  { key: 'autumn', label: '紅葉', terms: ['紅葉', 'コキア'] },
  { key: 'fireworks', label: '花火', terms: ['花火'] },
  { key: 'park', label: '公園', terms: ['公園'] },
  { key: 'aquarium', label: '水族館', terms: ['水族館'] },
  { key: 'onsen', label: '温泉', terms: ['温泉', '入浴'] },
  { key: 'food', label: 'グルメ', terms: ['グルメ', '食', '海鮮', 'カフェ', 'レストラン'] },
];

const containsAny = (card, terms) => {
  const text = `${card.search} ${card.tags}`;
  return terms.some((term) => text.includes(term.toLowerCase()));
};

const kindCounts = new Map();
for (const card of cards) kindCounts.set(card.kind, (kindCounts.get(card.kind) ?? 0) + 1);

const matrix = [];
for (const region of REGIONS) {
  const inRegion = cards.filter((card) => card.area.includes(region));
  for (const intent of INTENTS) {
    matrix.push({
      region,
      intent: intent.label,
      count: inRegion.filter((card) => containsAny(card, intent.terms)).length,
    });
  }
}

const GAP_TARGET = 3;
const gaps = matrix.filter((row) => row.count < GAP_TARGET)
  .sort((a, b) => a.count - b.count || a.region.localeCompare(b.region, 'ja') || a.intent.localeCompare(b.intent, 'ja'));

const lines = [
  `# Discovery カバレッジ監査`,
  '',
  `- 検索対象: **${cards.length}件**`,
  `- 種別: ${[...kindCounts.entries()].map(([kind, count]) => `${kind} ${count}件`).join(' / ')}`,
  `- 薄い組み合わせ基準: 1条件あたり **${GAP_TARGET}件未満**`,
  `- 薄い組み合わせ: **${gaps.length}件**`,
  '',
  '## 優先補強候補',
  '',
  ...(gaps.length
    ? gaps.slice(0, 25).map((row) => `- **${row.region} × ${row.intent}**：${row.count}件`)
    : ['- 主要条件はすべて3件以上あります。']),
  '',
  '## 地域別の検索対象',
  '',
  ...REGIONS.map((region) => `- ${region}: ${cards.filter((card) => card.area.includes(region)).length}件`),
  '',
  '## 判断ルール',
  '',
  '- この監査は既存コンテンツの文字列・タグだけを数えます。該当性を推測して水増ししません。',
  '- 0〜2件の組み合わせは、次の取材・記事・ミニガイド候補の優先順位付けに使います。',
  '- 検索需要・収益性・季節性は別途GA4/GSCと一次情報で確認し、件数だけで記事化を決めません。',
  '',
];

const report = lines.join('\n');
console.log(report);

if (write) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${report}\n`, 'utf8');
}
