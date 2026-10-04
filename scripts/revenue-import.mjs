#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'data/editorial/revenue-ledger.json');
const PRIVATE_DIR = join(ROOT, 'data/revenue-imports/private');
const REPORT = join(ROOT, 'reports/editorial/revenue-import.md');
const writeLedger = process.argv.includes('--write-ledger');
const arg = process.argv.find((x) => x.startsWith('--input='));
const explicitInput = arg ? resolve(process.cwd(), arg.slice('--input='.length)) : null;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

const REQUIRED = ['provider', 'transaction_id', 'status', 'confirmed_at', 'revenue_yen'];
const OPTIONAL = ['page', 'order_amount_yen', 'note'];
const ALLOWED = new Set([...REQUIRED, ...OPTIONAL]);

function readNormalizedCsv(path) {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  if (rows.length < 2) return [];
  const header = rows[0].map(normalizeHeader);
  const missing = REQUIRED.filter((key) => !header.includes(key));
  const unknown = header.filter((key) => !ALLOWED.has(key));
  if (missing.length) throw new Error(`${basename(path)}: 必須列がありません: ${missing.join(', ')}`);
  if (unknown.length) throw new Error(`${basename(path)}: 未対応列があります: ${unknown.join(', ')}`);

  return rows.slice(1).map((values, index) => {
    const obj = Object.fromEntries(header.map((key, i) => [key, (values[i] ?? '').trim()]));
    if (!obj.provider || !obj.transaction_id) {
      throw new Error(`${basename(path)}:${index + 2}: provider / transaction_id は必須です`);
    }
    if (obj.status !== 'confirmed') {
      return { skipped: true, reason: `status=${obj.status || '(empty)'}`, sourceFile: basename(path) };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(obj.confirmed_at)) {
      throw new Error(`${basename(path)}:${index + 2}: confirmed_at は YYYY-MM-DD で指定してください`);
    }
    const revenue = Number(obj.revenue_yen);
    if (!Number.isFinite(revenue) || revenue < 0) {
      throw new Error(`${basename(path)}:${index + 2}: revenue_yen が不正です`);
    }
    if (obj.page && !obj.page.startsWith('/')) {
      throw new Error(`${basename(path)}:${index + 2}: page は / から始まるサイト内パスにしてください`);
    }
    const orderAmount = obj.order_amount_yen ? Number(obj.order_amount_yen) : undefined;
    if (orderAmount !== undefined && (!Number.isFinite(orderAmount) || orderAmount < 0)) {
      throw new Error(`${basename(path)}:${index + 2}: order_amount_yen が不正です`);
    }

    return {
      provider: obj.provider,
      transactionId: obj.transaction_id,
      status: 'confirmed',
      confirmedAt: obj.confirmed_at,
      revenueYen: revenue,
      ...(obj.page ? { page: obj.page } : {}),
      ...(orderAmount !== undefined ? { orderAmountYen: orderAmount } : {}),
      ...(obj.note ? { note: obj.note } : {}),
      importedFrom: basename(path),
    };
  });
}

if (!existsSync(LEDGER)) {
  console.error('Revenue Import: revenue-ledger.json がありません');
  process.exit(1);
}

let inputs = [];
if (explicitInput) {
  if (!existsSync(explicitInput)) {
    console.error(`Revenue Import: input not found: ${explicitInput}`);
    process.exit(1);
  }
  inputs = [explicitInput];
} else if (existsSync(PRIVATE_DIR)) {
  inputs = readdirSync(PRIVATE_DIR)
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .map((name) => join(PRIVATE_DIR, name));
}

const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const existing = new Set(
  (ledger.entries ?? []).map((entry) => `${entry.provider}::${entry.transactionId}`)
);

const imported = [];
const skipped = [];
for (const path of inputs) {
  for (const row of readNormalizedCsv(path)) {
    if (row.skipped) {
      skipped.push(row);
      continue;
    }
    const key = `${row.provider}::${row.transactionId}`;
    if (existing.has(key)) {
      skipped.push({ skipped: true, reason: 'duplicate', provider: row.provider, transactionId: row.transactionId });
      continue;
    }
    existing.add(key);
    imported.push(row);
  }
}

const nextLedger = {
  ...ledger,
  updatedAt: new Date().toISOString().slice(0, 10),
  entries: [...(ledger.entries ?? []), ...imported]
    .sort((a, b) => String(a.confirmedAt ?? '').localeCompare(String(b.confirmedAt ?? ''))),
};

const pageAttributed = imported.filter((x) => x.page).length;
const unattributed = imported.length - pageAttributed;
const revenue = imported.reduce((sum, x) => sum + Number(x.revenueYen ?? 0), 0);

const lines = [
  '# Revenue Import',
  '',
  `- 入力CSV: **${inputs.length}ファイル**`,
  `- 新規確定成果: **${imported.length}件**`,
  `- 今回の確定売上: **¥${revenue.toLocaleString('ja-JP')}**`,
  `- ページ帰属あり: **${pageAttributed}件**`,
  `- ページ帰属なし: **${unattributed}件**`,
  `- 重複/未確定スキップ: **${skipped.length}件**`,
  '',
  '## ルール',
  '',
  '- status=confirmed の行だけledgerへ入れる。',
  '- provider + transaction_id で重複排除する。',
  '- pageが無い売上はサイト全体売上には含めるが、ページRPMへは割り振らない。',
  '- 推測でページ帰属しない。',
  '- 生CSVはGitへコミットしない。',
  '',
];

mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, lines.join('\n') + '\n', 'utf8');

if (writeLedger && imported.length > 0) {
  writeFileSync(LEDGER, JSON.stringify(nextLedger, null, 2) + '\n', 'utf8');
}

console.log(lines.join('\n'));
if (!inputs.length) {
  console.log('\n入力CSVなし。処理対象はありません。');
}
