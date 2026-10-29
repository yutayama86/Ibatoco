/**
 * GA4/GSC 日次同期の固定ブランチ（bot/google-analytics-daily）を、上書きしてよいかを確かめる。
 *
 * 同期は毎朝、このブランチを「最新の main ＋ 当日のスナップショット」に強制 push する。
 * 人がこのブランチ（同期 PR）に足した修正が main にまだ入っていないうちに上書きすると、修正が黙って消える（2026-10-28・#445）。
 * ブランチで変わったファイルのうち、同期が持つファイル（スナップショット）以外で、main と中身が違うものがあれば止める。
 * squash でマージ済みの修正は main と同じ中身になるので止めない。main を取り込んだマージコミットも止めない。
 *
 *   node scripts/sync-branch-guard.mjs <main の ref> <同期ブランチの ref>
 *   終了コード 0：上書きしてよい ／ 1：main に無い変更がある（上書きしない）／ 2：判定できない（共通の履歴が無い等。上書きしない）
 * ブランチがまだ無いときは呼ばない（.github/workflows/google-analytics-daily.yml）。
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** 同期が書き換えてよいファイル（これ以外の変更は人の修正として守る） */
export const SYNC_OWNED_FILES = ['data/editorial/performance-snapshot.json'];

const gitIn = (cwd) => (args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * main に入っていない、同期ブランチ上の変更（ファイル名）。
 * @param {{ main: string, branch: string, cwd?: string }} refs
 * @returns {string[]}
 */
export function pendingChanges({ main, branch, cwd = process.cwd() }) {
  const git = gitIn(cwd);
  const base = git(['merge-base', main, branch]).trim();
  const changed = git(['diff', '--name-only', base, branch]).split('\n').filter(Boolean);
  return changed.filter((file) => {
    if (SYNC_OWNED_FILES.includes(file)) return false;
    try {
      git(['diff', '--quiet', main, branch, '--', file]);
      return false; // main と同じ中身（マージ済み）
    } catch {
      return true;
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [main, branch] = process.argv.slice(2);
  if (!main || !branch) {
    console.error('使い方：node scripts/sync-branch-guard.mjs <main の ref> <同期ブランチの ref>');
    process.exit(2);
  }
  let pending;
  try {
    pending = pendingChanges({ main, branch });
  } catch (error) {
    console.error(`::error title=同期ブランチを判定できない::${branch} と ${main} の関係を確かめられないため、上書きしません（${String(error.message).split('\n')[0]}）`);
    process.exit(2);
  }
  if (pending.length) {
    console.error(`::error title=同期ブランチに未マージの修正::${branch} に main へ入っていない変更があるため、上書きしません：${pending.join('・')}。同期 PR をマージするか、変更を別の PR へ移してから、同期を再実行してください（docs/GA4_GSC_DAILY_SYNC.md）`);
    process.exit(1);
  }
  console.log(`${branch}：main に無い変更は無い（同期のスナップショットだけ）。上書きしてよい`);
}
