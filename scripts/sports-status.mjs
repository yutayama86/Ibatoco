/**
 * 試合の更新ループで「次に何をするか」を出す。
 *
 *   npm run sports:status                      … 今日（日本時間）を基準に
 *   npm run sports:status -- --date 2026-09-14 … 基準日を指定
 *   npm run sports:status -- --strict          … 結果の入れ忘れがあれば終了コード1
 *
 * データは src/data/sports/matches/*.json。ここは読むだけで、書き換えない。
 * 事実を埋めるのは人（または公式情報を確認した担当）で、このスクリプトは不足を知らせるだけ。
 * 各段階でやることは docs/SPORTS_MATCHDAY_LOOP.md。
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { todayDateOnlyString } from '../src/lib/date-only.js';

const DIR = 'src/data/sports/matches';
const args = process.argv.slice(2);
const argOf = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const strict = args.includes('--strict');

const today = argOf('date') ?? todayDateOnlyString();
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error(`--date は YYYY-MM-DD で指定してください: ${today}`);
  process.exit(1);
}

/** a − b の日数 */
const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

/** 試合までの日数ごとの段階。上から順に当てはめる */
const STAGES = [
  { max: 0, name: '当日', todo: '最終案内。開場・交通・天候・当日券を公式で再確認し、guide.verifiedAt を今日にする' },
  { max: 1, name: '前日', todo: '交通・天候・チケット販売状況を再確認し、guide.verifiedAt を更新する' },
  { max: 3, name: '3日前', todo: 'イベント・グルメ・交通情報を guide に足す。ホームゲームは matchDay（モデルコース）も作る' },
  { max: 7, name: '7日前', todo: '日時・会場・大会・中継・チケットを公式で確認し、guide の骨組みを作る' },
];

/** 3日前までにそろえたい節。アウェイは遠征に必要な最小限 */
const REQUIRED_SECTIONS = {
  home: ['match', 'ticket', 'access', 'parking', 'gourmet', 'event'],
  away: ['match', 'ticket', 'access'],
  neutral: ['match', 'ticket', 'access'],
};

let problems = 0;
const files = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
console.log(`試合データの状況（基準日 ${today}）`);

for (const file of files) {
  const data = JSON.parse(await readFile(join(DIR, file), 'utf8'));
  const matches = [...data.matches].sort((a, b) => a.date.localeCompare(b.date));
  const age = dayDiff(today, data.updatedAt);
  console.log(`\n■ ${data.team}（updatedAt ${data.updatedAt}${age > 0 ? `・${age}日前` : '・今日'}）`);

  // 翌日の段階：終わったはずの試合に結果が入っていない
  for (const m of matches.filter((x) => x.status === 'scheduled' && x.date < today)) {
    problems += 1;
    console.log(`  ✗ 結果待ち ${m.date} vs ${m.opponent}：公式の結果を確認し、status を finished、score（PK戦なら pk も）、recap を入れる`);
  }

  const next = matches.find((m) => m.status === 'scheduled' && m.date >= today);
  if (!next) {
    console.log('  次の試合がデータにありません。公式の年間日程で確定した試合を追加してください');
    continue;
  }

  const days = dayDiff(next.date, today);
  const stage = STAGES.find((s) => days <= s.max);
  console.log(`  次の試合：${next.date}（あと${days}日）${next.competition}${next.round ? ` ${next.round}` : ''} vs ${next.opponent}（${next.homeAway}）`);
  console.log(`  段階：${stage ? `${stage.name} → ${stage.todo}` : '8日以上前 → 日程が変わっていないかの確認だけでよい'}`);

  const missing = [];
  if (days <= 7) {
    if (!next.kickoff) missing.push('kickoff');
    if (!next.venue) missing.push('venue');
    if (!next.guide) missing.push('guide');
  }
  if (days <= 3 && next.guide) {
    const keys = new Set(next.guide.sections.map((s) => s.key));
    for (const key of REQUIRED_SECTIONS[next.homeAway]) {
      if (!keys.has(key)) missing.push(`guide.${key}`);
    }
    if (next.homeAway === 'home' && !next.matchDay) missing.push('matchDay');
  }
  if (days <= 1 && next.guide && dayDiff(today, next.guide.verifiedAt) > 1) {
    missing.push(`guide.verifiedAt（${next.guide.verifiedAt}のまま。前日以降に再確認）`);
  }
  if (days === 0 && next.guide && next.guide.verifiedAt !== today) {
    missing.push('guide.verifiedAt を今日に');
  }
  console.log(`  不足：${missing.length > 0 ? missing.join(' / ') : 'なし'}`);

  const unverified = next.guide?.unverified?.length ?? 0;
  if (unverified > 0) {
    console.log(`  未確認として残している項目：${unverified}件（公式で確認できたら guide の節へ移し、ここから消す）`);
  }

  const later = matches.filter((m) => m.status === 'scheduled' && m.date > next.date);
  if (later.length < 3) {
    console.log(`  今後の試合が${later.length}件しかありません。公式の日程で確定した試合を追加してください`);
  }
}

console.log('\n更新したら updatedAt を今日にし、npm run verify → 作業ブランチでコミット → PR → CI確認 → 承認後に main へマージ（本番公開は GitHub Actions）の順で。');
if (strict && problems > 0) process.exit(1);
