/** Preflight official Google API daily export. Never writes to the repository. */
import { readFileSync } from 'node:fs';
import { dailyCoverage, checkDaily } from '../src/lib/ga4-daily.mjs';
import { checkGscDaily } from '../src/lib/measurement-monitor.mjs';

const path = process.argv[2];
if (!path) throw new Error('Usage: node scripts/google-daily-preflight.mjs <daily.json>');
const input = JSON.parse(readFileSync(path, 'utf8'));
const fail = [];
const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'T00:00:00Z'));
const inspect = (label, rows, fields, end) => {
  if (!Array.isArray(rows) || !rows.length) { fail.push(label+': empty rows'); return; }
  const dates = new Set();
  for (const r of rows) {
    if (!validDate(r.date) || r.date > end || dates.has(r.date)) fail.push(label+': invalid, future or duplicated date '+r.date);
    dates.add(r.date);
    for (const f of fields) if (!Number.isFinite(r[f]) || r[f] < 0) fail.push(label+': invalid '+f+' at '+r.date);
  }
  if (rows.at(-1).date !== end) fail.push(label+': latest date '+rows.at(-1).date+' != confirmedThrough '+end);
};
if (!validDate(input.confirmedThrough) || !validDate(input.gsc?.confirmedThrough)) fail.push('confirmedThrough missing or invalid');
if (input.confirmedThrough && input.gsc?.confirmedThrough) {
  inspect('GA4', input.daily, ['views','sessions','engagedSessions','organicViews'], input.confirmedThrough);
  inspect('GSC', input.gsc.daily, ['clicks','impressions','position'], input.gsc.confirmedThrough);
}
for (const err of checkDaily(input.daily, { confirmedThrough: input.confirmedThrough })) fail.push('GA4: '+err);
for (const err of checkGscDaily(input.gsc?.daily, { confirmedThrough: input.gsc?.confirmedThrough })) fail.push('GSC: '+err);
if (fail.length) { for (const e of fail) console.error('::error::'+e); process.exit(1); }
const coverage = dailyCoverage(input.daily, input.confirmedThrough);
console.log('Google API preflight passed. GA4 dates='+input.daily.length+', GSC dates='+input.gsc.daily.length+
  ', GA4 missing dates='+coverage.missingDates.length+'. No snapshot written.');
