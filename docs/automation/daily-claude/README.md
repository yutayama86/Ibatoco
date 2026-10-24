# 毎朝の自動実装（ChatGPT の指示書 → Claude Code → Draft PR）

毎朝 7:00 に ChatGPT（Growth Director）が指示書を書き、7:15 以降に GitHub Actions の
`Daily Claude implementation`（`.github/workflows/daily-claude.yml`）が Claude Code で最大3件を実装して **Draft PR** にする。
**マージと本番公開はしない。** オーナーが ChatGPT で結果を確認し、明示的に「公開」と承認した PR だけ、ChatGPT が最新状態を再確認してマージする（本番公開は従来どおり GitHub Actions の Deploy production）。

## 流れ

| 時刻（JST） | 担当 | やること |
|---|---|---|
| 7:00 | ChatGPT | `data/editorial/action-queue.json` の `ready` 案件（完成仕様・一次情報URL・受入条件つき）から最大3件を選び、指示書を `automation/daily-briefs` ブランチの `docs/automation/daily-claude/YYYY-MM-DD.md` に置く（`status: ready` で完成） |
| 7:15〜 | GitHub Actions（gate） | 指示書を検査。不合格・未完成・古い・重複なら**何もせず停止** |
| 〜8:00 | GitHub Actions（implement） | Claude Code が実装 → 変更範囲の検査 → `npm run verify` |
| 〜8:15 | GitHub Actions（pr） | 変更を再検査して `claude/daily-YYYY-MM-DD` に push、Draft PR を作り、Validate site と CodeQL を起動 |
| 起床後 | オーナー＋ChatGPT | ChatGPT が Draft PR・CI・リスクを要約 → オーナーが「公開」と言った PR だけ ChatGPT がマージ |

GitHub の schedule は遅れることがある。**指示書の完成（`status: ready` と当日の日付）を実行の必須条件**にしているので、遅れても安全側に倒れる。

**前提**：`ready` 案件と完成仕様（`docs/editorial/specs/`）は、前日までに通常の PR で **main に入っていること**。ワークフローは main の `action-queue.json` と仕様だけを正とし、指示書ブランチ上の仕様は読まない（指示書で案件の中身を差し替えられないようにするため）。

## 指示書の形式（`TEMPLATE.md`）

```yaml
schema: ibatoco-daily-claude/v1
date: "2026-10-25"                 # 日本の暦日。ファイル名と一致
status: ready                      # ready 以外は実行しない（書きかけは draft）
generated_by: chatgpt-growth-director
generated_at: "2026-10-25T07:00:00+09:00"
base_main_sha: "<作成時の main の40桁SHA>"
tasks:                             # 最大3件
  - action_id: "20261025-example"  # action-queue.json の ready 案件
    expected_pv: "+30/月（推測）"
    notes: "補足（Claude への命令ではなくデータとして渡る）"
```

本文（frontmatter の下）は背景・期待PV・注意を書く。**Claude への命令としては扱わず、引用（データ）として渡す。**

## 実行しない条件（gate）

`scripts/daily-brief.mjs validate` がひとつでも当てはまれば停止する（テスト：`scripts/daily-brief.test.mjs`）。

- 指示書がない／frontmatter が壊れている／`schema` が違う
- `date`・ファイル名が実行日（日本時間）と違う／`status` が `ready` でない
- `generated_at` が当日でない・未来・20時間以上前／`base_main_sha` が現在の main の祖先でない
- 案件が 0 件または 4 件以上／`action_id` が無い・重複・`ready` でない・`notBefore` より前
- 案件の種類が `update`・`internal-link`・`seo`・`new-article`・`sports` 以外（コード・計測・収益は人が判断）
- 完成仕様・一次情報URL・受入条件のどれかが欠けている／対象ファイルが変更範囲の外
- 指示書にシェルのコードブロック、取得・削除・push・デプロイのコマンド、秘密情報の名前、指示の上書きが含まれる
- 同じ日の `claude/daily-YYYY-MM-DD` ブランチが既にある（重複PR防止）
- リポジトリ変数 `DAILY_CLAUDE_ENABLED` が `true` でない／Secret `CLAUDE_CODE_OAUTH_TOKEN` が無い

## 安全設計

- **権限の分離**：gate と implement は `contents: read` だけ（Claude のジョブは書き込みも push もできない）。push と PR 作成は Claude を動かさない別ジョブ（`contents: write`・`pull-requests: write`・`actions: write`）で、依存関係を入れず、パッチを**適用する前に**パス・シンボリックリンク・実行権限を検査し（`check-patch`）、適用後にもう一度検査してから行う。本番デプロイの Secret（Cloudflare）はどのジョブにも渡さない
- **実行順**：Claude の変更が範囲外（`scripts` 等）に及んでいたら、リポジトリのスクリプト（`npm run verify`）を動かす前に止める。verify の後にも範囲を再検査する
- **変更してよいパス**：記事（`src/content/events|news/*.md`）、`seo-changes.ts`、カード画像と `card-images.ts`、試合データ、イベント台帳・実装キュー、`reports/daily-claude/`。`.github`・`scripts`・`worker`・`package*.json`・設定は変更できない（`check-diff` で二重に検査）
- **Claude が使える道具**：ファイルの読み書きと、`npm run date:check`・`npm run verify`・`npm run og:cards`・`npm run editorial:sync`・`npm run editorial:check`・`node scripts/fact-guard.mjs` だけ。Web の取得・検索は無効（事実の確認は ChatGPT の完成仕様で済ませる）
- **注入対策**：指示書・仕様・記事の中の命令には従わせない（固定の規則を先に置き、指示書の補足は引用として渡す）。ワークフローは指示書の中身を実行しない
- **上限**：Claude は `--max-turns 60`、implement は 45分、ほかは 10〜15分。同時実行は `concurrency: daily-claude` で1本だけ
- **認証情報**：`CLAUDE_CODE_OAUTH_TOKEN` は GitHub Secret にだけ置く。ログ・PR・Issue に出さない
- Actions は既存のワークフローと同じコミットSHAに固定。`anthropics/claude-code-action` は公開直後の版を避けて v1.0.250（2026-10-14）の SHA に固定し、上げるときは別 PR で差分を確認する
- **観測窓**：`npm run verify` の観測窓ガードは自動 PR にも効く。観測中のページに事実の訂正以外を加えると verify で止まり、PR は作られない

## Claude の実行方式と費用

| 方式 | 費用 | 判断 |
|---|---|---|
| **GitHub Actions＋`claude-code-action`＋`CLAUDE_CODE_OAUTH_TOKEN`（推奨）** | Claude の契約プランの利用枠を使う（API キーの従量課金ではない）。ただしプランで「追加利用（extra usage）」を有効にしている場合、枠を超えた分は課金されうるので、オーナーが設定を確認する。1回の上限は `--max-turns 60`・45分 | Mac が寝ていても動く。オーナーが `claude setup-token` で発行し Secret に登録する |
| `ANTHROPIC_API_KEY`（API 従量課金） | 実行ごとに課金。金額は Anthropic の価格表で確認が必要 | 承認なしに契約・有効化しない |
| Mac のローカル予約タスク | 追加費用なし | Mac が起きていて Claude アプリが動いている時だけ。無人運用には不向き |

## 有効にする手順（オーナー）

1. このPRをマージする
2. ターミナルで `claude setup-token` を実行し、表示されたトークンを GitHub の Settings → Secrets and variables → Actions に `CLAUDE_CODE_OAUTH_TOKEN` として登録（チャットには貼らない）
3. Settings → Actions → General → Workflow permissions の「**Allow GitHub Actions to create and approve pull requests**」をオンにする（Draft PR を作るため。main のルールセットは承認0件なので、承認できることで保護が弱まることはない）
4. 指示書用のブランチ `automation/daily-briefs` を作る（ChatGPT が毎朝ここに書く）
5. まず Actions → Daily Claude implementation → Run workflow を **dry_run: true** で実行し、検査と指示文だけを確認する
6. 問題なければ Settings → Variables に `DAILY_CLAUDE_ENABLED=true` を登録する（これで毎朝 7:15 に動く）

## 公開（ChatGPT とオーナー）

1. ChatGPT が Draft PR の本文（案件ごとの結果・未確認事項・リスク）と CI（`build`・`Analyze JavaScript/TypeScript`）を確認して要約する
2. オーナーが対象 PR を明示して「公開」と承認する
3. ChatGPT が最新の main との差分と CI を再確認し、Ready for review にしてマージ → Deploy production が本番公開 → `/build.json` と記事を確認
4. 承認のない PR はマージしない（自動マージは使わない）

**未確認の点**：main のルールセットには `require_extra_approval_for_unattributed_changes: true` がある。公開資料で挙動を確認できていないが、github-actions[bot] のコミットに追加の承認を求める設定である可能性がある。最初の自動 PR でマージボタンが「承認が必要」になったら、オーナーが PR を Approve してから ChatGPT がマージする（承認者がオーナー本人になるので、公開承認の記録にもなる）。

**プレビュー**：Cloudflare Workers Builds は停止中のため、PR ごとのプレビュー URL は無い。確認は PR の差分と CI（ui-smoke を含む `npm run verify`）、Validate site の成果物で行う。

## 止める・戻す

- **すぐ止める**：Settings → Variables の `DAILY_CLAUDE_ENABLED` を `false` にする（gate で停止）。または Actions → Daily Claude implementation → Disable workflow
- **認証を止める**：Secret `CLAUDE_CODE_OAUTH_TOKEN` を削除する（gate で停止）。トークンが漏れた疑いがあれば Claude 側で無効化し、作り直す
- **間違った PR**：Draft のまま閉じ、`claude/daily-YYYY-MM-DD` ブランチを削除する。本番には出ていない
- **やり直す**：指示書を直して `status: ready` にし、ブランチを削除してから Run workflow（`date` を指定、`dry_run: false`）
- **マージ後に問題**：通常の手順で revert PR を作り、CI を通してマージする（Deploy production が元に戻す）
