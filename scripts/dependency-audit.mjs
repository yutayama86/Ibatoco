#!/usr/bin/env node
/** Preserve the complete npm findings and enforce the strict production threshold. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { evaluateDependencyAudit } from '../src/lib/dependency-audit.mjs';

const audit = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], {
  encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024,
});
let report;
try { report = JSON.parse(audit.stdout); } catch { report = null; }
const evaluation = evaluateDependencyAudit({ report, exitCode: audit.status });
mkdirSync('reports/security', { recursive: true });
writeFileSync('reports/security/dependency-audit.json', JSON.stringify({ checkedAt: new Date().toISOString(),
  originalNpmExitCode: audit.status, originalNpmReport: report, evaluation }, null, 2) + '\n');
console.log(`npm production audit: ${JSON.stringify(report?.metadata?.vulnerabilities ?? 'unavailable')}`);
console.log(`Gate: ${evaluation.mode}; original findings retained in reports/security/dependency-audit.json`);
for (const error of evaluation.errors) console.error(`::error title=Dependency security audit::${error}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  `\n## Dependency audit\n- Gate: ${evaluation.mode}\n- Original npm findings: ${JSON.stringify(report?.metadata?.vulnerabilities ?? null)}\n${evaluation.errors.map((e) => `- BLOCKED: ${e}`).join('\n')}\n`);
if (!evaluation.ok) process.exitCode = 1;
