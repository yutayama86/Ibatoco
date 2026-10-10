/**
 * Growth Engine — 11月100,000 Views の達成確率を上げるための計算だけを持つ。
 *
 * ファイル・ネットワークに触れない純粋な関数。次の2か所が同じ計算を使う。
 *   - scripts/growth-engine.mjs … 毎日のレポート（npm run growth:target。CIの定期実行でも生成）
 *   - src/pages/control/       … Control Center（運営者向け）
 *
 * 原則（docs/GROWTH_ENGINE.md）
 *   - 実測（data/editorial/performance-snapshot.json の GA4 / GSC）だけを数値の根拠にする。無い値は null のまま返し、推測で埋めない
 *   - 推定を含む値（伸びしろ、季節の需要期間）は、必ず basis（根拠）と confidence（確度）を付ける
 *   - 日付は日本の暦日（YYYY-MM-DD）。src/lib/date-only.js 以外の方法で日付を解釈しない
 */
import { addDateOnlyDays, dateOnlyFromInstant, parseDateOnly } from './date-only.js';

const DAY_MS = 86400000;
const iso = (date) => date.toISOString().slice(0, 10);
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJst(now = new Date()) {
  return iso(dateOnlyFromInstant(now));
}
/** a から b までの日数（b が後なら正） */
export function daysBetween(a, b) {
  return Math.round((parseDateOnly(b).valueOf() - parseDateOnly(a).valueOf()) / DAY_MS);
}
export function addDays(value, amount) {
  return iso(addDateOnlyDays(parseDateOnly(value), amount));
}
export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
const num = (value) => (value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));
const round = (value) => (value == null ? null : Math.round(value));

/** 一般的な検索順位別CTRの目安（推定）。サイトの実測で上書きできるよう設定ファイルから渡す */
export function expectedCtr(position, curve) {
  if (position == null) return null;
  const p = Math.max(1, Math.min(20, Math.round(position)));
  const keys = Object.keys(curve).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
  const key = keys.reduce((best, k) => (k <= p ? k : best), keys[0]);
  return Number(curve[key]);
}

// ---------------------------------------------------------------------------
// 1) 100k Gap Controller
// ---------------------------------------------------------------------------

/**
 * 11月の着地予測とギャップ。
 * 11月に入る前：直近7日の1日平均 × 30日（現状ペースを維持した場合）
 * 11月に入った後：11月の実績（snapshot.monthToDate）＋ 残り日数 × 直近7日の1日平均
 */
export function gapController({ snapshot, config, today }) {
  const { month, views: target } = config.target;
  const monthStart = `${month}-01`;
  const monthDays = daysInMonth(month);
  const ga4 = snapshot?.windows?.ga4 ?? {};
  const recent7 = num(ga4.recent7?.views);
  const previous7 = num(ga4.previous7?.views);
  const currentDaily = recent7 == null ? null : recent7 / 7;
  const previousDaily = previous7 == null ? null : previous7 / 7;
  const mtd = snapshot?.monthToDate?.month === month && num(snapshot.monthToDate.views) != null
    ? { views: num(snapshot.monthToDate.views), days: num(snapshot.monthToDate.days) ?? 0, through: snapshot.monthToDate.through ?? null }
    : null;

  let forecast = null;
  let basis;
  let requiredDaily;
  if (mtd && mtd.days > 0) {
    const remaining = Math.max(0, monthDays - mtd.days);
    forecast = currentDaily == null ? null : mtd.views + currentDaily * remaining;
    basis = `${month}の実績 ${mtd.views.toLocaleString('ja-JP')}（${mtd.days}日分）＋残り${remaining}日 × 直近7日の1日平均`;
    requiredDaily = remaining > 0 ? Math.max(0, target - mtd.views) / remaining : 0;
  } else {
    forecast = currentDaily == null ? null : currentDaily * monthDays;
    basis = `直近7日の1日平均 × ${monthDays}日（現状のペースを維持した場合。季節の上振れは実測が出るまで加えない）`;
    requiredDaily = target / monthDays;
  }
  const ratio = forecast == null ? null : forecast / target;
  const { atRisk } = config.statusThresholds;
  const status = ratio == null ? 'NO DATA' : ratio >= 1 ? 'ON TRACK' : ratio >= atRisk ? 'AT RISK' : 'OFF TRACK';
  const daysToMonth = daysBetween(today, monthStart);
  return {
    month,
    target,
    currentRunRate28: currentDaily == null ? null : round(currentDaily * 28),
    forecast: round(forecast),
    forecastBasis: basis,
    gap: forecast == null ? null : round(forecast - target),
    targetDailyAverage: round(requiredDaily),
    currentDailyAverage: round(currentDaily),
    requiredMultiplier: currentDaily ? Number((requiredDaily / currentDaily).toFixed(2)) : null,
    status,
    ratio: ratio == null ? null : Number(ratio.toFixed(3)),
    daysToMonth: daysToMonth > 0 ? daysToMonth : 0,
    monthToDate: mtd,
    velocity: {
      last7: recent7,
      previous7,
      wowPct: recent7 != null && previous7 ? Number(((recent7 / previous7 - 1) * 100).toFixed(1)) : null,
      dailyAverage: round(currentDaily),
      previousDailyAverage: round(previousDaily),
      requiredDailyAverage: round(requiredDaily),
      viewsPerSession: num(ga4.recent7?.viewsPerSession),
    },
    rolling28: { views: num(ga4.recent28?.views), target: num(snapshot?.northStar?.target) ?? target },
    dataAsOf: snapshot?.source?.freshness?.ga4LatestConfirmedDate ?? snapshot?.asOf ?? null,
  };
}

// ---------------------------------------------------------------------------
// 2) Seasonal Deadline Engine
// ---------------------------------------------------------------------------

/** 記事の季節カテゴリ（タグ・キーワード・slug から） */
export function seasonCategory(page, config) {
  const hay = [page.slug, page.keyword, page.title, ...(page.tags ?? [])].filter(Boolean).join(' ');
  for (const rule of config.seasonCategories) {
    if (rule.match.some((word) => hay.includes(word))) return rule.key;
  }
  return null;
}

/**
 * 開催日（または季節の需要期間）から逆算した、今日の段階と締切。
 * prepare → index-window（公開・更新の締切まで）→ demand-rising → peak → live → aftermath → ended
 */
export function seasonalPhase({ startDate, endDate, category, today, config }) {
  if (!isDate(startDate)) return null;
  const rule = config.seasonalRules[category] ?? config.seasonalRules.default;
  const end = isDate(endDate) ? endDate : startDate;
  const demandStart = addDays(startDate, -rule.demandLeadDays);
  const publishDeadline = addDays(demandStart, -rule.indexLeadDays);
  const peakStart = addDays(startDate, -rule.peakDays);
  const aftermathEnd = addDays(end, rule.aftermathDays);
  const before = (d) => daysBetween(today, d) > 0;
  const phase = before(publishDeadline) ? 'prepare'
    : before(demandStart) ? 'index-window'
      : before(peakStart) ? 'demand-rising'
        : before(startDate) ? 'peak'
          : daysBetween(today, end) >= 0 ? 'live'
            : daysBetween(today, aftermathEnd) >= 0 ? 'aftermath'
              : 'ended';
  return {
    category: category ?? 'default',
    phase,
    urgency: config.phaseUrgency[phase] ?? 1,
    startDate,
    endDate: end,
    milestones: [
      { key: 'publishDeadline', label: '公開・更新の締切（検索評価の猶予を見込む）', date: publishDeadline },
      { key: 'demandStart', label: '検索需要の立ち上がり（想定）', date: demandStart },
      { key: 'peakStart', label: '需要のピーク（想定）', date: peakStart },
      { key: 'start', label: '開催・見頃の開始', date: startDate },
      { key: 'aftermathEnd', label: '終了処理（終了表示・翌年版への導線）', date: aftermathEnd },
    ],
    nextMilestone: [
      { label: '公開・更新の締切', date: publishDeadline },
      { label: '需要の立ち上がり', date: demandStart },
      { label: 'ピーク', date: peakStart },
      { label: '開催・見頃', date: startDate },
      { label: '終了処理', date: aftermathEnd },
    ].find((m) => daysBetween(today, m.date) >= 0) ?? null,
    basis: `季節カテゴリ「${category ?? 'default'}」の運用上の想定（需要${rule.demandLeadDays}日前・評価猶予${rule.indexLeadDays}日・ピーク${rule.peakDays}日前・終了後${rule.aftermathDays}日）`,
  };
}

/** 記事の開催日を、季節ガイド（開催日を持たない紅葉など）は設定の需要期間で補う */
export function pageSeason(page, config, today) {
  const category = seasonCategory(page, config);
  if (isDate(page.startDate)) {
    return seasonalPhase({ startDate: page.startDate, endDate: page.endDate, category, today, config });
  }
  const season = category ? config.seasonWindows[category] : null;
  if (!season || page.lifespan === 'evergreen') return null;
  const year = page.year ?? Number(today.slice(0, 4));
  const startDate = `${year}-${season.start}`;
  // 年をまたぐ季節（あんこう鍋の冬、年末年始など）は、終わりを翌年にする
  const endDate = `${season.end < season.start ? year + 1 : year}-${season.end}`;
  const result = seasonalPhase({ startDate, endDate, category, today, config });
  return result && { ...result, basis: `${result.basis}。開催日を持たない季節ガイドのため、需要期間（${season.start}〜${season.end}）を${season.basis ?? '運用上の想定'}として使う` };
}

/** 対象月のうち、ページが読まれうる日数（開催前〜終了後の余韻まで。終日読まれる常設ページは月の全日） */
export function activeDaysInMonth(season, month) {
  const monthStart = `${month}-01`;
  const monthEnd = addDays(monthStart, daysInMonth(month) - 1);
  if (!season) return daysInMonth(month);
  const last = season.milestones.find((m) => m.key === 'aftermathEnd').date;
  if (daysBetween(last, monthStart) > 0) return 0; // 対象月より前に終わる
  const until = daysBetween(last, monthEnd) > 0 ? last : monthEnd;
  return daysBetween(monthStart, until) + 1;
}

// ---------------------------------------------------------------------------
// 3) Observation Window Guard
// ---------------------------------------------------------------------------

/** 変更の種類 → 観測の種類。experimentType が書かれていればそれを優先する */
export function experimentTypeOf(change) {
  if (change.experimentType) return change.experimentType;
  switch (change.kind) {
    case 'internal-link': return 'internal-link';
    case 'ogp': return 'metadata';
    case 'technical': return 'metadata';
    case 'new-article': return 'new-article';
    case 'on-page': {
      const text = String(change.change ?? '');
      const metaOnly = /(title|description|タイトル|ディスクリプション|メタ|スニペット)/i.test(text)
        && !/(本文|構成|セクション|見出し|FAQ|追加|更新し|反映)/.test(text);
      return metaOnly ? 'metadata' : 'body';
    }
    default: return 'body';
  }
}

/**
 * ページごとの最新の変更と観測期限。
 * 観測中のページは、事実・計測の不具合の修正（fact / measurement）以外を変えない。
 * 季節イベントの公式発表・期限変更は例外として扱う（seasonalException）。
 */
export function observationWindows({ changes, config, today }) {
  const byPath = new Map();
  for (const change of changes) {
    if (!change.url || !isDate(change.date)) continue;
    const current = byPath.get(change.url);
    if (!current || change.date > current.date) byPath.set(change.url, change);
  }
  const rows = [];
  for (const [path, change] of byPath) {
    const type = experimentTypeOf(change);
    const days = config.observationWindows[type] ?? 28;
    const observeUntil = addDays(change.date, days);
    const observing = daysBetween(today, observeUntil) > 0;
    rows.push({
      path,
      lastChange: change.date,
      changeId: change.id,
      experimentType: type,
      observeDays: days,
      observeUntil,
      status: observing ? 'observing' : 'open',
      allowed: observing ? '事実・計測の不具合の修正、季節イベントの公式発表の反映のみ' : 'すべて',
    });
  }
  return rows.sort((a, b) => b.lastChange.localeCompare(a.lastChange));
}

// ---------------------------------------------------------------------------
// 4) SEO Opportunity Engine
// ---------------------------------------------------------------------------

/** GSC の行（ページ別 pageMetrics / 検索語×ページの gscDiscovery）を同じ形にそろえる */
export function normalizeSearchRows(snapshot) {
  const rows = [];
  for (const pm of snapshot?.pageMetrics ?? []) {
    const g = pm.gsc ?? {};
    if (num(g.impressions28) == null) continue;
    rows.push({
      source: 'pageMetrics', page: pm.path, query: null,
      impressions: num(g.impressions28), clicks: num(g.clicks28), ctr: num(g.ctr28) ?? (num(g.clicks28) != null && num(g.impressions28) ? num(g.clicks28) / num(g.impressions28) : null),
      position: num(g.position28), impressionsPrev: num(g.impressionsPrev28), days: 28,
    });
  }
  for (const f of snapshot?.gscDiscovery?.findings ?? []) {
    if (!f.page || num(f.impressions) == null) continue;
    const [start, end] = String(f.period ?? '').split('..');
    const days = isDate(start) && isDate(end) ? daysBetween(start, end) + 1 : 28;
    rows.push({
      source: 'gscDiscovery', page: f.page, query: f.query ?? null,
      impressions: num(f.impressions), clicks: num(f.clicks), ctr: num(f.ctr), position: num(f.position),
      impressionsPrev: num(f.previousImpressions), days, note: f.recommendedAction ?? null,
    });
  }
  return rows;
}

const ACTION_TEXT = {
  STRIKING_DISTANCE: '8〜20位。検索意図に合わせて見出し・本文の不足を補い、関連ページから文脈リンクを足す',
  LOW_CTR: '上位なのにクリック率が低い。title・description を検索語に合わせて見直す',
  RISING_DEMAND: '表示回数が急増。公式情報を確認し、本文を最新化する',
  HIGH_IMPRESSION_LOW_CLICK: '表示が多くクリックが少ない。検索結果での見え方（title・description・構造化データ）を改善',
  INTERNAL_LINK_OPPORTUNITY: '重要ページなのに文脈リンクが少ない。関連ページからリンクを足す',
  SEASONAL_WINDOW: '需要のピーク前。公式発表の反映と、季節の導線を最優先',
};

/** 検索の伸びしろ（推定）：今の表示回数のまま、目標順位の一般的なCTRに近づいた場合の追加 Views */
export function searchUpside(row, { config, activeDays, viewsPerSession }) {
  if (row.impressions == null || row.position == null || row.ctr == null) return null;
  const targetPosition = row.position > 10 ? 8 : row.position > 3 ? 3 : row.position;
  const goal = expectedCtr(targetPosition, config.ctrCurve);
  const perDay = row.impressions / (row.days || 28);
  const clicks = perDay * Math.max(0, goal - row.ctr) * activeDays;
  return { views: Math.round(clicks * (viewsPerSession ?? 1)), targetPosition, goalCtr: goal };
}

export function seoOpportunities({ snapshot, config, seasons, inbound, focusPaths, observation, month, today }) {
  const t = config.seo;
  const viewsPerSession = num(snapshot?.windows?.ga4?.recent7?.viewsPerSession) ?? 1;
  const observingPaths = new Map(observation.filter((o) => o.status === 'observing').map((o) => [o.path, o]));
  const out = [];
  for (const row of normalizeSearchRows(snapshot)) {
    const types = [];
    const ctrGoal = expectedCtr(row.position, config.ctrCurve);
    if (row.impressions >= t.minImpressions28 && row.position != null && row.position >= t.strikingDistance[0] && row.position <= t.strikingDistance[1]) types.push('STRIKING_DISTANCE');
    if (row.impressions >= t.minImpressions28 && row.position != null && row.position <= t.lowCtrMaxPosition && row.ctr != null && ctrGoal != null && row.ctr < ctrGoal * t.lowCtrRatio) types.push('LOW_CTR');
    if (row.impressions >= t.minImpressions28 && row.impressionsPrev && (row.impressions / row.impressionsPrev - 1) * 100 >= t.risingDemandPct) types.push('RISING_DEMAND');
    if (row.impressions >= t.highImpressions28 && row.ctr != null && row.ctr < t.highImpressionMaxCtr) types.push('HIGH_IMPRESSION_LOW_CLICK');
    const season = seasons.get(row.page) ?? null;
    if (season && ['index-window', 'demand-rising', 'peak'].includes(season.phase)) types.push('SEASONAL_WINDOW');
    if (!types.length) continue;
    const upside = searchUpside(row, { config, activeDays: activeDaysInMonth(season, month), viewsPerSession });
    const watch = observingPaths.get(row.page);
    out.push({
      types,
      page: row.page,
      query: row.query,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
      period: `${row.days}日`,
      source: row.source,
      upsideViews: upside?.views ?? null,
      upsideBasis: upside ? `表示回数を維持し、${upside.targetPosition}位相当のCTR目安 ${(upside.goalCtr * 100).toFixed(1)}% に近づいた場合（推定）` : null,
      urgency: season?.urgency ?? 1,
      observing: watch ? { until: watch.observeUntil, type: watch.experimentType } : null,
      action: watch
        ? `観測中（〜${watch.observeUntil}）。事実の訂正・公式発表の反映以外は変えない`
        : ACTION_TEXT[types[0]],
      note: row.note ?? null,
    });
  }
  // 重要ページの文脈リンク不足（サイト内のリンク網から）
  for (const path of focusPaths) {
    const link = inbound?.get(path);
    if (!link) continue;
    if (link.sources.length >= t.internalLinkMinSources) continue;
    out.push({
      types: ['INTERNAL_LINK_OPPORTUNITY'],
      page: path,
      query: null,
      inboundSources: link.sources.length,
      candidates: link.candidates ?? [],
      upsideViews: null,
      upsideBasis: null,
      urgency: seasons.get(path)?.urgency ?? 1,
      observing: observingPaths.get(path) ? { until: observingPaths.get(path).observeUntil, type: observingPaths.get(path).experimentType } : null,
      action: `${ACTION_TEXT.INTERNAL_LINK_OPPORTUNITY}（現在 ${link.sources.length} ページから。候補：${(link.candidates ?? []).slice(0, 3).join('、') || 'なし'}）`,
    });
  }
  const weight = (o) => (o.upsideViews ?? (o.impressions ?? 0) * 0.01) * o.urgency * (o.observing ? 0.2 : 1);
  return out.sort((a, b) => weight(b) - weight(a));
}

// ---------------------------------------------------------------------------
// 5) Page Forecast
// ---------------------------------------------------------------------------

export function pageForecast({ snapshot, config, pages, seasons, opportunities, observation, inbound, month, today }) {
  const top7 = new Map((snapshot?.ga4TopPages?.recent7 ?? []).map((r) => [r.path, num(r.views)]));
  const top28 = new Map((snapshot?.ga4TopPages?.recent28 ?? []).map((r) => [r.path, num(r.views)]));
  const metrics = new Map((snapshot?.pageMetrics ?? []).map((r) => [r.path, r]));
  const rowsByPage = new Map();
  for (const row of normalizeSearchRows(snapshot)) {
    const list = rowsByPage.get(row.page) ?? [];
    list.push(row);
    rowsByPage.set(row.page, list);
  }
  const obsByPath = new Map(observation.map((o) => [o.path, o]));
  const oppByPath = new Map();
  for (const o of opportunities) if (!oppByPath.has(o.page)) oppByPath.set(o.page, o);
  const viewsPerSession = num(snapshot?.windows?.ga4?.recent7?.viewsPerSession) ?? 1;
  const ga4Fresh = snapshot?.source?.freshness?.ga4LatestConfirmedDate;
  const dataAge = isDate(ga4Fresh) ? daysBetween(ga4Fresh, today) : null;

  const focus = config.focusPages.map((f) => f.path);
  const detected = [...new Set([...top7.keys(), ...rowsByPage.keys(), ...metrics.keys()])].filter((p) => !focus.includes(p));
  const paths = [...focus, ...detected];

  return paths.map((path) => {
    const page = pages.get(path) ?? null;
    const focusEntry = config.focusPages.find((f) => f.path === path);
    const pm = metrics.get(path);
    const views7 = num(pm?.views7) ?? top7.get(path) ?? null;
    const views28 = num(pm?.views28) ?? top28.get(path) ?? null;
    const prev7 = num(pm?.viewsPrev7);
    const searchRows = rowsByPage.get(path) ?? [];
    const pageRow = searchRows.find((r) => r.source === 'pageMetrics') ?? null;
    const best = pageRow ?? searchRows.sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))[0] ?? null;
    const season = seasons.get(path) ?? null;
    const activeDays = activeDaysInMonth(season, month);
    const daily = views7 != null ? views7 / 7 : views28 != null ? views28 / 28 : null;
    const forecast = daily == null ? null : Math.round(daily * activeDays);
    const upside = best ? searchUpside(best, { config, activeDays, viewsPerSession }) : null;
    const obs = obsByPath.get(path);
    const opp = oppByPath.get(path);
    const confidence = pm && pageRow && dataAge != null && dataAge <= 3 ? 'high'
      : (views7 != null || views28 != null) && best ? 'medium'
        : (views7 != null || views28 != null || best) ? 'low' : 'none';

    let status;
    let action;
    if (season?.phase === 'ended') {
      status = 'ENDED';
      action = '開催終了。終了表示・翌年版への導線・推薦からの除外を確認';
    } else if (obs?.status === 'observing') {
      status = 'OBSERVING';
      action = `観測中（〜${obs.observeUntil}・${obs.experimentType}）。事実の訂正・公式発表の反映以外は変えない`;
    } else if (season && ['index-window', 'demand-rising', 'peak'].includes(season.phase)) {
      status = 'ACT NOW';
      action = opp ? opp.action : `需要の${season.phase === 'index-window' ? '立ち上がり前' : 'ピーク前'}。公式発表の確認と本文の事実更新（次の節目：${season.nextMilestone?.label} ${season.nextMilestone?.date}）`;
    } else if (opp) {
      status = 'OPPORTUNITY';
      action = opp.action;
    } else if (daily == null && !best) {
      status = 'NO DATA';
      action = 'GA4・GSC のページ別データが未取得（performance-snapshot の pageMetrics に追加する）';
    } else {
      status = 'STABLE';
      action = '現状維持';
    }
    return {
      path,
      label: focusEntry?.label ?? page?.title ?? path,
      focus: Boolean(focusEntry),
      views7,
      views28,
      growthPct: views7 != null && prev7 ? Number(((views7 / prev7 - 1) * 100).toFixed(1)) : null,
      impressions: best?.impressions ?? null,
      clicks: best?.clicks ?? null,
      ctr: best?.ctr ?? null,
      position: best?.position ?? null,
      searchSource: best ? (best.query ? `GSC「${best.query}」${best.days}日` : `GSC ページ別 ${best.days}日`) : null,
      seasonPhase: season?.phase ?? null,
      nextMilestone: season?.nextMilestone ?? null,
      activeDays,
      forecast,
      forecastBasis: daily == null ? null : `直近の1日平均 ${daily.toFixed(1)} × ${month}の有効日数 ${activeDays}日`,
      upside: upside?.views ?? null,
      upsideBasis: upside ? `GSCの表示回数のまま${upside.targetPosition}位相当のCTR目安へ（推定）` : null,
      inboundSources: inbound?.get(path)?.sources.length ?? null,
      confidence,
      status,
      action,
    };
  });
}

// ---------------------------------------------------------------------------
// 6) Growth Action Queue
// ---------------------------------------------------------------------------

const CONFIDENCE = { high: 0.8, medium: 0.5, low: 0.25 };
const EFFORT_HOURS = { S: 1, M: 3, L: 8, XL: 16 };

/**
 * 優先度 = 期待PV × 確度 ÷ 工数（時間）× 締切の緊急度
 * 期待PV・確度・工数のどれかが無い施策は score を null にし、不足項目を返す（推測で埋めない）
 */
export function scoreActions({ actions, seasons, today }) {
  return actions
    .filter((a) => ['ready', 'in-progress', 'candidate'].includes(a.status))
    .map((a) => {
      const impact = num(a.expectedPvImpact ?? a.expected_pv_impact);
      const rawConfidence = a.confidence;
      const confidence = typeof rawConfidence === 'string' ? CONFIDENCE[rawConfidence] ?? null : num(rawConfidence);
      const rawEffort = a.effort;
      const effort = typeof rawEffort === 'string' ? EFFORT_HOURS[rawEffort] ?? num(rawEffort) : num(rawEffort);
      const deadline = a.deadline ?? a.dueDate ?? null;
      const daysLeft = isDate(deadline) ? daysBetween(today, deadline) : null;
      const deadlineUrgency = daysLeft == null ? 1 : daysLeft <= 2 ? 2 : daysLeft <= 7 ? 1.5 : daysLeft <= 14 ? 1.2 : 1;
      const seasonUrgency = seasons.get(a.page ?? a.targetUrl)?.urgency ?? 1;
      const urgency = Math.max(deadlineUrgency, seasonUrgency);
      const missing = [impact == null && 'expectedPvImpact', confidence == null && 'confidence', effort == null && 'effort'].filter(Boolean);
      const score = missing.length ? null : Math.round((impact * confidence / Math.max(0.5, effort)) * urgency);
      return {
        id: a.id,
        title: a.title,
        page: a.page ?? a.targetUrl ?? null,
        status: a.status,
        priority: a.priority ?? null,
        expectedPvImpact: impact,
        confidence,
        effortHours: effort,
        deadline,
        daysLeft,
        urgency,
        score,
        missing,
        reason: a.reason ?? null,
        source: a.source ?? 'action-queue',
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
}

/** 今日もっとも Gap を縮める施策 TOP3（スコア済みの施策と、エンジンが見つけた伸びしろから） */
export function growthBatch({ scoredActions, forecasts, opportunities, limit = 3 }) {
  const candidates = [];
  for (const a of scoredActions) {
    if (a.score == null) continue;
    candidates.push({ title: a.title, page: a.page, expectedPv: a.expectedPvImpact, score: a.score, confidence: a.confidence, reason: a.reason ?? `締切 ${a.deadline ?? '—'}`, source: `action-queue:${a.id}` });
  }
  for (const f of forecasts) {
    if (f.status !== 'ACT NOW' && f.status !== 'OPPORTUNITY') continue;
    const expected = f.upside ?? null;
    const urgency = f.status === 'ACT NOW' ? 1.5 : 1;
    candidates.push({
      title: `${f.label}：${f.action}`,
      page: f.path,
      expectedPv: expected,
      score: Math.round((expected ?? 0) * urgency * (f.confidence === 'high' ? 0.8 : f.confidence === 'medium' ? 0.5 : 0.25)) || (f.status === 'ACT NOW' ? 1 : 0),
      confidence: f.confidence,
      reason: [f.seasonPhase && `季節段階 ${f.seasonPhase}`, f.nextMilestone && `${f.nextMilestone.label} ${f.nextMilestone.date}`, f.upsideBasis].filter(Boolean).join('・'),
      source: 'growth-engine:page-forecast',
    });
  }
  const seen = new Set();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => (c.page && seen.has(c.page) ? false : (seen.add(c.page), true)))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// 7) Alerts
// ---------------------------------------------------------------------------

export function growthAlerts({ gap, snapshot, forecasts, opportunities, observation, freshness, registry, today }) {
  const alerts = [];
  const add = (level, kind, message) => alerts.push({ level, kind, message });
  if (gap.status === 'OFF TRACK' || gap.status === 'AT RISK') {
    add(gap.status === 'OFF TRACK' ? 'critical' : 'warning', gap.status, `11月の着地予測 ${gap.forecast?.toLocaleString('ja-JP') ?? '—'} / 目標 ${gap.target.toLocaleString('ja-JP')}（${gap.gap?.toLocaleString('ja-JP')}）。必要な1日平均 ${gap.targetDailyAverage?.toLocaleString('ja-JP')}、現在 ${gap.currentDailyAverage?.toLocaleString('ja-JP') ?? '—'}`);
  }
  const fresh = snapshot?.source?.freshness ?? {};
  for (const [label, date, max] of [['GA4', fresh.ga4LatestConfirmedDate, 2], ['GSC', fresh.gscLatestConfirmedDate, 4]]) {
    if (!isDate(date)) add('warning', '計測欠損', `${label} の最新確認日がありません`);
    else if (daysBetween(date, today) > max) add('warning', '計測欠損', `${label} のデータが ${daysBetween(date, today)} 日前（${date}）で止まっている`);
  }
  if (/anomaly|error|fail/i.test(String(snapshot?.source?.status ?? ''))) add('warning', 'GA4異常', `データ取得の状態：${snapshot.source.status}`);
  if (!snapshot?.pageMetrics?.length) add('info', '計測欠損', 'ページ別の GA4/GSC（pageMetrics）が未取得。ページ予測・SEO機会の確度が低い');
  for (const o of opportunities.filter((x) => x.types.includes('RISING_DEMAND')).slice(0, 3)) add('info', 'GSC急上昇', `${o.page}${o.query ? `「${o.query}」` : ''} の表示回数が急増`);
  for (const f of forecasts.filter((x) => x.status === 'ENDED' && x.focus)) add('warning', '終了処理', `${f.label} は開催終了。終了表示と翌年版への導線を確認`);
  for (const item of freshness.filter((x) => x.type === 'expired-cta' || x.type === 'stale-deadline').slice(0, 5)) add('warning', '期限切れCTA', `${item.path}：${item.detail}`);
  for (const item of freshness.filter((x) => x.type === 'ended-live-wording').slice(0, 3)) add('warning', '終了後の表現', `${item.path}：${item.detail}`);
  for (const item of freshness.filter((x) => x.type.startsWith('year-')).slice(0, 3)) add('warning', '年度確認', `${item.path}：${item.detail}`);
  const waiting = (registry?.events ?? []).filter((e) => ['discovered', 'verified'].includes(e.status) && !e.articleUrl && isDate(e.startDate) && daysBetween(today, e.startDate) >= 0 && daysBetween(today, e.startDate) <= 30);
  if (waiting.length) add('info', '公式情報更新待ち', `30日以内の未掲載候補 ${waiting.length} 件（${waiting.slice(0, 3).map((e) => e.name).join('、')}${waiting.length > 3 ? ' ほか' : ''}）`);
  const observing = observation.filter((o) => o.status === 'observing');
  if (observing.length) add('info', 'Observation中', `${observing.length} ページが観測期間中（事実の訂正以外は変更しない）`);
  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

// ---------------------------------------------------------------------------
// まとめて実行
// ---------------------------------------------------------------------------

/**
 * @param {{ snapshot: any, config: any, pages: Map<string, any>, changes: any[], actions: any[], registry?: any,
 *           inbound?: Map<string, { sources: string[], candidates?: string[] }> | null, freshness?: any[], today?: string }} input
 */
export function runGrowthEngine({ snapshot, config, pages, changes, actions, registry = null, inbound = null, freshness = [], today = todayJst() }) {
  const month = config.target.month;
  const seasons = new Map();
  for (const [path, page] of pages) {
    const season = pageSeason(page, config, today);
    if (season) seasons.set(path, season);
  }
  const gap = gapController({ snapshot, config, today });
  const observation = observationWindows({ changes, config, today });
  const focusPaths = config.focusPages.map((f) => f.path);
  const opportunities = seoOpportunities({ snapshot, config, seasons, inbound, focusPaths, observation, month, today });
  const forecasts = pageForecast({ snapshot, config, pages, seasons, opportunities, observation, inbound, month, today });
  const scoredActions = scoreActions({ actions, seasons, today });
  const batch = growthBatch({ scoredActions, forecasts, opportunities });
  const alerts = growthAlerts({ gap, snapshot, forecasts, opportunities, observation, freshness, registry, today });
  const deadlines = [...seasons.entries()]
    .filter(([, s]) => s.phase !== 'ended' && s.phase !== 'aftermath')
    .map(([path, s]) => ({ path, title: pages.get(path)?.title ?? path, ...s }))
    .sort((a, b) => (a.nextMilestone?.date ?? '9999').localeCompare(b.nextMilestone?.date ?? '9999'));
  return { generatedFor: today, gap, forecasts, opportunities, observation, scoredActions, batch, alerts, deadlines };
}
