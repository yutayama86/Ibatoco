/**
 * 本番デプロイの前に、計測データ（GA4/GSC の確定値）の古さを知らせる。**デプロイは止めない。**
 *
 *   node scripts/deploy-preflight.mjs   … Deploy production（.github/workflows/deploy.yml）が実行する
 *
 * 2026-10-27 まで、06:30 の定期デプロイは「当日の確定指標」が無いと止まっていた。GA4/GSC 日次同期が
 * PR を作れずに失敗し続けたため、日付で切り替わる表示（終了・開催中・月別一覧）まで更新されなくなった。
 * 計測の失敗とサイトの日付更新を分け、計測が古いときは警告（::warning と Job Summary）だけを出す。
 *
 * このスクリプトは計測データを作らない・書き換えない（読むだけ）。古いデータから新しい数値を作らないことは、
 * レポート側（operator-os のブロッカー・scripts/lib/report-data.mjs の鮮度）が担う。
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** 確定値の取得から何時間たったら「古い」と知らせるか（日次同期は毎日 05:30。1回の失敗は許し、2日目から知らせる） */
export const STALE_AFTER_HOURS = 48;

/**
 * @param {any} snapshot data/editorial/performance-snapshot.json の中身
 * @param {number} nowMs 現在時刻（ミリ秒）
 * @returns {{ level: 'ok' | 'stale' | 'unknown', ageHours: number | null, asOf: string | null, source: string | null, message: string }}
 */
export function analyticsFreshness(snapshot, nowMs) {
  const asOf = typeof snapshot?.asOf === 'string' ? snapshot.asOf : null;
  const source = snapshot?.source?.status ?? null;
  const confirmedAt = Date.parse(snapshot?.source?.lastConfirmedAt ?? '');
  if (!Number.isFinite(confirmedAt)) {
    return { level: 'unknown', ageHours: null, asOf, source, message: `計測データの確定時刻が読めない（asOf: ${asOf ?? '不明'}）。数値は未取得として扱う` };
  }
  const ageHours = Math.floor((nowMs - confirmedAt) / 3600000);
  if (ageHours < 0) {
    return { level: 'unknown', ageHours, asOf, source, message: `計測データの確定時刻が未来になっている（${snapshot.source.lastConfirmedAt}）` };
  }
  if (ageHours > STALE_AFTER_HOURS) {
    return {
      level: 'stale', ageHours, asOf, source,
      message: `計測データが古い：最後の確定は ${Math.floor(ageHours / 24)}日前（asOf ${asOf ?? '不明'}・${source ?? '出典不明'}）。サイトは公開するが、数値は更新されていない。GA4/GSC 日次同期（Read-only GA4 and GSC）を確認する`,
    };
  }
  return { level: 'ok', ageHours, asOf, source, message: `計測データ：asOf ${asOf}（確定から ${ageHours} 時間・${source ?? '出典不明'}）` };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let result;
  try {
    const snapshot = JSON.parse(readFileSync('data/editorial/performance-snapshot.json', 'utf8'));
    result = analyticsFreshness(snapshot, Date.now());
  } catch (error) {
    result = { level: 'unknown', message: `performance-snapshot.json を読めない（${error.message}）。数値は未取得として扱う` };
  }
  if (result.level === 'ok') console.log(result.message);
  else console.log(`::warning title=計測データ::${result.message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 計測データの鮮度\n\n- ${result.level}: ${result.message}\n- デプロイはこの結果で止めない（計測の失敗とサイトの日付更新を分けている）\n\n`);
  }
  // 計測が古くても、読めなくても、デプロイは続ける（常に 0 で終わる）
  process.exit(0);
}
