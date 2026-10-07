/**
 * Growth OS の計算をひとまとめにする（日次レポート scripts/growth-engine.mjs と Control Center が同じ結果を出すため）。
 *
 *   実測の整合チェック（snapshot-quality）
 *   → Growth Engine（着地予測・Gap・ページ予測・SEO機会・季節の締切・観測窓・施策の優先度）
 *   → Demand Radar / PV Relay / 30・60・90日 Pipeline / Next Winners（demand-radar）
 *   → Today's Growth Batch（PV Relay 反映。既存と同じ式）
 *   → Revenue Funnel（revenue-funnel）・Annual Learning（seasonal-learning）
 *
 * ファイルは読まない（呼び出し側が渡す）。docs/GROWTH_ENGINE.md
 */
import { runGrowthEngine } from './growth-engine.mjs';
import { auditSnapshot } from './snapshot-quality.mjs';
import { demandPipeline, demandRadar, nextWinners, pvRelay, queryClusters, relayBatch, searchTrends, seasonsFor } from './demand-radar.mjs';
import { revenueFunnel } from './revenue-funnel.mjs';
import { aggregateLearning } from './seasonal-learning.mjs';

const ALERT_ORDER = { critical: 0, warning: 1, info: 2 };

/**
 * @param {{ snapshot: any, engineConfig: any, radarConfig: any, pages: Map<string, any>, changes: any[], actions: any[], registry: any,
 *   inbound?: any | null, freshness?: any[], ledger: any, asp: any, learningRecords?: any[], today: string }} input
 */
export function runGrowthOS({ snapshot: rawSnapshot, engineConfig, radarConfig, pages, changes, actions, registry, inbound = null, freshness = [], ledger, asp, learningRecords = [], today }) {
  const quality = auditSnapshot(rawSnapshot);
  const snapshot = quality.snapshot;
  const result = runGrowthEngine({ snapshot, config: engineConfig, pages, changes, actions, registry, inbound, freshness, today });
  const seasons = seasonsFor(pages, engineConfig, today);
  const radar = demandRadar({ snapshot, pages, seasons, engineConfig, config: radarConfig, observation: result.observation, registry, today });
  const relay = pvRelay({ snapshot, pages, seasons, engineConfig, config: radarConfig, radar, forecasts: result.forecasts, today });
  const pipeline = demandPipeline({ pages, seasons, radar, snapshot, today });
  const winners = nextWinners({ radar, forecasts: result.forecasts });
  const queries = radar.filter((s) => s.kind === 'query');
  // 急上昇：直近7日の表示の増え方（件数）が大きい順。終了したページの検索語は PV Relay 側で扱う
  const risingQueries = queries.filter((q) => q.rising && q.components.timing !== 0)
    .sort((a, b) => ((b.impressions7 ?? 0) - (b.impressionsPrev7 ?? 0)) - ((a.impressions7 ?? 0) - (a.impressionsPrev7 ?? 0)))
    .slice(0, radarConfig.queryRadar?.top ?? 20);
  const clusters = queryClusters({ snapshot, pages, seasons, engineConfig, config: radarConfig, observation: result.observation, today });
  const trends = searchTrends({ snapshot, pages, config: radarConfig });
  const relayed = relayBatch({ engineBatch: result.batch, winners, relay, seasons, clusters });
  const gapMap = buildGapMap({ forecasts: result.forecasts, gap: result.gap, engineConfig, pages, relay });
  const funnel = revenueFunnel({ snapshot, ledger, asp, pages, commercialWords: radarConfig.commercialIntentWords });
  const annual = aggregateLearning(learningRecords, radarConfig);
  return {
    ...result,
    freshness,
    dataQuality: quality.issues,
    demandRadar: radar,
    pvRelay: relay,
    pipeline,
    nextWinners: winners,
    risingQueries,
    queryClusters: clusters,
    searchSignals: {
      rising: clusters.filter((c) => c.rising && !c.ended).sort((a, b) => b.impressionsDelta7 - a.impressionsDelta7),
      newDemand: clusters.filter((c) => c.isNew && !c.ended).sort((a, b) => b.impressions7 - a.impressions7),
      strikingDistance: clusters.filter((c) => c.strikingDistance && !c.ended).sort((a, b) => (b.upside ?? 0) - (a.upside ?? 0)),
      lowCtr: clusters.filter((c) => c.lowCtr && !c.ended).sort((a, b) => b.impressions28 - a.impressions28),
      positionUp: trends.filter((t) => t.kind === 'position-up'),
      positionDown: trends.filter((t) => t.kind === 'position-down'),
      ctrDown: trends.filter((t) => t.kind === 'ctr-down'),
    },
    gapMap,
    gscQueriesAvailable: Array.isArray(snapshot?.gscQueries),
    engineBatch: result.batch,
    batch: relayed.batch,
    batchCandidatesWithoutEstimate: relayed.candidatesWithoutEstimate,
    revenueFunnel: funnel,
    annualLearning: { categories: annual, records: learningRecords.length, measured: learningRecords.filter((r) => r.measuredAt).length },
    alerts: [...quality.issues.map(({ level, kind, message }) => ({ level, kind, message })), ...relay.alerts, ...result.alerts]
      .sort((a, b) => ALERT_ORDER[a.level] - ALERT_ORDER[b.level]),
  };
}

/**
 * 11月100,000 Views の「どこを何で取るか」。Growth Engine のページ予測（11月の見込み・伸びしろ、どちらも根拠付きの推定）をテーマ別に積む。
 * 予測の無いページ・テーマは数値にしない（推測で埋めない）。サイト全体の着地予測（gap.forecast）との差は「ページ別に説明できていない分」
 */
function buildGapMap({ forecasts, gap, engineConfig, pages, relay }) {
  // 11月より前に「需要が落ちる可能性のある節目」や終わりがあるページ（見込みが下がりうる）
  const caution = new Map((relay?.items ?? [])
    .filter((i) => i.nextMilestone?.effect === 'demand-may-drop' || i.status === 'ENDED' || i.status === 'ENDING')
    .map((i) => [i.path, i.nextMilestone ? `${i.nextMilestone.date} ${i.nextMilestone.label}の後に減る可能性` : `${i.endDate} 終了`]));
  const themeOf = (f) => {
    const page = pages.get(f.path);
    const text = [page?.slug, page?.title, page?.keyword, ...(page?.tags ?? []), f.label].filter(Boolean).join(' ');
    const season = (engineConfig.seasonCategories ?? []).find((c) => c.match.some((m) => text.includes(m)));
    if (season) return season.key;
    if (f.path.startsWith('/sports/') || /hollyhock|antlers|ホーリーホック|アントラーズ|スタジアム/.test(text)) return 'sports';
    if (/passport|パスポート/.test(text)) return 'passport';
    if (f.path.startsWith('/events/') && /guide/.test(f.path)) return 'guide';
    return f.path.split('/')[1] || 'top';
  };
  const themes = new Map();
  for (const f of forecasts) {
    const key = themeOf(f);
    const t = themes.get(key) ?? { theme: key, pages: 0, forecast: 0, upside: 0, withForecast: 0, top: [] };
    t.pages += 1;
    if (f.forecast != null) { t.forecast += f.forecast; t.withForecast += 1; }
    if (f.upside != null) t.upside += f.upside;
    t.top.push({ path: f.path, label: f.label, forecast: f.forecast, upside: f.upside, status: f.status, caution: caution.get(f.path) ?? null });
    if (caution.has(f.path)) t.caution = true;
    themes.set(key, t);
  }
  const list = [...themes.values()].map((t) => ({ ...t, top: t.top.sort((a, b) => (b.forecast ?? 0) - (a.forecast ?? 0)).slice(0, 3) }))
    .sort((a, b) => (b.forecast + b.upside) - (a.forecast + a.upside));
  const explained = list.reduce((s, t) => s + t.forecast, 0);
  const upside = list.reduce((s, t) => s + t.upside, 0);
  return {
    target: gap.target,
    siteForecast: gap.forecast,
    pageForecastTotal: explained,
    upsideTotal: upside,
    withUpside: gap.forecast == null ? null : gap.forecast + upside,
    remainingGap: gap.forecast == null ? null : gap.target - gap.forecast - upside,
    themes: list,
    basis: 'ページ別の11月見込み（直近の1日平均 × 11月の有効日数）と伸びしろ（GSCの表示のまま3位相当のCTR目安）の合計。どちらも推定。予測の無いページは含めない',
  };
}

