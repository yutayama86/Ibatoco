import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPopularPages } from '../src/lib/popular-pages-sync.mjs';

const period={start:'2026-11-06',end:'2026-11-12'};
const today='2026-11-15';
const generatedAt='2026-11-15T12:00:00.000Z';
const metrics=(rows, pageMetrics=[])=>({
  asOf:'2026-11-12',
  windows:{ga4:{recent7:{...period,views:5640,sessions:5092,daysPresent:7}}},
  source:{pageLevel:{ga4TopPagesUpdated:true,periods:{recent7:{...period}},truncated:{ga4Pages:false}}},
  ga4TopPages:{recent7:rows},
  pageMetrics
});
const info=(opts={})=>({
  noindex:false,articleType:'event',lifespan:'seasonal',year:2026,
  startDate:'2026-11-01',endDate:'2026-11-21',updatedDate:'2026-11-13',
  frontmatter:{reviewed:true},...opts
});
const makePages=(pairs)=>new Map(pairs);

test('公式GA4直近7日だけを選び、終了/非公開/noindex/一覧/ホームを除く',()=>{
 const s=metrics([
  {path:'/events/past/',views:400},{path:'/events/valid/',views:200},
  {path:'/news/hidden/',views:150},{path:'/events/draft/',views:100},
  {path:'/events/has-noindex/',views:90},{path:'/events/today-ended/',views:80},
  {path:'/events/guide/',views:50},{path:'/',views:999},{path:'/events/',views:120}
 ]);
 const pages=makePages([
  ['/events/past/',info({endDate:'2026-11-14'})],
  ['/events/valid/',info()],
  ['/news/hidden/',info({frontmatter:{reviewed:true,draft:true}})],
  ['/events/draft/',info({frontmatter:{reviewed:false}})],
  ['/events/has-noindex/',info({noindex:true})],
  ['/events/today-ended/',info({endDate:today})],
  ['/events/guide/',info({lifespan:'evergreen',articleType:'guide',endDate:null})]
 ]);
 const result=buildPopularPages(s,pages,{today,generatedAt});
 assert.deepEqual(result.pages,[{path:'/events/valid/',views:200},{path:'/events/guide/',views:50}]);
 assert.equal(result.generatedAt,generatedAt);
 assert.equal(result.source.period.end,'2026-11-12');
 assert.equal(result.baseline.views,5640);
 assert.equal(result.baseline.sessions,5092);
});

test('直近7日の pageMetrics から上位20件の外にある記事を補完する',()=>{
 const s=metrics([{path:'/events/ended/',views:500}],
  [{path:'/events/ended/',views7:500},{path:'/events/live/',views7:21}]);
 const pages=makePages([
  ['/events/ended/',info({endDate:'2026-11-12'})],
  ['/events/live/',info()],
 ]);
 assert.deepEqual(buildPopularPages(s,pages,{today,generatedAt}).pages,[{path:'/events/live/',views:21}]);
});

test('数値未取得を0として埋めず、相互矛盾は更新を拒否する',()=>{
 const pages=makePages([['/events/live/',info()]]);
 assert.throws(()=>buildPopularPages(metrics([{path:'/events/live/',views:null}]),pages,{today,generatedAt}),/nonnumeric/);
 assert.throws(()=>buildPopularPages(metrics([{path:'/events/live/',views:4}],[{path:'/events/live/',views7:5}]),pages,{today,generatedAt}),/mismatch/);
 assert.throws(()=>buildPopularPages(metrics([{path:'/events/live/',views:0}]),pages,{today,generatedAt}),/no verified eligible/);
});

test('日付ずれ/欠落/切り詰め時にはデータを出さない',()=>{
 const rows=[{path:'/events/live/',views:4}];
 const pages=makePages([['/events/live/',info()]]);
 const s=metrics(rows);
 assert.throws(()=>buildPopularPages({...s,asOf:'2026-11-10'},pages,{today,generatedAt}),/period/);
 assert.throws(()=>buildPopularPages(s,pages,{today:'2026-11-19',generatedAt}),/stale/);
 assert.throws(()=>buildPopularPages({...s,source:{pageLevel:{...s.source.pageLevel,truncated:{ga4Pages:true}}}},pages,{today,generatedAt}),/incomplete/);
 assert.throws(()=>buildPopularPages({...s,source:{pageLevel:{...s.source.pageLevel,ga4TopPagesUpdated:false}}},pages,{today,generatedAt}),/incomplete/);
});

test('日程未設定のイベント・古い季節ガイド・中止イベントを推薦しない',()=>{
 const pages=makePages([
  ['/events/unknown/',info({endDate:null})],
  ['/events/old-season/',info({articleType:'guide',endDate:null,updatedDate:'2026-08-31'})],
  ['/events/confirmed-season/',info({articleType:'guide',endDate:null,updatedDate:'2026-11-01'})],
  ['/events/cancelled/',info({dateStatus:'cancelled'})]
 ]);
 const s=metrics([
  {path:'/events/unknown/',views:100},
  {path:'/events/old-season/',views:90},
  {path:'/events/confirmed-season/',views:50},
  {path:'/events/cancelled/',views:70}
 ]);
 assert.deepEqual(buildPopularPages(s,pages,{today,generatedAt}).pages,[{path:'/events/confirmed-season/',views:50}]);
});
