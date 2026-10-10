import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const checks = [];

function read(path) {
  const full = join(ROOT, path);
  if (!existsSync(full)) {
    errors.push(`missing: ${path}`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

function requirePattern(path, label, pattern) {
  const src = read(path);
  const ok = pattern.test(src);
  checks.push({ label, ok, path });
  if (!ok) errors.push(`${label}: ${path}`);
}

requirePattern('src/components/BusinessCta.astro', 'business_cta_view instrumentation', /business_cta_view/);
requirePattern('src/components/BusinessCta.astro', 'business_cta_click instrumentation', /business_cta_click/);
requirePattern('src/components/BookingGuide.astro', 'booking_guide_view instrumentation', /booking_guide_view/);
requirePattern('src/components/BookingGuide.astro', 'outbound_booking_click instrumentation', /outbound_booking_click/);
requirePattern('src/pages/contact.astro', 'contact_form_view instrumentation', /contact_form_view/);
requirePattern('src/pages/contact.astro', 'contact_form_start instrumentation', /contact_form_start/);
requirePattern('src/lib/forms.ts', 'generate_lead instrumentation', /generate_lead/);
requirePattern('src/pages/news/\[slug\].astro', 'BusinessCta wired on news', /<BusinessCta\b/);
requirePattern('src/pages/events/\[slug\].astro', 'BusinessCta wired on events', /<BusinessCta\b/);
requirePattern('src/pages/sports/\[team\].astro', 'BusinessCta wired on sports', /<BusinessCta\b/);
requirePattern('src/pages/discover/index.astro', 'discovery_search instrumentation', /discovery_search/);
requirePattern('src/pages/discover/index.astro', 'discovery_result_click instrumentation', /discovery_result_click/);
requirePattern('src/pages/submit.astro', 'self-service form view instrumentation', /contact_form_view/);
requirePattern('src/pages/submit.astro', 'self-service form start instrumentation', /contact_form_start/);
requirePattern('src/components/GrowthNextReads.astro', 'growth_next_view instrumentation', /growth_next_view/);
requirePattern('src/components/GrowthNextReads.astro', 'growth_next_click instrumentation', /growth_next_click/);
requirePattern('src/pages/news/[slug].astro', 'GrowthNextReads wired on news', /<GrowthNextReads\b/);
requirePattern('src/pages/events/[slug].astro', 'GrowthNextReads wired on events', /<GrowthNextReads\b/);
requirePattern('src/layouts/BrandBase.astro', 'landing traffic attribution', /landing_traffic_kind/);
requirePattern('src/layouts/BrandBase.astro', 'AI referral attribution', /ai_source/);

const cta = read('src/components/BusinessCta.astro');
if (/href=["'][^"']*utm_/i.test(cta)) {
  errors.push('BusinessCta internal links must not contain utm_* because they overwrite session attribution');
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const layoutsDir = join(ROOT, 'src/layouts');
for (const file of walk(layoutsDir).filter((p) => p.endsWith('.astro'))) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  if (rel !== 'src/layouts/BrandBase.astro' && /googletagmanager\.com\/gtag\/js|gtag\('config'/.test(src)) {
    errors.push(`duplicate/legacy GA4 boot code outside BrandBase: ${rel}`);
  }
}

// GA4（gtag.js）の送信先が CSP（public/_headers）の connect-src で許可されているか。
// 許可から外れると、タグは読み込まれるのに送信だけがブラウザで止められ、GA4 がほぼゼロになる（2026-10-08、Issue #226）
const headers = read('public/_headers');
const csp = headers.match(/Content-Security-Policy:\s*([^\n]+)/)?.[1] ?? '';
const directive = (name) => (csp.match(new RegExp(`(?:^|;)\\s*${name}\\s+([^;]+)`))?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
const allows = (sources, url) => {
  const { protocol, hostname } = new URL(url);
  return sources.some((src) => {
    if (src === "'self'") return false;
    if (src === 'https:') return protocol === 'https:';
    const m = src.match(/^(https?:)\/\/(\*\.)?([^/:]+)/);
    if (!m || m[1] !== protocol) return false;
    return m[2] ? hostname.endsWith(`.${m[3]}`) : hostname === m[3]; // 「*.example.com」は example.com 自体には一致しない
  });
};
const GA4_ENDPOINTS = {
  'connect-src': [
    'https://analytics.google.com/g/collect',
    'https://region1.google-analytics.com/g/collect',
    'https://www.google-analytics.com/g/collect',
    'https://www.google.com/g/collect',
    'https://stats.g.doubleclick.net/g/collect',
  ],
  'script-src': ['https://www.googletagmanager.com/gtag/js'],
};
for (const [name, urls] of Object.entries(GA4_ENDPOINTS)) {
  const sources = directive(name);
  for (const url of urls) {
    const ok = allows(sources, url);
    checks.push({ label: `CSP ${name} allows ${new URL(url).hostname}`, ok, path: 'public/_headers' });
    if (!ok) errors.push(`CSP ${name} が GA4 の送信先 ${url} を許可していない（public/_headers）`);
  }
}

if (errors.length) {
  console.error('Analytics audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Analytics audit passed: ${checks.length} instrumentation checks, single GA4 boot path, no internal CTA UTM contamination.`);
