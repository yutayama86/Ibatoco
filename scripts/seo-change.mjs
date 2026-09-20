/**
 * SEO改善履歴にエントリを追加する。
 *
 *   npm run seo:log -- --url /news/foo/ --kind on-page --change "titleを改善" --queries "茨城 道の駅,道の駅 かさま"
 *
 * 手で src/data/seo-changes.ts を編集してもよいが、これを使うと
 *  - id と日付が自動で入る（付け忘れ・重複を防ぐ）
 *  - 直近のコミットハッシュが根拠として記録される
 *  - 指標欄を作らない（数値はGSCから取るという設計を崩さない）
 *
 * 引数なしで実行すると現在の履歴を一覧表示する。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const FILE = join(root, 'src/data/seo-changes.ts');
const KINDS = ['new-article', 'on-page', 'technical', 'internal-link', 'ogp'];

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const src = await readFile(FILE, 'utf8');

// 引数なし＝一覧表示
if (args.length === 0) {
  const rows = [...src.matchAll(/id: '([^']+)',\s*\n\s*date: '([^']+)',\s*\n\s*url: '([^']+)',\s*\n\s*kind: '([^']+)',\s*\n\s*change: '([^']+)'/g)];
  console.log(`SEO改善履歴 ${rows.length} 件（新しい順）\n`);
  for (const [, , date, url, kind, change] of rows) {
    console.log(`  ${date}  ${kind.padEnd(13)} ${url}`);
    console.log(`            ${change}`);
  }
  console.log('\n追加: npm run seo:log -- --url <URL> --kind <種類> --change "<変更内容>" [--queries "a,b"] [--note "…"]');
  console.log(`種類: ${KINDS.join(' / ')}`);
  process.exit(0);
}

const url = arg('url');
const kind = arg('kind');
const change = arg('change');
const queries = (arg('queries') ?? '').split(',').map((q) => q.trim()).filter(Boolean);
const note = arg('note');

if (!url || !kind || !change) {
  console.error('必須: --url --kind --change');
  console.error(`--kind は ${KINDS.join(' / ')} のいずれか`);
  process.exit(1);
}
if (!KINDS.includes(kind)) {
  console.error(`--kind が不正です: ${kind}\n使えるのは ${KINDS.join(' / ')}`);
  process.exit(1);
}
if (!url.startsWith('/') && url !== '*') {
  console.error("--url は '/' 始まりのパスか、サイト全体を表す '*' か、前方一致の '/news/*' で指定してください");
  process.exit(1);
}

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD

// --date は「後から過去の変更を記録する」ためだけに使う。
// 変更日がずれると GSC の比較期間（変更前7日／変更後7日・28日）ごとずれるので、
// 実際の本番反映日を入れること。未来日は受け付けない。
const date = arg('date') ?? today;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`--date は YYYY-MM-DD で指定してください: ${date}`);
  process.exit(1);
}
if (date > today) {
  console.error(`--date に未来の日付は指定できません: ${date}（今日は ${today}）`);
  process.exit(1);
}
// '/news/' と '/news/*' は別物なので、前方一致には -all を付けてidが衝突しないようにする
const slugBase = url === '*' ? 'site' : url.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
const slug = (url !== '*' && url.endsWith('*') ? `${slugBase}-all` : slugBase).slice(0, 40);
const id = `${date.replaceAll('-', '')}-${slug}`;
if (src.includes(`id: '${id}'`)) {
  console.error(`同じidが既にあります: ${id}\n同日・同URLの変更は1件にまとめるか、手でidを調整してください。`);
  process.exit(1);
}

// 根拠コミット。--commit を渡した場合は実在するか確認してから記録する
// （存在しないハッシュを残すと、後から変更内容を確かめられなくなるため）。
let commit = 'uncommitted';
const wantCommit = arg('commit');
if (wantCommit) {
  try {
    commit = execSync(`git rev-parse --short ${wantCommit}^{commit}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    console.error(`--commit がリポジトリに見つかりません: ${wantCommit}`);
    process.exit(1);
  }
} else {
  // 記録する変更はまだコミットされていないのが普通なので、ここでHEADを入れると
  // 常に「ひとつ前のコミット」を指してしまう（実際に5件それで誤っていた）。
  // 作業ツリーが汚れているあいだは PENDING とし、コミット後に npm run seo:seal で確定させる。
  let dirty = true;
  try { dirty = execSync('git status --porcelain', { cwd: root }).toString().trim().length > 0; } catch {}
  if (dirty) {
    commit = 'PENDING';
  } else {
    try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch {}
  }
}

const esc = (s) => s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
const entry = [
  '  {',
  `    id: '${id}',`,
  `    date: '${date}',`,
  `    url: '${esc(url)}',`,
  `    kind: '${kind}',`,
  `    change: '${esc(change)}',`,
  `    queries: [${queries.map((q) => `'${esc(q)}'`).join(', ')}],`,
  `    commit: '${commit}',`,
  ...(note ? [`    note: '${esc(note)}',`] : []),
  '  },',
].join('\n');

const anchor = 'export const SEO_CHANGES: SeoChange[] = [\n';
if (!src.includes(anchor)) {
  console.error('SEO_CHANGES の定義が見つかりませんでした。src/data/seo-changes.ts を確認してください。');
  process.exit(1);
}
await writeFile(FILE, src.replace(anchor, anchor + entry + '\n'));

console.log('追加しました:');
console.log(entry);
console.log(`\n※ 指標は入れません。変更日 ${date} を起点に、Apps Script が GSC から`);
console.log('   変更前7日 / 変更後7日 / 変更後28日 を自動で取り直します。');
