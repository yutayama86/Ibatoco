import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDependencyAudit, PICOMATCH_ADVISORY } from '../src/lib/dependency-audit.mjs';

const sha = 'a'.repeat(64);
function input() {
  const evidence = Object.fromEntries(['package-lock.json', 'worker/index.js', 'wrangler.jsonc', 'astro.config.mjs'].map((p) => [p, sha]));
  return {
    today: '2026-11-18', exitCode: 1, eventName: 'push', inActions: true,
    report: { auditReportVersion: 2, metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 2, critical: 0 } }, vulnerabilities: {
      picomatch: { severity: 'high', nodes: ['node_modules/picomatch'], via: [{ name: 'picomatch', dependency: 'picomatch',
        url: `https://github.com/advisories/${PICOMATCH_ADVISORY}`, range: '<=4.0.7', severity: 'high' }] },
      astro: { severity: 'high', via: ['picomatch'] },
    } },
    rule: { advisory: PICOMATCH_ADVISORY, status: 'approved', approvedBy: 'test-owner', approvedAt: '2026-11-18T09:00:00+09:00',
      reviewedOn: '2026-11-18', expiresOn: '2026-11-21', exploitFixed: false, evidenceSha256: { ...evidence } },
    evidence, lockfile: { packages: { 'node_modules/picomatch': { version: '4.0.7' } } },
  };
}
test('strict audit passes without using a stale or missing exception when no blocking findings exist', () => {
  const x = input(); x.report.vulnerabilities = {}; x.report.metadata.vulnerabilities.high = 0; x.exitCode = 0; x.rule = null;
  assert.deepEqual(evaluateDependencyAudit(x), { ok: true, mode: 'strict', errors: [] });
});
test('one precisely identified advisory and its transitive effects can be temporarily accepted with matching evidence', () => {
  const result = evaluateDependencyAudit(input());
  assert.equal(result.ok, true); assert.equal(result.mode, 'temporary-risk-accepted');
});
test('proposed exception can validate PR code but can never authorize main, scheduled or local runs', () => {
  const x = input(); x.rule.status = 'pending-owner-approval'; delete x.rule.approvedBy; delete x.rule.approvedAt;
  for (const eventName of ['push', 'schedule', 'workflow_dispatch', undefined]) {
    assert.equal(evaluateDependencyAudit({ ...x, eventName }).ok, false);
  }
  assert.equal(evaluateDependencyAudit({ ...x, eventName: 'pull_request', inActions: false }).ok, false);
  const review = evaluateDependencyAudit({ ...x, eventName: 'pull_request' });
  assert.equal(review.ok, true); assert.equal(review.mode, 'proposal-ci-only');
});
test('expire at the Japanese calendar boundary and reject future reviews or more than seven days', () => {
  const x = input();
  assert.equal(evaluateDependencyAudit({ ...x, today: '2026-11-20' }).ok, true);
  assert.equal(evaluateDependencyAudit({ ...x, today: '2026-11-21' }).ok, false);
  assert.equal(evaluateDependencyAudit({ ...x, today: '2026-11-17' }).ok, false);
  x.rule.expiresOn = '2026-12-01'; assert.equal(evaluateDependencyAudit(x).ok, false);
});
test('new direct or transitive advisories are never concealed by the accepted one', () => {
  const x = input();
  x.report.vulnerabilities.picomatch.via.push({ name: 'picomatch', dependency: 'picomatch', url: 'https://github.com/advisories/GHSA-new', severity: 'high', range: '<=4.0.7' });
  assert.equal(evaluateDependencyAudit(x).ok, false);
  const y = input(); y.report.vulnerabilities.astro.via.push('another-package');
  assert.equal(evaluateDependencyAudit(y).ok, false);
});
test('critical findings always block, including an escalation of the accepted advisory', () => {
  const x = input(); x.report.vulnerabilities.picomatch.severity = 'critical';
  x.report.metadata.vulnerabilities.high = 1; x.report.metadata.vulnerabilities.critical = 1;
  assert.equal(evaluateDependencyAudit(x).ok, false);
});
test('empty, partial, cyclic, malformed and network failure reports fail closed', () => {
  for (const edit of [
    (x) => { x.report = null; }, (x) => { x.exitCode = 2; }, (x) => { x.exitCode = null; },
    (x) => { x.report.error = { message: 'registry unavailable' }; },
    (x) => { x.report.vulnerabilities = {}; },
    (x) => { x.report.vulnerabilities.picomatch.via = []; },
    (x) => { x.report.vulnerabilities.picomatch.via = ['astro']; },
  ]) { const x = input(); edit(x); assert.equal(evaluateDependencyAudit(x).ok, false); }
});
test('lockfile, Worker, deployment and Astro configuration changes require renewed review', () => {
  for (const path of Object.keys(input().evidence)) {
    const x = input(); x.evidence[path] = 'b'.repeat(64);
    assert.equal(evaluateDependencyAudit(x).ok, false);
  }
});
test('new node paths, package versions or missing approval records are rejected', () => {
  for (const edit of [
    (x) => { x.report.vulnerabilities.picomatch.nodes.push('node_modules/new/nested/picomatch'); },
    (x) => { x.lockfile.packages['node_modules/picomatch'].version = '4.0.8'; },
    (x) => { delete x.rule.approvedAt; }, (x) => { x.rule.exploitFixed = true; },
  ]) { const x = input(); edit(x); assert.equal(evaluateDependencyAudit(x).ok, false); }
});
