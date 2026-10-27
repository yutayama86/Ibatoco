/**
 * 茨城県 市町村境界 → SVGパス生成（トポロジー保持簡略化）。
 * 生データは niiyz/JapanCityGeoJson の5桁コード別GeoJSON（例：08201.json）。リポジトリには入れない。
 * 隣接境界を共有アーク（TopoJSON）として一度だけ簡略化するので、隙間や重なりが出ない。
 *
 * 実行: node scripts/gen-geo.mjs --geo-dir <GeoJSONを置いたフォルダ>
 *   （環境変数 GEO_DIR でもよい）。出力は src/data/ibaraki-geo.ts を上書きする。
 *   境界は中核資産（AGENTS.md「地図の保護」）なので、作り直したら差分と地図の表示を必ず確認する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature } from 'topojson-client';

const geoDirArg = process.argv.indexOf('--geo-dir');
const GEO_DIR = geoDirArg >= 0 ? process.argv[geoDirArg + 1] : process.env.GEO_DIR;
if (!GEO_DIR || !fs.existsSync(GEO_DIR)) {
  console.error('GeoJSON のフォルダを --geo-dir <フォルダ>（または環境変数 GEO_DIR）で指定してください。');
  process.exit(1);
}
const OUT = new URL('../src/data/ibaraki-geo.ts', import.meta.url).pathname;

const SLUG_CODE = {
  mito: '08201', hitachi: '08202', tsuchiura: '08203', koga: '08204', ishioka: '08205',
  yuki: '08207', ryugasaki: '08208', shimotsuma: '08210', joso: '08211', hitachiota: '08212',
  takahagi: '08214', kitaibaraki: '08215', kasama: '08216', toride: '08217', ushiku: '08219',
  tsukuba: '08220', hitachinaka: '08221', kashima: '08222', itako: '08223', moriya: '08224',
  hitachiomiya: '08225', naka: '08226', chikusei: '08227', bando: '08228', inashiki: '08229',
  kasumigaura: '08230', sakuragawa: '08231', kamisu: '08232', namegata: '08233', hokota: '08234',
  tsukubamirai: '08235', omitama: '08236', 'ibaraki-machi': '08302', oarai: '08309', shirosato: '08310',
  tokai: '08341', daigo: '08364', miho: '08442', ami: '08443', kawachi: '08447',
  yachiyo: '08521', goka: '08542', sakai: '08546', tone: '08564',
};

// --- 生GeoJSONを読み込み、1市町村=1 Feature(MultiPolygon)に集約、全体bbox算出 ---
let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
const features = [];
for (const [slug, code] of Object.entries(SLUG_CODE)) {
  const gj = JSON.parse(fs.readFileSync(path.join(GEO_DIR, `${code}.json`), 'utf8'));
  const polys = [];
  for (const f of gj.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') polys.push(g.coordinates);
    else if (g.type === 'MultiPolygon') for (const p of g.coordinates) polys.push(p);
  }
  for (const poly of polys) for (const ring of poly) for (const [lon, lat] of ring) {
    if (lon < lonMin) lonMin = lon; if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat; if (lat > latMax) latMax = lat;
  }
  features.push({ type: 'Feature', id: slug, properties: {}, geometry: { type: 'MultiPolygon', coordinates: polys } });
}

// --- 投影（東西cos補正・高さ基準）---
const midLat = ((latMin + latMax) / 2) * Math.PI / 180;
const kx = Math.cos(midLat);
const PAD = 14, TARGET_H = 660;
const scale = (TARGET_H - PAD * 2) / (latMax - latMin);
const W = Math.round((lonMax - lonMin) * kx * scale + PAD * 2);
const H = Math.round(TARGET_H);
const px = ([lon, lat]) => [
  Math.round((PAD + (lon - lonMin) * kx * scale) * 10) / 10,
  Math.round((PAD + (latMax - lat) * scale) * 10) / 10,
];
for (const f of features) {
  f.geometry.coordinates = f.geometry.coordinates.map((poly) => poly.map((ring) => ring.map(px)));
}

// --- TopoJSONで共有境界ごと簡略化（隣接を崩さない）---
// quantization で近接頂点をグリッドにスナップ→共有アークを確実に検出（隙間防止）
let topo = topology({ m: { type: 'FeatureCollection', features } }, 12000);
console.log(`arcs: ${topo.arcs.length}`);
topo = presimplify(topo);
const MIN_WEIGHT = 0.5; // px² 未満の微小な凹凸を除去
topo = simplify(topo, MIN_WEIGHT);
const fc = feature(topo, topo.objects.m);

// --- SVGパス化 ---
function ringArea(r) {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) { const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % n]; a += x0 * y1 - x1 * y0; }
  return Math.abs(a) / 2;
}
function ringCentroid(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = r.length; i < n; i++) { const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % n]; const c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; }
  a *= 0.5; if (Math.abs(a) < 1e-6) return [r[0][0], r[0][1]];
  return [cx / (6 * a), cy / (6 * a)];
}
const dOfRing = (r) => 'M' + r.map((p) => `${p[0]} ${p[1]}`).join('L') + 'Z';

const geo = {};
for (const f of fc.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = '', best = null;
  const MIN_RING = 4.0; // これ未満の面積(px²)のリングは“かけら”とみなし除去
  // 最大の外周をもつポリゴン（=本体）を先に特定（ラベル位置＆必ず残す用）
  for (const poly of polys) {
    const a = ringArea(poly[0]);
    if (!best || a > best.area) best = { area: a, poly, c: ringCentroid(poly[0]) };
  }
  for (const poly of polys) {
    const extArea = ringArea(poly[0]);
    if (extArea < MIN_RING && poly !== best.poly) continue; // かけら除去（本体は必ず残す）
    for (const ring of poly) if (ringArea(ring) >= MIN_RING) d += dOfRing(ring);
  }
  const [cx, cy] = best.c;
  geo[f.id] = { d, cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10 };
}

const body =
  `// 自動生成（国土数値情報 行政区域 / TopoJSONでトポロジー保持簡略化）\n` +
  `export const GEO_VIEW = { w: ${W}, h: ${H} };\n` +
  `export const IBARAKI_GEO: Record<string, { d: string; cx: number; cy: number }> = {\n` +
  Object.entries(geo).map(([s, g]) => `  ${JSON.stringify(s)}: { d: ${JSON.stringify(g.d)}, cx: ${g.cx}, cy: ${g.cy} },`).join('\n') +
  `\n};\n`;
fs.writeFileSync(OUT, body);
console.log(`viewBox ${W}x${H} / ${Object.keys(geo).length}市町村 / 出力 ${(Buffer.byteLength(body) / 1024).toFixed(0)}KB`);
