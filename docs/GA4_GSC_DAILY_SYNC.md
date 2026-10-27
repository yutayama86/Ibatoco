# GA4/GSC 日次同期（Read-only GA4 and GSC via Google API）

最終確認：2026-10-27。ワークフローは `.github/workflows/google-analytics-daily.yml`、計測の設計は [GA4_MEASUREMENT.md](GA4_MEASUREMENT.md)・[GROWTH_ENGINE.md](GROWTH_ENGINE.md)。

## 仕組み

1. **fetch ジョブ**（毎日 05:30 JST・main）：Workload Identity で Google の公式 API を読む（鍵なし・読み取り専用）。GA4 の日別 Views・Sessions・engagedSessions・Organic Views と、GSC の日別クリック・表示回数・順位を取る。範囲は**確定日（今日の3日前）までの35日**（直近28日＋前7日の窓を API の結果だけで埋められる）。検査（preflight）を通ったものだけを artifact に置く
2. **sync ジョブ**（Google の認証情報なし）：artifact を検査し直し、`data/editorial/performance-snapshot.json` に合わせる → `npm run verify` → 同期 PR を出す
3. 同期 PR をオーナー（または承認を受けた担当）がマージ → Validate site → Deploy production

## 2026-10-25・26 の失敗の原因（確定）

- 失敗したステップ：sync ジョブの「Propose verified snapshot through protected PR」
- ログ：`pull request create failed: GraphQL: GitHub Actions is not permitted to create or approve pull requests (createPullRequest)`
- 原因：リポジトリ設定（Settings → Actions → General → Workflow permissions）の **「Allow GitHub Actions to create and approve pull requests」がオフ**。API でも `can_approve_pull_request_reviews: false`・`default_workflow_permissions: read` を確認した（2026-10-27）
- 取得（fetch）・検査・`npm run verify` は成功していた。**データは失われていない**：ブランチ `bot/google-analytics-daily-<run>` に残っており、Google 側にもある。次に成功した同期が35日分を取り直す
- 影響：スナップショットは 2026-10-21 のまま。06:30 の定期デプロイが「当日の確定指標が無い」で止まっていた（Deploy の切り離しは別の PR）

## この PR で直したこと

| 問題 | 対策 |
|---|---|
| 毎回 `bot/google-analytics-daily-<run>` を作るので、PR が作れる設定にすると**毎日 PR が増える** | 固定ブランチ `bot/google-analytics-daily` を毎回「最新の main＋当日のスナップショット」の1コミットに作り直す。開いている同期 PR があれば**それを更新**し、新しく作らない |
| PR を作れない設定だと、ジョブが毎日失敗する | 失敗にせず、**警告と Job Summary に「PR を開くリンク」**を出す。データはブランチに保存される。必須チェック（Validate site・CodeQL）はブランチで起動するので、PR を開いたときに結果が揃っている |
| 取得が32日分で、窓（35日）の一部を前回のスナップショットに頼っていた | 35日分を取る（`src/lib/ga4-daily.mjs` の `googleDailyRange`）。何日失敗していても、API の結果だけで窓を作り直せる |

変えていないこと：未取得の日を 0 にしない（取得・preflight・sync の3段で、空の応答・欠けた日・0 埋めの疑いを拒否する）。過去より古いデータで上書きしない（確定日が戻る更新は拒否）。Google の認証は fetch ジョブだけ・読み取りスコープだけ。

## 過去データの扱い

- スナップショットに持つのは直近35日（`GA4_DAILY_MAX_DAYS`）。それより前の日別値は、**Git の履歴**（マージされたスナップショット）と **Google 側**に残る
- 同期が止まっても、Google 側の値は消えない。再開した同期が35日分を取り直す。35日を超えて止まった期間も Google 側には残るので、必要なら手動で取り出せる（このワークフローは35日より前を書き込まない）
- 計測障害の期間は `data/editorial/measurement-incidents.json` に記録し、その日の値を本当の減少として扱わない

## 「Actions に PR の作成と承認を許す」設定のリスク

この設定をオンにすると、**このリポジトリのどのワークフローでも**、`GITHUB_TOKEN` に `pull-requests: write` を与えたジョブが PR を作り、**PR を承認（Approve）できる**ようになる。

| 観点 | いまのイバトコ |
|---|---|
| どのジョブが使えるか | 既定の権限は読み取り（`default_workflow_permissions: read`）。`pull-requests: write` を持つのは GA4/GSC 同期の sync ジョブだけ |
| 承認の悪用 | main の必須承認は0人なので、承認は今は関門になっていない。**将来「承認1人以上」を必須にするなら**、Actions が人の PR を承認して関門をすり抜けられるので、この設定はオフに戻すか、承認の条件（最後に push した人以外）を足す |
| フォークからの PR | フォークの PR のトークンは読み取り専用のまま（この設定で変わらない） |
| マージ | Actions の承認だけではマージされない。必須チェック（build・Analyze）とオーナーのマージは変わらない |
| 依存の乗っ取り | sync ジョブは Google の認証情報を持たず、`npm ci` と `npm run verify` を実行する。悪意ある依存が PR を作る可能性はある（作るだけ。マージはされない） |

## 選択肢の比較と推奨

| 案 | 権限 | 運用 | 推奨 |
|---|---|---|---|
| **B. 設定はオフのまま**（この PR のフォールバック） | 増やさない | 同期は毎日ブランチを更新。PR が無いときは、担当（ChatGPT かオーナー）が Job Summary のリンクから PR を1回開く。開いた後は毎日その PR が更新される（マージした翌日にまた1回開く） | **最小権限として推奨**。手作業はマージの頻度と同じ |
| A. 設定をオンにする | リポジトリ全体で、Actions に PR の作成・承認を許す | 完全に自動。毎日1本の PR が更新される | 自動化を優先するなら可。上のリスク表の条件（既定は読み取り・承認を関門に使わない）を守る |
| C. GitHub App／fine-grained token を Secret に置く | このリポジトリの PR 書き込みだけ。リポジトリ設定は変えない | 認証情報が1つ増え、更新・失効の管理が要る | 長期の認証情報を増やさない方針（SECURE_DEPLOYMENT_POLICY）と合わないので非推奨 |
| D. スナップショットを PR で回さない（artifact 等から直接読む） | — | ビルドとデータの関係を作り直す大改修 | 非推奨（今回の範囲を超える） |

## 設定を変えた後（または B で運用する）ときの確認手順

1. Actions → 「Read-only GA4 and GSC via Google API」→ Run workflow（main）
2. fetch ジョブ：`Google API preflight passed. GA4 dates=35, GSC dates=35` が出ること（35 未満なら Google 側の欠けを確認。0 で埋めない）
3. sync ジョブ：`Verified Google official daily metrics synced through <日付>` が出ること
4. 「Propose verified snapshot」：
   - A：`同期 PR を作成しました` か `既存の同期 PR #<番号> を更新しました`
   - B：警告「同期 PR を自動作成できません」と Job Summary のリンク → リンクから PR を開く
5. ブランチ `bot/google-analytics-daily` で Validate site と CodeQL が成功すること（PR の必須チェック）
6. **翌日もう一度実行され、PR が増えずに同じ PR が更新されること**（重複防止の確認）
7. PR をマージ → Deploy production 成功 → `/control/` と日次レポートの基準日が更新されること
8. 古いブランチ `bot/google-analytics-daily-40139261083`・`-40241362496`・`-40423209048` は役目を終えている。削除はオーナー承認後

## ChatGPT の日次運用（Windsor.ai）との関係

スナップショットは ChatGPT の日次運用でも更新されることがある（`source.primary` が Windsor.ai の日）。同じ日に両方が `windows.ga4`・`windows.gsc` を書くと PR が競合する。この同期が動き出したら、日別の GA4/GSC は**この同期を正**とし、ChatGPT は Windsor でしか取れない項目（上位ページ・検索語・送客イベントのページ別など）だけを更新する。
