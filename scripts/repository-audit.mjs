/**
 * リポジトリ構造の退行を検知する軽量監査。
 * コンテンツやデザインを評価せず、責務分割と不要物だけを確認する。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const add = (message) => errors.push(message);
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const lines = (path) => read(path).split('\n').length;

const requiredCollections = [
  'src/collections/core.ts',
  'src/collections/news.ts',
  'src/collections/events.ts',
  'src/collections/foundations.ts',
];
for (const path of requiredCollections) {
  if (!existsSync(join(ROOT, path))) add(`必須のコレクション定義がありません: ${path}`);
  else if (lines(path) > 650) add(`${path} が650行を超えています。責務を追加する前に分割してください。`);
}

if (lines('src/content.config.ts') > 80) {
  add('src/content.config.ts は登録点だけにしてください（80行以下）。');
}

const interiorImports = [
  "@import './interior/foundation.css';",
  "@import './interior/listings.css';",
  "@import './interior/articles.css';",
  "@import './interior/places-areas.css';",
  "@import './interior/editorial-pages.css';",
  "@import './interior/motion.css';",
  "@import './interior/responsive.css';",
];
const interior = read('src/styles/interior.css');
let previous = -1;
for (const statement of interiorImports) {
  const index = interior.indexOf(statement);
  if (index < 0) add(`下層CSSの登録がありません: ${statement}`);
  if (index >= 0 && index < previous) add(`下層CSSの読み込み順が変わっています: ${statement}`);
  previous = index;
}

const ignored = new Set(['.git', 'node_modules', 'dist', '.astro']);
const junk = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(bak|orig|rej|tmp)$|~$|^\.DS_Store$/i.test(name)) junk.push(relative(ROOT, path));
  }
}
walk(ROOT);
if (junk.length) add(`不要な一時・バックアップファイルがあります: ${junk.join(', ')}`);

if (errors.length) {
  console.error(`リポジトリ監査で ${errors.length} 件の問題が見つかりました。`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('リポジトリ監査：コレクション分割・CSS読込順・不要物に問題なし');
