// Read-only production QA. Issue #569. Never submit forms or deploy.
const base = 'https://ibatoco.jp';
const monthly = process.argv.includes('--monthly');
const pages = ['/', '/news/', '/events/', '/contact/', '/privacy/', '/404.html'];
const failures = [], notes = [];
async function check(path) {
  const r = await fetch(base + path, {signal: AbortSignal.timeout(12000),headers:{'User-Agent':'IbatocoQualityAudit/1.0'}});
  return {status:r.status, html:await r.text()};
}
function tag(html, regex) { return regex.test(html); }
for (const path of pages) {
  try {
    const {status, html} = await check(path);
    notes.push(path + ': HTTP ' + status);
    if (!((path === '/404.html' && [200,404].includes(status)) || (path !== '/404.html' && status === 200))) failures.push(path + ': unexpected status ' + status);
    const required = [
      [/<title>[^<]+<\/title>/i,'title'],
      [/<link\b[^>]*rel=["']canonical["']/i,'canonical'],
      [/<meta\b[^>]*property=["']og:title["']/i,'og:title'],
      [/<meta\b[^>]*property=["']og:image["']/i,'og:image'],
      [/<meta\b[^>]*name=["']twitter:card["']/i,'twitter:card'],
    ];
    for (const [regex,label] of required) if (!tag(html,regex)) failures.push(path + ': missing ' + label);
    if (path === '/contact/') {
      for (const [regex,label] of [
        [/<form\b/i,'form'],
        [/type=["']email["']/i,'email validation'],
        [/\brequired(?:\s|=|>)/i,'required fields'],
      ]) if (!tag(html,regex)) failures.push(path + ': missing ' + label);
      notes.push('Contact: markup only, no real submission');
    }
    if (path === '/privacy/' && !html.includes('プライバシーポリシー')) failures.push(path + ': missing privacy text');
  } catch(e) { failures.push(path + ': ' + String(e.message || e)); }
}
if (monthly) {
  for (const path of ['/robots.txt','/sitemap.xml','/favicon.svg']) {
    try { const {status}=await check(path); notes.push(path + ': HTTP ' + status); if(status!==200)failures.push(path+': HTTP '+status); }
    catch(e) { failures.push(path + ': ' + String(e.message || e)); }
  }
}
const warnings = [
  'This checks representative URLs only; daily Validate/Deploy QA covers additional page types, image sizes, navigation and browser console.',
  'LCP/INP/CLS must be measured separately through PSI/CrUX; no scores are fabricated.',
  'Human review: privacy disclosures vs actual processors, real form delivery and edge cases, Safari/iMac layout.',
];
const output = [
  '## Quality audit: ' + (monthly ? 'monthly' : 'weekly'),
  'Date: ' + new Date().toISOString(),
  'Result: ' + (failures.length ? 'FAIL' : 'PASS within sampled scope'),
  '',
  '### Requests', ...notes.map(x=>'- '+x),
  '### Failures', ...(failures.length ? failures.map(x=>'- '+x) : ['- None detected']),
  '### Limitations', ...warnings.map(x=>'- '+x)
].join('\n');
console.log(output);
if(process.env.GITHUB_STEP_SUMMARY) {
  const {appendFileSync}=await import('node:fs');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,output+'\n');
}
if(failures.length)process.exitCode=1;
