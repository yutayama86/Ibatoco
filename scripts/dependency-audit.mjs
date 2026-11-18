#!/usr/bin/env node
/** Preserve the complete npm findings; accept only a reviewed, expiring exception. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { todayDateOnlyString } from '../src/lib/date-only.js';
import { evaluateDependencyAudit } from '../src/lib/dependency-audit.mjs';

const audit = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], {
  encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024,
});
let report;
try { report = JSON.parse(audit.stdout); } catch { report = null; }
const config = 'data/security/picomatch-risk-review.json';
let rule = null, lockfile = null;
try { if (existsSync(config)) rule = JSON.parse(readFileSync(config, 'utf8')); } catch { /* fail closed below */ }
try { lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8')); } catch { /* fail closed below */ }
const evidence = {};
for (const path of ['package-lock.json', 'worker/index.js', 'wrangler.jsonc', 'astro.config.mjs']) {
  if (existsSync(path)) evidence[path] = createHash('sha256').update(readFileSync(path)).digest('hex');
}
const evaluation = evaluateDependencyAudit({ report, exitCode: audit.status, rule, evidence, lockfile,
  today: todayDateOnlyString(), eventName: process.env.GITHUB_EVENT_NAME, inActions: process.env.GITHUB_ACTIONS === 'true' });
mkdirSync('reports/security', { recursive: true });
writeFileSync('reports/security/dependency-audit.json', JSON.stringify({ checkedAt: new Date().toISOString(),
  originalNpmExitCode: audit.status, originalNpmReport: report, evaluation, review: rule }, null, 2) + '\n');
console.log(`npm production audit: ${JSON.stringify(report?.metadata?.vulnerabilities ?? 'unavailable')}`);
console.log(`Gate: ${evaluation.mode}; original findings retained in reports/security/dependency-audit.json`);
if (evaluation.mode !== 'strict' && evaluation.ok) {
  console.warn(`::warning title=未修正のビルド依存::${rule.advisory} は未修正です。${rule.expiresOn} 00:00 JSTで自動失効。mode=${evaluation.mode}`);
  if (evaluation.mode === 'proposal-ci-only') console.warn('PR検証用の提案です。オーナー承認前のmain/定期実行/公開には使えません。');
}
for (const error of evaluation.errors) console.error(`::error title=Dependency security audit::${error}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  `\n## Dependency audit\n- Gate: ${evaluation.mode}\n- Original npm findings: ${JSON.stringify(report?.metadata?.vulnerabilities ?? null)}\n- Advisory remains unfixed: ${rule?.advisory ?? 'none'}\n- Expiry: ${rule?.expiresOn ?? 'none'} 00:00 JST\n${evaluation.errors.map((e) => `- BLOCKED: ${e}`).join('\n')}\n`);
if (!evaluation.ok) process.exitCode = 1;
