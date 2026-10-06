/**
 * Growth Engine の日次レポート（npm run growth:target）。CI の定期実行（Validate site の schedule）でも生成される。
 *
 * 入力（すべてリポジトリ内。追加費用ゼロ・外部APIなし）
 *   data/editorial/performance-snapshot.json … GA4 / GSC の実測（Windsor.ai 経由で日次更新される）
 *   data/editorial/growth-engine.json        … 目標・重点ページ・季節の想定・観測窓・SEOのしきい値
 *   data/editorial/action-queue.json         … 施策キュー
 *   data/editorial/event-registry.json       … イベント台帳
 *   src/data/seo-changes.ts                  … 変更履歴（観測窓）
 *   src/content/{events,news}                … 記事の開催日・季節
 *   dist/（あれば）                          … サイト内リンク網（文脈リンクの不足）
 *
 * 変更前の確認：node scripts/growth-engine.mjs --check /events/xxx/ --type metadata
 *   そのページを今その種類で変えてよいか（観測窓）を判定する。変えない方がよいときは終了コード 2
 *   種類：fact / measurement / cta / ui / metadata / internal-link / body / template / ia
 *
 * 出力（--write のとき。reports/ は Git に入れない）
 *   reports/editorial/growth-target.md   … 100k Gap Controller と今日の判断（CI の Job Summary に載る）
 *   reports/editorial/growth-engine.json … 全結果（Control Center・他のスクリプトが読む）
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { runGrowthEngine, todayJst } from '../src/lib/growth-engine.mjs';
import { auditSnapshot } from '../src/lib/snapshot-quality.mjs';
import { loadContentPages } from './lib/content-pages.mjs';
import { auditFreshness } from './freshness-guard.mjs';
import { parseSeoChanges } from './lib/seo-changes.mjs';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const today = process.env.GROWTH_TODAY ?? todayJst();

// 実測の整合チェックを通してから使う（矛盾する値は計算から外し、理由を Alerts に出す。src/lib/snapshot-quality.mjs）
const quality = auditSnapshot(readJson('data/editorial/performance-snapshot.json'));
const snapshot = quality.snapshot;
const config = readJson('data/editorial/growth-engine.json');
const actions = readJson('data/editorial/action-queue.json').actions ?? [];
const registry = readJson('data/editorial/event-registry.json');
const pages = loadContentPages(ROOT);

/**
 * サイト内リンク網（dist から）。ヘッダー・フッター・ナビの共通リンクを除いた「文脈リンク」だけを数える。
 * 候補：同じ市町村・同じタグの記事で、まだそのページへリンクしていないもの。
 */
function internalLinkGraph() {
  const dist = join(ROOT, 'dist');
  if (!existsSync(join(dist, 'index.html'))) return null;
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === 'index.html') files.push(full);
    }
  };
  walk(dist);
  const linksFrom = new Map();
  for (const file of files) {
    const from = `/${relative(dist, file).replace(/index\.html$/, '')}`.replace(/\/+/g, '/');
    let html = readFileSync(file, 'utf8');
    html = html
      .replace(/<header\b[^>]*data-site-header[\s\S]*?<\/header>/, '')
      .replace(/<footer\b[\s\S]*?<\/footer>/g, '')
      .replace(/<nav\b[\s\S]*?<\/nav>/g, '');
    const targets = new Set();
    for (const m of html.matchAll(/<a\b[^>]*\bhref="(\/[^"#?]*)/g)) {
      const to = m[1].endsWith('/') ? m[1] : `${m[1]}/`;
      if (to !== from) targets.add(to);
    }
    linksFrom.set(from, targets);
  }
  const inbound = new Map();
  for (const [from, targets] of linksFrom) {
    for (const to of targets) {
      const entry = inbound.get(to) ?? { sources: [] };
      entry.sources.push(from);
      inbound.set(to, entry);
    }
  }
  for (const focus of config.focusPages) {
    const entry = inbound.get(focus.path) ?? { sources: [] };
    const page = pages.get(focus.path);
    if (page) {
      entry.candidates = [...pages.values()]
        .filter((p) => p.path !== focus.path && !p.noindex && !entry.sources.includes(p.path))
        .map((p) => ({ path: p.path, score: p.municipalities.filter((m) => page.municipalities.includes(m)).length * 2 + p.tags.filter((t) => page.tags.includes(t)).length }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((c) => c.path);
    }
    inbound.set(focus.path, entry);
  }
  return inbound;
}

const freshness = auditFreshness({ pages, today });
const result = runGrowthEngine({
  snapshot,
  config,
  pages,
  changes: parseSeoChanges(readFileSync(join(ROOT, 'src/data/seo-changes.ts'), 'utf8')),
  actions,
  registry,
  inbound: internalLinkGraph(),
  freshness,
  today,
});
result.freshness = freshness;
result.dataQuality = quality.issues;
const ALERT_ORDER = { critical: 0, warning: 1, info: 2 };
result.alerts = [...quality.issues.map(({ level, kind, message }) => ({ level, kind, message })), ...result.alerts]
  .sort((a, b) => ALERT_ORDER[a.level] - ALERT_ORDER[b.level]);

// ---- 観測窓の確認（--check） ----
const checkIndex = process.argv.indexOf('--check');
if (checkIndex > -1) {
  const path = process.argv[checkIndex + 1];
  const type = process.argv[process.argv.indexOf('--type') + 1] ?? 'body';
  const row = result.observation.find((o) => o.path === path);
  const exempt = ['fact', 'measurement'].includes(type);
  if (!row || row.status !== 'observing' || exempt) {
    console.log(`変更可：${path}（${type}）${row ? `｜最終変更 ${row.lastChange}・${row.experimentType}・観測 〜${row.observeUntil}` : '｜変更履歴なし'}${exempt && row?.status === 'observing' ? '｜事実・計測の修正は観測中でも可' : ''}`);
    process.exit(0);
  }
  console.log(`変更を控える：${path} は ${row.observeUntil} まで観測中（${row.lastChange} の ${row.experimentType} 変更）。事実・計測の修正と季節イベントの公式発表の反映だけ可`);
  process.exit(2);
}

// ---- 表示 ----
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('ja-JP'));
const signed = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${Number(n).toLocaleString('ja-JP')}`);
const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const g = result.gap;
const lines = [
  `# 100k Growth Controller｜${today}（GA4 ${g.dataAsOf ?? '—'}）`,
  '',
  '```',
  `Target                 ${fmt(g.target)} PV（${g.month} 月間・GA4 Views）`,
  `Current Run Rate       ${fmt(g.currentRunRate28)} PV（直近7日 × 28日）`,
  `November Forecast      ${fmt(g.forecast)} PV`,
  `Gap                    ${signed(g.gap)} PV`,
  `Target Daily Average   ${fmt(g.targetDailyAverage)} PV`,
  `Current Daily Average  ${fmt(g.currentDailyAverage)} PV（必要倍率 ${g.requiredMultiplier ?? '—'} 倍）`,
  `Achievement Status     ${g.status}`,
  '```',
  '',
  `- 予測の根拠：${g.forecastBasis}`,
  `- 11月まで あと ${g.daysToMonth} 日。ローリング28日 ${fmt(g.rolling28.views)} / ${fmt(g.rolling28.target)}`,
  `- Growth Velocity：直近7日 ${fmt(g.velocity.last7)}・前週 ${fmt(g.velocity.previous7)}・前週比 ${g.velocity.wowPct == null ? '—' : `${g.velocity.wowPct > 0 ? '+' : ''}${g.velocity.wowPct}%`}・1日平均 ${fmt(g.velocity.dailyAverage)} → 必要 ${fmt(g.velocity.requiredDailyAverage)}`,
  '',
  '## Today\'s Growth Batch（今日もっとも Gap を縮める施策）',
  '',
  ...(result.batch.length
    ? result.batch.map((b, i) => `${i + 1}. ${b.title}（期待 ${b.expectedPv == null ? '未推定' : `+${fmt(b.expectedPv)} PV`}・確度 ${b.confidence ?? '—'}）— ${b.reason || b.source}`)
    : ['- 実行候補なし（期待PV・確度・工数を持つ施策がまだ無い。action-queue に expectedPvImpact / confidence / effort を付けると順位付けされる）']),
  '',
  '## Alerts',
  '',
  ...(result.alerts.length ? result.alerts.map((a) => `- [${a.level}] ${a.kind}：${a.message}`) : ['- なし']),
  '',
  '## Priority Pages（重点ページ＋検出ページ）',
  '',
  '| ページ | 7日Views | 表示 | CTR | 順位 | 11月予測 | 伸びしろ | 確度 | 状態 | 次の一手 |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...result.forecasts.slice(0, 15).map((f) => `| ${f.label}${f.focus ? '' : '（検出）'} | ${fmt(f.views7)} | ${fmt(f.impressions)} | ${pct(f.ctr)} | ${f.position == null ? '—' : f.position.toFixed(1)} | ${fmt(f.forecast)} | ${f.upside == null ? '—' : `+${fmt(f.upside)}`} | ${f.confidence} | ${f.status} | ${f.action} |`),
  '',
  '## SEO Opportunities',
  '',
  ...(result.opportunities.length
    ? result.opportunities.slice(0, 10).map((o) => `- ${o.types.join(' / ')}：${o.page}${o.query ? `「${o.query}」` : ''}${o.impressions != null ? `（表示 ${fmt(o.impressions)}・CTR ${pct(o.ctr)}・${o.position?.toFixed(1)}位）` : ''}${o.upsideViews != null ? ` 伸びしろ +${fmt(o.upsideViews)}（推定）` : ''} → ${o.action}`)
    : ['- 検出なし（GSC のページ別データ pageMetrics が入ると精度が上がる）']),
  '',
  '## Seasonal Deadlines（次の節目が近い順）',
  '',
  ...result.deadlines.slice(0, 12).map((d) => `- ${d.nextMilestone?.date ?? '—'} ${d.nextMilestone?.label ?? ''}｜${d.title}（${d.category}・段階 ${d.phase}）`),
  '',
  '## Observation Window（変更を控えるページ）',
  '',
  ...(result.observation.filter((o) => o.status === 'observing').slice(0, 15).map((o) => `- 〜${o.observeUntil} ${o.path}（${o.experimentType}、${o.lastChange} 変更）`)),
  ...(result.observation.some((o) => o.status === 'observing') ? [] : ['- なし']),
  '',
  `## Freshness / 年度（エラー ${freshness.filter((f) => f.severity === 'error').length} 件・警告 ${freshness.filter((f) => f.severity === 'warning').length} 件）`,
  '',
  ...freshness.slice(0, 15).map((f) => `- [${f.severity}] ${f.type}：${f.path} ${f.detail}`),
  '',
  'Guardrail：Views だけを成功とみなさない。sessions・engagement・検索流入・収益導線（BookingGuide・Business CTA）を同時に見る。記事数はKPIにしない。',
  '',
];
const report = lines.join('\n');

if (WRITE) {
  mkdirSync(join(ROOT, 'reports/editorial'), { recursive: true });
  writeFileSync(join(ROOT, 'reports/editorial/growth-target.md'), report, 'utf8');
  writeFileSync(join(ROOT, 'reports/editorial/growth-engine.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}
console.log(report);
