/**
 * 11月の参考予測（別指標）。公式の着地予測（gapController：直近7日の1日平均 × 月の日数）と計算式は変えない。純粋関数（ファイルは読まない）。
 *
 * 公式の予測は、終わったイベントや締切のある制度の一時的な流入も、そのまま翌月へ延ばす（2026-10-01〜03 の急増で過大になった）。
 * ここでは次の3つを分けて出す。どれも「参考」で、判断の正本にはしない（採用は Growth Director が検証結果を見て決める）
 *   ① 計測障害を除いた直近の実績（windows.ga4.daily。障害日は除く。ゼロで埋めない）
 *   ② 一時的な検索需要：対象月より前に終わる・節目の後に減る可能性があるページ（PV Relay・ページ予測の季節）。対象月には残さない
 *   ③ 季節需要を考えた参考予測：基礎（季節・一時のページを除いた残り）× 月の日数 ＋ 対象月に開催・見頃があるページの見込み（現ペース × 有効日数）
 *      季節の上振れ（当日前後のピーク）は、同じ種類の実測が2件以上たまるまで足さない（Annual Learning）。足さない分は「上振れ要因」として名前だけ出す
 * 答え合わせ：日別（直近35日）で、直近の実績から先の1日平均を当てる方法を比べる（起点ごとの誤差の偏りと大きさ）
 * docs/GROWTH_ENGINE.md の「参考予測」
 */
import { addDays, daysInMonth } from './growth-engine.mjs';

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 計測障害の日（incident）と値の無い日を除いた日別。日付の昇順 */
export function cleanDaily(daily = []) {
  return (Array.isArray(daily) ? daily : [])
    .filter((r) => isDate(r?.date) && !r.incident && Number.isFinite(r.views))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** ① 計測障害を除いた直近の実績（最新の確定日から数えた暦日の窓。窓の中の障害日は除き、使った日数を出す） */
export function recentLevels(daily = []) {
  const rows = cleanDaily(daily);
  const last = rows.at(-1);
  if (!last) return null;
  const window = (n) => {
    const from = addDays(last.date, -(n - 1));
    const inWin = rows.filter((r) => r.date >= from && r.date <= last.date);
    return { from, to: last.date, days: inWin.length, views: inWin.reduce((s, r) => s + r.views, 0), dailyAverage: Math.round(mean(inWin.map((r) => r.views)) * 10) / 10 };
  };
  return { latest: { date: last.date, views: last.views }, last7: window(7), last3: window(3) };
}

/** 答え合わせに使う方法（起点の日までの実績だけを使う） */
export const BACKTEST_METHODS = [
  { key: 'mean7', label: '直近7日の平均（現行）', fn: (h) => mean(h.slice(-7)) },
  { key: 'mean3', label: '直近3日の平均', fn: (h) => mean(h.slice(-3)) },
  { key: 'median14', label: '直近14日の中央値', fn: (h) => median(h.slice(-14)) },
  { key: 'capped14', label: '直近14日の平均（中央値の1.5倍で頭打ち）', fn: (h) => { const w = h.slice(-14); const cap = median(w) * 1.5; return mean(w.map((x) => Math.min(x, cap))); } },
];

/**
 * 答え合わせ：各起点で、起点までの実績から「先の horizon 日の1日平均」を当て、実際（障害日を除く）と比べる。
 * 起点は、起点を含む直前 minHistory 暦日がすべてそろう日。先の確定日が3日未満の起点は使わない
 * @returns {{ horizon: number, origins: number, from: string|null, to: string|null, methods: { key: string, label: string, bias: number, mape: number, over: number, under: number }[] } | null}
 */
export function backtestDaily(daily = [], { horizon = 7, minHistory = 14, methods = BACKTEST_METHODS } = {}) {
  const rows = cleanDaily(daily);
  const byDate = new Map(rows.map((r) => [r.date, r.views]));
  const results = [];
  for (const origin of rows.map((r) => r.date)) {
    const hist = [];
    for (let i = minHistory - 1; i >= 0; i -= 1) {
      const d = addDays(origin, -i);
      if (byDate.has(d)) hist.push(byDate.get(d));
    }
    if (hist.length < minHistory) continue;
    const target = [];
    for (let i = 1; i <= horizon; i += 1) {
      const d = addDays(origin, i);
      if (byDate.has(d)) target.push(byDate.get(d));
    }
    if (target.length < Math.min(3, horizon)) continue;
    const actual = mean(target);
    results.push({ origin, errors: Object.fromEntries(methods.map((m) => [m.key, (m.fn(hist) - actual) / actual])) });
  }
  if (!results.length) return null;
  const pct = (x) => Math.round(x * 1000) / 10;
  return {
    horizon,
    origins: results.length,
    from: results[0].origin,
    to: results.at(-1).origin,
    methods: methods.map((m) => {
      const errs = results.map((r) => r.errors[m.key]);
      return {
        key: m.key,
        label: m.label,
        bias: pct(mean(errs)),
        mape: pct(mean(errs.map(Math.abs))),
        over: errs.filter((e) => e > 0.2).length,
        under: errs.filter((e) => e < -0.2).length,
      };
    }),
  };
}

/**
 * ②③ ページ別の直近7日を「一時・季節・基礎」に分ける。
 *   一時：ページ予測の季節が終了（ended）・対象月の有効日数0、または PV Relay の終了・節目（demand-may-drop が対象月より前）
 *   季節：対象月に開催・見頃があるページ（ページ予測に季節があり、一時ではない）
 *   基礎：サイト全体の直近7日 − 一時 − 季節（ページ別に無いページの分を含む）
 * ページ別の直近7日が無い（計測障害で null）なら分けない
 */
export function splitForecast({ siteViews7, forecasts = [], relayItems = [], month }) {
  if (!Number.isFinite(siteViews7) || !month) return null;
  const monthStart = `${month}-01`;
  const monthDays = daysInMonth(month);
  const tracked = forecasts.filter((f) => f.views7 != null);
  if (!tracked.length) return { unavailable: 'ページ別の直近7日が無い（計測障害の期間を含むなど）' };
  const relayByPath = new Map(relayItems.map((i) => [i.path, i]));
  const temporary = [];
  const seasonal = [];
  const evergreen = [];
  for (const f of tracked) {
    const relay = relayByPath.get(f.path);
    const ms = relay?.nextMilestone;
    const milestoneBefore = ms?.effect === 'demand-may-drop' && isDate(ms.date) && ms.date < monthStart;
    const ended = f.seasonPhase === 'ended' || f.activeDays === 0 || ['ENDED', 'ENDING'].includes(relay?.status);
    const row = { path: f.path, label: f.label ?? f.path, views7: f.views7, forecast: f.forecast ?? null, activeDays: f.activeDays ?? null };
    if (ended || milestoneBefore) temporary.push({ ...row, reason: milestoneBefore ? `${ms.date} ${ms.label}の後は不明` : relay?.endDate ? `${relay.endDate} 終了` : '対象月より前に終わる' , milestone: milestoneBefore });
    else if (f.seasonPhase != null) seasonal.push(row);
    else evergreen.push(row);
  }
  const sum = (rows, key = 'views7') => rows.reduce((s, r) => s + (r[key] ?? 0), 0);
  const temporaryViews7 = sum(temporary);
  const seasonalViews7 = sum(seasonal);
  const baseViews7 = Math.max(0, siteViews7 - temporaryViews7 - seasonalViews7);
  const baseForecast = Math.round((baseViews7 / 7) * monthDays);
  const seasonalForecast = sum(seasonal, 'forecast');
  const milestoneRows = temporary.filter((r) => r.milestone);
  const byViews = (rows) => [...rows].sort((a, b) => b.views7 - a.views7);
  return {
    month,
    monthDays,
    siteViews7,
    temporary: { views7: temporaryViews7, share: siteViews7 ? Math.round((temporaryViews7 / siteViews7) * 1000) / 10 : null, pages: byViews(temporary), milestoneCurrentPace: sum(milestoneRows, 'forecast') },
    seasonal: { views7: seasonalViews7, forecast: seasonalForecast, pages: byViews(seasonal).sort((a, b) => (b.forecast ?? 0) - (a.forecast ?? 0)) },
    base: { views7: baseViews7, dailyAverage: Math.round((baseViews7 / 7) * 10) / 10, forecast: baseForecast, trackedEvergreenViews7: sum(evergreen), untrackedViews7: Math.max(0, siteViews7 - sum(tracked)) },
    reference: baseForecast + seasonalForecast,
    basis: `基礎（季節・一時のページを除いた直近7日の1日平均）× ${monthDays}日 ＋ 対象月に開催・見頃があるページの見込み（直近の1日平均 × 有効日数）。一時的な流入は対象月に残さない。季節の上振れは足さない`,
  };
}

/** Growth OS から呼ぶ：①②③と答え合わせをまとめる */
export function referenceForecast({ snapshot, forecasts, relayItems, month, officialForecast }) {
  const ga4 = snapshot?.windows?.ga4 ?? {};
  const split = splitForecast({ siteViews7: ga4.recent7?.views, forecasts, relayItems, month });
  return {
    official: officialForecast ?? null,
    recent: recentLevels(ga4.daily),
    split,
    backtest: backtestDaily(ga4.daily, { horizon: 7 }),
  };
}
