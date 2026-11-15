/**
 * 人気記事ランキングの安全な再生成。
 * Google公式GA4の確定した直近7日 pagePath×screenPageViews だけを使用する。
 * 終了済みイベント・非公開/非index記事・確認できない数値は推薦しない。
 * このモジュールは IO を持たない。実行ファイルは scripts/popular-pages-sync.mjs。
 */
import { daysBetween } from './growth-engine.mjs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE = /^\/(events|news)\/[^/?#]+\/$/;
const BLOCKED_STATUS = new Set(['ended','cancelled','canceled','postponed','中止','延期','終了']);
const sourceLabel = 'Google official GA4 Data API';

function assertDate(v, field) {
  if (typeof v !== 'string' || !DATE.test(v)) throw new Error(`popular-pages: invalid ${field}`);
}

function eligible(path, info, today) {
  if (!PAGE.test(path) || !info || info.noindex || info.frontmatter?.draft === true || info.frontmatter?.reviewed === false) return false;
  const status = [
    info.dateStatus,
    info.frontmatter?.eventLifecycle,
    info.frontmatter?.eventInfo?.status,
    info.frontmatter?.event?.status,
  ];
  if (status.some(x => BLOCKED_STATUS.has(String(x ?? '').toLowerCase()))) return false;
  // 単発イベントの最終日も含めない。翌日から古い推薦になるのを防ぐ。
  if (info.endDate && info.endDate <= today) return false;
  if (info.startDate && info.endDate && info.startDate > info.endDate) return false;
  if (info.articleType === 'event' && info.lifespan === 'seasonal' && !info.endDate) return false;
  // 日程の無い季節ガイドは、記事の最終検証から45日を超えたら推薦から外す。
  // 検証していない「今年の紅葉」「クリスマス」を翌年まで引きずらない。
  if (info.lifespan === 'seasonal' && !info.endDate) {
    if (!info.updatedDate || !DATE.test(info.updatedDate)) return false;
    const age = daysBetween(info.updatedDate, today);
    if (age < 0 || age > 45) return false;
  }
  const year = info.year ?? null;
  if (year && info.lifespan !== 'evergreen' && year < Number(today.slice(0,4))) return false;
  return true;
}

/**
 * @param {object} snapshot 完全・確定済みperformance-snapshot.json
 * @param {Map<string, object>} contentPages loadContentPages()の結果
 * @param {{today:string,generatedAt:string}} options 日本の暦日と生成時刻（テスト時は固定）
 */
export function buildPopularPages(snapshot, contentPages, { today, generatedAt }) {
  assertDate(today, 'today');
  assertDate(snapshot?.asOf, 'confirmed date');
  const w = snapshot?.windows?.ga4?.recent7;
  const level = snapshot?.source?.pageLevel;
  if (!w || w.start == null || w.end == null) throw new Error('popular-pages: GA4 recent7 not available');
  assertDate(w.start, 'recent7.start');
  assertDate(w.end, 'recent7.end');
  if (daysBetween(w.start,w.end) !== 6 || w.daysPresent !== 7 || w.end !== snapshot.asOf)
    throw new Error('popular-pages: GA4 7-day period is incomplete/inconsistent');
  if (daysBetween(w.end,today) < 0 || daysBetween(w.end,today) > 5)
    throw new Error('popular-pages: confirmed GA4 data is stale or future-dated');
  if (level?.ga4TopPagesUpdated !== true || level?.periods?.recent7?.start !== w.start ||
      level?.periods?.recent7?.end !== w.end || level?.truncated?.ga4Pages !== false)
    throw new Error('popular-pages: official GA4 page data incomplete, not updating');
  if (!Number.isFinite(w.views) || w.views < 0 || !Number.isFinite(w.sessions) || w.sessions <= 0)
    throw new Error('popular-pages: invalid GA4 site-level totals');
  const top = snapshot?.ga4TopPages?.recent7;
  if (!Array.isArray(top) || top.length === 0) throw new Error('popular-pages: GA4 page rows missing');
  const values = new Map();
  for (const row of top) {
    if (!PAGE.test(row?.path ?? '') || !Number.isSafeInteger(row.views) || row.views < 0) {
      // ページ以外（/や一覧URL）は対象外。実測値の欠落は0とみなさない。
      if (PAGE.test(row?.path ?? '') && !Number.isSafeInteger(row.views))
        throw new Error('popular-pages: nonnumeric page metrics');
      continue;
    }
    if (values.has(row.path) && values.get(row.path) !== row.views)
      throw new Error('popular-pages: duplicate path has conflicting Views');
    values.set(row.path,row.views);
  }
  // GA4上位20行の外にも常設記事があるため、同じ確定期間のpageMetricsを補助に使う。
  // 両出典が重なるパスは数値が一致しなければ更新を拒否する。
  for (const row of snapshot.pageMetrics ?? []) {
    if (!PAGE.test(row?.path ?? '')) continue;
    if (row.views7 == null) continue;
    if (!Number.isSafeInteger(row.views7) || row.views7 < 0)
      throw new Error('popular-pages: invalid pageMetrics Views');
    if (values.has(row.path) && values.get(row.path) !== row.views7)
      throw new Error('popular-pages: GA4 pageMetrics/topPages mismatch');
    values.set(row.path,row.views7);
  }
  const rows = [...values].filter(([path,views])=>views>0 && eligible(path,contentPages.get(path),today))
    .map(([path,views])=>({path,views})).sort((a,b)=>b.views-a.views||a.path.localeCompare(b.path)).slice(0,8);
  if (!rows.length) throw new Error('popular-pages: no verified eligible articles; preserving existing ranking');
  return {
    schemaVersion: 1,
    generatedAt,
    source: { connector: sourceLabel, metric: 'screenPageViews', confirmedThrough: snapshot.asOf,
      period: { start:w.start,end:w.end } },
    baseline: { views:w.views,sessions:w.sessions,
      viewsPerSession: Math.round(w.views/w.sessions * 10000)/10000 },
    refreshRule: '直近7日GA4 Views上位。ホーム、noindex、404、終了済みイベントを除外し、最大8件を保存。同一テーマの記事はHomeNow側でtopic単位に合算して表示順位を決める。終了判定は正本データに基づく。',
    pages:rows,
    notes: [
      `Google公式GA4確定値（${w.start}〜${w.end}）、更新判断日${today}。過去7日の実測のみで計算。`,
      '下書き・noindex・終了済みの単発イベントと非記事URLを除外。期間未確認の季節ガイドは最終更新45日以内だけ候補に含める。',
      'ゼロ補完なし。速報値・GSCクリック数とは混同しない。TOPと記事下部では表示時も終了判定を適用。',
    ],
  };
}
