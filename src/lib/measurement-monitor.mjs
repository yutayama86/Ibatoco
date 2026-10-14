/**
 * 計測の健全性（日次）。GA4 の日別（windows.ga4.daily）と GSC の日別（windows.gsc.daily）を突き合わせ、
 * 「計測欠損の疑い」と「検索流入の減少」を分ける。純粋関数（ファイルは読まない）。
 *
 * 2026-10-08〜10 の障害（Issue #226）では、GA4 の Views・Organic Views・エンゲージメントだけが消え、GSC のクリックは保たれていた。
 * GA4 が減っただけで SEO の障害と断定しない。GSC が同じ日に保たれていれば計測側を先に疑い、GSC も減っていれば流入の減少を疑う。
 * GSC の同じ日が無いときは判定を保留する（推測で決めない）。値の補完・ゼロ埋めはしない。docs/GROWTH_ENGINE.md の「計測の健全性」
 */
import { addDays } from './growth-engine.mjs';

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const fin = (v) => (Number.isFinite(v) ? v : null);
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 判定のしきい値（変えるときは docs と tests も直す） */
export const MONITOR_RULES = {
  baselineDays: 7, // 比べる相手：その日より前の直近7日（計測障害・計測欠損の疑いの日を除く）の中央値。急増した日に引っ張られないよう平均ではなく中央値
  minBaselineDays: 4, // GA4 の比較に要る日数
  minGscBaselineDays: 2, // GSC の比較に要る日数
  gaDrop: 0.5, // GA4 Views（または Organic Views）が比較相手の50%未満
  gscDrop: 0.7, // GSC クリックが直前7日の中央値の70%未満なら「GSC も減った」
  ratioDrop: 0.3, // Organic Views ÷ GSC クリック が比較相手の中央値の30%未満なら「GA4 と GSC の乖離」
  engagementFloor: 0.1, // エンゲージメント率（engaged ÷ sessions）が10%未満で
  engagementBaselineMin: 0.5, //   比較相手が50%以上なら「エンゲージメントがほぼ0」
  minSessions: 10,
  alertDays: 3, // アラートに出すのは GA4 日別の直近3日
};

/** 判定の種類 */
export const STATUS = {
  ok: '正常',
  measurement: '計測欠損の疑い',
  traffic: '検索流入の減少の疑い',
  pending: '判定保留（GSC の同じ日か、比べる日が未取得）',
  nonSearch: '検索以外の流入の減少（検索からの流入は保たれている）',
  nodata: '比較できる日が足りない',
};

function incidentByDate(incidents) {
  const map = new Map();
  for (const i of incidents?.incidents ?? []) if (i.source === 'ga4') for (const d of i.affectedDates ?? []) map.set(d, i.id);
  return map;
}

/**
 * @param {{ ga4Daily?: any[], gscDaily?: any[], incidents?: any, rules?: Partial<typeof MONITOR_RULES> }} input
 * @returns {{ days: any[], latest: any | null, alerts: { level: string, kind: string, message: string }[], gscAvailable: boolean }}
 */
export function measurementMonitor({ ga4Daily = [], gscDaily = [], incidents = null, rules = {} } = {}) {
  const r = { ...MONITOR_RULES, ...rules };
  const ga = (Array.isArray(ga4Daily) ? ga4Daily : []).filter((x) => isDate(x?.date) && fin(x.views) != null).sort((a, b) => a.date.localeCompare(b.date));
  const gsc = new Map((Array.isArray(gscDaily) ? gscDaily : []).filter((x) => isDate(x?.date) && fin(x.clicks) != null).map((x) => [x.date, x]));
  const known = incidentByDate(incidents);
  const suspicious = new Set(); // 計測欠損の疑いになった日は、後の日の比較相手から外す（流入の減少は実際の値なので外さない）
  const days = [];

  for (const row of ga) {
    const prior = ga.filter((x) => x.date < row.date && x.date >= addDays(row.date, -r.baselineDays) && !x.incident && !known.has(x.date) && !suspicious.has(x.date));
    const base = {
      days: prior.length,
      views: median(prior.map((x) => x.views)),
      organicViews: median(prior.filter((x) => fin(x.organicViews) != null).map((x) => x.organicViews)),
      engagementRate: (() => {
        const s = prior.reduce((a, x) => a + (fin(x.sessions) ?? 0), 0);
        const e = prior.reduce((a, x) => a + (fin(x.engagedSessions) ?? 0), 0);
        return s ? e / s : null;
      })(),
    };
    // GSC は GA4 の計測障害の影響を受けないので、直前の GSC の日をそのまま比べる
    const gscPrior = [...gsc.values()].filter((x) => x.date < row.date && x.date >= addDays(row.date, -r.baselineDays));
    const gscBase = gscPrior.length >= r.minGscBaselineDays ? median(gscPrior.map((x) => x.clicks)) : null;
    const ratios = prior.map((x) => (gsc.get(x.date)?.clicks && fin(x.organicViews) != null ? x.organicViews / gsc.get(x.date).clicks : null)).filter((x) => x != null);
    const ratioBase = ratios.length >= r.minGscBaselineDays ? median(ratios) : null;
    const g = gsc.get(row.date) ?? null;
    const previous = ga.filter((x) => x.date < row.date).at(-1) ?? null;
    const engagementRate = fin(row.sessions) && row.sessions >= r.minSessions && fin(row.engagedSessions) != null ? row.engagedSessions / row.sessions : null;

    const signals = [];
    const enough = base.days >= r.minBaselineDays;
    const viewsFell = Boolean(enough && base.views && row.views < base.views * r.gaDrop);
    // 検索の比較は Organic Views で行う。Organic が取れない日は Views で代える
    const organicKnown = base.organicViews != null && fin(row.organicViews) != null;
    const organicFell = organicKnown ? Boolean(enough && base.organicViews && row.organicViews < base.organicViews * r.gaDrop) : viewsFell;
    const engagementCollapsed = Boolean(enough && engagementRate != null && base.engagementRate != null && base.engagementRate >= r.engagementBaselineMin && engagementRate < r.engagementFloor);
    if (viewsFell) signals.push(`Views ${row.views}（直近7日の中央値 ${Math.round(base.views)} の${Math.round((row.views / base.views) * 100)}%）`);
    if (organicKnown && organicFell) signals.push(`Organic Views ${row.organicViews}（同 ${Math.round(base.organicViews)} の${Math.round((row.organicViews / base.organicViews) * 100)}%）`);
    if (engagementCollapsed) signals.push(`エンゲージメント率 ${Math.round(engagementRate * 100)}%（同 ${Math.round(base.engagementRate * 100)}%）`);
    const gscFell = g && gscBase ? g.clicks < gscBase * r.gscDrop : null;
    const ratio = g?.clicks && fin(row.organicViews) != null ? row.organicViews / g.clicks : null;
    const diverged = ratio != null && ratioBase ? ratio < ratioBase * r.ratioDrop : null;

    // 判定：検索（Organic）かエンゲージメントが崩れた日だけ、GSC と比べて計測か流入かを分ける
    let status;
    if (!enough) status = STATUS.nodata;
    else if (!organicFell && !engagementCollapsed) status = viewsFell ? STATUS.nonSearch : STATUS.ok;
    else if (diverged === true || gscFell === false) status = STATUS.measurement; // GSC は保たれている／GA4 だけが大きく減った
    else if (gscFell === true) status = engagementCollapsed ? STATUS.measurement : STATUS.traffic;
    else status = engagementCollapsed ? STATUS.measurement : STATUS.pending;
    if (status === STATUS.measurement) suspicious.add(row.date);

    days.push({
      date: row.date,
      views: row.views,
      organicViews: fin(row.organicViews),
      engagementRate: engagementRate == null ? null : Math.round(engagementRate * 1000) / 1000,
      dayOverDayPct: previous?.views ? Math.round((row.views / previous.views - 1) * 1000) / 10 : null,
      vsBaselinePct: base.views ? Math.round((row.views / base.views) * 1000) / 10 : null,
      baselineDays: base.days,
      gscClicks: g?.clicks ?? null,
      gscVsBaselinePct: g && gscBase ? Math.round((g.clicks / gscBase) * 1000) / 10 : null,
      organicPerGscClick: ratio == null ? null : Math.round(ratio * 100) / 100,
      organicPerGscClickBaseline: ratioBase == null ? null : Math.round(ratioBase * 100) / 100,
      diverged,
      signals,
      status,
      incident: row.incident ?? known.get(row.date) ?? null,
    });
  }

  const recent = days.slice(-r.alertDays);
  const alerts = [];
  for (const d of recent) {
    if (![STATUS.measurement, STATUS.traffic, STATUS.pending].includes(d.status)) continue;
    const gscText = d.gscClicks == null ? 'GSC の同じ日は未取得' : d.gscVsBaselinePct == null ? `GSC クリック ${d.gscClicks}（比べる GSC の日が足りない）` : `GSC クリック ${d.gscClicks}（直近7日の中央値の${d.gscVsBaselinePct ?? '—'}%）${d.diverged ? '・Organic Views と GSC クリックが乖離' : ''}`;
    if (d.incident) {
      alerts.push({ level: 'info', kind: '既知の計測障害', message: `GA4 ${d.date}：${d.status}（${d.signals.join('・')}／${gscText}）。登録済みの計測障害（${d.incident}・Issue #226）の期間。流入の急落として扱わない` });
    } else if (d.status === STATUS.measurement) {
      alerts.push({ level: 'critical', kind: '計測欠損の疑い', message: `GA4 ${d.date}：${d.signals.join('・')}。${gscText}。検索からの実アクセスは保たれている可能性が高いので、SEO の変更より先に計測を調べる：本番ブラウザで g/collect が送られているか、CSP（public/_headers の connect-src）、タグ、除外フラグ、Cloudflare。確認できたら data/editorial/measurement-incidents.json に登録する` });
    } else if (d.status === STATUS.traffic) {
      alerts.push({ level: 'warning', kind: '検索流入の減少の疑い', message: `GA4 ${d.date}：${d.signals.join('・')}。${gscText}。GSC も減っているため流入の減少を疑う（順位・表示回数・季節の終わり・検索エンジンの更新）。計測の不具合も否定はしない` });
    } else {
      alerts.push({ level: 'warning', kind: 'GA4 急減（判定保留）', message: `GA4 ${d.date}：${d.signals.join('・')}。GSC の同じ日か比べる日がまだ無いため、計測欠損か流入の減少かは判定しない（GSC の確定を待つ）` });
    }
  }
  return { days, latest: days.at(-1) ?? null, alerts, gscAvailable: gsc.size > 0 };
}

/** GSC の日別（windows.gsc.daily）の形式の検査。ゼロ埋めの疑い・確定日より後・重複・クリックが表示を超える、を止める */
export function checkGscDaily(daily, { confirmedThrough = null, maxDays = 35 } = {}) {
  const errors = [];
  if (daily == null) return errors;
  if (!Array.isArray(daily)) return ['windows.gsc.daily が配列ではない'];
  if (daily.length > maxDays) errors.push(`windows.gsc.daily が ${daily.length} 行（最大 ${maxDays} 日）`);
  let prev = null;
  for (const r of daily) {
    if (!isDate(r?.date)) { errors.push(`日付が YYYY-MM-DD でない：${JSON.stringify(r?.date)}`); continue; }
    if (prev && r.date <= prev) errors.push(`日付が昇順でない・重複：${prev} → ${r.date}`);
    prev = r.date;
    for (const key of ['clicks', 'impressions']) {
      const v = r[key];
      if (v == null) errors.push(`${r.date} の ${key} が無い（取れない日は行を作らない）`);
      else if (!Number.isInteger(v) || v < 0) errors.push(`${r.date} の ${key} が0以上の整数でない（${v}）`);
    }
    if (r.position != null && !(Number.isFinite(r.position) && r.position > 0)) errors.push(`${r.date} の position が正の数でない（${r.position}）`);
    if (Number.isInteger(r.clicks) && Number.isInteger(r.impressions) && r.clicks > r.impressions) errors.push(`${r.date} の clicks（${r.clicks}）が impressions（${r.impressions}）より大きい`);
    if (r.clicks === 0 && r.impressions === 0 && r.confirmedZero !== true) errors.push(`${r.date} が clicks 0・impressions 0（未取得日のゼロ埋めの疑い。本当に0なら confirmedZero: true）`);
    if (isDate(confirmedThrough) && r.date > confirmedThrough) errors.push(`${r.date} は GSC の確定日（${confirmedThrough}）より後`);
  }
  return errors;
}
