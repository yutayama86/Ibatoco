/**
 * GA4/GSC スナップショットの鮮度を報告する（Issue #545）。
 *
 * 実行：node scripts/analytics-freshness.mjs [--strict] [--json]
 *   既定は報告だけ（終了コード0）。CI では ::warning として PR の画面に出す。
 *   --strict は stale / missing で失敗にする（日次の監視など、止めたい場面で使う）。
 * 記事の公開をデータの遅れで止めないため、npm run verify では既定（報告だけ）で使う。
 * 復旧手順は docs/GA4_GSC_DAILY_SYNC.md「数字が止まったとき」。
 */
import { existsSync, readFileSync } from 'node:fs';
import { analyticsFreshness, analyticsFreshnessMessages, pageLevelFreshness, pageLevelFreshnessMessage } from '../src/lib/analytics-freshness.mjs';
import { todayJst } from '../src/lib/growth-engine.mjs';

const SNAPSHOT = 'data/editorial/performance-snapshot.json';
const args = process.argv.slice(2);
const snapshot = existsSync(SNAPSHOT) ? JSON.parse(readFileSync(SNAPSHOT, 'utf8')) : null;
const result = analyticsFreshness(snapshot, todayJst());

if (args.includes('--json')) {
  console.log(JSON.stringify({ ...result, pageLevel: pageLevelFreshness(snapshot, todayJst()) }, null, 2));
} else if (result.status === 'fresh') {
  console.log(`ANALYTICS_FRESHNESS_OK: GA4 ${result.sources.ga4.latestConfirmedDate} / GSC ${result.sources.gsc.latestConfirmedDate}（本来の確定日 ${result.expectedConfirmedDate}）`);
} else {
  const fix = '同期ブランチ bot/google-analytics-daily の PR が開いているか確認してください（docs/GA4_GSC_DAILY_SYNC.md「数字が止まったとき」）。';
  for (const message of analyticsFreshnessMessages(result)) {
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=GA4/GSC の鮮度（P0）::${message}${fix}`);
    else console.warn(`[P0] ${message}${fix}`);
  }
}
// ページ別・検索語別の鮮度は報告だけ（--strict でも止めない。サイト全体の確定値とは別に扱う）
const pageLevel = pageLevelFreshness(snapshot, todayJst());
const pageLevelMessage = pageLevelFreshnessMessage(pageLevel);
if (!args.includes('--json')) {
  if (!pageLevelMessage) console.log(`PAGE_LEVEL_FRESHNESS_OK: 直近28日 〜${pageLevel.end}`);
  else if (process.env.GITHUB_ACTIONS) console.log(`::warning title=ページ別データの鮮度::${pageLevelMessage}`);
  else console.warn(`[P1] ${pageLevelMessage}`);
}
if (args.includes('--strict') && result.status !== 'fresh') process.exit(1);
