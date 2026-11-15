#!/usr/bin/env node
/**
 * Google公式GA4日次スナップショットから popular-pages.json を更新する。
 * 実測未取得・時期不整合・欠落の場合は現在のランキングを保持する。
 * 使用方法: node scripts/popular-pages-sync.mjs [--write]
 * --write がない場合は、現在の選定候補と期間だけを表示する。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { loadContentPages } from './lib/content-pages.mjs';
import { buildPopularPages } from '../src/lib/popular-pages-sync.mjs';
import { todayDateOnlyString } from '../src/lib/date-only.js';

const snapshotPath='data/editorial/performance-snapshot.json';
const popularPath='data/editorial/popular-pages.json';
const old=JSON.parse(readFileSync(popularPath,'utf8'));
const snapshot=JSON.parse(readFileSync(snapshotPath,'utf8'));
const current=old?.source?.period?.end ?? null;
const confirmed=snapshot?.asOf ?? null;
if (current && confirmed && current >= confirmed) {
  console.log(`Popular pages unchanged (existing ${current}, official latest ${confirmed})`);
  process.exit(0);
}
try {
  const result=buildPopularPages(snapshot,loadContentPages(),{
    today:todayDateOnlyString(),generatedAt:new Date().toISOString(),
  });
  console.log(`Popular pages GA4 official ${result.source.period.start}.. ${result.source.period.end}: ${result.pages.length} eligible articles`);
  for(const row of result.pages)console.log(`  ${row.path}: ${row.views} Views/7d`);
  if(process.argv.includes('--write')) {
    writeFileSync(popularPath,JSON.stringify(result,null,2)+'\n');
    console.log('Updated '+popularPath+' (verified official GA4 only)');
  } else {
    console.log('Dry run: file unchanged. Pass --write only in verified metrics sync.');
  }
} catch(error) {
  // Google公式APIからページ別が取れない日は、人気記事の過去値・集計期間を保存する。
  // 日次のGA4/GSC全体同期まで停止させない。
  console.warn(`::warning title=人気記事ランキングは更新保留::${error.message}`);
  console.warn('Previous popular-pages.json preserved. Do not substitute zero or guess.');
}
