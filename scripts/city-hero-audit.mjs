/**
 * 44市町村の共通ヒーロー静的HTMLを公開前に確認。
 * UI smokeの代表5市 + 11画面幅と組み合わせ、全44市の欠落を防ぐ。
 * 既存本文やSEOの書き換えは行わない。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const source = readFileSync(resolve('src/data/areas.ts'),'utf8');
const cityBlock = source.split('export const MUNICIPALITIES = [')[1]?.split('] as const')[0];
if (!cityBlock) throw new Error('municipality source parse failed');
const entries = [...cityBlock.matchAll(/\{ slug: '([^']+)', name: '([^']+)'/g)].map((m)=>({slug:m[1],name:m[2]}));
if (entries.length!==44 || new Set(entries.map((m)=>m.slug)).size!==44) throw new Error(`municipalities expected 44, actual ${entries.length}`);
let failures=0;
for (const {slug,name} of entries){
  const path=join(resolve('dist'),'area',slug,'index.html');
  if(!existsSync(path)){console.error('CITY_HERO_MISSING_PAGE',slug);failures++;continue;}
  const html=readFileSync(path,'utf8');
  const h1=(html.match(/<h1\b/g)||[]).length;
  const checks=[
    [h1===1, 'h1 must be exactly 1'],
    [html.includes('data-city-hero'), 'shared hero'],
    [html.includes(`data-city-slug="${slug}"`), 'city slug'],
    [html.includes(name), 'city name'],
    [html.includes('city-hero__visual'), 'city artwork'],
    [html.includes('area-discovery-bar__search'), 'search form'],
    [html.includes(`https://ibatoco.jp/area/${slug}/`), 'canonical'],
  ];
  if(slug==='hitachi'||slug==='daigo') checks.push([html.includes('city-hero__credit')&&html.includes('creativecommons.org')===false ? html.includes('rel="license') : html.includes('rel="license'), 'image license link']);
  else checks.push([html.includes('現地写真ではありません'), 'illustration not asserted as photography']);
  for(const [pass,reason] of checks){if(!pass){console.error('CITY_HERO_QA_FAIL',slug,reason);failures++;}}
}
if(failures>0){console.error(`CITY_HERO_QA_FAILED ${failures} issues`);process.exit(1)}
console.log(`CITY_HERO_QA_OK: ${entries.length} cities, page title/h1, unique city art, search, canonical, licensing checked`);
