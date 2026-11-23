#!/usr/bin/env node
// 使い方: node scripts/source-watch-digest.mjs <official-source-watch.json>
// data/editorial/source-watch-digest.json を更新する（公式サイトの新着リンクの積み上げ）。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSourceWatchDigest } from '../src/lib/source-watch-digest.mjs';
import { todayDateOnlyString } from '../src/lib/date-only.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'data/editorial/source-watch-digest.json');
const input = process.argv[2];
if (!input || !existsSync(input)) {
  console.error('official-source-watch.json のパスを指定してください');
  process.exit(1);
}
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const report = read(input);
if (!Array.isArray(report.results)) {
  console.error('監視レポートの形式が不正です（results がない）');
  process.exit(1);
}
const digest = buildSourceWatchDigest(report, existsSync(OUT) ? read(OUT) : null, {
  registry: read(resolve(ROOT, 'data/editorial/event-registry.json')),
  sources: read(resolve(ROOT, 'data/editorial/official-source-watch.json')).sources,
  today: todayDateOnlyString(),
});
writeFileSync(OUT, `${JSON.stringify(digest, null, 2)}\n`);
console.log(`新着リンク：${digest.items.length}件（未登録 ${digest.items.filter((x) => !x.registered).length}件）を保存`);
