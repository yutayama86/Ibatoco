# 毎朝の自動実装（ChatGPT の指示書 → Claude Code → Draft PR）

毎朝 7:00 に ChatGPT（Growth Director）が指示書を書き、7:15 以降に GitHub Actions の
`Daily Claude implementation`（`.github/workflows/daily-claude.yml`）が Claude Code で最大3件を実装して **Draft PR** にする。
**マージと本番公開はしない。** オーナーが ChatGPT で結果を確認し、明示的に「公開」と承認した PR だけ、ChatGPT が最新状態を再確認してマージする（本番公開は従来どおり GitHub Actions の Deploy production）。

## 流れ

| 時刻（JST） | 担当 | やること |
|---|---|---|
| 前日まで | ChatGPT → 通常の PR | 自動実装に回す案件を `data/editorial/action-queue.json` に `ready` で登録し、完成仕様を `docs/editorial/specs/` に置く。**main にマージされた案件だけ**が対象 |
| 7:00 | ChatGPT | `ready` 案件から最大3件を選び、指示書を `automation/daily-briefs` ブランチの `docs/automation/daily-claude/YYYY-MM-DD.md` に置く（`status: ready` で完成） |
| 7:15〜 | Actions：gate | 指示書を検査。指示書なし・同じ日の重複・不合格・古い・無効なら**何もせず停止** |
| 〜7:45 | Actions：implement | Claude Code が完成仕様どおりにファイルを編集（コマンドは実行できない） |
| 〜8:15 | Actions：verify | 認証情報のない別の環境で、変更範囲の検査 → 台帳同期（新しいイベント記事だけ）→ 観測窓ガード → `npm run verify` |
| 〜8:30 | Actions：pr | Claude なしで変更を再検査し、`claude/daily-YYYY-MM-DD` に push、Draft PR を作り、Validate site と CodeQL を起動 |
| 起床後 | オーナー＋ChatGPT | ChatGPT が Draft PR・CI・リスクを要約 → オーナーが「公開」と言った PR だけ ChatGPT がマージ |

GitHub の schedule は遅れることがある。**指示書の完成（`status: ready` と当日の日付）を実行の必須条件**にしているので、遅れても安全側に倒れる。

**前提**：ワークフローは main の `action-queue.json` と仕様だけを正とし、指示書ブランチ上の仕様は読まない（指示書で案件の中身を差し替えられないようにするため）。candidate を自動で ready にすることはしない。

## ChatGPT が毎朝見るもの・書くもの

**7:00 より前に見る**
- `data/editorial/action-queue.json`：`status: "ready"` の案件（main）。`notBefore` がある案件はその日まで使えない
- 前回の Actions「Daily Claude implementation」の実行結果（要約に「実装キュー：自動実装に回せるか」の一覧が出る。止まった理由もここに出る）
- 前日の自動 PR（`claude/daily-*`）の状態。未マージの PR と同じページを重ねて変えない

**7:00 に書く**：`automation/daily-briefs` ブランチの `docs/automation/daily-claude/YYYY-MM-DD.md`（形式は `TEMPLATE.md`）

```yaml
schema: ibatoco-daily-claude/v1
date: "2026-10-26"                 # 日本の暦日。ファイル名と一致
status: ready                      # ready 以外は実行しない（書きかけは draft）
generated_by: chatgpt-growth-director
generated_at: "2026-10-26T07:00:00+09:00"
base_main_sha: "<作成時の main の40桁SHA>"
tasks:                             # 最大3件
  - action_id: "20261025-tsuchiura-sangyosai-confirmed"   # main の ready 案件
    expected_pv: "設定しない（事実の更新）"
    notes: "補足（Claude への命令ではなくデータとして渡る）"
```

本文（frontmatter の下）は背景・期待PV・注意を書く。**Claude への命令としては扱わず、引用（データ）として渡す。** コードブロック・コマンド・秘密情報の名前を書くと検査で止まる。

**起床後に見る**：自動 PR の本文（案件・対象URL・期待PV、Claude の報告、観測窓の例外、実行ログ）、Checks（`build`・`Analyze JavaScript/TypeScript`）、Files changed。PR ごとのプレビュー URL は無い（Workers Builds 停止中）。

## ready にする条件（通常の PR で main に登録する）

`node scripts/daily-brief.mjs candidates` と同じ条件。実装キュー・仕様を変える PR では、このワークフローが Dry Run として一覧を出す。

- 種類が `update`・`internal-link`・`seo`・`new-article`・`sports` のどれか（コード・計測・収益は人が判断）
- 完成仕様（`specPath`）・一次情報URL（`primarySourceUrls`）・受入条件（`acceptanceCriteria`）・対象ファイル（`targetFile`）がある
- 対象ファイルが変更してよい範囲（下記）にある
- 対象ページが観測窓の中なら、事実の訂正などの例外を `"observationException": "fact — 理由"`（種類は fact / measurement / seasonal-official）で書く。**例外は main でレビューされた実装キューでだけ宣言できる**（指示書や Claude は宣言できない）

## 実行しない条件（gate）

- 指示書がない／同じ日の `claude/daily-YYYY-MM-DD` ブランチが既にある（重複防止）
- frontmatter が壊れている／`schema` が違う／`date`・ファイル名が実行日（日本時間）と違う／`status` が `ready` でない
- `generated_at` が当日でない・未来・20時間以上前／`base_main_sha` が現在の main の祖先でない
- 案件が 0 件または 4 件以上／上の「ready にする条件」を満たさない案件がある（ready が0件なら必ず止まる）
- 指示書にシェルのコードブロック、取得・削除・push・デプロイのコマンド、秘密情報の名前や値、指示の上書きが含まれる
- 変数 `DAILY_CLAUDE_ENABLED` が `true` でない／変数 `DAILY_CLAUDE_EXTRA_USAGE_OFF` が `true` でない／環境 `daily-claude` に使えるブランチの制限がない（Dry Run でも要約の「有効化の準備状況」に出る）

検査は `scripts/daily-brief.mjs`、テストは `scripts/daily-brief.test.mjs`（`npm run verify` に含む）。

## 安全設計

- **Claude はコマンドを実行できない**：使えるのは Read・Glob・Grep と、下の範囲への Edit/Write だけ。Bash・Web 取得・検索・サブエージェントは無効。`/proc`・ホーム・一時フォルダの読み取りも禁止
- **権限の根拠**：`claude-code-action` の agent モードは権限モードを変えない（v1.0.250 のソースで確認。`acceptEdits` を付けるのは tag モードだけ）ため、許可した道具以外は使えない。リポジトリに `.claude/settings.json`・`.mcp.json` を追加すると自動実装の権限・フックにも効くので、追加する PR は必ずレビューする（2026-10-25 時点でどちらも無い）
- **Claude が書ける範囲**：`src/content/events/**`・`src/content/news/**`・`src/data/seo-changes.ts`・`src/data/sports/matches/**`・`data/editorial/event-registry.json`・`data/editorial/action-queue.json`・`reports/daily-claude/**`。`.github`・`scripts`・`worker`・`package*.json`・設定は変更できない
- **Claude の書いた内容は、認証情報のあるジョブで実行しない**：`seo-changes.ts` などは verify で実行されるため、verify は Claude の認証を持たない別のジョブ（新しい環境）で行う
- **権限の分離**：gate・implement・verify は `contents: read` だけ。push と PR 作成は Claude を動かさない pr ジョブ（`contents: write`・`pull-requests: write`・`actions: write`）で、依存関係を入れず、パッチを適用する前にパス・シンボリックリンク・実行権限・認証情報の文字列を検査し、適用後にもう一度検査する。本番デプロイの Secret（Cloudflare）はどのジョブにも渡さない
- **Claude の認証は main だけ**：`CLAUDE_CODE_OAUTH_TOKEN` は環境 `daily-claude`（使えるブランチを main に制限）の Secret に置く。別ブランチのワークフローからは使えない。gate は環境の制限がないと止まる
- **観測窓**：自動 PR は `pull_request` のワークフローが動かないため、verify で観測窓ガードを明示的に実行する。例外は実装キューの `observationException` だけで、PR 本文とコミットにも残す
- **本番との関係**：Deploy production は main への push 後の Validate 成功と、main の定期・手動実行でしか動かない。自動 PR の Validate（ブランチの手動起動）では動かない。マージには必須チェックの成功が要る
- **注入対策**：指示書・仕様・記事の中の命令には従わせない（固定の規則を先に置き、指示書の補足は引用として渡す）。ワークフローは指示書の中身を実行しない
- **上限**：1日1回（同じ日のブランチがあれば止まる）、最大3件、Claude は `--max-turns 60`・implement 30分。同時実行は1本だけ
- Actions はコミットSHAに固定。`anthropics/claude-code-action` は公開直後の版を避けて v1.0.250（2026-10-14）に固定し、上げるときは別 PR で差分を確認する
- **PR での Dry Run**：この仕組み・実装キュー・仕様を変える PR では、gate だけが Dry Run で動き（Claude・push はしない）、実在しない案件で通る指示書・止まる指示書を自己診断する

## Claude の実行方式と費用

| 方式 | 費用 | 判断 |
|---|---|---|
| **GitHub Actions＋`claude-code-action`＋`CLAUDE_CODE_OAUTH_TOKEN`（推奨）** | Claude の契約プランの利用枠を使う（API キーの従量課金ではない）。**claude.ai の「Usage credits」（旧称：追加利用・extra usage）がオンだと、枠を超えた分が課金されうる**。オフなら枠を超えた日は実行が失敗して止まるだけ（PR は作られない） | オーナーが Usage credits をオフにしたことを確認し、変数 `DAILY_CLAUDE_EXTRA_USAGE_OFF=true` を登録するまで Claude は動かない |
| `ANTHROPIC_API_KEY`（API 従量課金） | 実行ごとに課金 | 追加費用ゼロ原則に反するため使わない |
| Mac のローカル予約タスク | 追加費用なし | Mac が起きていて Claude アプリが動いている時だけ。無人運用には不向き |

GitHub Actions は、GitHub の料金案内では公開リポジトリの標準ランナーが無料（このワークフローは1日1回・合計30〜60分程度）。自動実装の分だけ、オーナー自身が使える Claude の利用枠は減る。

## 有効にする手順（オーナー・画面操作）

GitHub の画面は、リポジトリ `yutayama86/Ibatoco` の上部「Settings」から入る。

1. **PR #421 をマージする**（ChatGPT の確認後。この時点では Claude は動かない）
2. **Claude の Usage credits をオフにする**
   - claude.ai にログイン → 左下のアカウント名 → Settings → Usage
   - 「Usage credits」（旧称：追加利用・extra usage）をオフにする。オフの間は、プランに含まれる利用枠だけになる
   - 公式ヘルプによると、Usage credits をオフにすると fast mode は使えなくなる
3. **環境 `daily-claude` を作り、main だけに制限する**
   - Settings → 左メニュー「Environments」→「New environment」→ Name に `daily-claude` →「Configure environment」
   - 「Deployment branches and tags」を「No restriction」から「Selected branches and tags」に変える
   - 「Add deployment branch or tag rule」→ Ref type は「Branch」、Name pattern は `main` →「Add rule」
   - 「Required reviewers」「Wait timer」は設定しない（7:15 の無人実行が承認待ちで止まるため）
4. **Claude の認証トークンを登録する**
   - Mac のターミナル（アプリ「ターミナル」）で `claude setup-token` を実行 → ブラウザで claude.ai の承認画面が開く → 承認する
   - ターミナルに表示されたトークンをコピーする（有効期限1年。どこにも保存されないので、この場でだけ使う。チャット・メモ・PR には貼らない）
   - 手順3の環境の画面の「Environment secrets」→「Add environment secret」→ Name は `CLAUDE_CODE_OAUTH_TOKEN`、Value に貼り付け →「Add secret」
   - リポジトリ全体の Secrets（Settings → Secrets and variables → Actions の Secrets タブ）には置かない
5. **Actions に PR の作成を許可する**
   - Settings → 左メニュー「Actions」→「General」→ いちばん下の「Workflow permissions」
   - 「Read repository contents and packages permissions」は**そのまま**（Read and write に変えない）
   - 「Allow GitHub Actions to create and approve pull requests」にチェック →「Save」
6. **main で Dry Run する**
   - 上部「Actions」→ 左の一覧「Daily Claude implementation」→ 右の「Run workflow」→ Branch は `main`、date は空、dry_run はチェックのまま →「Run workflow」
   - 実行を開き、Summary の「有効化の準備状況」で「環境 daily-claude：main だけで使える設定あり」になっていることを確認する（Secret の有無はここには出ない）
7. **変数を2つ登録する**（手順7と8は、同じ日の 7:15 より後にまとめて行う。変数を入れると翌朝 7:15 から自動で動くため、手動実行の結果が悪ければその日のうちに `DAILY_CLAUDE_ENABLED` を `false` に戻す）
   - Settings → 左メニュー「Secrets and variables」→「Actions」→「Variables」タブ →「New repository variable」
   - Name `DAILY_CLAUDE_EXTRA_USAGE_OFF`、Value `true` →「Add variable」（手順2を済ませたことの確認）
   - Name `DAILY_CLAUDE_ENABLED`、Value `true` →「Add variable」（これで翌朝 7:15 から自動で動く）
8. **初回の手動実行**（下の「初回の手動実行」。オーナーが見ている日に行う）

## 初回の手動実行（土浦市産業祭の ready 案件）

1. ChatGPT が、土浦市の開催案内（第50回土浦市産業祭、https://www.city.tsuchiura.lg.jp/kanko-bunka-sports/kanko-matsuri-event/news/page022255.html ）が仕様を作った時点（2026-10-25確認・9/10更新）から変わっていないことを確かめる。変わっていたら、先に仕様を通常の PR で直す
2. ChatGPT が、実行する日の指示書を `automation/daily-briefs` の `docs/automation/daily-claude/YYYY-MM-DD.md` に置く（例）

```yaml
---
schema: ibatoco-daily-claude/v1
date: "YYYY-MM-DD"                          # 実行する日（日本時間）
status: ready
generated_by: chatgpt-growth-director
generated_at: "YYYY-MM-DDTHH:MM:00+09:00"   # 書いた時刻（実行と同じ日・20時間以内・未来でない）
base_main_sha: "<書いた時点の main の40桁SHA>"
tasks:
  - action_id: "20261025-tsuchiura-sangyosai-confirmed"
    expected_pv: "設定しない（事実の更新）"
    notes: "カレーフェス本体の未発表事項は変更しない"
---
初回の自動実装の試験。土浦市の開催案内が仕様作成時から変わっていないことを確認してから書いた。
```

3. オーナーが Actions → Daily Claude implementation → Run workflow（Branch `main`、date 空、**dry_run のチェックを外す**）→「Run workflow」
4. 4つのジョブ（Check the brief → Implement → Verify → Open a Draft PR）が成功し、`【自動・Draft】毎朝の記事改善（YYYY-MM-DD）` の Draft PR ができることを確認する。PR に Validate site・CodeQL のチェックが付くことも確認する
5. ChatGPT が PR の差分を仕様（`docs/editorial/specs/20261025-tsuchiura-sangyosai-confirmed.md`）と照らし、問題なければ通常の公開手順へ。おかしければ PR を閉じて、変数 `DAILY_CLAUDE_ENABLED` を `false` にする

## 公開（ChatGPT とオーナー）

1. ChatGPT が Draft PR の本文（案件ごとの結果・未確認事項・リスク）と CI（`build`・`Analyze JavaScript/TypeScript`）を確認して要約する
2. オーナーが対象 PR を明示して「公開」と承認する
3. ChatGPT が最新の main との差分と CI を再確認し、Ready for review にする
4. **Approve が求められたら**：main のルールセットの `require_extra_approval_for_unattributed_changes: true` により、github-actions[bot] が作った PR には人の Approve が1件要る可能性が高い（GitHub の公式文書では未確認。他リポジトリの報告では、アプリが作った PR は承認0件の設定でも人の承認待ちになる）。オーナーの承認を受けて Approve してからマージする。この設定は安全側なので変更しない
5. マージ → Deploy production が本番公開 → `/build.json` と記事を確認
6. 承認のない PR はマージしない（自動マージは使わない）

## 止める・戻す

- **すぐ止める（翌朝から動かさない）**：Settings → Secrets and variables → Actions → Variables の `DAILY_CLAUDE_ENABLED` の鉛筆 → Value を `false` →「Update variable」（gate で停止する）
- **実行中を止める**：Actions → 実行中の Daily Claude implementation を開く →「Cancel workflow」
- **ワークフローごと止める**：Actions → 左の「Daily Claude implementation」→ 右上の「…」→「Disable workflow」
- **認証を止める**：Settings → Environments → `daily-claude` → Environment secrets の `CLAUDE_CODE_OAUTH_TOKEN` を削除する。Secret を消してもトークン自体は1年間有効なまま。漏れた疑いがあれば claude.ai の設定の Claude Code の項目でトークンを無効化する（公式の手順は未確認。利用者の報告では claude.ai/settings/claude-code）。`claude setup-token` をもう一度実行しても古いトークンは無効にならない
- **間違った PR**：Draft のまま「Close pull request」→「Delete branch」。本番には出ていない
- **やり直す**：指示書を直して `status: ready` にし、その日の `claude/daily-YYYY-MM-DD` ブランチを削除してから Run workflow（`date` を指定、`dry_run` を外す）
- **マージ後に問題**：通常の手順で revert PR を作り、CI を通してマージする（Deploy production が元に戻す）
