#!/usr/bin/env node
/**
 * SEO改善履歴の commit: 'PENDING' を、直前に作った実際のコミットで確定させる。
 *
 *   git commit -m "…"      ← 変更とログ（PENDING のまま）を一緒にコミット
 *   npm run seo:seal       ← PENDING を実ハッシュに置換し、確定用のコミットを1つ積む
 *
 * ログのエントリは変更と同じコミットに入るため、記録した時点では自分の
 * コミットハッシュがまだ存在しない。かといって amend で埋めようとすると
 * amend 自体がハッシュを変えてしまい、永久に一致しない。
 * そこで「変更のコミット」と「参照を確定するコミット」を分けている。
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'src/data/seo-changes.ts');
const git = (c) => execSync(c, { cwd: root }).toString().trim();

const src = readFileSync(file, 'utf8');
const pending = (src.match(/commit: 'PENDING'/g) ?? []).length;
if (pending === 0) {
  console.log('PENDING のエントリはありません。何もしませんでした。');
  process.exit(0);
}

// 作業ツリーが汚れていると、どのコミットを指すべきかが確定しない。
const dirty = git('git status --porcelain')
  .split('\n')
  .filter((l) => l.trim() && !l.endsWith('src/data/seo-changes.ts'));
if (dirty.length > 0) {
  console.error('未コミットの変更が残っています。先にコミットしてください:');
  console.error(dirty.map((l) => `  ${l}`).join('\n'));
  process.exit(1);
}

const head = git('git rev-parse --short HEAD');
const subject = git('git log -1 --format=%s');

// 確定するのは、直前のコミット（HEAD）で追加された記録だけ。
// main には別の作業の PENDING が残っていることがあり、すべてを HEAD で埋めると
// 関係のない変更まで HEAD に紐づいてしまう（2026-11-10 に14件を誤って上書きしかけた）。
const addedIds = new Set(
  git('git show --format= --unified=0 HEAD -- src/data/seo-changes.ts')
    .split('\n')
    .map((line) => line.match(/^\+\s*id: '([^']+)'/)?.[1])
    .filter(Boolean),
);
if (addedIds.size === 0) {
  console.error('直前のコミットで src/data/seo-changes.ts に追加された記録がありません。');
  console.error('記録を追加したコミットの直後に実行してください（他の作業の PENDING は書き換えません）。');
  process.exit(1);
}

let sealed = 0;
const next = src.replace(/  \{\n([\s\S]*?)\n  \},?/g, (block, body) => {
  const id = body.match(/^\s*id: '([^']+)'/m)?.[1];
  if (!id || !addedIds.has(id) || !body.includes("commit: 'PENDING'")) return block;
  sealed += 1;
  return block.replace("commit: 'PENDING'", `commit: '${head}'`);
});
if (sealed === 0) {
  console.error(`直前のコミットで追加された記録（${[...addedIds].join(', ')}）に PENDING がありません。何もしませんでした。`);
  process.exit(1);
}

writeFileSync(file, next, 'utf8');
git('git add src/data/seo-changes.ts');
git(`git commit -m "chore(seo): 変更履歴の参照コミットを ${head} で確定"`);

const untouched = pending - sealed;
console.log(`PENDING ${sealed}件 を ${head} で確定しました。`);
if (untouched > 0) console.log(`  ほかの作業の PENDING ${untouched}件 は書き換えていません。`);
console.log(`  参照先: ${head}  ${subject}`);
console.log(`  確定コミット: ${git('git rev-parse --short HEAD')}`);
