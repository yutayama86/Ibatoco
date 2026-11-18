#!/usr/bin/env node
/**
 * 44市町村ごとの記事数と検索流入を reports/editorial/area-coverage.{md,json} に出す。
 *   node scripts/area-coverage.mjs           … 標準出力に要約
 *   node scripts/area-coverage.mjs --write   … レポートを書き出す（editorial:daily からも呼ぶ）
 * 読み取りだけ。記事・スナップショットは変更しない。計算は src/lib/area-coverage.mjs。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { THIN_COVERAGE_MAX, areaCoverageMarkdown, buildAreaCoverage } from '../src/lib/area-coverage.mjs';
import { todayJst } from '../src/lib/growth-engine.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_DIR = join(ROOT, 'reports/editorial');

export function loadAreas(root = ROOT) {
  const src = readFileSync(join(root, 'src/data/areas.ts'), 'utf8');
  return [...src.matchAll(/\{\s*slug:\s*'([a-z-]+)',\s*name:\s*'([^']+)',\s*region:\s*'([a-z]+)'/g)]
    .map(([, slug, name, region]) => ({ slug, name, region }));
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(md|mdx)$/.test(name) && !name.startsWith('_')) out.push(p);
  }
  return out;
}

const dateOnly = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/** 記事を読む。URL はページのルーティングと同じ規則（events・news は /〔collection〕/〔slug〕/、articles は /〔category〕/〔slug〕/） */
export function loadEntries(areas, root = ROOT) {
  const byName = new Map(areas.map((a) => [a.name, a.slug]));
  const entries = [];
  for (const collection of ['events', 'news', 'articles']) {
    const base = join(root, 'src/content', collection);
    if (!existsSync(base)) continue;
    for (const file of walk(base)) {
      const raw = readFileSync(file, 'utf8');
      const fm = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      let data;
      try { data = parse(fm[1]) ?? {}; } catch { continue; }
      const slug = relative(base, file).split(sep).pop().replace(/\.(md|mdx)$/, '');
      const path = collection === 'articles' ? `/${data.category}/${slug}/` : `/${collection}/${slug}/`;
      const municipalities = new Set(Array.isArray(data.municipalities) ? data.municipalities : []);
      for (const key of ['area', 'municipality']) if (typeof data[key] === 'string' && byName.has(data[key])) municipalities.add(byName.get(data[key]));
      entries.push({
        path,
        title: String(data.title ?? slug),
        collection,
        pubDate: dateOnly(data.pubDate ?? data.publishedAt),
        municipalities: [...municipalities],
        published: data.draft !== true && data.noindex !== true && data.sample !== true,
      });
    }
  }
  return entries;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const areas = loadAreas();
  const snapshotPath = join(ROOT, 'data/editorial/performance-snapshot.json');
  const snapshot = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, 'utf8')) : null;
  const report = buildAreaCoverage(areas, loadEntries(areas), snapshot);
  const today = todayJst();
  if (process.argv.includes('--write')) {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(join(REPORT_DIR, 'area-coverage.md'), areaCoverageMarkdown(report, { today }), 'utf8');
    writeFileSync(join(REPORT_DIR, 'area-coverage.json'), `${JSON.stringify({ generatedAt: today, ...report }, null, 2)}\n`, 'utf8');
    console.log(`市町村カバレッジを生成：reports/editorial/area-coverage.md（記事${THIN_COVERAGE_MAX}本以下 ${report.totals.thin}市町村）`);
  } else {
    for (const r of report.rows.slice(0, 10)) console.log(`${r.name}\t${r.articles}本\tクリック28日 ${r.clicks28 ?? '—'}`);
    if (!report.periodRecorded) console.log('※ ページ別の集計期間が未記録（旧データ）');
  }
}
