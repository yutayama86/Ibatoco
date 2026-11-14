/**
 * 44市町村ごとの「記事数 × 検索流入」レポート（あまり取り上げられていない地域を見つけ、取り上げた効果を見るため）。
 * 純粋関数（ファイルもネットワークも触らない）。読み込みと出力は scripts/area-coverage.mjs。
 *
 * 原則：
 *   - 公開中の記事だけ数える（draft・noindex・sample は数えない）
 *   - 数字は performance-snapshot の pageMetrics（ページ別）だけを使う。ページ別の期間が記録されていなければ「期間未記録」と明示する
 *   - データの無いページは null（0 で埋めない）。ページ別の行が無い記事は「データなし」として件数だけ数える
 *   - 1つの記事が複数の市町村にかかるときは、それぞれの市町村に数える（合計は記事数と一致しない）
 */

export const REGION_LABEL = { kenpoku: '県北', keno: '県央', kennan: '県南', rokko: '鹿行', kensei: '県西' };

/** 記事が「少ない」とみなす件数（これ以下を優先候補に出す） */
export const THIN_COVERAGE_MAX = 5;

/**
 * @param {{slug:string,name:string,region:string}[]} areas 44市町村
 * @param {{path:string,title:string,collection:string,pubDate:string|null,municipalities:string[],published:boolean}[]} entries 記事
 * @param {any} snapshot data/editorial/performance-snapshot.json
 */
export function buildAreaCoverage(areas, entries, snapshot) {
  const metrics = new Map((snapshot?.pageMetrics ?? []).map((row) => [row.path, row]));
  const periods = snapshot?.source?.pageLevel?.periods ?? null;
  const published = entries.filter((e) => e.published);

  const rows = areas.map((area) => {
    const own = published.filter((e) => e.municipalities.includes(area.slug));
    const pages = own.map((e) => ({ ...e, metric: metrics.get(e.path) ?? null }));
    const withData = pages.filter((p) => p.metric);
    const sum = (pick) => (withData.length ? withData.reduce((s, p) => s + (pick(p.metric) ?? 0), 0) : null);
    const top = [...withData].sort((a, b) => (b.metric.gsc?.clicks28 ?? 0) - (a.metric.gsc?.clicks28 ?? 0))[0] ?? null;
    const areaPage = metrics.get(`/area/${area.slug}/`) ?? null;
    const newest = own.map((e) => e.pubDate).filter(Boolean).sort().at(-1) ?? null;
    return {
      slug: area.slug,
      name: area.name,
      region: REGION_LABEL[area.region] ?? area.region,
      articles: own.length,
      byCollection: countBy(own.map((e) => e.collection)),
      newestPubDate: newest,
      pagesWithData: withData.length,
      clicks28: sum((m) => m.gsc?.clicks28),
      impressions28: sum((m) => m.gsc?.impressions28),
      clicks7: sum((m) => m.gsc?.clicks7),
      clicksPrev7: sum((m) => m.gsc?.clicksPrev7),
      views28: sum((m) => m.views28),
      topPage: top ? { path: top.path, title: top.title, clicks28: top.metric.gsc?.clicks28 ?? null } : null,
      areaPage: areaPage ? { clicks28: areaPage.gsc?.clicks28 ?? null, impressions28: areaPage.gsc?.impressions28 ?? null, views28: areaPage.views28 ?? null } : null,
    };
  });

  rows.sort((a, b) => a.articles - b.articles || (a.clicks28 ?? -1) - (b.clicks28 ?? -1) || a.slug.localeCompare(b.slug));
  return {
    periods,
    periodRecorded: Boolean(periods?.recent28?.end),
    totals: { municipalities: rows.length, publishedEntries: published.length, thin: rows.filter((r) => r.articles <= THIN_COVERAGE_MAX).length },
    rows,
  };
}

function countBy(list) {
  const out = {};
  for (const v of list) out[v] = (out[v] ?? 0) + 1;
  return out;
}

const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString('ja-JP'));
const delta = (a, b) => (a == null || b == null ? '—' : b === 0 ? (a === 0 ? '±0' : `+${a}`) : `${a - b >= 0 ? '+' : ''}${Math.round(((a - b) / b) * 100)}%`);

/** 人が読む Markdown */
export function areaCoverageMarkdown(report, { today } = {}) {
  const p = report.periods;
  const lines = [
    '# 44市町村の記事数と検索流入',
    '',
    `生成日：${today ?? '—'}（日本時間）`,
    '',
    report.periodRecorded
      ? `検索・閲覧の数字の期間：直近28日 ${p.recent28.start}〜${p.recent28.end}、直近7日 ${p.recent7.start}〜${p.recent7.end}（前7日 ${p.previous7.start}〜${p.previous7.end}）`
      : '**検索・閲覧の数字は集計期間が記録されていない旧データです。** 記事数は最新ですが、クリック・表示・閲覧は優先順位の根拠に使わないでください（日次同期でページ別が取れると期間が入ります）。',
    '',
    `公開中の記事 ${report.totals.publishedEntries} 本／記事が${THIN_COVERAGE_MAX}本以下の市町村：${report.totals.thin}`,
    '',
    '- 記事数は公開中（draft・noindex・sample を除く）。1本の記事が複数の市町村にかかるときは、それぞれに数える',
    '- クリック・表示はページ別の Search Console、閲覧は GA4 のページ別 Views。ページ別の行が無い記事は「データあり」に入らない（0 とは扱わない）',
    '- 「市町村ページ」は /area/〔市町村〕/ 自体の数字',
    '',
    `## 記事が少ない市町村（${THIN_COVERAGE_MAX}本以下）`,
    '',
    ...thinList(report),
    '',
    '## 全市町村（記事が少ない順）',
    '',
    '| 市町村 | 地域 | 記事 | 最新の公開日 | データあり | クリック28日 | 表示28日 | クリック7日（前週比） | 閲覧28日 | いちばんクリックされた記事 | 市町村ページ クリック28日 |',
    '|---|---|---:|---|---:|---:|---:|---:|---:|---|---:|',
    ...report.rows.map((r) => `| [${r.name}](/area/${r.slug}/) | ${r.region} | ${r.articles} | ${r.newestPubDate ?? '—'} | ${r.pagesWithData} | ${fmt(r.clicks28)} | ${fmt(r.impressions28)} | ${fmt(r.clicks7)}（${delta(r.clicks7, r.clicksPrev7)}） | ${fmt(r.views28)} | ${r.topPage ? `[${escapeCell(r.topPage.title)}](${r.topPage.path})（${fmt(r.topPage.clicks28)}）` : '—'} | ${fmt(r.areaPage?.clicks28)} |`),
    '',
  ];
  return lines.join('\n');
}

function thinList(report) {
  const thin = report.rows.filter((r) => r.articles <= THIN_COVERAGE_MAX);
  if (!thin.length) return ['なし'];
  return thin.map((r) => `- **${r.name}**（${r.region}）：${r.articles}本${r.newestPubDate ? `、最新 ${r.newestPubDate}` : ''}${r.clicks28 != null ? `、クリック28日 ${fmt(r.clicks28)}` : ''}`);
}

const escapeCell = (s) => String(s ?? '').replaceAll('|', '｜').slice(0, 40);
