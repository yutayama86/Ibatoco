#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PERF = join(ROOT, 'data/editorial/performance-snapshot.json');
const REPORT = join(ROOT, 'reports/editorial/booking-experiment.md');
const write = process.argv.includes('--write');

if (!existsSync(PERF)) {
  console.error('Booking experiment: performance snapshot missing');
  process.exit(1);
}

const performance = JSON.parse(readFileSync(PERF, 'utf8'));
const recent7 = performance.conversionDetail?.recent7 ?? {};

const aViews = Number(recent7.booking_guide_view_a ?? 0);
const bViews = Number(recent7.booking_guide_view_b ?? 0);
const aClicks = Number(recent7.outbound_booking_click_a ?? 0);
const bClicks = Number(recent7.outbound_booking_click_b ?? 0);

const minViews = 200;
const minClicks = 8;
const minLift = 0.10;

const aCtr = aViews > 0 ? aClicks / aViews : 0;
const bCtr = bViews > 0 ? bClicks / bViews : 0;
const enoughData = aViews >= minViews && bViews >= minViews && aClicks >= minClicks && bClicks >= minClicks;
const lift = aCtr > 0 ? (bCtr - aCtr) / aCtr : null;

let decision = 'collect';
let reason = '必要サンプル数に未到達。実験を継続する。';

if (enoughData) {
  if (lift !== null && lift >= minLift) {
    decision = 'b-candidate';
    reason = `BのCTRがAより${(lift * 100).toFixed(1)}%高い。勝者候補。`;
  } else if (lift !== null && lift <= -minLift) {
    decision = 'a-candidate';
    reason = `AのCTRがBより${(Math.abs(lift) * 100).toFixed(1)}%高い。勝者候補。`;
  } else {
    decision = 'inconclusive';
    reason = '差が10%未満。実験継続か、差分の再設計を検討。';
  }
}

const lines = [
  '# Booking CTA Experiment',
  '',
  `- A: ${aViews} views / ${aClicks} clicks / CTR ${(aCtr * 100).toFixed(2)}%`,
  `- B: ${bViews} views / ${bClicks} clicks / CTR ${(bCtr * 100).toFixed(2)}%`,
  `- 判定: **${decision}**`,
  `- 理由: ${reason}`,
  '',
  '## 勝者判定条件',
  '',
  `- 各variant ${minViews} views以上`,
  `- 各variant ${minClicks} clicks以上`,
  `- 相対改善率 ${Math.round(minLift * 100)}%以上`,
  '',
  '## ルール',
  '',
  '- 公式リンクの順序・表示は実験対象外。',
  '- 対象は成果リンクCTAの見せ方のみ。',
  '- 十分なデータが無い間は自動で勝者固定しない。',
  '- GA4スナップショットにA/Bイベントが入った時だけ判定する。',
  '',
];

const output = lines.join('\n');
console.log(output);
if (write) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${output}\n`, 'utf8');
}
