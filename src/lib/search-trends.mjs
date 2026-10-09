/**
 * Google Trends（検索需要の相対値・proxy）の取り込みと季節性の計算。純粋関数（ファイルは読まない）。
 *
 * データ：data/editorial/search-trends.json（scripts/search-trends.mjs で Trends の CSV から作る）
 * 原則
 *   - Trends の値は「同じ比較（最大5語）の中での相対値 0〜100」。月間検索ボリュームではない（basis: proxy）
 *   - 別々の比較どうしは、全ての比較に入れた基準語（anchor）の最大値を100とした尺度に直してから比べる。
 *     値は整数に丸められているため、小さい語（ピークが一桁）ほど比の誤差が大きい
 *   - 「1 未満」は数値にしない（belowOne: true、value: null）。計算では 0 として扱う
 *   - 期待PVへの換算はしない（換算するなら GSC の表示回数との対応を根拠に、別に明記する）
 */
import { addDays, daysBetween } from './growth-engine.mjs';
import { dateOnlyWeekday, parseDateOnly } from './date-only.js';

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const median = (list) => {
  if (!list.length) return null;
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Trends の「人気度の動向」CSV（週単位）を読む */
export function parseTrendsCsv(text) {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const headerIndex = lines.findIndex((l) => /^(週|日|月|Week|Day|Month),/.test(l));
  if (headerIndex < 0) throw new Error('Trends の CSV ではない（「週,」で始まる見出し行が無い）');
  const head = lines[headerIndex].split(',');
  const granularity = { 週: 'week', Week: 'week', 日: 'day', Day: 'day', 月: 'month', Month: 'month' }[head[0]];
  const columns = head.slice(1).map((h) => {
    const m = h.match(/^(.*): \((.*)\)$/);
    return { keyword: (m ? m[1] : h).trim(), geoLabel: m ? m[2] : null };
  });
  const rows = lines.slice(headerIndex + 1).map((l) => l.split(','));
  const series = columns.map((c, i) => ({
    keyword: c.keyword,
    geoLabel: c.geoLabel,
    points: rows.map((r) => {
      const raw = (r[i + 1] ?? '').trim();
      const belowOne = /未満|<\s*1/.test(raw);
      const value = belowOne || raw === '' ? null : Number(raw);
      return { date: r[0], value: Number.isFinite(value) ? value : null, ...(belowOne ? { belowOne: true } : {}) };
    }),
  }));
  return { granularity, series };
}

const valueOf = (p) => (p.value == null ? 0 : p.value);

/**
 * 1つのキーワードの季節性。全期間の最大の週から52週ごとに季節を区切り、各季節の山と立ち上がりを出す。
 *   山（peak）：その季節の窓（山の週の16週前〜8週後）で最大の週
 *   立ち上がり（rise）：山から遡って、値が山の threshold（既定10%）以上で連続する最初の週
 *   山の週の割合（peakShare）：山の週 ÷（山の12週前〜2週後の合計）。小さいほど、山の前の数か月に需要が分散している
 *   山の値が minPeak 未満の季節は「データ不足」（丸めの誤差が大きいため）
 */
export function seasonalityOf(points, { threshold = 0.1, minPeak = 5 } = {}) {
  const pts = points.filter((p) => isDate(p.date));
  if (!pts.length) return [];
  const maxIndex = pts.reduce((best, p, i) => (valueOf(p) > valueOf(pts[best]) ? i : best), 0);
  const seasons = [];
  for (let k = -10; k <= 10; k += 1) {
    const center = maxIndex + k * 52;
    if (center < -8 || center > pts.length + 8) continue;
    const from = Math.max(0, center - 16);
    const to = Math.min(pts.length - 1, center + 8);
    if (from > to) continue;
    let peak = from;
    for (let i = from; i <= to; i += 1) if (valueOf(pts[i]) > valueOf(pts[peak])) peak = i;
    const peakValue = valueOf(pts[peak]);
    const complete = center - 16 >= 0 && center + 8 <= pts.length - 1;
    if (peakValue < minPeak) {
      seasons.push({ season: Number(pts[peak].date.slice(0, 4)), peakDate: pts[peak].date, peakValue, riseDate: null, riseToPeakDays: null, status: 'データ不足', complete });
      continue;
    }
    let rise = peak;
    while (rise - 1 >= from && valueOf(pts[rise - 1]) >= peakValue * threshold) rise -= 1;
    const seasonSum = pts.slice(Math.max(0, peak - 12), Math.min(pts.length, peak + 3)).reduce((sum, p) => sum + valueOf(p), 0);
    seasons.push({
      season: Number(pts[peak].date.slice(0, 4)),
      peakDate: pts[peak].date,
      peakValue,
      riseDate: pts[rise].date,
      riseToPeakDays: daysBetween(pts[rise].date, pts[peak].date),
      peakShare: seasonSum ? Number((peakValue / seasonSum).toFixed(2)) : null,
      status: complete ? 'ok' : '途中',
      complete,
    });
  }
  // 同じ山を二重に数えない
  const seen = new Set();
  return seasons.filter((s) => (seen.has(s.peakDate) ? false : (seen.add(s.peakDate), true))).sort((a, b) => a.peakDate.localeCompare(b.peakDate));
}

/**
 * CSV（比較グループ）を search-trends.json の形にする。
 * 各比較に基準語（anchor）が入っていることが前提。比較ごとに「基準語の最大値を100とした尺度」の値も持つ
 */
export function buildTrendsData({ groups, anchor, keywords = {}, fetchedAt, geo = 'JP', timeframe = 'today 5-y' }) {
  const series = [];
  const seasonality = [];
  groups.forEach((group, groupIndex) => {
    const anchorSeries = group.series.find((s) => s.keyword === anchor);
    if (!anchorSeries) throw new Error(`比較 ${groupIndex + 1} に基準語「${anchor}」が無い`);
    const anchorMax = Math.max(...anchorSeries.points.map(valueOf));
    for (const s of group.series) {
      if (s.keyword === anchor && groupIndex > 0) continue; // 基準語の系列は最初の比較のものだけ残す（尺度は各比較で求める）
      const max = Math.max(...s.points.map(valueOf));
      const meta = keywords[s.keyword] ?? {};
      series.push({
        keyword: s.keyword,
        theme: meta.theme ?? null,
        page: meta.page ?? null,
        seasonal: meta.seasonal !== false,
        geo,
        timeframe,
        granularity: group.granularity,
        group: groupIndex + 1,
        anchor,
        comparedWith: group.series.map((x) => x.keyword).filter((k) => k !== s.keyword),
        fetchedAt,
        max,
        anchorMaxInGroup: anchorMax,
        // 基準語の5年最大を100とした、この語の5年最大（比較をまたいで比べるための値。整数の丸めで、一桁の語は±0.5の誤差）
        peakRelativeToAnchor: anchorMax ? Number(((max / anchorMax) * 100).toFixed(1)) : null,
        points: s.points,
      });
      if (meta.seasonal !== false) for (const season of seasonalityOf(s.points)) seasonality.push({ keyword: s.keyword, ...season });
    }
  });
  return {
    schemaVersion: 1,
    updatedAt: fetchedAt,
    source: 'Google Trends（trends.google.co.jp の「人気度の動向」CSV）',
    basis: 'proxy',
    about: '検索需要の相対値（0〜100、同じ比較の中での相対）。月間検索ボリュームではない。比較をまたぐときは peakRelativeToAnchor（基準語の5年最大を100とした値）で比べる。季節性は src/lib/search-trends.mjs の seasonalityOf（立ち上がり＝山の10%以上が山まで連続する最初の週、peakShare＝山の週の割合）。通年型（seasonal: false）は季節性を出さない',
    anchor,
    geo,
    timeframe,
    series,
    seasonality,
  };
}

/** MM-DD の次の発生日（今日以降） */
function nextMonthDay(md, today) {
  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const d = `${y}-${md}`;
    if (daysBetween(today, d) >= -7) return d;
  }
  return null;
}

/** Trends 週（日曜始まり）の開始日 */
function weekStartOf(date) {
  return addDays(date, -dateOnlyWeekday(parseDateOnly(date))); // 0＝日曜（src/lib/date-only.js）
}

/**
 * キーワードごとの要約：基準語比の大きさ、例年の山と立ち上がり、今年の見込み（proxy）。
 * 開催日が分かるページ（pages の startDate、3日以内の催し）に対応する語は、今年の山を「開催日を含む週」として見込む。
 * それ以外は、例年の山の月日（中央値）から見込む
 */
export function trendsSummary(data, { pages = new Map(), today }) {
  if (!data?.series?.length) return [];
  return data.series.map((s) => {
    const measured = (data.seasonality ?? []).filter((x) => x.keyword === s.keyword && x.status === 'ok');
    // 通年型、または季節の実測が2年未満の語は、例年の山・立ち上がりを出さない（1年だけでは例年と言えない）
    const seasons = s.seasonal === false || measured.length < 2 ? [] : measured;
    const leads = seasons.map((x) => x.riseToPeakDays).filter((v) => v != null);
    const peakMds = seasons.map((x) => x.peakDate.slice(5));
    // 月日の中央値（年をまたぐ山は 12月→1月の順に並べるため、山の月が1〜3月なら +12 か月として扱う）
    const peakOrder = peakMds.map((md) => (Number(md.slice(0, 2)) <= 3 ? 1200 : 0) + Number(md.slice(0, 2)) * 100 + Number(md.slice(3)));
    const mid = median(peakOrder);
    const typicalPeakMd = mid == null ? null : (() => {
      const nearest = peakMds[peakOrder.findIndex((v) => v === peakOrder.reduce((b, x) => (Math.abs(x - mid) < Math.abs(b - mid) ? x : b), peakOrder[0]))];
      return nearest;
    })();
    const page = s.page ? pages.get(s.page) : null;
    // 開催日を含む週を山と見込むのは、3日以内の催しだけ（1か月続く催しは、初日の週が山とは限らない）
    const shortEvent = page?.startDate && (!page.endDate || daysBetween(page.startDate, page.endDate) <= 3);
    const eventStart = shortEvent && daysBetween(today, page.startDate) >= 0 ? page.startDate : null;
    const expectedPeakWeek = eventStart ? weekStartOf(eventStart) : typicalPeakMd ? weekStartOf(nextMonthDay(typicalPeakMd, today)) : null;
    const typicalLead = median(leads);
    const expectedRise = expectedPeakWeek && typicalLead != null ? addDays(expectedPeakWeek, -typicalLead) : null;
    const dated = s.points.filter((p) => isDate(p.date));
    const last = dated.at(-1) ?? null;
    // 最新の週は集計途中のことがあるので、1つ前の週（完了した週）を例年の同じ週と比べる
    const complete = dated.at(-2) ?? null;
    const sameWeekPrior = complete ? [1, 2, 3, 4].map((y) => {
      const target = addDays(complete.date, -364 * y);
      return dated.find((p) => Math.abs(daysBetween(p.date, target)) <= 3);
    }).filter(Boolean).map(valueOf) : [];
    const typicalSameWeek = median(sameWeekPrior);
    const shares = seasons.map((x) => x.peakShare).filter((v) => v != null);
    return {
      keyword: s.keyword,
      theme: s.theme,
      page: s.page,
      peakRelativeToAnchor: s.peakRelativeToAnchor,
      seasonsMeasured: seasons.length,
      seasonPeaks: seasons.map((x) => ({ season: x.season, peakDate: x.peakDate, peakValue: x.peakValue, riseDate: x.riseDate })),
      typicalPeakMonthDay: typicalPeakMd,
      typicalRiseToPeakDays: typicalLead,
      expectedPeakWeek,
      expectedPeakBasis: eventStart ? `今年の開催日 ${eventStart} を含む週（記事の開催日）` : typicalPeakMd ? `例年の山の月日（中央値 ${typicalPeakMd}・${seasons.length}年）` : null,
      expectedRise,
      typicalPeakShare: median(shares),
      latest: last ? { date: last.date, value: last.value, belowOne: last.belowOne === true, partial: true } : null,
      latestComplete: complete ? { date: complete.date, value: complete.value, belowOne: complete.belowOne === true, typicalSameWeek, years: sameWeekPrior.length } : null,
      seasonal: s.seasonal !== false,
      status: s.seasonal === false ? '通年（試合・話題で変動）' : seasons.length >= 2 ? 'ok' : 'データ不足',
    };
  }).sort((a, b) => (b.peakRelativeToAnchor ?? 0) - (a.peakRelativeToAnchor ?? 0));
}
