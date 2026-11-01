/** Editorial staleness triage: review queue only; never auto-correct facts.
 * Usage: node scripts/editorial-staleness-audit.mjs [YYYY-MM-DD]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const today = process.argv[2] || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today))) {
  console.error('Expected date YYYY-MM-DD'); process.exit(2);
}
const roots = ['src/content/news', 'src/content/events'];
const rows = [];
const datePattern = /(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|20\d{2}年\d{1,2}月\d{1,2}日)/g;
const keywords = /申込|受付|締切|販売|運休|中止|延期|開催|交付|抽選|配布|先着|予定|現在|確認時点/;
const normalize = (s) => {
  const m = s.match(/^(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
};
for (const dir of roots) {
  for (const name of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const path = join(dir, name);
    const src = readFileSync(path, 'utf8');
    const lines = src.split('\n');
    const reviewed = /^reviewed:\s*true\s*$/m.test(src);
    const draft = /^draft:\s*true\s*$/m.test(src);
    if (draft || !reviewed) continue;
    lines.forEach((line, i) => {
      if (!keywords.test(line)) return;
      const dates = [...line.matchAll(datePattern)].map((m) => normalize(m[0])).filter(Boolean);
      const past = dates.filter((d) => d < today);
      if (past.length === 0) return;
      rows.push({ path, line: i + 1, pastDates: [...new Set(past)], excerpt: line.trim().slice(0, 170) });
    });
  }
}
rows.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line);
console.log(JSON.stringify({asOf:today,scope:'published news and events markdown',reviewOnly:true,count:rows.length,items:rows},null,2));
