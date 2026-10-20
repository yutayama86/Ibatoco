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
// 地域固有の図案を全市町村に明示的に割り当てる。新しい地域を無条件で田園図案にしない。
const sceneSource=readFileSync(resolve('src/data/city-visuals.ts'),'utf8');
const sceneBlock=sceneSource.split('export const CITY_SCENE_BY_SLUG')[1]?.split('};')[0];
if(!sceneBlock) throw new Error('city scene source not found');
const sceneSlugs=[...sceneBlock.matchAll(/^\s*'([^']+)':\s*'[^']+',?$/gm)].map((m)=>m[1]);
const expectedSlugs=new Set(entries.map((m)=>m.slug));
const sceneMissing=[...expectedSlugs].filter((slug)=>!sceneSlugs.includes(slug));
const sceneExtra=sceneSlugs.filter((slug)=>!expectedSlugs.has(slug));
if(sceneMissing.length||sceneExtra.length||new Set(sceneSlugs).size!==44){
  throw new Error(`CITY_SCENE_COVERAGE_ERROR missing=${sceneMissing.join(',')} extra=${sceneExtra.join(',')} count=${sceneSlugs.length}`);
}
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
  if(slug==='hitachi'||slug==='daigo') checks.push([html.includes('city-hero__credit') && html.includes('rel="license'), 'CC photograph attribution link']);
  else if(slug==='hitachinaka') checks.push([html.includes('写真：イバトコ編集部'), 'owned photograph credit']);
  else checks.push([html.includes('現地写真ではありません'), 'illustration not asserted as photography']);
  for(const [pass,reason] of checks){if(!pass){console.error('CITY_HERO_QA_FAIL',slug,reason);failures++;}}
}
if(failures>0){console.error(`CITY_HERO_QA_FAILED ${failures} issues`);process.exit(1)}
console.log(`CITY_HERO_QA_OK: ${entries.length} cities, page title/h1, unique city art, search, canonical, licensing checked`);
