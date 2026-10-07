/**
 * Annual Learning の台帳（data/editorial/seasonal-learning.json）を記事から同期する。
 *
 * 実行：npm run learning:sync        … 差分を表示するだけ
 *       npm run learning:sync -- --write … 台帳を書き換える（実測の項目は上書きしない）
 * 実測の項目（demandStartDate・impressionsPeakDate・peakViews など）は、日次の Growth OS が GA4/GSC の実測で埋める。
 * 書き方は docs/GROWTH_ENGINE.md の「Annual Learning」。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContentPages } from './lib/content-pages.mjs';
import { aggregateLearning, syncLearningRecords } from '../src/lib/seasonal-learning.mjs';
import { todayJst } from '../src/lib/growth-engine.mjs';

const ROOT = process.cwd();
const PATH = join(ROOT, 'data/editorial/seasonal-learning.json');
const config = JSON.parse(readFileSync(join(ROOT, 'data/editorial/demand-radar.json'), 'utf8'));
const current = existsSync(PATH) ? JSON.parse(readFileSync(PATH, 'utf8')) : { schemaVersion: 1, records: [] };
const records = syncLearningRecords({ records: current.records ?? [], pages: loadContentPages(ROOT), config });
const before = new Set((current.records ?? []).map((r) => r.path));
const added = records.filter((r) => !before.has(r.path));
const next = {
  schemaVersion: 1,
  updatedAt: todayJst(),
  about: '季節記事の年次実測（Annual Learning）。構造の項目は記事から同期（npm run learning:sync -- --write）、実測の項目は GA4/GSC の実測で埋める（推測しない・null のまま可）。同カテゴリ2件以上の実測で平均を学習。docs/GROWTH_ENGINE.md',
  records,
};
if (process.argv.includes('--write')) writeFileSync(PATH, `${JSON.stringify(next, null, 2)}\n`);
const learned = aggregateLearning(records, config);
console.log(`Annual Learning：記事 ${records.length} 件（新規 ${added.length} 件）・実測あり ${records.filter((r) => r.measuredAt).length} 件`);
for (const c of learned) {
  const peak = c.impressionsPeakLeadAvg != null ? `・検索表示のピーク 開催の平均${c.impressionsPeakLeadAvg}日前（${c.impressionsPeakSamples}件）` : '';
  console.log(`  ${c.label}：${c.records} 件・実測 ${c.measured} 件・需要の立ち上がり ${c.leadDaysAvg != null ? `平均${c.leadDaysAvg}日前` : `データ不足（${c.leadDaysSamples}件）`}${peak}`);
}
if (!process.argv.includes('--write') && added.length) console.log('台帳に反映するには --write を付ける');
