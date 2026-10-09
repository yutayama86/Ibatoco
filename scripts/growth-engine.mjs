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
import { todayJst } from '../src/lib/growth-engine.mjs';
import { runGrowthOS } from '../src/lib/growth-os.mjs';
import { loadContentPages } from './lib/content-pages.mjs';
import { auditFreshness } from './freshness-guard.mjs';
import { parseSeoChanges } from './lib/seo-changes.mjs';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const today = process.env.GROWTH_TODAY ?? todayJst();

// 実測（整合チェックは runGrowthOS の中で通す。src/lib/snapshot-quality.mjs）
const snapshot = readJson('data/editorial/performance-snapshot.json');
const config = readJson('data/editorial/growth-engine.json');
const radarConfig = readJson('data/editorial/demand-radar.json');
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
// 実測の整合チェック → Growth Engine → Demand Radar / PV Relay / Pipeline → Batch → Revenue Funnel → Annual Learning（src/lib/growth-os.mjs）
const learningRecords = readJson('data/editorial/seasonal-learning.json').records ?? [];
const result = runGrowthOS({
  snapshot,
  engineConfig: config,
  radarConfig,
  pages,
  changes: parseSeoChanges(readFileSync(join(ROOT, 'src/data/seo-changes.ts'), 'utf8')),
  actions,
  registry,
  inbound: internalLinkGraph(),
  freshness,
  ledger: readJson('data/editorial/revenue-ledger.json'),
  asp: readJson('data/editorial/asp-results.json'),
  learningRecords,
  trendsData: existsSync(join(ROOT, 'data/editorial/search-trends.json')) ? readJson('data/editorial/search-trends.json') : null,
  today,
});
const { demandRadar: radar, pvRelay: relay, pipeline, nextWinners: winners, revenueFunnel: funnel } = result;
const annual = result.annualLearning.categories;

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
// PV at Risk の「終わり」と「失う可能性」。節目（申請締切など）は終わりではないので、止まった場合の上限として別に書く
const endText = (i) => i.endDate ?? (i.nextMilestone ? `節目 ${i.nextMilestone.date} ${i.nextMilestone.label}` : '不明');
const lostText = (i) => (i.lostViewsIfDrops ? `上限 ${fmt(i.lostViewsIfDrops[7])} / ${fmt(i.lostViewsIfDrops[30])}（節目の後に止まった場合）` : `${fmt(i.lostViewsForecast[7])} / ${fmt(i.lostViewsForecast[30])}`);
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
  '## ④⑤ PV at Risk（今後失う可能性のある Views と代替候補）',
  '',
  `今後7日 ${fmt(relay.lostViewsForecast[7])}・14日 ${fmt(relay.lostViewsForecast[14])}・30日 ${fmt(relay.lostViewsForecast[30])} PV（forecast。直近7日 ${fmt(relay.siteViews7)}・GA4 ${relay.dataAsOf}）`,
  ...(relay.baselineExcludingTop2 ? ['', `- ${relay.baselineExcludingTop2.label}：直近7日 ${fmt(relay.baselineExcludingTop2.views7)} → 30日 ${fmt(relay.baselineExcludingTop2.monthly30)}`] : []),
  '',
  '| 主要流入ページ | 7日Views | 全体比 | 終わり | 状態 | 失う可能性（7日/30日） | 代替候補（現在の7日Views・仕込み期限） |',
  '|---|---|---|---|---|---|---|',
  ...relay.items.map((i) => `| ${i.label.slice(0, 40)} | ${fmt(i.views7)} | ${i.shareOfSite == null ? '—' : `${Math.round(i.shareOfSite * 100)}%`} | ${endText(i)} | ${i.status} | ${lostText(i)} | ${i.replacements.map((r) => `${r.label.slice(0, 18)}（7日${fmt(r.views7)}・11月見込み ${fmt(r.expectedViewsNovember)}・${r.deadlinePassed ? '至急' : r.next ? `${r.next.label} ${r.next.date}` : '—'}）`).join('、') || '—'} |`),
  '',
  '## ⑥ Demand Radar（需要の増加速度が高い順）',
  '',
  ...radar.filter((r) => r.kind === 'page' && r.components.timing !== 0 && (r.viewsVelocityPct ?? r.impressionsVelocityPct ?? 0) > 0).sort((a, b) => Math.max(b.viewsVelocityPct ?? 0, b.impressionsVelocityPct ?? 0) - Math.max(a.viewsVelocityPct ?? 0, a.impressionsVelocityPct ?? 0)).slice(0, 8)
    .map((r) => `- ${r.label.slice(0, 40)}：7日Views ${fmt(r.views7)}（前週比 ${r.viewsVelocityPct == null ? (r.isNew ? '新規' : '—') : `${r.viewsVelocityPct > 0 ? '+' : ''}${r.viewsVelocityPct}%`}）・表示28日 ${fmt(r.impressions28)}（前期間比 ${r.impressionsVelocityPct == null ? (r.impressionsPrev28 === 0 ? '新規' : '—') : `${r.impressionsVelocityPct}%`}）・${r.position == null ? '—' : `${r.position.toFixed(1)}位`}・Demand Score ${r.score ?? '—'}（coverage ${r.coverage}）`),
  '',
  '### 急上昇の検索語 TOP20（gscQueries・直近7日の表示の増加数が大きい順）',
  '',
  ...(!result.gscQueriesAvailable ? ['- 検索語別の 7日/前7日/28日/前28日（gscQueries）は未取得。performance-snapshot に入ると検索語単位の急上昇を出す']
    : result.risingQueries.length ? result.risingQueries.map((q, n) => `${n + 1}. ${q.label} → ${q.pageLabel.slice(0, 30)}：表示7日 ${fmt(q.impressions7)}（前7日 ${fmt(q.impressionsPrev7)}・${q.impressions7VelocityPct == null ? '新規' : `${q.impressions7VelocityPct > 0 ? '+' : ''}${q.impressions7VelocityPct}%`}）・28日 ${fmt(q.impressions28)}・${q.position == null ? '—' : `${q.position.toFixed(1)}位`}・伸びしろ ${q.upside == null ? '—' : `+${fmt(q.upside)}（推定）`}・${q.observing ? `観測中〜${q.observing}` : q.action}`)
      : ['- 上昇中の検索語なし（しきい値：表示7日 ' + (radarConfig.queryRadar?.minImpressions7 ?? 20) + ' 以上・前7日比 +' + (radarConfig.queryRadar?.risingPct ?? 30) + '% 以上）']),
  '',
  '### Query Clusters TOP10（表記ゆれを「ページ × 検索意図」でまとめ、終了していないもの。直近7日の表示の増加数順）',
  '',
  ...(result.gscQueriesAvailable
    ? result.searchSignals.rising.slice(0, 10).map((c, n) => `${n + 1}. ${c.cluster}：表示7日 ${fmt(c.impressions7)}（前7日 ${fmt(c.impressionsPrev7)}・${c.growthPct == null ? '新規' : `${c.growthPct > 0 ? '+' : ''}${c.growthPct}%`}）・28日 ${fmt(c.impressions28)}・${c.position ?? '—'}位・CTR ${pct(c.ctr)}・伸びしろ ${c.upside == null ? '—' : `+${fmt(c.upside)}（推定）`}・${c.queryCount}語（${c.topQueries.slice(0, 3).join('／')}）→ ${c.action}`)
    : ['- gscQueries 未取得']),
  '',
  '### 検索の変化（A〜G）',
  '',
  `- A 急上昇：${result.searchSignals.rising.length} まとまり／G 新規需要（前7日0から）：${result.searchSignals.newDemand.length}`,
  `- B 4〜20位で表示がある（TOP3を狙える）：${result.searchSignals.strikingDistance.length}（伸びしろ上位：${result.searchSignals.strikingDistance.slice(0, 5).map((c) => `${c.cluster} +${fmt(c.upside)}`).join('、') || '—'}）`,
  `- C 高表示・低CTR（順位別CTR目安の半分未満）：${result.searchSignals.lowCtr.slice(0, 5).map((c) => `${c.cluster}（${fmt(c.impressions28)}表示・CTR ${pct(c.ctr)}・${c.position}位）`).join('、') || 'なし'}`,
  `- D 順位上昇（ページ別・前28日比）：${result.searchSignals.positionUp.slice(0, 6).map((t) => `${t.label.slice(0, 20)} ${t.positionPrev?.toFixed(1)}→${t.position?.toFixed(1)}位`).join('、') || 'なし'}`,
  `- E CTR悪化：${result.searchSignals.ctrDown.slice(0, 5).map((t) => `${t.label.slice(0, 20)} ${pct(t.ctrPrev)}→${pct(t.ctr)}`).join('、') || 'なし'}`,
  `- F 順位下落：${result.searchSignals.positionDown.slice(0, 5).map((t) => `${t.label.slice(0, 20)} ${t.positionPrev?.toFixed(1)}→${t.position?.toFixed(1)}位`).join('、') || 'なし'}`,
  '- 検索語ごとの前期間の順位・CTR は gscQueries に無いため、D〜F はページ別（pageMetrics の前28日）で判定',
  '',
  '## Search Trends（Google Trends・proxy。月間検索ボリュームではない）',
  '',
  ...(result.searchTrends.length ? [
    `取得 ${result.trendsUpdatedAt}・需要の大きさは基準語「土浦花火」の5年最大を100とした値（比較をまたぐため、一桁の語は丸めの誤差が大きい）`,
    '',
    '| 検索語 | 需要の大きさ | 例年の山 | 立ち上がり→山 | 山の週の割合 | 今年の山の週 | 今年の立ち上がり | 直近の完了週（例年の同じ週） | 対応ページ |',
    '|---|---|---|---|---|---|---|---|---|',
    ...result.searchTrends.map((t) => `| ${t.keyword} | ${t.peakRelativeToAnchor ?? '—'} | ${t.typicalPeakMonthDay ? `${t.typicalPeakMonthDay}（${t.seasonsMeasured}年）` : t.status} | ${t.typicalRiseToPeakDays == null ? '—' : `${t.typicalRiseToPeakDays}日`} | ${t.typicalPeakShare == null ? '—' : `${Math.round(t.typicalPeakShare * 100)}%`} | ${t.expectedPeakWeek ?? '—'} | ${t.expectedRise ?? '—'} | ${t.latestComplete ? `${t.latestComplete.belowOne ? '1未満' : t.latestComplete.value}（${t.latestComplete.typicalSameWeek ?? '—'}）` : '—'} | ${t.page ?? 'なし'} |`),
    '',
    '- 立ち上がり＝山の10%以上が山まで連続する最初の週。山の週の割合＝山の週 ÷ 山の12週前〜2週後の合計（小さいほど山の前から需要がある）',
    '- 今年の山の週：記事に開催日がある語はその日を含む週、それ以外は例年の山の月日（中央値）。季節の実測が2年未満の語・通年型（スポーツ）は例年を出さない',
  ] : ['- search-trends.json が無い（npm run trends:import -- <CSV…>）']),
  '',
  '## 100k Gap Map（11月の見込みをテーマ別に。根拠のある推定だけ）',
  '',
  `サイト全体の着地予測 ${fmt(result.gapMap.siteForecast)}・ページ別の伸びしろ合計 +${fmt(result.gapMap.upsideTotal)} → ${fmt(result.gapMap.withUpside)}。残り ${fmt(result.gapMap.remainingGap)} は根拠のある推定でまだ説明できていない（新しい需要の発見が必要）`,
  '',
  '| テーマ | ページ | 11月見込み | 伸びしろ | 検索需要（Trends） | 主なページ |',
  '|---|---|---|---|---|---|',
  ...result.gapMap.themes.slice(0, 12).map((t) => `| ${t.theme} | ${t.pages} | ${fmt(t.forecast)}${t.caution ? '（※）' : ''} | +${fmt(t.upside)} | ${t.trendsPeakRelative ?? '—'} | ${t.top.map((p) => `${p.label.slice(0, 16)}（${fmt(p.forecast)}${p.caution ? `・${p.caution}` : ''}）`).join('、')} |`),
  '',
  '- ※ 見込みに、11月より前に終わる・節目の後に減る可能性があるページを含む（直近の1日平均がそのまま続く前提のため上振れ）',
  '',
  `- ${result.gapMap.basis}`,
  '',
  '## ⑧ Next Winners（次に育てる既存ページ）',
  '',
  ...(winners.length ? winners.map((w) => `- ${w.label.slice(0, 40)}：伸びしろ ${w.upside == null ? '—' : `+${fmt(w.upside)}`}（推定）・速度 ${w.viewsVelocityPct ?? '—'}%・${w.observing ? `観測中〜${w.observing}` : w.action}`) : ['- なし']),
  '',
  '## ⑦⑨ 30/60/90日 Pipeline（仕込み）',
  '',
  ...['0-30', '31-60', '61-90'].flatMap((b) => [`### ${b}日`, ...pipeline.filter((p) => p.bucket === b).slice(0, 40).map((p) => `- ${p.date} ${p.label.slice(0, 40)}${p.path ? '' : '（ページなし）'}：${p.action}${p.trends ? `（Trends：例年なら立ち上がり ${p.trends.expectedRise ?? '—'}・山 ${p.trends.expectedPeakWeek}週）` : ''}`), '']),
  '## ⑩ Revenue Funnel（クリックは成果として扱わない）',
  '',
  ...funnel.stages.map((st) => `- ${st.label}：${st.value == null ? '未取得' : fmt(st.value)}（${st.period ?? '—'}・${st.source}）`),
  `- Revenue / 1,000 Views：${funnel.metrics.revenuePer1000Views ?? '—'} 円（${funnel.metrics.revenuePer1000ViewsBasis}）・Affiliate CTR ${pct(funnel.metrics.affiliateCtr)}・発生CVR ${funnel.metrics.occurredCvr ?? '—'}・承認率 ${funnel.metrics.approvalRate ?? '—'}・EPC ${funnel.metrics.epc ?? '—'}`,
  `- ${funnel.metrics.note}`,
  ...funnel.diagnosis.flatMap((d) => [`- ⚠ ${d.message}`, ...d.pages.map((p) => `  - ${p.path}（${p.provider}・${fmt(p.clicks)} click）`)]),
  '',
  '## ⑪ Annual Learning（2027年に使う季節実測）',
  '',
  `台帳 ${learningRecords.length} 件・実測あり ${learningRecords.filter((r) => r.measuredAt).length} 件（data/editorial/seasonal-learning.json）`,
  ...annual.map((c) => `- ${c.label}：${c.records} 件・実測 ${c.measured} 件・需要の立ち上がり ${c.leadDaysAvg != null ? `平均 ${c.leadDaysAvg} 日前` : `データ不足（${c.leadDaysSamples} 件）`}・検索表示のピーク ${c.impressionsPeakLeadAvg != null ? `開催の平均 ${c.impressionsPeakLeadAvg} 日前（${c.impressionsPeakSamples} 件）` : `データ不足（${c.impressionsPeakSamples} 件）`}`),
  '- 学習は同カテゴリ2件以上の実測から。seasonalRules（growth-engine.json）は自動で変えない',
  '',
  '## ⑫ Today\'s Growth Batch（期待PV × 確度 ÷ 工数 × 緊急度。緊急度に需要の速度・失うPVの代替を反映）',
  '',
  ...(result.batch.length
    ? result.batch.map((b, i) => `${i + 1}. ${b.title}（期待 +${fmt(b.expectedPv)} PV・確度 ${b.confidence ?? '—'}・工数 ${b.effortHours}h・緊急度 ${b.urgency}${b.replacesAtRisk ? '・失うPVの代替' : ''}）— ${b.reason || b.source}`)
    : ['- 期待PVを推定できる施策が無い']),
  ...(result.batchCandidatesWithoutEstimate.length ? ['', `期待PVを推定できない候補（順位付けしない）：${result.batchCandidatesWithoutEstimate.slice(0, 5).map((c) => c.title.slice(0, 30)).join('／')}`] : []),
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
