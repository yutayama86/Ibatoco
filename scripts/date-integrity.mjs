/**
 * 暦日（YYYY-MM-DD）の1日ずれを防ぐ回帰テスト。
 *
 * ビルド環境がUTC/JST/米国時間のどれでも、公式日付と表示日付が一致することを
 * npm run check の最初に検査する。
 */
import { readFileSync } from 'node:fs';
import {
  addDateOnlyDays,
  dateOnlyFromCoercedDate,
  dateOnlyFromInstant,
  dateOnlyWeekday,
  parseDateOnly,
} from '../src/lib/date-only.js';

const errors = [];
const expect = (actual, expected, label) => {
  if (actual !== expected) errors.push(`${label}: expected ${expected}, got ${actual}`);
};
const iso = (value) => value.toISOString().slice(0, 10);
const ja = new Intl.DateTimeFormat('ja-JP', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  timeZone: 'Asia/Tokyo',
});

const kokiaStart = dateOnlyFromCoercedDate(new Date('2026-09-18'));
const kokiaEnd = dateOnlyFromCoercedDate(new Date('2026-11-03'));
expect(iso(kokiaStart), '2026-09-18', 'コキア開始日');
expect(iso(kokiaEnd), '2026-11-03', 'コキア終了日');
expect(ja.format(kokiaStart), '9月18日(金)', 'コキア開始日の表示');
expect(ja.format(kokiaEnd), '11月3日(火)', 'コキア終了日の表示');

expect(iso(parseDateOnly('2026-09-22')), '2026-09-22', 'ISO日付の解析');
expect(dateOnlyWeekday(parseDateOnly('2026-09-22')), 2, '曜日のUTC固定');
expect(iso(addDateOnlyDays(parseDateOnly('2026-09-18'), 46)), '2026-11-03', '日付加算');
expect(
  iso(dateOnlyFromInstant(new Date('2026-09-17T15:30:00Z'), 'Asia/Tokyo')),
  '2026-09-18',
  '日本時間の今日',
);

const criticalFiles = ['src/lib/happenings.ts', 'src/lib/lifecycle.ts'];
const forbidden = [
  { pattern: /\.getFullYear\s*\(/, label: 'getFullYear()' },
  { pattern: /\.getMonth\s*\(/, label: 'getMonth()' },
  { pattern: /\.getDate\s*\(/, label: 'getDate()' },
  { pattern: /\.getDay\s*\(/, label: 'getDay()' },
  { pattern: /\.setDate\s*\(/, label: 'setDate()' },
  { pattern: /T00:00:00\+09:00/, label: '手書きのJST日時変換' },
];
for (const file of criticalFiles) {
  const source = readFileSync(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) {
      errors.push(`${file}: 暦日処理に ${rule.label} を使わず date-only.js を使用してください`);
    }
  }
}

if (errors.length) {
  console.error(`日付整合性チェックで ${errors.length} 件の問題が見つかりました`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('日付整合性チェック通過：公式日付・曜日・JST表示に1日ずれなし');
