#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookingItems, dataFreshness, formatCount, isEventEnded, isPublished, lookup, orZero, readFrontmatter, viewsByPath } from './lib/report-data.mjs';
import { todayJst } from '../src/lib/growth-engine.mjs';

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

// GA4 上位ページ・ページ別ファネルに無いページは「0」ではなく「値なし」（null）。並べ替えのときだけ 0 として扱う
const ga7 = viewsByPath(performance.ga4TopPages?.recent7);
const ga28 = viewsByPath(performance.ga4TopPages?.recent28);
const today = todayJst();
const freshness = dataFreshness(performance.asOf, today);
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
  const data = readFrontmatter(raw);
  if (!isPublished(data)) continue;
  const items = bookingItems(data);
  if (!items.length) continue;
  const path = `/events/${basename(file, '.md')}/`;
  const title = data.title ?? path;
  const funnel = pageFunnel.get(path) ?? null;
  const ended = isEventEnded(data, today);

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
      ended,
      providerStatus: provider?.status ?? 'none',
      views7: lookup(ga7, path),
      views28: lookup(ga28, path),
      bookingGuideViews: funnel ? funnel.bookingGuideViews : null,
      bookingClicks: funnel ? funnel.bookingClicks : null,
      monetizedClicks: funnel ? funnel.monetizedClicks : null,
      nonMonetizedClicks: funnel ? Math.max(0, funnel.bookingClicks - funnel.monetizedClicks) : null,
    });
  }
}

const counts = Object.fromEntries(['paid','active-unmapped','non-partner','official'].map((state) => [
  state, rows.filter((r) => r.state === state).length
]));

const rankedGaps = rows
  // 終了したイベントは、これから収益化できないので優先ギャップに入れない
  .filter((r) => !r.ended && (r.state === 'active-unmapped' || r.state === 'non-partner'))
  .sort((a, b) => {
    const aPriority = a.state === 'active-unmapped' ? 1000 : 0;
    const bPriority = b.state === 'active-unmapped' ? 1000 : 0;
    const aDemand = orZero(a.nonMonetizedClicks) * 500 + orZero(a.bookingClicks) * 50 + orZero(a.views7) * 10 + orZero(a.views28);
    const bDemand = orZero(b.nonMonetizedClicks) * 500 + orZero(b.bookingClicks) * 50 + orZero(b.views7) * 10 + orZero(b.views28);
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
  freshness.line,
  `- Bookingリンク総数: **${rows.length}**（公開中のイベント記事 ${new Set(rows.map((r) => r.path)).size}本の booking.items）`,
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
  `- 対象：開催中・これからのイベント（今日 ${today} の時点。終了したイベントのリンク ${rows.filter((r) => r.ended).length}本は除外）`,
  '',
  ...(rankedGaps.length ? rankedGaps.slice(0, 20).map((r, i) =>
    `${i + 1}. **${r.title}**｜${r.state}\n   - ${r.path}\n   - provider: ${r.provider} / kind: ${r.kind}\n   - 7日Views: ${formatCount(r.views7, '上位外')} / 28日Views: ${formatCount(r.views28, '上位外')} / 予約クリック: ${formatCount(r.bookingClicks)}\n   - 元URL: ${r.url}`
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
