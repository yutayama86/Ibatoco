#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_DIR = join(ROOT, 'data/revenue-imports/private');
const REPORT = join(ROOT, 'reports/editorial/revenue-import-inspect.md');
const STUB = join(ROOT, 'reports/editorial/revenue-import-mapping-stub.json');
const arg = process.argv.find((x) => x.startsWith('--input='));
const explicitInput = arg ? resolve(process.cwd(), arg.slice('--input='.length)) : null;

function decodeCsv(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buffer.subarray(3)), encoding: 'utf-8-bom' };
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const replacementRate = (utf8.match(/�/g)?.length ?? 0) / Math.max(1, utf8.length);
  if (replacementRate < 0.001) return { text: utf8, encoding: 'utf-8' };
  try {
    return { text: new TextDecoder('shift_jis', { fatal: false }).decode(buffer), encoding: 'shift_jis' };
  } catch {
    return { text: utf8, encoding: 'utf-8-uncertain' };
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

function cleanHeader(value) {
  return value.replace(/^\uFEFF/, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function inputFiles() {
  if (explicitInput) return [explicitInput];
  if (!existsSync(PRIVATE_DIR)) return [];
  return readdirSync(PRIVATE_DIR)
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .map((name) => join(PRIVATE_DIR, name));
}

const files = inputFiles();
const inspected = [];

for (const path of files) {
  if (!existsSync(path)) {
    console.error('Revenue Import Inspect: input not found: ' + path);
    process.exit(1);
  }
  const buffer = readFileSync(path);
  const decoded = decodeCsv(buffer);
  const rows = parseCsv(decoded.text);
  const headers = (rows[0] ?? []).map(cleanHeader);
  inspected.push({
    file: basename(path),
    encoding: decoded.encoding,
    rowCount: Math.max(0, rows.length - 1),
    columnCount: headers.length,
    headers,
  });
}

const normalizedFields = {
  provider: 'ASP/提供元ID',
  transaction_id: '重複排除用の成果ID・注文ID',
  status: 'confirmed判定',
  confirmed_at: '確定日',
  revenue_yen: '確定報酬額',
  page: '任意。イバトコ内の帰属ページ',
  order_amount_yen: '任意。注文金額',
  note: '任意。運用メモ',
};

const stub = {
  schemaVersion: 1,
  note: '列名だけを対応付ける。成果データそのものはGitへ保存しない。',
  mappings: inspected.map((item) => ({
    sourceFile: item.file,
    sourceHeaders: item.headers,
    target: Object.fromEntries(Object.keys(normalizedFields).map((key) => [key, null])),
  })),
};

const lines = [
  '# Revenue Import Inspector',
  '',
  '- 生CSVの値はレポートへ出さず、列名・件数・文字コードだけ確認する。',
  '- このレポートから自動で売上計上はしない。列対応が確定するまでImportを止める。',
  '',
];

if (!inspected.length) {
  lines.push('## 結果', '', '- CSVがありません。data/revenue-imports/private/ にASPのCSVを置いて再実行してください。', '');
} else {
  for (const item of inspected) {
    lines.push('## ' + item.file, '');
    lines.push('- encoding: **' + item.encoding + '**');
    lines.push('- data rows: **' + item.rowCount + '**');
    lines.push('- columns: **' + item.columnCount + '**', '', '### Headers', '');
    item.headers.forEach((header, i) => lines.push('- ' + (i + 1) + ': ' + (header || '(blank)')));
    lines.push('');
  }
}

lines.push('## 正規化先', '');
Object.entries(normalizedFields).forEach(([key, desc]) => lines.push('- ' + key + ': ' + desc));
lines.push(
  '',
  '## 次の処理',
  '',
  '- 列名を確認してASP専用mappingを1度だけ確定する。',
  '- mapping確定後は同形式CSVを自動変換する。',
  '- 未知の列構成は推測変換せず停止する。',
  ''
);

mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, lines.join('\n'), 'utf8');
writeFileSync(STUB, JSON.stringify(stub, null, 2) + '\n', 'utf8');
console.log(lines.join('\n'));
