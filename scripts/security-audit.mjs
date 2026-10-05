#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ignored = new Set(['.git','node_modules','dist','.astro','reports','.output']);
const findings = [];

function add(message){ findings.push(message); }
function walk(dir){
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const full = join(dir,name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else {
      const rel = relative(ROOT,full);
      if (rel.startsWith('data/revenue-imports/private/')) continue;
      inspect(rel, full);
    }
  }
}

const secretPatterns = [
  {name:'private-key', re:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/},
  {name:'github-token', re:/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/},
  {name:'cloudflare-token', re:/\b(?:CLOUDFLARE_API_TOKEN|CF_API_TOKEN)\s*=\s*["']?[A-Za-z0-9_-]{20,}/i},
  {name:'aws-key', re:/\bAKIA[0-9A-Z]{16}\b/},
  {name:'generic-secret-assignment', re:/\b(?:CONTROL_PASSWORD|CONTROL_TOTP_SECRET|CONTROL_SESSION_SECRET)\s*[:=]\s*["'][^"'\n]{8,}["']/},
];

function inspect(rel, full){
  if (/\.(png|jpe?g|webp|gif|ico|woff2?|ttf|zip|gz|pdf)$/i.test(rel)) return;
  let text='';
  try { text=readFileSync(full,'utf8'); } catch { return; }

  for (const p of secretPatterns) {
    // Documentation may mention variable names, but literal assignments are never allowed.
    if (p.re.test(text)) add(`${p.name}: ${rel}`);
  }

  if (/\bCONTROL_PASSWORD\b/.test(text) && rel !== 'worker/index.js' && rel !== 'docs/CONTROL_CENTER.md' && !rel.endsWith('security-audit.mjs') && !rel.endsWith('tech-audit.mjs')) {
    // Secret name references outside the sanctioned implementation are suspicious.
    if (/password\s*[:=]/i.test(text)) add(`control-secret-reference: ${rel}`);
  }
}

walk(ROOT);

for (const forbidden of ['.env','.env.production','.env.local']) {
  if (existsSync(join(ROOT,forbidden))) add(`tracked-or-local-env-present: ${forbidden}`);
}

const worker = readFileSync(join(ROOT,'worker/index.js'),'utf8');
for (const required of [
  'CONTROL_PASSWORD',
  'CONTROL_TOTP_SECRET',
  'CONTROL_SESSION_SECRET',
  'SameSite=Strict',
  'HttpOnly',
  'Secure',
  'CONTROL_SESSION_SECONDS',
  'verifyTotp',
  'validSession',
  'X-Content-Type-Options',
  'Permissions-Policy',
  'Content-Security-Policy',
]) {
  if (!worker.includes(required)) add(`worker-security-missing: ${required}`);
}

if (!/(?:CONTROL_PASSWORD|password)\.length\s*>=\s*20/.test(worker)) add('worker-security-missing: minimum 20-char password');
if (!/CONTROL_SESSION_SECONDS\s*=\s*60\s*\*\s*60\s*\*\s*4/.test(worker)) add('worker-security-missing: 4-hour session');
if (!worker.includes('Path=/; Max-Age=${CONTROL_SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict')) add('worker-security-missing: valid __Host cookie Path=/');
if (worker.includes('Path=/control;')) add('worker-security-invalid: __Host cookie cannot use Path=/control');
if (!/status:\s*503/.test(worker)) add('worker-security-missing: fail-closed 503');

if (findings.length) {
  console.error(`Security audit failed: ${findings.length} finding(s)`);
  for (const item of findings) console.error('  - ' + item);
  process.exit(1);
}

console.log('Security audit: secrets・2FA・session・security headers に問題なし');
