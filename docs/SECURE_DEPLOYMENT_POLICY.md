# 本番公開・Cloudflare認証情報の運用方針（2026-10-23）

## 原則
- **ChatGPT = 判断・ディレクション・PR・CI結果の確認。** GitHub連携でコードとレビューを管理する。ChatGPTが直接Cloudflareの長期認証情報を保持することはしない。
- **GitHub Actions = 唯一の本番デプロイ経路。** `main` の `Validate site` が成功した後、`.github/workflows/deploy.yml` が Cloudflare Workers を更新する。
- **Claude Code / ローカルPC = 開発・プレビュー・PRまで。** 本番への `wrangler deploy` / `npm run deploy` は実行しない。緊急復旧も原則GitHub Actionsの手動 `workflow_dispatch` を使う。
- 本番認証情報はリポジトリの Actions Secret `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` に置く。トークン値をIssue、PR、チャット、ログに貼らない。
- Cloudflareトークンは対象アカウントの **Workers Scripts: Edit** に限定。対象Workerやルート変更などで追加権限が必要となった場合は、変更ごとに事前審査する。
- `/control/` のパスワード保護、noindex、SEO、公開後のHTTP検証を維持する。

## 変更・復旧
1. 作業ブランチに変更を作りPRへ提出。観測窓ガード・SEO・セキュリティ検証の承認規則を遵守する。
2. CIの全チェック成功と必要なレビュー・オーナー判断後にmainへマージする。
3. GitHub Actionsの自動デプロイを確認し、失敗なら **Cloudflareトークンを無闇に増やさず** 該当ステップのログで原因を特定する。
4. 公開後にサイト・重要ページ・`/control/` を確認する。問題時は元のコミットへGitHubでリバートしてCI経由で復旧する。
5. 旧トークンは、GitHub以外の利用先（ローカル、Claude Code、cron、他の連携サービス等）を洗い出し、代替手段の疎通確認ができてから失効する。

## 旧トークン廃止条件
- `IBATOCO Workers Deploy v2` による本番 `Deploy production #625` 成功を確認済み。
- `GitHub Ibatoco Deploy` と `ibatoco build token` は **未失効**。ローカル・外部利用を廃止した後に、Cloudflareダッシュボードで所有者が失効させる。
- 古いトークンの最終使用日だけでは「未使用」は判定しない。
- 検証用トークン・Secretは検証完了後に削除する。

## 定期デプロイ（毎朝 06:30）と計測データ（2026-10-27）
- 目的は、ビルド時の日付で決まる表示（イベントの終了・開催中・月別一覧）を毎朝切り替えること。出すのは**その時点の最新の main** だけ。
- 定期実行・手動実行では、出す版が **Validate site（main）に合格していること** を Actions の記録で確かめる。合格していなければ止める（workflow_run は Validate site の成功が起動条件なので確かめ直さない）。
- GA4/GSC の確定値（`data/editorial/performance-snapshot.json`）が古くても**止めない**。`scripts/deploy-preflight.mjs` が警告（::warning と Job Summary）を出すだけ。計測データは読むだけで、作らない・書き換えない。
- これまでどおり：最新の main 以外は出さない（Reject superseded deployment・Check latest main before deployment）、deploy-guard、監査とビルド、公開後の `/build.json` の SHA 照合と本番確認。
- Deploy production の権限は読み取りだけ（`contents: read`・`actions: read`）。テストは `scripts/deploy-guard.test.mjs`。
