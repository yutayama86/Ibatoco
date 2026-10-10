/**
 * GA4 の日別実績（performance-snapshot.json の windows.ga4.daily）の取り込みと検査。
 *
 *   npm run ga4:daily -- --input <file.json>  … Windsor.ai の取得結果を日付で結合して取り込む（直近35日・確定日まで・ゼロ埋めしない）
 *       入力：{ "source": "...", "fetchedAt": "...", "confirmedThrough": "YYYY-MM-DD",
 *               "totals":   [{ "date", "screen_page_views", "sessions", "engaged_sessions" }],
 *               "channels": [{ "date", "session_default_channel_group", "screen_page_views" }] }
 *       （日別の行が既にあるときは "daily": [{ date, views, sessions, engagedSessions, organicViews }] でもよい）
 *   node scripts/ga4-daily.mjs --check        … 形式の検査（npm run verify）。日別が無ければ何もしない
 *   node scripts/ga4-daily.mjs                 … 収録状況を表示
 *
 * GA4 の生データ（windows.ga4 の他の値）と measurement-incidents 台帳は変えない。src/lib/ga4-daily.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDaily, dailyCoverage, joinWindsorDaily, mergeDaily } from '../src/lib/ga4-daily.mjs';

const ROOT = process.cwd();
const SNAPSHOT = join(ROOT, 'data/editorial/performance-snapshot.json');
const INCIDENTS = join(ROOT, 'data/editorial/measurement-incidents.json');
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

const raw = readFileSync(SNAPSHOT, 'utf8');
const snapshot = JSON.parse(raw);
const incidents = existsSync(INCIDENTS) ? JSON.parse(readFileSync(INCIDENTS, 'utf8')) : null;
const ga4 = snapshot.windows?.ga4 ?? {};

if (args.includes('--input')) {
  const input = JSON.parse(readFileSync(arg('input'), 'utf8'));
  const incoming = Array.isArray(input.daily) ? input.daily : joinWindsorDaily({ totals: input.totals ?? [], channels: input.channels ?? [] });
  const confirmedThrough = input.confirmedThrough ?? ga4.dailyMeta?.confirmedThrough ?? null;
  const daily = mergeDaily({ existing: ga4.daily ?? [], incoming, confirmedThrough, incidents });
  const errors = checkDaily(daily, { confirmedThrough, incidents });
  if (errors.length) { for (const e of errors) console.error(`  [error] ${e}`); process.exit(1); }
  const coverage = dailyCoverage(daily, confirmedThrough);
  snapshot.windows.ga4.daily = daily;
  snapshot.windows.ga4.dailyMeta = {
    source: input.source ?? ga4.dailyMeta?.source ?? null,
    fetchedAt: input.fetchedAt ?? null,
    confirmedThrough: coverage.to,
    organicDefinition: 'session_default_channel_group = "Organic Search" の screen_page_views（Organic sessions ではない）',
    incidentHandling: '計測障害の日（incident）は実測値のまま持ち、参考計算から外す（data/editorial/measurement-incidents.json）',
    coverage: { from: coverage.from, to: coverage.to, rows: coverage.rows, expectedDays: coverage.expectedDays, missingDates: coverage.missingDates },
  };
  // 元のファイルの書式（1行 or 2スペースの字下げ）を保つ
  const minified = !raw.trimEnd().includes('\n');
  writeFileSync(SNAPSHOT, `${minified ? JSON.stringify(snapshot) : JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`windows.ga4.daily：${daily.length} 日（${coverage.from}〜${coverage.to}、未収録 ${coverage.missingDates.length} 日）`);
  process.exit(0);
}

const daily = ga4.daily;
if (daily == null) {
  console.log('windows.ga4.daily はまだ無い（npm run ga4:daily -- --input <file.json>）');
  process.exit(0);
}
const confirmedThrough = ga4.dailyMeta?.confirmedThrough ?? null;
const errors = checkDaily(daily, { confirmedThrough, incidents });
const coverage = dailyCoverage(daily, confirmedThrough);
const line = `GA4 日別：${coverage.rows} 日（${coverage.from}〜${coverage.to}・未収録 ${coverage.missingDates.length} 日・障害日 ${daily.filter((r) => r.incident).length} 日）`;
if (args.includes('--check')) {
  if (errors.length) { for (const e of errors) console.error(`  [error] windows.ga4.daily：${e}`); process.exit(1); }
  console.log(`${line} の形式 OK`);
  process.exit(0);
}
console.log(line);
for (const r of daily) console.log(`  ${r.date} views ${r.views} sessions ${r.sessions} engaged ${r.engagedSessions} organic ${r.organicViews ?? '—'}${r.incident ? `（障害日 ${r.incident}）` : ''}`);
if (coverage.missingDates.length) console.log(`  未収録：${coverage.missingDates.join('・')}`);
process.exit(errors.length ? 1 : 0);
