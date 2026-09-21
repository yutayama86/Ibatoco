import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const target = JSON.parse(readFileSync(join(ROOT, 'data/editorial/growth-targets.json'), 'utf8'));
const performance = JSON.parse(readFileSync(join(ROOT, 'data/editorial/performance-snapshot.json'), 'utf8'));
const primary = target.primary;
const gsc = performance.windows?.gsc;

if (!gsc?.recent28 || !gsc?.recent7) {
  console.error('GSC recent28/recent7 data is required for growth target status');
  process.exit(1);
}

const current = Number(gsc.recent28.impressions ?? 0);
const recent7 = Number(gsc.recent7.impressions ?? 0);
const targetValue = Number(primary.target);
const progress = targetValue > 0 ? current / targetValue : 0;
const gap = Math.max(0, targetValue - current);
const daily7 = recent7 / 7;
const runRate28 = daily7 * primary.windowDays;
const requiredDaily = targetValue / primary.windowDays;
const uplift = daily7 > 0 ? requiredDaily / daily7 - 1 : null;

const status = current >= targetValue
  ? 'target-met'
  : runRate28 >= targetValue
    ? 'on-pace'
    : 'below-pace';

const lines = [
  `# Growth Target｜${performance.asOf ?? 'unknown'}`,
  '',
  `- Primary KPI: ${primary.name}`,
  `- Rolling ${primary.windowDays}d impressions: ${current.toLocaleString('ja-JP')} / ${targetValue.toLocaleString('ja-JP')} (${(progress * 100).toFixed(1)}%)`,
  `- Gap: ${gap.toLocaleString('ja-JP')}`,
  `- Recent 7d impressions: ${recent7.toLocaleString('ja-JP')} (${daily7.toFixed(0)}/day)`,
  `- 28d run-rate from recent 7d: ${Math.round(runRate28).toLocaleString('ja-JP')}`,
  `- Required daily average: ${requiredDaily.toFixed(0)}/day`,
  `- Status: ${status}`,
  uplift == null ? '- Required uplift: unknown' : `- Required uplift vs recent 7d daily average: ${(uplift * 100).toFixed(1)}%`,
  '',
  'Guardrail: impressions alone are not success. Check clicks, CTR, position, organic sessions and business outcomes together.',
  ''
];

mkdirSync(join(ROOT, 'reports/editorial'), { recursive: true });
writeFileSync(join(ROOT, 'reports/editorial/growth-target.md'), lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
