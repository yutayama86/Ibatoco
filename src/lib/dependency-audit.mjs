/** Evaluate npm's production report before CI or release may proceed. */
export function evaluateDependencyAudit({ report, exitCode }) {
  const errors = [];
  const severities = ['info', 'low', 'moderate', 'high', 'critical'];
  if (report?.auditReportVersion !== 2 || report.error || !report.vulnerabilities
    || typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
    return { ok: false, mode: 'blocked', errors: ['npm の監査レポートを取得できませんでした。'] };
  }

  const entries = Object.entries(report.vulnerabilities);
  const totals = report.metadata?.vulnerabilities;
  for (const severity of severities) {
    const observed = entries.filter(([, finding]) => finding?.severity === severity).length;
    if (totals?.[severity] !== observed) errors.push(`監査件数が不整合: ${severity}`);
  }
  if (totals?.total !== entries.length) errors.push('監査の総件数が不整合。');
  for (const [name, finding] of entries) {
    if (!severities.includes(finding?.severity)) errors.push(`不明な深刻度: ${name}`);
    if (['high', 'critical'].includes(finding?.severity)) errors.push(`公開を止める依存: ${name} (${finding.severity})`);
  }
  if (exitCode !== 0) errors.push('npm audit が正常終了しませんでした。');
  return { ok: errors.length === 0, mode: errors.length ? 'blocked' : 'strict', errors };
}
