#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS = join(ROOT, 'src/content/events');
const AFFILIATES = join(ROOT, 'src/data/affiliates.ts');
const PERFORMANCE = join(ROOT, 'data/editorial/performance-snapshot.json');
const REPORT = join(ROOT, 'reports/editorial/monetization-audit.md');
const write = process.argv.includes('--write');

for (const path of [EVENTS, AFFILIATES, PERFORMANCE]) {
  if (!existsSync(path)) {
    console.error(`Monetization audit: required file missing: ${path}`);
    process.exit(1);
  }
}

const affiliates = readFileSync(AFFILIATES, 'utf8');
const performance = JSON.parse(readFileSync(PERFORMANCE, 'utf8'));

function providerBlock(id) {
  const escaped = id.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\$&');
  const re = new RegExp(`^\\s{2}['"]?${escaped}['"]?:\\s*\\{([\\s\\S]*?)(?=^\\s{2}['"]?[a-z0-9-]+['"]?:\\s*\\{|^};)`, 'm');
  return re.exec(affiliates)?.[1] ?? '';
}

const providerIds = [...affiliates.matchAll(/^\s{2}['"]?([a-z0-9-]+)['"]?:\s*\{/gm)].map((m) => m[1]);
const providers = new Map(providerIds.map((id) => {
  const b = providerBlock(id);
  const status = /status:\s*'([^']+)'/.exec(b)?.[1] ?? 'none';
  const mapped = new Set([...b.matchAll(/^\s{6}'(https?:\/\/[^']+)':/gm)].map((m) => m[1]));
  return [id, { status, mapped }];
}));

function fm(raw) { return raw.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? ''; }
function scalar(front, key) {
  const m = front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}
function bool(front, key) {
  const v = scalar(front, key);
  return v === 'true' ? true : v === 'false' ? false : null;
}
function bookingBlock(front) {
  const lines = front.split('\n');
  const start = lines.findIndex((line) => /^booking:\s*$/.test(line));
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^[A-Za-z][A-Za-z0-9]*:\s*/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}
function bookingItems(front) {
  const b = bookingBlock(front);
  const rows = [];
  const itemChunks = b.split(/^\s{4}-\s+/m).slice(1);
  for (const chunk of itemChunks) {
    const provider = /^provider:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim();
    const url = /^\s{2}url:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim();
    const label = /^label:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim();
    const kind = /^\s{2}kind:\s*['"]?([^'"\n]+)['"]?/m.exec(chunk)?.[1]?.trim();
    if (provider && url) rows.push({ provider, url, label: label ?? '', kind: kind ?? 'official' });
  }
  return rows;
}

const ga7 = new Map((performance.ga4TopPages?.recent7 ?? []).map((x) => [x.path, Number(x.views ?? 0)]));
const ga28 = new Map((performance.ga4TopPages?.recent28 ?? []).map((x) => [x.path, Number(x.views ?? 0)]));
const pageFunnel = new Map(
  (performance.conversionDetail?.byPage ?? []).map((row) => [row.path, {
    bookingGuideViews: Number(row.booking_guide_view ?? 0),
    bookingClicks: Number(row.outbound_booking_click ?? 0),
    monetizedClicks: Number(row.monetized_booking_click ?? 0),
  }])
);
const providerClickRows = performance.conversionDetail?.byProviderPage ?? [];
const paidClickCount = providerClickRows
  .filter((row) => row.classification === 'paid')
  .reduce((sum, row) => sum + Number(row.event_count ?? 0), 0);
const activeUnmappedClickCount = providerClickRows
  .filter((row) => row.classification === 'active-unmapped')
  .reduce((sum, row) => sum + Number(row.event_count ?? 0), 0);
const officialClickCount = providerClickRows
  .filter((row) => row.classification === 'official')
  .reduce((sum, row) => sum + Number(row.event_count ?? 0), 0);
const nonPartnerCandidateClickCount = providerClickRows
  .filter((row) => row.classification === 'non-partner-candidate')
  .reduce((sum, row) => sum + Number(row.event_count ?? 0), 0);
const activePartnerClickCount = paidClickCount + activeUnmappedClickCount;
const commercialMonetizedShare = activePartnerClickCount > 0
  ? paidClickCount / activePartnerClickCount
  : null;

const rows = [];
for (const file of readdirSync(EVENTS).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
  const raw = readFileSync(join(EVENTS, file), 'utf8');
  const front = fm(raw);
  if (bool(front, 'draft') !== false || bool(front, 'reviewed') !== true || bool(front, 'noindex') === true) continue;
  const items = bookingItems(front);
  if (!items.length) continue;
  const path = `/events/${basename(file, '.md')}/`;
  const title = scalar(front, 'title') ?? path;

  for (const item of items) {
    const provider = providers.get(item.provider);
    let state = 'non-partner';
    if (item.provider === 'official') state = 'official';
    else if (provider?.status === 'active') state = provider.mapped.has(item.url) ? 'paid' : 'active-unmapped';

    rows.push({
      path,
      title,
      ...item,
      state,
      providerStatus: provider?.status ?? 'none',
      views7: ga7.get(path) ?? 0,
      views28: ga28.get(path) ?? 0,
      bookingGuideViews: pageFunnel.get(path)?.bookingGuideViews ?? 0,
      bookingClicks: pageFunnel.get(path)?.bookingClicks ?? 0,
      monetizedClicks: pageFunnel.get(path)?.monetizedClicks ?? 0,
      nonMonetizedClicks: Math.max(
        0,
        (pageFunnel.get(path)?.bookingClicks ?? 0) - (pageFunnel.get(path)?.monetizedClicks ?? 0),
      ),
    });
  }
}

const counts = Object.fromEntries(['paid','active-unmapped','non-partner','official'].map((state) => [
  state, rows.filter((r) => r.state === state).length
]));

const rankedGaps = rows
  .filter((r) => r.state === 'active-unmapped' || r.state === 'non-partner')
  .sort((a, b) => {
    const aPriority = a.state === 'active-unmapped' ? 1000 : 0;
    const bPriority = b.state === 'active-unmapped' ? 1000 : 0;
    const aDemand = a.nonMonetizedClicks * 500 + a.bookingClicks * 50 + a.views7 * 10 + a.views28;
    const bDemand = b.nonMonetizedClicks * 500 + b.bookingClicks * 50 + b.views7 * 10 + b.views28;
    return (bPriority + bDemand) - (aPriority + aDemand);
  });

const funnelRows = [...pageFunnel.entries()]
  .map(([path, funnel]) => ({
    path,
    ...funnel,
    nonMonetizedClicks: Math.max(0, funnel.bookingClicks - funnel.monetizedClicks),
    monetizedShare: funnel.bookingClicks > 0 ? funnel.monetizedClicks / funnel.bookingClicks : null,
  }))
  .filter((row) => row.bookingClicks > 0)
  .sort((a, b) =>
    b.nonMonetizedClicks - a.nonMonetizedClicks
    || b.bookingClicks - a.bookingClicks
    || b.monetizedClicks - a.monetizedClicks
  );

const totalBookingClicks = funnelRows.reduce((sum, row) => sum + row.bookingClicks, 0);
const totalMonetizedClicks = paidClickCount || funnelRows.reduce((sum, row) => sum + row.monetizedClicks, 0);
const totalNonMonetizedClicks = activeUnmappedClickCount;

const lines = [
  '# Monetization Link Audit',
  '',
  `- Bookingリンク総数: **${rows.length}**`,
  `- 実際に収益化されるリンク: **${counts.paid}**`,
  `- 提携済みだがURL未マッピング: **${counts['active-unmapped']}**`,
  `- 未提携リンク: **${counts['non-partner']}**`,
  `- 公式リンク: **${counts.official}**`,
  `- 実測Booking click: **${totalBookingClicks}**`,
  `- 公式/主催者click: **${officialClickCount}**`,
  `- 未提携候補click: **${nonPartnerCandidateClickCount}**`,
  `- Active Partner click: **${activePartnerClickCount}**`,
  `- 実測Paid click: **${paidClickCount}**`,
  `- Activeだが未収益化click: **${activeUnmappedClickCount}**`,
  `- Commercial Monetized Click Share: **${commercialMonetizedShare == null ? '未取得' : `${(commercialMonetizedShare * 100).toFixed(2)}%`}**`,
  '',
  '## Active Partner 未収益化クリック TOP',
  '',
  ...(() => {
    const losses = providerClickRows
      .filter((row) => row.classification === 'active-unmapped')
      .sort((a, b) => Number(b.event_count ?? 0) - Number(a.event_count ?? 0));
    return losses.length
      ? losses.slice(0, 15).map((row, i) =>
        `${i + 1}. **${row.path}**\n   - provider: ${row.link_provider} / clicks: ${row.event_count}\n   - URL: ${row.link_url}`
      )
      : ['- Active Partnerの未収益化クリックはありません。'];
  })(),
  '',
  '## 未提携候補クリック',
  '',
  ...(() => {
    const candidates = providerClickRows
      .filter((row) => row.classification === 'non-partner-candidate')
      .sort((a, b) => Number(b.event_count ?? 0) - Number(a.event_count ?? 0));
    return candidates.length
      ? candidates.slice(0, 15).map((row, i) =>
        `${i + 1}. **${row.path}**\n   - provider: ${row.link_provider} / clicks: ${row.event_count}`
      )
      : ['- 未提携候補クリックはありません。'];
  })(),
  '',
  '## 最優先ギャップ',
  '',
  ...(rankedGaps.length ? rankedGaps.slice(0, 20).map((r, i) =>
    `${i + 1}. **${r.title}**｜${r.state}\n   - ${r.path}\n   - provider: ${r.provider} / kind: ${r.kind}\n   - 7日Views: ${r.views7} / 28日Views: ${r.views28}\n   - 元URL: ${r.url}`
  ) : ['- 収益化ギャップはありません。']),
  '',
  '## 計測',
  '',
  '- outbound_booking_click は is_paid_link と monetization_state を送る。',
  '- Commercial Monetized Click Share = paid / (paid + active-unmapped)。公式クリックは分母に入れない。',
  '- active-unmapped は提携済み提供元だが、そのURLが成果リンク未登録。最優先で確認する。',
  '- non-partner-candidate は損失ではなく、新規提携の検討材料として別管理する。',
  '- official / 主催者リンクは読者価値のある正常行動で、収益損失として扱わない。',
  '',
];

const output = lines.join('\n');
console.log(output);
if (write) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${output}\n`, 'utf8');
}
