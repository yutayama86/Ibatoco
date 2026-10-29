# Security Incident Response — Ibatoco

Last reviewed: 2026-10-22. Owner-only operations; never write tokens, passwords, visitor PII, or raw sensitive logs to public issues.

## Scope
Astro static output, Cloudflare Worker/assets, GitHub CI/CD, external analytics and inquiry providers. This document does NOT assert that Cloudflare WAF or account MFA are enabled.

## Severity and first response
- **P0**: confirmed account takeover, unauthorized production changes, leaked deployment credential, malicious redirect, data exposure. Stop discretionary releases, preserve evidence, revoke compromised credentials from the provider UI, isolate compromised access and restore verified revision.
- **P1**: site unavailable, active exploitation suspected, persistent malicious traffic, significant SEO spam. Gather Cloudflare request/event logs and GitHub audit/deployment history; use targeted WAF challenge/block with expiration and monitor for false positives.
- **P2**: dependency advisory without exploitation evidence. Assess reachability, exploitability and affected production version, fix by isolated PR after tests.

## Procedure
1. Log UTC/JST incident timeline, hostname and path, screenshots, request IDs, commit SHA and observed impact. Store evidence privately.
2. In GitHub, inspect Actions run history, PR approvals, branch protection, recent commits and deployment secrets access. Do not publish secret values.
3. In Cloudflare, inspect Security Events / WAF / Bot Analytics and Worker deployments. Distinguish blocked scans from verified compromise. Validate free-plan feature availability.
4. If credential compromise is credible, revoke/rotate affected scoped GitHub/Cloudflare/form/analytics keys, then check for persistence. Use least privilege; require MFA on privileged accounts.
5. Restore known-good commit/deployment and configuration as appropriate. Do not switch off /control/ authentication or blindly disable CSP. Confirm HTTPS, /control/ access restrictions, GA4, sitemap, canonical URLs, and search bot access.
6. Run independent validation from production and monitor for recurrence. Document root cause and prevention actions; notify affected stakeholders when legally or contractually required.

## Operational safeguards
- GitHub: protected main, required review/checks, no direct push except documented break-glass; verify settings in GitHub UI. Dependabot + advisory handling. Review the existing dependency-audit PR before duplicating.
- Cloudflare: verify (not assume) managed WAF, bot protections, targeted /control/login rate limits, DNS access protection, alert destination and rollback. Avoid blanket country blocks or challenges to Googlebot.
- Daily smoke workflow performs low-volume GET/HEAD checks and reports GitHub Actions failure only. It is NOT intrusion detection, threat intelligence, or proof of integrity.
- Back up repository **and** Cloudflare/DNS/Worker settings, credentials recovery procedures, form provider exports as applicable. Test restoration quarterly.
- If any P0 finding appears, do not auto-merge security fixes without appropriate test and production verification.

## Manual verification remains necessary
Cloudflare WAF plan/rules, GitHub account MFA, token inventory, secrets rotation and billing alert recipients cannot be inferred from repository files. Those checks require provider-side authorized access.
