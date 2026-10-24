/**
 * Official GA4/GSC verified daily → snapshot. Writes the snapshot only after all
 * affected rolling windows are complete. Never backfills missing observations.
 * Run in isolated write job AFTER Google API preflight has succeeded.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { addDays } from '../src/lib/growth-engine.mjs';
import { checkDaily } from '../src/lib/ga4-daily.mjs';
import { checkGscDaily } from '../src/lib/measurement-monitor.mjs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/google-analytics-sync.mjs <verified-export.json>');
const input = JSON.parse(readFileSync(inputPath, 'utf8'));
const path = 'data/editorial/performance-snapshot.json';
const raw = readFileSync(path, 'utf8');
const data = JSON.parse(raw);
const gaEnd = input.confirmedThrough, gsEnd = input.gsc?.confirmedThrough;
const valid = v => /^\d{4}-\d{2}-\d{2}$/.test(v ?? '') && !Number.isNaN(Date.parse(v+'T00:00:00Z'));
if (!valid(gaEnd) || !valid(gsEnd)) throw new Error('Invalid confirmation dates');
if (gaEnd !== gsEnd) throw new Error('GA4 and GSC confirmation dates differ; safe-sync halted');
const previousGaEnd = data.windows?.ga4?.dailyMeta?.confirmedThrough;
const previousGsEnd = data.windows?.gsc?.dailyMeta?.confirmedThrough;
if ((previousGaEnd && gaEnd < previousGaEnd) || (previousGsEnd && gsEnd < previousGsEnd))
  throw new Error('Official API export older than saved snapshot; refusing regression');
const updatedAt = Date.parse(input.fetchedAt ?? '');
if (!Number.isFinite(updatedAt) || updatedAt > Date.now() + 300000 || Date.now() - updatedAt > 3 * 3600000)
  throw new Error('Verified API export has an invalid or stale fetchedAt');
const existingGa = data.windows?.ga4?.daily ?? [];
const existingGs = data.windows?.gsc?.daily ?? [];
const gaMap = new Map(existingGa.map(x => [x.date,x]));
for (const x of input.daily ?? []) gaMap.set(x.date, {...gaMap.get(x.date),...x});
const gsMap = new Map(existingGs.map(x => [x.date,x]));
for (const x of input.gsc?.daily ?? []) gsMap.set(x.date, {...gsMap.get(x.date),...x});
const first = addDays(gaEnd,-34);
const ga = [...gaMap.values()].filter(x=>x.date>=first && x.date<=gaEnd).sort((a,b)=>a.date.localeCompare(b.date));
const gs = [...gsMap.values()].filter(x=>x.date>=first && x.date<=gsEnd).sort((a,b)=>a.date.localeCompare(b.date));
const incidentMap = new Map();
for(const i of data.measurementIncidents ?? []) if(i.source==='ga4') for(const d of i.affectedDates ?? []) incidentMap.set(d,i.id);
for(const row of ga){if(incidentMap.has(row.date)) row.incident=incidentMap.get(row.date); else delete row.incident;}
const issues = [...checkDaily(ga,{confirmedThrough:gaEnd,incidents:{incidents:data.measurementIncidents??[]}}),
 ...checkGscDaily(gs,{confirmedThrough:gsEnd})];
if(issues.length) throw new Error('Daily check failed: '+issues.join(' | '));
const gaBy = new Map(ga.map(x=>[x.date,x])), gsBy = new Map(gs.map(x=>[x.date,x]));
function windowRows(by,end,n){
 const result=[];
 for(let i=n-1;i>=0;i--){const d=addDays(end,-i); const x=by.get(d); if(!x) throw new Error('Missing verified observation '+d+'; refusing stale/zero-filled windows');result.push(x);}
 return result;
}
function gaWindow(end,n){
 const rows=windowRows(gaBy,end,n);
 const sum=k=>rows.reduce((v,r)=>v+r[k],0);
 const views=sum('views'),sessions=sum('sessions'),engagedSessions=sum('engagedSessions');
 if(![views,sessions,engagedSessions].every(Number.isFinite)) throw new Error('Nonfinite GA4 aggregation');
 return {start:rows[0].date,end,views,sessions,engagedSessions,users:null,daysPresent:n,
   engagementRate:sessions?engagedSessions/sessions:null,viewsPerSession:sessions?views/sessions:null,
   quality:'google-official-confirmed-daily',usersStatus:'not-returned-by-daily-API'};
}
function gsWindow(end,n){
 const rows=windowRows(gsBy,end,n);
 const clicks=rows.reduce((v,r)=>v+r.clicks,0),impressions=rows.reduce((v,r)=>v+r.impressions,0);
 // Mean position must be weighted by impressions; never average daily positions equally.
 const position=impressions?rows.reduce((v,r)=>v+r.position*r.impressions,0)/impressions:null;
 return {start:rows[0].date,end,clicks,impressions,ctr:impressions?clicks/impressions:null,position,daysPresent:n,
   quality:'google-official-confirmed-daily'};
}
const recent7=gaWindow(gaEnd,7),previous7=gaWindow(addDays(gaEnd,-7),7),
 recent28=gaWindow(gaEnd,28),recent3=gaWindow(gaEnd,3);
const gRecent7=gsWindow(gsEnd,7),gPrevious7=gsWindow(addDays(gsEnd,-7),7),
 gRecent28=gsWindow(gsEnd,28);
const pct=(a,b)=>b?Math.round((a/b-1)*1e4)/100:null;
const current=data.northStar?.target??100000;
data.windows.ga4={...data.windows.ga4,daily:ga,dailyMeta:{
  source:'Google official GA4 Data API',fetchedAt:input.fetchedAt,confirmedThrough:gaEnd,
  organicDefinition:'Organic Search channel screenPageViews, not sessions',
  coverage:{from:first,to:gaEnd,rows:ga.length,expectedDays:35,missingDates:[]}},
  recent7,previous7,recent28,recent3,
  latestDay:{date:gaEnd,views:gaBy.get(gaEnd).views,sessions:gaBy.get(gaEnd).sessions,
    engagedSessions:gaBy.get(gaEnd).engagedSessions,users:null,quality:'google-official-confirmed-daily'},
  recent7VsPrevious7:{usersPct:null,sessionsPct:pct(recent7.sessions,previous7.sessions),
    viewsPct:pct(recent7.views,previous7.views),
    comparability:'raw equal 7-day windows; known GA4 CSP incident 2026-10-08..10 can affect comparison'}};
data.windows.gsc={...data.windows.gsc,daily:gs,dailyMeta:{source:'Google official Search Console API',
  fetchedAt:input.fetchedAt,confirmedThrough:gsEnd,rows:gs.length},latestDay:gsWindow(gsEnd,1),
  recent7:gRecent7,previous7:gPrevious7,recent28:gRecent28,
  recent7VsPrevious7:{clicksPct:pct(gRecent7.clicks,gPrevious7.clicks),
    impressionsPct:pct(gRecent7.impressions,gPrevious7.impressions),
    ctrPct:pct(gRecent7.ctr,gPrevious7.ctr)}};
data.northStar={...data.northStar,current:recent28.views,progress:recent28.views/current,
 gap:Math.max(0,current-recent28.views),recent7Views:recent7.views,previous7Views:previous7.views,
 recent7VsPrevious7Pct:pct(recent7.views,previous7.views),
 recent7DailyAverage:recent7.views/7,runRate28FromRecent7:recent7.views*4,
 requiredDailyAverage:current/30,requiredUpliftVsRecent7:recent7.views?current/30/(recent7.views/7):null,
 status:recent7.views*4>=current?'on-pace':'below-pace'};
data.asOf=gaEnd;
data.source={...data.source,primary:'Google official APIs (verified daily)',ga4:'Google Analytics Data API',
 gsc:'Search Console Search Analytics API',checkedAt:input.fetchedAt,lastConfirmedAt:input.fetchedAt,
 status:'google-api-daily-confirmed',
 freshness:{basisDateAsiaTokyo:gaEnd,ga4LatestConfirmedDate:gaEnd,gscLatestConfirmedDate:gsEnd,
 todayRefreshSucceeded:true},ga4LatestConfirmedDate:gaEnd,gscLatestConfirmedDate:gsEnd,
 warnings:[...(data.source?.warnings??[]).filter(x=>!x.includes('Windsor')&&!x.includes('確定')),
 'Google API daily windows refreshed. Legacy page/channel and acquisitionControl metrics may remain from their last separately verified source.',
 '2026-10-08..10 GA4 CSP incident: raw measurements retained; do not interpret as a genuine audience drop.']};
const result=JSON.stringify(data);
if(!result.includes('"google-api-daily-confirmed"'))throw new Error('Source invariant failed');
writeFileSync(path,raw.trimEnd().includes('\n')?JSON.stringify(data,null,2)+'\n':result+'\n');
console.log('Verified Google official daily metrics synced through '+gaEnd+'; GA4 28d views='+recent28.views+'; GSC 28d clicks='+gRecent28.clicks);
