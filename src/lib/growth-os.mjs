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
import { demandPipeline, demandRadar, nextWinners, pvRelay, relayBatch, seasonsFor } from './demand-radar.mjs';
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
  const relay = pvRelay({ snapshot, pages, seasons, engineConfig, config: radarConfig, radar, today });
  const pipeline = demandPipeline({ pages, seasons, radar, snapshot, today });
  const winners = nextWinners({ radar, forecasts: result.forecasts });
  const queries = radar.filter((s) => s.kind === 'query');
  const risingQueries = queries.filter((q) => q.rising && q.components.timing !== 0)
    .sort((a, b) => (b.impressions7VelocityPct ?? (b.isNew ? Infinity : 0)) - (a.impressions7VelocityPct ?? (a.isNew ? Infinity : 0)))
    .slice(0, radarConfig.queryRadar?.top ?? 10);
  const relayed = relayBatch({ engineBatch: result.batch, winners, relay, seasons, queries });
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
