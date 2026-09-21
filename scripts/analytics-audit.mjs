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
requirePattern('src/components/BookingGuide.astro', 'outbound_booking_click instrumentation', /outbound_booking_click/);
requirePattern('src/pages/contact.astro', 'contact_form_view instrumentation', /contact_form_view/);
requirePattern('src/pages/contact.astro', 'contact_form_start instrumentation', /contact_form_start/);
requirePattern('src/lib/forms.ts', 'generate_lead instrumentation', /generate_lead/);
requirePattern('src/pages/news/\[slug\].astro', 'BusinessCta wired on news', /<BusinessCta\b/);
requirePattern('src/pages/events/\[slug\].astro', 'BusinessCta wired on events', /<BusinessCta\b/);
requirePattern('src/pages/sports/\[team\].astro', 'BusinessCta wired on sports', /<BusinessCta\b/);
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

if (errors.length) {
  console.error('Analytics audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Analytics audit passed: ${checks.length} instrumentation checks, single GA4 boot path, no internal CTA UTM contamination.`);
