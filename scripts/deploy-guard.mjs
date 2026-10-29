/**
 * 本番デプロイの入口を、GitHub Actions の「Deploy production」（main）だけに絞る。
 *
 *   npm run deploy の先頭で実行される（package.json）。
 *
 * 手元のPC・Claude Code・Codex から npm run deploy を実行すると、ここで止まる。
 * Actions の中でも、別のワークフローや main 以外のブランチからの手動実行は止める
 * （CIを通っていない版で本番を上書きしないため）。
 *
 * 本番に出す手順は docs/SECURE_DEPLOYMENT_POLICY.md を正とする。
 */
const { GITHUB_ACTIONS, GITHUB_WORKFLOW, GITHUB_REF, GITHUB_EVENT_NAME } = process.env;

const problems = [];
if (GITHUB_ACTIONS !== 'true') problems.push('GitHub Actions の外で実行されています');
else {
  if (GITHUB_WORKFLOW !== 'Deploy production') problems.push(`ワークフロー「${GITHUB_WORKFLOW ?? '不明'}」からは本番デプロイしません（Deploy production だけ）`);
  if (GITHUB_REF !== 'refs/heads/main') problems.push(`main 以外（${GITHUB_REF ?? '不明'}）からは本番デプロイしません`);
}

if (problems.length) {
  console.error('本番デプロイを中止しました：');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('本番公開は、PRを main へマージしたあとの GitHub Actions「Deploy production」だけで行います。');
  console.error('緊急時も、同じワークフローを main で手動実行してください（npx wrangler deploy も手元では実行しない）。');
  process.exit(1);
}
console.log(`デプロイ経路の確認：GitHub Actions「Deploy production」（main・${GITHUB_EVENT_NAME ?? 'event不明'}）`);
