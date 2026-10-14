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

/**
 * 日次の判断（Trends は proxy。期待PVは出さない）。
 *   freshness      … 最終取得日と経過日数。staleDays 以上で更新推奨、データが無くても止めない
 *   refreshRequest … 更新が必要なときだけ、オーナーに頼む比較グループ（語・地域・期間・URL）
 *   deadlines      … テーマごとの仕込み期限（例年の立ち上がり − prepLeadDays）。過ぎた・14日以内・先
 *   coverageGaps   … 需要期（立ち上がり〜山の週の1週後）なのに、対応ページが無い／GSC の表示が無い／平均順位が weakPosition より下
 *   focusCandidates… 需要期・仕込み期の語の対応ページで、改善余地（4位以下）があるもの。需要の大きさ順
 * GSC はページ別（pageMetrics）を優先し、無ければ検索語別（gscQueries）をページで合計した値を使う
 */
export function trendsDecisions({ summary = [], data = null, snapshot = null, observation = [], today, rules = {} }) {
  const prepLeadDays = rules.prepLeadDays ?? 14;
  const staleDays = rules.staleDays ?? 7;
  const weakPosition = rules.weakPosition ?? 10;
  const ageDays = data?.updatedAt && isDate(data.updatedAt) ? daysBetween(data.updatedAt, today) : null;
  const freshness = {
    updatedAt: data?.updatedAt ?? null,
    ageDays,
    missing: !data?.series?.length,
    stale: !data?.series?.length || (ageDays != null && ageDays >= staleDays),
    staleDays,
  };
  const groups = new Map();
  for (const s of data?.series ?? []) {
    const key = s.group ?? 0;
    if (!groups.has(key)) groups.set(key, [data.anchor, ...(s.comparedWith ?? []).filter((k) => k !== data.anchor)].slice(0, 5));
  }
  const refreshRequest = freshness.stale ? {
    reason: freshness.missing ? 'search-trends.json が無い' : `最終取得 ${freshness.updatedAt}（${ageDays}日前）`,
    geo: data?.geo ?? 'JP',
    timeframe: data?.timeframe ?? 'today 5-y',
    anchor: data?.anchor ?? '土浦花火',
    groups: [...groups.values()].map((keywords) => ({
      keywords,
      url: `https://trends.google.co.jp/trends/explore?date=${encodeURIComponent(data?.timeframe ?? 'today 5-y')}&geo=${data?.geo ?? 'JP'}&q=${keywords.map(encodeURIComponent).join(',')}&hl=ja`,
    })),
    howTo: '各URLの「人気度の動向」右上の↓でCSVを保存し、Claude Code が npm run trends:import -- <CSV…> で取り込む',
  } : null;

  // ページ別の GSC（28日）
  const gsc = new Map();
  for (const r of snapshot?.pageMetrics ?? []) {
    if (r.gsc?.impressions28 != null) gsc.set(r.path, { impressions28: r.gsc.impressions28, position28: r.gsc.position28 == null ? null : Number(Number(r.gsc.position28).toFixed(1)), source: 'pageMetrics' });
  }
  const fromQueries = new Map();
  for (const q of snapshot?.gscQueries ?? []) {
    if (!q?.page || gsc.has(q.page)) continue;
    const a = fromQueries.get(q.page) ?? { impressions28: 0, w: 0, wi: 0 };
    const imp = Number(q.impressions28) || 0;
    a.impressions28 += imp;
    if (q.position28 != null && imp > 0) { a.w += q.position28 * imp; a.wi += imp; }
    fromQueries.set(q.page, a);
  }
  for (const [page, a] of fromQueries) gsc.set(page, { impressions28: a.impressions28, position28: a.wi ? Number((a.w / a.wi).toFixed(1)) : null, source: 'gscQueries' });
  const observing = new Map(observation.filter((o) => o.status === 'observing').map((o) => [o.path, o.observeUntil]));

  // テーマの需要の段階は、そのテーマで「例年」が出ている語（季節の実測2年以上）のうち需要が最大の語で決める
  const themeTiming = new Map();
  for (const t of summary) {
    if (t.status !== 'ok' || !t.theme || !t.expectedRise || !t.expectedPeakWeek) continue;
    const cur = themeTiming.get(t.theme);
    if (!cur || (t.peakRelativeToAnchor ?? 0) > (cur.peakRelativeToAnchor ?? 0)) themeTiming.set(t.theme, t);
  }
  const phaseOf = (timing) => {
    if (!timing) return null;
    const prepDeadline = addDays(timing.expectedRise, -prepLeadDays);
    const peakEnd = addDays(timing.expectedPeakWeek, 13);
    if (daysBetween(peakEnd, today) > 0) return { phase: 'ended', prepDeadline };
    if (daysBetween(timing.expectedRise, today) >= 0) return { phase: 'demand', prepDeadline };
    // 仕込み期：仕込み期限の14日前から、需要が立ち上がるまで（期限を過ぎても立ち上がり前なら仕込み期）
    if (daysBetween(addDays(prepDeadline, -14), today) >= 0) return { phase: 'prep', prepDeadline };
    return { phase: 'before', prepDeadline };
  };

  const deadlines = [...themeTiming.values()].map((t) => {
    const p = phaseOf(t);
    const daysLeft = daysBetween(today, p.prepDeadline);
    return {
      theme: t.theme, keyword: t.keyword, peakRelativeToAnchor: t.peakRelativeToAnchor,
      expectedRise: t.expectedRise, expectedPeakWeek: t.expectedPeakWeek, prepDeadline: p.prepDeadline, daysLeft, phase: p.phase,
      status: p.phase === 'ended' ? '終了' : p.phase === 'demand' ? '需要期（仕込み期限は過ぎた）' : daysLeft < 0 ? `仕込み期限を${-daysLeft}日過ぎた（立ち上がり前）` : daysLeft <= 14 ? `仕込み期限まで${daysLeft}日` : `仕込み期限 ${p.prepDeadline}`,
    };
  }).filter((d) => d.phase !== 'ended' && d.daysLeft <= 90).sort((a, b) => a.prepDeadline.localeCompare(b.prepDeadline));

  const inSeason = (t) => {
    const p = phaseOf(themeTiming.get(t.theme));
    return p && (p.phase === 'demand' || p.phase === 'prep') ? p.phase : null;
  };
  const coverageGaps = [];
  const focusCandidates = [];
  for (const t of summary) {
    if (!t.seasonal) continue;
    const phase = inSeason(t);
    if (!phase) continue;
    const g = t.page ? gsc.get(t.page) ?? null : null;
    const base = { keyword: t.keyword, theme: t.theme, page: t.page, peakRelativeToAnchor: t.peakRelativeToAnchor, phase, impressions28: g?.impressions28 ?? null, position28: g?.position28 ?? null, observing: t.page ? observing.get(t.page) ?? null : null };
    if (!t.page) coverageGaps.push({ ...base, reason: '対応ページが無い（新規記事の候補。需要の大きさと工数で比べる）' });
    else if (!g || !g.impressions28) coverageGaps.push({ ...base, reason: '需要期なのに GSC の表示が無い（インデックス・内部リンク・検索意図を確認）' });
    else if (g.position28 != null && g.position28 > weakPosition) coverageGaps.push({ ...base, reason: `平均${g.position28}位で1ページ目に届いていない` });
    else if (g.position28 != null && g.position28 > 3) focusCandidates.push({ ...base, reason: `需要期に平均${g.position28}位。TOP3への改善余地（title・description・冒頭の回答・FAQ・内部リンク）` });
  }
  const bySize = (a, b) => (b.peakRelativeToAnchor ?? 0) - (a.peakRelativeToAnchor ?? 0);
  // 同じページに着地する語（例：土浦花火・土浦全国花火競技大会）は1件にまとめる
  const byPage = (list) => {
    const out = new Map();
    for (const x of list.sort(bySize)) {
      const key = x.page ?? `kw:${x.keyword}`;
      if (out.has(key)) out.get(key).keywords.push(x.keyword);
      else out.set(key, { ...x, keywords: [x.keyword] });
    }
    return [...out.values()];
  };
  return { freshness, refreshRequest, deadlines, coverageGaps: byPage(coverageGaps), focusCandidates: byPage(focusCandidates) };
}
