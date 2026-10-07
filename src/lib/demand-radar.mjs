/**
 * Demand Radar / PV Relay / 30・60・90日 Pipeline / Next Winners（計算だけの純粋関数）。
 *
 * 「流入が落ちてから気づく」をなくすため、需要の増加速度・終わり・次の山を先に出す。
 * src/lib/growth-engine.mjs の計算式は変えず、その関数（季節の段階・CTR目安・日付）を呼び出して使う。
 *
 * 原則（docs/GROWTH_ENGINE.md の 8〜11.）
 *   - 実測は performance-snapshot.json だけ。無い値は null（Demand Score では分母からも外し、coverage で示す）
 *   - 失う可能性のある Views・伸びしろは forecast（推定）として basis を付ける。実測として保存しない
 *   - 記事数を目的にしない。期待追加PV ÷ 工数 で、既存ページの改善と新規記事を同じ物差しで比べる
 */
import { addDays, daysBetween, expectedCtr, pageSeason } from './growth-engine.mjs';

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const num = (value) => (value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));
const clamp = (v) => Math.max(0, Math.min(1, v));
const pct = (now, prev) => (now != null && prev ? Number(((now / prev - 1) * 100).toFixed(1)) : null);
const EFFORT_HOURS = { S: 1, M: 3, L: 8, XL: 16 };
const CONFIDENCE = { high: 0.8, medium: 0.5, low: 0.25, none: 0 };

/** 記事ごとの季節の段階（Growth Engine と同じ計算） */
export function seasonsFor(pages, engineConfig, today) {
  const seasons = new Map();
  for (const [path, page] of pages) {
    const season = pageSeason(page, engineConfig, today);
    if (season) seasons.set(path, season);
  }
  return seasons;
}

const hay = (page) => [page?.slug, page?.title, page?.keyword, ...(page?.tags ?? [])].filter(Boolean).join(' ');
const hasCommercialIntent = (text, config) => config.commercialIntentWords.some((w) => text.includes(w));

/** 次に来る（または今の）季節期間。MM-DD の期間を、今日から見た直近の発生に直す */
function nextWindow(season, today) {
  const year = Number(today.slice(0, 4));
  for (const y of [year - 1, year, year + 1]) {
    const start = `${y}-${season.start}`;
    const end = `${season.end < season.start ? y + 1 : y}-${season.end}`;
    if (daysBetween(today, end) >= 0) return { start, end };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Demand Radar
// ---------------------------------------------------------------------------

function timingScore({ startDate, endDate, phase }, today) {
  if (isDate(startDate)) {
    const toStart = daysBetween(today, startDate);
    const toEnd = daysBetween(today, isDate(endDate) ? endDate : startDate);
    if (toEnd < 0) return 0;
    if (toStart <= 0) return 0.8; // 開催中
    if (toStart <= 30) return 1;
    if (toStart <= 60) return 0.6;
    if (toStart <= 90) return 0.3;
    return 0.1;
  }
  if (phase) return { 'index-window': 1, 'demand-rising': 1, peak: 1, live: 0.8, prepare: 0.3, aftermath: 0, ended: 0 }[phase] ?? null;
  return null;
}

function scoreOf(components, weights) {
  let sum = 0;
  let used = 0;
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += weight;
    const c = components[key];
    if (c == null) continue;
    sum += weight * c;
    used += weight;
  }
  const coverage = total ? used / total : 0;
  return {
    score: used ? Math.round((sum / used) * 100) : null,
    coverage: Number(coverage.toFixed(2)),
    confidence: coverage >= 0.7 ? 'high' : coverage >= 0.4 ? 'medium' : 'low',
  };
}

/**
 * 需要のシグナル。既存ページ（pageMetrics の実測）、台帳の未掲載イベント、先の季節（年末年始・初詣・梅・桜…）を同じ物差しで並べる。
 * Demand Score は優先順位付けの目安（推定）。速度（7日Viewsの前週比、28日の表示回数の前期間比）を最も重く見る。
 */
export function demandRadar({ snapshot, pages, seasons, engineConfig, config, observation = [], registry = null, today }) {
  const w = config.demandScore.weights;
  const observing = new Map(observation.filter((o) => o.status === 'observing').map((o) => [o.path, o]));
  const signals = [];

  for (const row of snapshot?.pageMetrics ?? []) {
    const page = pages.get(row.path) ?? null;
    const season = seasons.get(row.path) ?? null;
    const views7 = num(row.views7);
    const viewsPrev7 = num(row.viewsPrev7);
    const imp = num(row.gsc?.impressions28);
    const impPrev = num(row.gsc?.impressionsPrev28);
    const position = num(row.gsc?.position28);
    const ctr = num(row.gsc?.ctr28);
    const viewsVel = pct(views7, viewsPrev7);
    const impVel = pct(imp, impPrev);
    const isNew = (viewsPrev7 === 0 && views7 != null && views7 >= config.demandScore.newPageMinViews7) || (impPrev === 0 && imp != null && imp >= 100);
    const vel = [viewsVel, impVel].filter((v) => v != null);
    const velocity = vel.length ? clamp(Math.log2(1 + Math.max(0, Math.max(...vel) / 100)) / 3) : isNew ? 1 : null;
    const goal = position != null ? expectedCtr(position, engineConfig.ctrCurve) : null;
    const timing = timingScore({ startDate: page?.startDate ?? season?.startDate, endDate: page?.endDate ?? season?.endDate, phase: season?.phase }, today);
    const components = {
      velocity,
      size: imp == null ? null : clamp(Math.log10(1 + imp) / 5),
      positionOpportunity: position == null ? null : position >= 8 && position <= 20 ? 1 : position >= 4 ? 0.7 : position < 4 ? 0.2 : 0.3,
      ctrGap: goal != null && ctr != null && goal > 0 ? clamp((goal - ctr) / goal) : null,
      timing,
      commercialIntent: page ? (hasCommercialIntent(hay(page), config) ? 1 : 0) : null,
      effort: 1, // 既存ページの改善（S）
      competition: null, // 競合の実測なし
    };
    const s = scoreOf(components, w);
    const ended = timing === 0 && (page?.startDate || season);
    const watch = observing.get(row.path);
    signals.push({
      kind: 'page',
      path: row.path,
      label: page?.title ?? row.path,
      exists: true,
      views7, viewsPrev7, viewsVelocityPct: viewsVel,
      impressions28: imp, impressionsPrev28: impPrev, impressionsVelocityPct: impVel,
      isNew,
      position, ctr,
      startDate: page?.startDate ?? season?.startDate ?? null,
      endDate: page?.endDate ?? season?.endDate ?? null,
      phase: season?.phase ?? null,
      commercial: components.commercialIntent === 1,
      components,
      ...s,
      observing: watch ? watch.observeUntil : null,
      action: ended ? '需要は終了。PV Relay で次の山へ流入を渡す'
        : watch ? `観測中（〜${watch.observeUntil}）。事実の訂正・公式発表の反映以外は控える`
          : position != null && position >= 4 && position <= 20 ? '既存ページの改善でTOP3を狙う（title・description・検索意図・FAQ・内部リンク）'
            : '現状維持（需要の推移を監視）',
    });
  }

  // 検索語別（gscQueries）：直近7日と前7日、28日と前28日の表示で速度を見る。ページが同じでも検索語ごとに別のシグナル
  const qc = config.queryRadar ?? {};
  const top3Ctr = expectedCtr(3, engineConfig.ctrCurve);
  for (const q of snapshot?.gscQueries ?? []) {
    if (!q?.query || !q.page) continue;
    const page = pages.get(q.page) ?? null;
    const season = seasons.get(q.page) ?? null;
    const imp7 = num(q.impressions7);
    const impPrev7 = num(q.impressionsPrev7);
    const imp28 = num(q.impressions28);
    const impPrev28 = num(q.impressionsPrev28);
    const position = num(q.position28);
    const ctr = num(q.ctr28);
    const vel7 = pct(imp7, impPrev7);
    const vel28 = pct(imp28, impPrev28);
    const isNew = impPrev7 === 0 && imp7 != null && imp7 >= (qc.minImpressions7 ?? 20);
    const vel = [vel7, vel28].filter((v) => v != null);
    const velocity = vel.length ? clamp(Math.log2(1 + Math.max(0, Math.max(...vel) / 100)) / 3) : isNew ? 1 : null;
    const goal = position != null ? expectedCtr(position, engineConfig.ctrCurve) : null;
    const timing = timingScore({ startDate: page?.startDate ?? season?.startDate, endDate: page?.endDate ?? season?.endDate, phase: season?.phase }, today);
    const components = {
      velocity,
      size: imp28 == null ? null : clamp(Math.log10(1 + imp28) / 5),
      positionOpportunity: position == null ? null : position >= 8 && position <= 20 ? 1 : position >= 4 ? 0.7 : position < 4 ? 0.2 : 0.3,
      ctrGap: goal != null && ctr != null && goal > 0 ? clamp((goal - ctr) / goal) : null,
      timing,
      commercialIntent: hasCommercialIntent(`${q.query} ${hay(page)}`, config) ? 1 : 0,
      effort: 1,
      competition: null,
    };
    // 伸びしろ（forecast）：今の28日の表示（30日換算）のまま、3位相当のCTR目安に届いた場合の追加クリック。4〜20位だけ
    const upside = position != null && position > 3 && position <= 20 && imp28 != null && ctr != null && top3Ctr != null
      ? Math.max(0, Math.round((imp28 / 28) * 30 * (top3Ctr - ctr))) : null;
    const rising = imp7 != null && imp7 >= (qc.minImpressions7 ?? 20) && (isNew || (vel7 != null && vel7 >= (qc.risingPct ?? 30)));
    const ended = timing === 0;
    const watch = observing.get(q.page);
    signals.push({
      kind: 'query',
      query: q.query,
      path: q.page,
      label: `「${q.query}」`,
      pageLabel: page?.title ?? q.page,
      exists: Boolean(page),
      impressions7: imp7, impressionsPrev7: impPrev7, impressions7VelocityPct: vel7,
      impressions28: imp28, impressionsPrev28: impPrev28, impressionsVelocityPct: vel28,
      viewsVelocityPct: null,
      isNew, rising, position, ctr, upside,
      startDate: page?.startDate ?? season?.startDate ?? null,
      endDate: page?.endDate ?? season?.endDate ?? null,
      phase: season?.phase ?? null,
      commercial: components.commercialIntent === 1,
      components,
      ...scoreOf(components, w),
      observing: watch ? watch.observeUntil : null,
      action: ended ? '需要は終了。PV Relay で次の山へ流入を渡す'
        : watch ? `観測中（〜${watch.observeUntil}）。観測後に「${q.query}」の検索意図を補強`
          : position != null && position > 3 && position <= 20 ? `「${q.query}」で3位以内を狙う：title・description・見出し・FAQを検索意図に合わせ、関連ページから内部リンク`
            : position != null && position <= 3 ? `「${q.query}」は上位。タイトルのCTRと、回遊・CTAを確認`
              : `「${q.query}」は20位より下。既存ページの補強・新規記事・内部リンクを期待追加PV ÷ 工数で比べる`,
    });
  }

  // 台帳の未掲載イベント（90日以内）：記事が無いので実測は無い。時期だけで評価する（coverage が低い）
  for (const e of registry?.events ?? []) {
    if (e.articleUrl || !['discovered', 'verified'].includes(e.status) || !isDate(e.startDate)) continue;
    const toStart = daysBetween(today, e.startDate);
    if (toStart < 0 || toStart > 90) continue;
    const components = { velocity: null, size: null, positionOpportunity: null, ctrGap: null, timing: timingScore({ startDate: e.startDate, endDate: e.endDate }, today), commercialIntent: hasCommercialIntent(e.name, config) ? 1 : 0, effort: 0.3, competition: null };
    signals.push({
      kind: 'event-candidate', path: null, label: e.name, exists: false, registryId: e.id, status: e.status,
      startDate: e.startDate, endDate: e.endDate ?? null, phase: null, commercial: components.commercialIntent === 1, components,
      ...scoreOf(components, w),
      action: e.status === 'verified' ? '一次情報は確認済み。記事化の期待値を比べる（新規記事 L）' : '一次情報の確認から（未確認のまま記事化しない）',
    });
  }

  // 先の季節（Growth Engine の対象外の、年をまたぐ需要）
  for (const [key, season] of Object.entries(config.upcomingSeasons)) {
    if (key === 'about') continue;
    const win = nextWindow(season, today);
    if (!win) continue;
    const toStart = daysBetween(today, win.start);
    if (toStart > 120) continue;
    const covering = [...pages.values()].filter((p) => season.match.some((m) => hay(p).includes(m)) && !p.noindex);
    const components = { velocity: null, size: null, positionOpportunity: null, ctrGap: null, timing: timingScore({ startDate: win.start, endDate: win.end }, today), commercialIntent: null, effort: covering.length ? 0.6 : 0.3, competition: null };
    signals.push({
      kind: 'season', path: covering[0]?.path ?? null, label: season.label, exists: covering.length > 0, coveringPages: covering.map((p) => p.path).slice(0, 5),
      startDate: win.start, endDate: win.end, phase: null, commercial: null, components,
      ...scoreOf(components, w),
      action: covering.length ? `既存ページ（${covering.length}件）の更新と季節導線` : '対応ページなし。一次情報の確認と記事化の検討',
    });
  }

  return signals.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

// ---------------------------------------------------------------------------
// PV Relay / PV at Risk
// ---------------------------------------------------------------------------

/**
 * 主要流入ページの「需要の終わり」と、失う可能性のある Views（forecast）。
 * 終わった後は流入がほぼ止まる想定（2026年の実測で減衰を学習したら置き換える）。
 * 終わりの日付が記事に無い主要ページは「終了日データなし」として警告する（失速を予測できないため）。
 */
export function pvRelay({ snapshot, pages, seasons, engineConfig, config, radar, today }) {
  const site7 = num(snapshot?.windows?.ga4?.recent7?.views);
  const dataAsOf = snapshot?.source?.freshness?.ga4LatestConfirmedDate ?? snapshot?.asOf ?? today;
  const rows = [...(snapshot?.pageMetrics ?? [])]
    .filter((r) => num(r.views7) != null)
    .sort((a, b) => num(b.views7) - num(a.views7))
    .slice(0, config.pvRelay.topPages)
    .filter((r) => !site7 || num(r.views7) / site7 >= config.pvRelay.minShareOfSite);

  // 代わりに流入を受ける候補：これから需要期に入る（または開催中の）もの
  const upcoming = radar.filter((s) => s.kind !== 'query' && (s.components?.timing ?? 0) >= 0.6);

  const items = rows.map((r) => {
    const page = pages.get(r.path) ?? null;
    const season = seasons.get(r.path) ?? null;
    const endDate = page?.endDate ?? page?.startDate ?? season?.endDate ?? null;
    // 申請締切・交付開始などの節目（終わりではない。config.milestones、公式一次情報で確認した日付だけ）
    const milestones = (config.milestones?.[r.path] ?? []).filter((m) => isDate(m?.date));
    const nextMs = milestones.filter((m) => daysBetween(today, m.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
    const rule = engineConfig.seasonalRules[season?.category] ?? engineConfig.seasonalRules.default;
    const tailEnd = endDate ? addDays(endDate, rule.aftermathDays) : null;
    const daily = num(r.views7) / 7;
    const daysToEnd = endDate ? daysBetween(today, endDate) : null;
    // 終了後の余韻が終わる日から、各期間の終わりまでに失う Views（forecast）
    const lost = Object.fromEntries(config.pvRelay.horizons.map((h) => {
      if (!tailEnd) return [h, null];
      const from = Math.max(0, daysBetween(today, tailEnd));
      return [h, Math.round(daily * Math.max(0, h - from))];
    }));
    const dropPct = pct(num(r.views7), num(r.viewsPrev7));
    const impDropPct = pct(num(r.gsc?.impressions28), num(r.gsc?.impressionsPrev28));
    const measuredDrop = dropPct != null && dropPct <= -config.pvRelay.measuredDropPct;
    const impressionsDrop = impDropPct != null && impDropPct <= -config.pvRelay.measuredDropPct;
    // 順位・CTR の前期間は performance-snapshot に positionPrev28・ctrPrev28 があるときだけ比べる（無ければ null）
    const position = num(r.gsc?.position28);
    const positionPrev = num(r.gsc?.positionPrev28);
    const positionChange = position != null && positionPrev != null ? Number((position - positionPrev).toFixed(1)) : null;
    const ctr = num(r.gsc?.ctr28);
    const ctrPrev = num(r.gsc?.ctrPrev28);
    const ctrChangePct = pct(ctr, ctrPrev);
    const status = endDate == null ? (milestones.length ? 'MILESTONE' : 'END UNKNOWN')
      : daysToEnd < 0 ? 'ENDED'
        : daysToEnd <= 14 ? 'ENDING'
          : 'ACTIVE';
    // 節目の後に需要が止まった場合の上限（forecast。終わりではないので合計には入れない）
    const dropMs = nextMs?.effect === 'demand-may-drop' ? nextMs : null;
    const lostIfDrops = dropMs ? Object.fromEntries(config.pvRelay.horizons.map((h) => [h, Math.round(daily * Math.max(0, h - Math.max(0, daysBetween(today, dropMs.date))))])) : null;
    const sameArea = (s) => s.path && pages.get(s.path)?.municipalities?.some((m) => page?.municipalities?.includes(m));
    const replacements = upcoming
      .filter((s) => s.path !== r.path)
      .sort((a, b) => Number(sameArea(b)) - Number(sameArea(a)) || (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3)
      .map((s) => ({
        label: s.label, path: s.path, kind: s.kind, views7: s.views7 ?? null, startDate: s.startDate,
        // 仕込み期限：これからの次の節目。公開・更新の締切を過ぎていれば「至急」
        next: (s.path && seasons.get(s.path)?.nextMilestone) ?? (isDate(s.startDate) ? { label: '開催', date: s.startDate } : null),
        deadlinePassed: Boolean(s.path && (() => { const d = seasons.get(s.path)?.milestones.find((m) => m.key === 'publishDeadline')?.date; return d && daysBetween(d, today) > 0; })()),
      }));
    return {
      path: r.path,
      label: page?.title ?? r.path,
      views7: num(r.views7),
      viewsPrev7: num(r.viewsPrev7),
      shareOfSite: site7 ? Number((num(r.views7) / site7).toFixed(3)) : null,
      endDate,
      daysToEnd,
      status,
      lostViewsForecast: lost,
      milestones,
      nextMilestone: nextMs,
      lostViewsIfDrops: lostIfDrops,
      neededReplacementViews7: lost[7] ?? null,
      measuredDropPct: dropPct,
      measuredDrop,
      impressionsChangePct: impDropPct,
      impressionsDrop,
      positionChange,
      ctrChangePct,
      replacements,
      basis: endDate ? `直近7日の1日平均 ${daily.toFixed(1)} が、終了（${endDate}）＋余韻${rule.aftermathDays}日の後に止まる想定（forecast）`
        : milestones.length ? `終わりではなく節目（${milestones.map((m) => `${m.label} ${m.date}`).join('・')}）。減り方は実測待ち`
          : '記事に開催日・期限のデータが無く、終わりを予測できない',
    };
  });

  const sumLost = (h) => items.reduce((s, i) => s + (i.lostViewsForecast[h] ?? 0), 0);
  const top = items[0];
  const second = items[1];
  const alerts = [];
  const lost7 = sumLost(7);
  if (lost7 > 0 && site7) alerts.push({ level: lost7 / site7 >= 0.2 ? 'critical' : 'warning', kind: 'PV at Risk', message: `今後7日で約 ${lost7.toLocaleString('ja-JP')} PV を失う可能性（forecast・直近7日 ${site7.toLocaleString('ja-JP')} の ${Math.round((lost7 / site7) * 100)}%）。${items.filter((i) => (i.lostViewsForecast[7] ?? 0) > 0).map((i) => i.label.slice(0, 18)).join('、')}` });
  for (const i of items.filter((x) => x.status === 'END UNKNOWN' && (x.shareOfSite ?? 0) >= 0.1)) alerts.push({ level: 'warning', kind: 'PV at Risk', message: `${i.label.slice(0, 24)}（直近7日 ${i.views7.toLocaleString('ja-JP')}・全体の${Math.round(i.shareOfSite * 100)}%）は終わりの日付データが無く、失速を予測できない（催しなら記事の event に公式の開催日を、申請締切などの節目なら demand-radar.json の milestones に公式の日付を入れる）` });
  for (const i of items.filter((x) => x.status === 'MILESTONE' && x.lostViewsIfDrops && (x.shareOfSite ?? 0) >= 0.05)) {
    const later = i.milestones.filter((m) => m !== i.nextMilestone && daysBetween(today, m.date) >= 0).map((m) => `${m.label} ${m.date}`).join('・');
    alerts.push({ level: 'warning', kind: 'PV at Risk', message: `${i.label.slice(0, 24)}（直近7日 ${i.views7.toLocaleString('ja-JP')}・全体の${Math.round(i.shareOfSite * 100)}%）は ${i.nextMilestone.label}（${i.nextMilestone.date}）の後に需要が落ちる可能性。止まった場合の上限は今後14日で ${(i.lostViewsIfDrops[14] ?? 0).toLocaleString('ja-JP')} PV（forecast）${later ? `。次の節目：${later}` : ''}` });
  }
  for (const i of items.filter((x) => x.status === 'ENDING' && (x.shareOfSite ?? 0) >= 0.05)) alerts.push({ level: 'warning', kind: 'PV at Risk', message: `${i.label.slice(0, 24)} は ${i.endDate} に終了（あと${i.daysToEnd}日・直近7日 ${i.views7.toLocaleString('ja-JP')}）。今後14日で約 ${(i.lostViewsForecast[14] ?? 0).toLocaleString('ja-JP')} PV を失う可能性（forecast）。代替を先に仕込む` });
  for (const i of items.filter((x) => x.measuredDrop)) alerts.push({ level: 'warning', kind: '流入急減', message: `${i.label.slice(0, 24)} の7日Viewsが前週比 ${i.measuredDropPct}%（実測）` });
  for (const i of items.filter((x) => x.impressionsDrop)) alerts.push({ level: 'warning', kind: '検索表示急減', message: `${i.label.slice(0, 24)} の28日の検索表示が前期間比 ${i.impressionsChangePct}%（実測）` });
  for (const i of items.filter((x) => x.positionChange != null && x.positionChange >= 3)) alerts.push({ level: 'warning', kind: '順位下落', message: `${i.label.slice(0, 24)} の平均順位が前期間より ${i.positionChange} 下落（実測）` });
  for (const i of items.filter((x) => x.ctrChangePct != null && x.ctrChangePct <= -30)) alerts.push({ level: 'info', kind: 'CTR悪化', message: `${i.label.slice(0, 24)} のCTRが前期間比 ${i.ctrChangePct}%（実測）` });
  if (top && site7 && top.shareOfSite >= config.pvRelay.dependencyShare) alerts.push({ level: 'warning', kind: '依存度', message: `上位1ページで直近7日の${Math.round(top.shareOfSite * 100)}%${second ? `、上位2ページで${Math.round(((top.views7 + second.views7) / site7) * 100)}%` : ''}。終了時の落ち幅が大きい` });

  // 参考値：上位2ページを除いた単純ランレート（11月 forecast の正本ではない。季節需要の変化を含まない）
  const rest7 = site7 != null && items.length ? site7 - items.slice(0, 2).reduce((s, i) => s + (i.views7 ?? 0), 0) : null;
  return {
    dataAsOf,
    siteViews7: site7,
    baselineExcludingTop2: rest7 == null ? null : {
      views7: rest7,
      monthly30: Math.round((rest7 / 7) * 30),
      excluded: items.slice(0, 2).map((i) => i.path),
      label: '参考値（上位2ページを除いた直近7日 ÷ 7 × 30日。11月 forecast の正本ではない）',
    },
    items,
    lostViewsForecast: Object.fromEntries(config.pvRelay.horizons.map((h) => [h, sumLost(h)])),
    alerts,
  };
}

// ---------------------------------------------------------------------------
// 30 / 60 / 90 日 Pipeline
// ---------------------------------------------------------------------------

export function demandPipeline({ pages, seasons, radar, snapshot, today }) {
  const views = new Map((snapshot?.pageMetrics ?? []).map((r) => [r.path, num(r.views7)]));
  const items = [];
  const bucket = (d) => (d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : null);
  for (const [path, page] of pages) {
    if (page.noindex) continue;
    const season = seasons.get(path);
    const start = page.startDate ?? season?.startDate ?? null;
    if (!isDate(start)) continue;
    const d = daysBetween(today, start);
    const b = bucket(d);
    if (d < 0 || !b) continue;
    const deadline = season?.milestones.find((m) => m.key === 'publishDeadline')?.date ?? null;
    items.push({
      bucket: b, date: start, label: page.title, path, kind: 'page', views7: views.get(path) ?? null,
      phase: season?.phase ?? null, nextMilestone: season?.nextMilestone ?? null,
      action: deadline && daysBetween(today, deadline) >= 0 ? `公開・更新の締切 ${deadline} までに事実更新と内部リンク` : '需要期に入る。公式発表の反映・FAQ・内部リンク・回遊',
    });
  }
  for (const s of radar.filter((x) => x.kind === 'event-candidate' || x.kind === 'season')) {
    if (!isDate(s.startDate)) continue;
    const d = daysBetween(today, s.startDate);
    const b = bucket(Math.max(0, d));
    if (!b) continue;
    items.push({ bucket: b, date: s.startDate, label: s.label, path: s.path, kind: s.kind, views7: s.path ? views.get(s.path) ?? null : null, phase: null, nextMilestone: { label: '仕込みの目安', date: addDays(s.startDate, -28) }, action: s.action });
  }
  const order = { '0-30': 0, '31-60': 1, '61-90': 2 };
  return items.sort((a, b) => order[a.bucket] - order[b.bucket] || a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Next Winners と、PV Relay を反映した Today's Growth Batch
// ---------------------------------------------------------------------------

/** 工数の目安（計画用）。title・description だけなら S、本文・FAQ・事実更新は M、新規記事は L */
export function effortOf(action = '') {
  if (/新規|記事化/.test(action)) return 'L';
  if (/title|description|スニペット/.test(action) && !/本文|FAQ|事実|公式|内部リンク/.test(action)) return 'S';
  return 'M';
}

/**
 * 次に育てるページ：需要が伸びていて（速度）、検索の伸びしろ（Growth Engine の upside）があり、終わっていないページ。
 * 観測中のページは「観測後に」として残す（今は変えない）。
 */
export function nextWinners({ radar, forecasts, limit = 5 }) {
  const upside = new Map(forecasts.map((f) => [f.path, f]));
  return radar
    .filter((s) => s.kind === 'page' && s.components.timing !== 0)
    .map((s) => {
      const f = upside.get(s.path);
      return { ...s, upside: f?.upside ?? null, upsideBasis: f?.upsideBasis ?? null, confidenceOfUpside: f?.confidence ?? null };
    })
    // 急減中のページ（前週比 -50% 以下）は育てる対象ではなく、PV Relay で次の山へ渡す対象
    .filter((s) => !(s.viewsVelocityPct != null && s.viewsVelocityPct <= -50))
    .filter((s) => (s.upside ?? 0) > 0 || (s.components.velocity ?? 0) >= 0.5)
    .sort((a, b) => ((b.upside ?? 0) * (1 + (b.components.velocity ?? 0))) - ((a.upside ?? 0) * (1 + (a.components.velocity ?? 0))))
    .slice(0, limit);
}

/**
 * Today's Growth Batch（PV Relay 反映）。既存と同じ式「期待PV × 確度 ÷ 工数 × 緊急度」で並べる。
 * 緊急度 = 締切・季節の段階（Growth Engine）× 需要の速度（前週比+100%以上 1.5、+30%以上 1.2）× 失うPVの代替（1.3）
 * 期待PVが推定できない候補は順位付けせず、candidatesWithoutEstimate に残す（推測で埋めない）
 */
export function relayBatch({ engineBatch, winners, relay, seasons, queries = [], limit = 3 }) {
  const replacementPaths = new Set(relay.items.flatMap((i) => i.replacements.map((r) => r.path)).filter(Boolean));
  const confidenceOf = (c) => (typeof c === 'number' ? c : CONFIDENCE[c] ?? 0.25);
  const candidates = [];
  const without = [];
  const push = (c) => {
    if (c.expectedPv == null || c.expectedPv <= 0) { without.push(c); return; }
    const velocityBoost = c.velocityPct == null ? 1 : c.velocityPct >= 100 ? 1.5 : c.velocityPct >= 30 ? 1.2 : 1;
    const relayBoost = c.path && replacementPaths.has(c.path) ? 1.3 : 1;
    const phaseUrgency = (c.path && seasons.get(c.path)?.urgency) ?? 1;
    const urgency = Number((phaseUrgency * velocityBoost * relayBoost).toFixed(2));
    const hours = EFFORT_HOURS[c.effort] ?? 3;
    candidates.push({ ...c, urgency, effortHours: hours, score: Math.round((c.expectedPv * confidenceOf(c.confidence) / hours) * urgency), replacesAtRisk: relayBoost > 1 });
  };
  for (const b of engineBatch) push({ title: b.title, path: b.page, expectedPv: b.expectedPv, confidence: b.confidence, effort: effortOf(b.title), velocityPct: null, source: b.source, reason: b.reason });
  for (const w of winners) {
    if (w.observing) continue;
    push({ title: `${w.label}：${w.action}`, path: w.path, expectedPv: w.upside, confidence: w.confidenceOfUpside ?? w.confidence, effort: effortOf(w.action), velocityPct: w.viewsVelocityPct == null && w.impressionsVelocityPct == null ? null : Math.max(w.viewsVelocityPct ?? -Infinity, w.impressionsVelocityPct ?? -Infinity), source: 'demand-radar:next-winner', reason: w.upsideBasis });
  }
  // 上昇中の検索語（gscQueries の実測）：4〜20位で、伸びしろ（forecast）があり、観測中・終了でないもの
  for (const q of queries) {
    if (!q.rising || q.observing || q.components?.timing === 0 || !(q.upside > 0)) continue;
    push({ title: `${q.label}（${q.position}位・表示7日 ${q.impressions7}）：${q.action}`, path: q.path, expectedPv: q.upside, confidence: 'medium', effort: effortOf(q.action), velocityPct: q.impressions7VelocityPct, source: 'demand-radar:rising-query', reason: '今の28日の表示のまま3位相当のCTR目安に届いた場合（推定）' });
  }
  const seen = new Set();
  const ranked = candidates.sort((a, b) => b.score - a.score).filter((c) => (c.path ? (seen.has(c.path) ? false : (seen.add(c.path), true)) : true));
  return { batch: ranked.slice(0, limit), ranked, candidatesWithoutEstimate: without.slice(0, 10) };
}
