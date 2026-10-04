#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const REPORT_DIR = join(ROOT, 'reports/editorial');
const OUTPUT = join(REPORT_DIR, 'operator-brief.md');
const STATE = join(REPORT_DIR, 'operator-state.json');
const PERFORMANCE = join(ROOT, 'data/editorial/performance-snapshot.json');
const write = process.argv.includes('--write');

const requiredReports = [
  ['growth', 'growth-target.md'],
  ['monetization', 'monetization-audit.md'],
  ['revenue', 'revenue-engine.md'],
  ['discoveryPriority', 'discovery-priorities.md'],
  ['discoveryCoverage', 'discovery-coverage.md'],
  ['editorial', 'daily-brief.md'],
];

for (const [, file] of requiredReports) {
  const path = join(REPORT_DIR, file);
  if (!existsSync(path)) {
    console.error(`Operator OS: required report missing: ${path}`);
    process.exit(1);
  }
}

const reports = Object.fromEntries(
  requiredReports.map(([key, file]) => [key, readFileSync(join(REPORT_DIR, file), 'utf8')])
);
const performance = existsSync(PERFORMANCE)
  ? JSON.parse(readFileSync(PERFORMANCE, 'utf8'))
  : null;

function section(md, heading) {
  const lines = md.split('\n');
  const target = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === target);
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}

function firstNumber(md, label) {
  const line = md.split('\n').find((x) => x.includes(label));
  if (!line) return null;
  const m = line.match(/([0-9][0-9,]*(?:\.[0-9]+)?)/);
  return m ? Number(m[1].replaceAll(',', '')) : null;
}

function extractTop(md, heading, limit = 5) {
  const s = section(md, heading);
  if (!s) return [];
  const lines = s.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^\d+\.\s+\*\*(.*?)\*\*(?:\s+—\s+Score\s+([0-9.]+))?/);
    if (!m) continue;
    const detail = [];
    for (let j = i + 1; j < lines.length && /^\s{3}-\s+/.test(lines[j]); j += 1) {
      detail.push(lines[j].trim().replace(/^-\s+/, ''));
    }
    out.push({ label: m[1], score: m[2] ? Number(m[2]) : null, detail });
    if (out.length >= limit) break;
  }
  return out;
}

const growthCurrent = performance?.windows?.ga4?.recent28?.views ?? null;
const growthTarget = performance?.northStar?.target ?? 100000;
const growthRunRate = performance?.northStar?.runRate28FromRecent7 ?? null;
const bookingClicks7 = performance?.conversionDetail?.recent7?.outbound_booking_click ?? null;

const monetization = {
  totalLinks: firstNumber(reports.monetization, 'Bookingリンク総数'),
  paidLinks: firstNumber(reports.monetization, '実際に収益化されるリンク'),
  activeUnmapped: firstNumber(reports.monetization, '提携済みだがURL未マッピング'),
  nonPartner: firstNumber(reports.monetization, '未提携リンク'),
};

const discoveryCount = firstNumber(reports.discoveryPriority, 'Discovery検索対象');
const coverageGaps = firstNumber(reports.discoveryCoverage, '薄い組み合わせ');
const growthTop = extractTop(reports.discoveryPriority, '今日のTOP10', 5);
const revenueTop = extractTop(reports.revenue, '今日の収益機会 TOP10', 5);
const monetizationGaps = extractTop(reports.monetization, '最優先ギャップ', 5);

const blockers = [];
if ((monetization.activeUnmapped ?? 0) > 0) {
  blockers.push(`提携済みなのに成果リンク未マッピングが${monetization.activeUnmapped}件`);
}
if (performance?.source?.freshness?.todayRefreshSucceeded === false) {
  blockers.push('GA4/GSCの当日更新に失敗');
}
if (performance?.asOf) {
  const age = Math.floor((Date.now() - Date.parse(`${performance.asOf}T00:00:00+09:00`)) / 86400000);
  if (age > 2) blockers.push(`パフォーマンスデータが${age}日前`);
}

const approvals = [
  '新規有料SaaS・API・従量課金サービス',
  '未提携サービスのASP申請・契約',
  'スポンサー/広告の契約・価格変更',
  '個人情報を新たに取得する機能',
];

const autoSafe = [
  'イベント終了判定・非表示',
  'Discoveryカバレッジ監査',
  'GA4/GSCベースの優先順位付け',
  '収益機会スコアリング',
  '収益化リンク監査',
  '日次Operator Brief生成',
];

const state = {
  generatedAt: new Date().toISOString(),
  growth: { current28Views: growthCurrent, targetViews: growthTarget, runRate28: growthRunRate },
  monetization: { ...monetization, bookingClicks7 },
  discovery: { entities: discoveryCount, coverageGaps },
  blockers,
  approvals,
  growthTop,
  revenueTop,
  monetizationGaps,
};

const lines = [
  '# Ibatoco Autonomous Operator',
  '',
  '> 一人運営・追加費用ゼロ前提。日々の判断、監査、優先順位付けを自動化し、人間は承認が必要な事項だけ判断する。',
  '',
  '## 経営ダッシュボード',
  '',
  `- 28日Views: **${growthCurrent ?? 'unknown'} / ${growthTarget}**`,
  `- 直近7日ペースの28日換算: **${growthRunRate ?? 'unknown'}**`,
  `- Discovery検索対象: **${discoveryCount ?? 'unknown'}件**`,
  `- Discovery薄領域: **${coverageGaps ?? 'unknown'}件**`,
  `- 直近7日Booking click: **${bookingClicks7 ?? 'unknown'}**`,
  `- 実収益化リンク: **${monetization.paidLinks ?? 'unknown'} / ${monetization.totalLinks ?? 'unknown'}**`,
  `- 提携済みURL未マッピング: **${monetization.activeUnmapped ?? 'unknown'}件**`,
  '',
  '## 今日の成長TOP5',
  '',
];

if (growthTop.length) {
  for (const [index, item] of growthTop.entries()) {
    lines.push(`${index + 1}. **${item.label}**${item.score != null ? ` — Score ${item.score}` : ''}`);
    for (const detail of item.detail) lines.push(`   - ${detail}`);
  }
} else {
  lines.push('- 候補なし');
}

lines.push('', '## 今日の収益TOP5', '');
if (revenueTop.length) {
  for (const [index, item] of revenueTop.entries()) {
    lines.push(`${index + 1}. **${item.label}**${item.score != null ? ` — Score ${item.score}` : ''}`);
    for (const detail of item.detail) lines.push(`   - ${detail}`);
  }
} else {
  lines.push('- 候補なし');
}

lines.push('', '## 人間承認が必要', '');
for (const item of approvals) lines.push(`- ${item}`);

lines.push('', '## 要対応ブロッカー', '');
if (blockers.length) {
  for (const item of blockers) lines.push(`- **${item}**`);
} else {
  lines.push('- なし');
}

lines.push('', '## 自動で回すもの', '');
for (const item of autoSafe) lines.push(`- ${item}`);

lines.push(
  '',
  '## 運用原則',
  '',
  '- 記事本数をKPIにしない。期待PV、収益、再利用性、鮮度で判断する。',
  '- 追加費用が発生するサービスは自動導入しない。',
  '- 自動公開は外部一次情報の事実確認が不要な派生表示・終了判定・集計に限定する。',
  '- 新しい事実、価格、営業時間、日程、提携条件は推測で埋めない。',
  '- 1人運営を壊す個別受託、手作業営業、手作業レポートを増やさない。',
  '- 売上が増えても運営時間が比例して増えない施策を優先する。',
  ''
);

const output = lines.join('\n');
console.log(output);

if (write) {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(OUTPUT, `${output}\n`, 'utf8');
  writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
