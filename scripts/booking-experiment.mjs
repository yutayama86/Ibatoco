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

// A/B のイベントがスナップショットに無いときは「0件」ではなく「未取得」。判定もしない（下の「ルール」）
const AB_KEYS = ['booking_guide_view_a', 'booking_guide_view_b', 'outbound_booking_click_a', 'outbound_booking_click_b'];
const missingKeys = AB_KEYS.filter((key) => recent7[key] == null || !Number.isFinite(Number(recent7[key])));
const hasData = missingKeys.length === 0;
const aViews = hasData ? Number(recent7.booking_guide_view_a) : 0;
const bViews = hasData ? Number(recent7.booking_guide_view_b) : 0;
const aClicks = hasData ? Number(recent7.outbound_booking_click_a) : 0;
const bClicks = hasData ? Number(recent7.outbound_booking_click_b) : 0;

const minViews = 200;
const minClicks = 8;
const minLift = 0.10;
const minZ = 1.96;

const aCtr = aViews > 0 ? aClicks / aViews : 0;
const bCtr = bViews > 0 ? bClicks / bViews : 0;
const enoughData = aViews >= minViews && bViews >= minViews && aClicks >= minClicks && bClicks >= minClicks;
const lift = aCtr > 0 ? (bCtr - aCtr) / aCtr : null;
const pooled = (aClicks + bClicks) / Math.max(1, aViews + bViews);
const standardError = Math.sqrt(Math.max(0, pooled * (1 - pooled) * ((1 / Math.max(1, aViews)) + (1 / Math.max(1, bViews)))));
const zScore = standardError > 0 ? (bCtr - aCtr) / standardError : 0;
const confidenceQualified = Math.abs(zScore) >= minZ;

let decision = 'collect';
let reason = '必要サンプル数に未到達。実験を継続する。';

if (!hasData) {
  decision = 'no-data';
  reason = `GA4スナップショット（conversionDetail.recent7）に A/B のイベントが無い（${missingKeys.join('・')}）。実験が動いているか、取得の対象に入っているかを先に確認する。`;
} else if (enoughData) {
  if (!confidenceQualified) {
    decision = 'inconclusive';
    reason = `サンプル数は満たしたが統計的な差が弱い（|z|=${Math.abs(zScore).toFixed(2)} < ${minZ}）。実験継続。`;
  } else if (lift !== null && lift >= minLift) {
    decision = 'b-candidate';
    reason = `BのCTRがAより${(lift * 100).toFixed(1)}%高く、|z|=${Math.abs(zScore).toFixed(2)}。勝者候補。`;
  } else if (lift !== null && lift <= -minLift) {
    decision = 'a-candidate';
    reason = `AのCTRがBより${(Math.abs(lift) * 100).toFixed(1)}%高く、|z|=${Math.abs(zScore).toFixed(2)}。勝者候補。`;
  } else {
    decision = 'inconclusive';
    reason = '差が10%未満。実験継続か、差分の再設計を検討。';
  }
}

const lines = [
  '# Booking CTA Experiment',
  '',
  ...(hasData ? [
    `- A: ${aViews} views / ${aClicks} clicks / CTR ${(aCtr * 100).toFixed(2)}%`,
    `- B: ${bViews} views / ${bClicks} clicks / CTR ${(bCtr * 100).toFixed(2)}%`,
  ] : ['- A・B: **未取得**（0件ではない）']),
  `- 判定: **${decision}**`,
  `- z-score: **${hasData ? zScore.toFixed(2) : '未計算'}**`,
  `- 理由: ${reason}`,
  '',
  '## 勝者判定条件',
  '',
  `- 各variant ${minViews} views以上`,
  `- 各variant ${minClicks} clicks以上`,
  `- 相対改善率 ${Math.round(minLift * 100)}%以上`,
  `- |z-score| ${minZ}以上`,
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
