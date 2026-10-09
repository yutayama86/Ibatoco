/**
 * Google Trends（proxy）の取り込みと検査。
 *
 *   npm run trends:import -- <CSV…>   … Trends の「人気度の動向」CSV（週単位・最大5語・基準語「土浦花火」入り）を
 *                                      data/editorial/search-trends.json に変換する（値はそのまま、季節性を計算）
 *   node scripts/search-trends.mjs --check … 形式の検査（npm run verify）。ファイルが無ければ何もしない
 *   node scripts/search-trends.mjs         … 要約を表示
 *
 * Trends の値は検索需要の相対値で、月間検索ボリュームではない（basis: proxy）。docs/GROWTH_ENGINE.md の「Search Trends」
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildTrendsData, parseTrendsCsv, trendsSummary } from '../src/lib/search-trends.mjs';
import { todayJst } from '../src/lib/growth-engine.mjs';
import { loadContentPages } from './lib/content-pages.mjs';

const ROOT = process.cwd();
const FILE = join(ROOT, 'data/editorial/search-trends.json');
const config = JSON.parse(readFileSync(join(ROOT, 'data/editorial/demand-radar.json'), 'utf8'));
const ANCHOR = '土浦花火';
const args = process.argv.slice(2);
const today = todayJst();

export function checkTrendsData(data) {
  const errors = [];
  const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (data.basis !== 'proxy') errors.push('basis は "proxy"（Trends は月間検索ボリュームではない）');
  if (!data.anchor) errors.push('anchor（基準語）が無い');
  if (!Array.isArray(data.series) || !data.series.length) errors.push('series が空');
  for (const s of data.series ?? []) {
    if (!s.keyword) errors.push('keyword の無い系列がある');
    if (s.anchor !== data.anchor) errors.push(`${s.keyword}：anchor が ${data.anchor} ではない`);
    if (!s.comparedWith?.includes(data.anchor) && s.keyword !== data.anchor) errors.push(`${s.keyword}：基準語と同じ比較で取っていない（比較をまたいで比べられない）`);
    for (const p of s.points ?? []) {
      if (!isDate(p.date)) { errors.push(`${s.keyword}：日付が YYYY-MM-DD でない（${p.date}）`); break; }
      if (p.value != null && (!Number.isFinite(p.value) || p.value < 0 || p.value > 100)) { errors.push(`${s.keyword}：値が0〜100でない（${p.date} ${p.value}）`); break; }
      if (p.belowOne && p.value != null) { errors.push(`${s.keyword}：「1 未満」に数値が入っている（${p.date}）`); break; }
    }
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (args[0] === '--import') {
    const files = args.slice(1);
    if (!files.length) { console.error('使い方：npm run trends:import -- <CSV…>'); process.exit(1); }
    const groups = files.map((file) => parseTrendsCsv(readFileSync(file, 'utf8')));
    const keywords = Object.fromEntries(Object.entries(config.trendsKeywords ?? {}).filter(([k]) => k !== 'about'));
    const data = buildTrendsData({ groups, anchor: ANCHOR, keywords, fetchedAt: today });
    const errors = checkTrendsData(data);
    if (errors.length) { for (const e of errors) console.error(`  [error] ${e}`); process.exit(1); }
    writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`search-trends.json を書きました：${data.series.length} 語・季節 ${data.seasonality.length} 件（比較 ${groups.length} 件）`);
  }
  if (!existsSync(FILE)) { console.log('search-trends.json はまだ無い（npm run trends:import -- <CSV…>）'); process.exit(0); }
  const data = JSON.parse(readFileSync(FILE, 'utf8'));
  const errors = checkTrendsData(data);
  if (args[0] === '--check') {
    if (errors.length) { for (const e of errors) console.error(`  [error] search-trends.json：${e}`); process.exit(1); }
    console.log(`Search Trends：${data.series.length} 語（${data.updatedAt} 取得・proxy）の形式 OK`);
    process.exit(0);
  }
  const summary = trendsSummary(data, { pages: loadContentPages(ROOT), today });
  console.log(`Search Trends（proxy・${data.updatedAt}・基準語「${data.anchor}」の5年最大＝100）`);
  for (const s of summary) {
    console.log(`  ${s.keyword}：${s.peakRelativeToAnchor} ・例年の山 ${s.typicalPeakMonthDay ?? '—'}（${s.seasonsMeasured}年）・立ち上がり→山 ${s.typicalRiseToPeakDays ?? '—'}日・今年の山 ${s.expectedPeakWeek ?? '—'}週・立ち上がり ${s.expectedRise ?? '—'}`);
  }
  process.exit(errors.length ? 1 : 0);
}
