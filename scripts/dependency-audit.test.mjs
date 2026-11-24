import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDependencyAudit } from '../src/lib/dependency-audit.mjs';

function reportFor(severity) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  const vulnerabilities = {};
  if (severity) {
    counts[severity] = 1;
    counts.total = 1;
    vulnerabilities.picomatch = { severity };
  }
  return { auditReportVersion: 2, metadata: { vulnerabilities: counts }, vulnerabilities };
}

test('a valid report below the production threshold passes', () => {
  for (const severity of [undefined, 'info', 'low', 'moderate']) {
    assert.deepEqual(evaluateDependencyAudit({ report: reportFor(severity), exitCode: 0 }),
      { ok: true, mode: 'strict', errors: [] });
  }
});

test('high and critical findings block even if npm reports success', () => {
  for (const severity of ['high', 'critical']) {
    for (const exitCode of [0, 1]) {
      assert.equal(evaluateDependencyAudit({ report: reportFor(severity), exitCode }).ok, false);
    }
  }
});

test('registry errors, incomplete reports, unknown severities and inconsistent counts block', () => {
  const reports = [null, {}, { ...reportFor(), error: {} }, reportFor('unknown'),
    { ...reportFor(), vulnerabilities: [] }, { ...reportFor('low'), vulnerabilities: {} },
    { ...reportFor(), metadata: {} }];
  const wrongTotal = reportFor();
  wrongTotal.metadata.vulnerabilities.total = 1;
  for (const report of [...reports, wrongTotal]) {
    assert.equal(evaluateDependencyAudit({ report, exitCode: 0 }).ok, false);
  }
  for (const exitCode of [null, 1, 2]) {
    assert.equal(evaluateDependencyAudit({ report: reportFor(), exitCode }).ok, false);
  }
});
