# 開発の手順書（ChatGPT・人・ほかのAI 共通）

最終確認：2026-10-27。ルールの正本は [AGENTS.md](../AGENTS.md)、構成は [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)。
この文書は「何をどの順で、どの検査を通して出すか」を書く。どのツールで作業しても同じ手順にする。

## 0. すべての変更に共通する流れ

1. **最新の main から始める**。作業前に main の最新コミットを確認する。別の担当が同じ変更を先にマージしていることがある（開いている PR も見る）
2. **作業ブランチを切る**。名前は `<種類>/<YYYYMMDD>-<短い説明>`（例：`content/20261101-koga-chochin`、`fix/20261101-booking-parser`）。main へ直接 push しない（ルールセットで拒否される）
3. **変更は小さく**。1つの PR に1つの目的。公開対象と関係のない差分を混ぜない
4. **検証する**（下の「検証の地図」）。手元で `npm ci` → `npm run verify` が理想。手元で実行できないときは、PR の CI（Validate site）が同じ検査を必ず実行する
5. **PR を作る**。最初は Draft。本文は [PR テンプレート](../.github/pull_request_template.md) を埋める。事実を扱う変更は出典 URL と確認日を書く
6. **CI を読む**。必須は `build`（Validate site）と `Analyze JavaScript/TypeScript`（CodeQL）。`Workers Builds: ibatoco` の失敗は既知で必須ではない
7. **オーナー承認を受けてからマージ**。マージ方法は squash（直線履歴が必須）
8. **本番反映を確かめる**。Deploy production の成功 → `https://ibatoco.jp/build.json` の `commit` がマージコミットと一致 → 公開 URL で中身を確認。ここまで揃って初めて「公開完了」（[RELEASE_MEASUREMENT_GATES.md](RELEASE_MEASUREMENT_GATES.md)）
9. **報告する**。PR 番号・マージ SHA・本番の確認結果・確認できなかったこと

止まったら：推測で直さない。CI のログで原因を特定し、同じブランチに修正コミットを積む。強制マージ・必須チェックの迂回・ワークフローの無効化はしない。

## 1. 開発依頼の受け方

依頼は GitHub の Issue テンプレート「開発依頼」（`.github/ISSUE_TEMPLATE/development-request.md`）か、同じ項目をチャットで受ける。最低限そろえるもの：

- 目的（誰の何が良くなるか）と、成功の判定方法
- 対象 URL・対象ファイル
- 一次情報（URL と確認日）— 記事・事実の変更のとき
- 変更してよい範囲／変更してはいけない範囲
- 公開の扱い（下書きのみ／承認後に公開）

完成仕様がある記事は `docs/editorial/specs/` が正本で、`data/editorial/action-queue.json` の `status: "ready"` が着手の合図。実装指示は毎朝 CI が `reports/editorial/implementation-brief.md` に出す（Validate site の artifact・Job Summary で読める）。

## 2. 新しい記事（ニュース・イベント）

ニュースの詳しい手順は [.claude/skills/news-post/SKILL.md](../.claude/skills/news-post/SKILL.md)（ファイルの場所は Claude 用だが、中身はどのツールでも同じ手順）。イベント記事は [EDITORIAL_OS.md](EDITORIAL_OS.md)。

| 手順 | 内容 | 落ちやすい所 |
|---|---|---|
| 一次情報 | 公式の発表で日付・曜日・時間・料金・会場を確認。開けない公式は「未確認」と書き、まとめサイトで埋めない | 「発表なし」と書く前に過去の発表一覧まで見る |
| ファイル | `src/content/news/<slug>.md` または `src/content/events/<slug>.md`。slug は英小文字・数字・ハイフン。年を入れる | 既存 slug と重複させない |
| frontmatter | スキーマは `src/content.config.ts`。`sourceUrls` は `{label, url, accessedAt}` のオブジェクト。作成時は `draft: true`・`reviewed: false` | 公開するときだけ `draft: false`＋`reviewed: true`（未確認のまま true にしない） |
| イベントの日付 | `eventInfo`（開始・終了）を必ず入れる | 無いと台帳の日付が null になり、終了判定が効かない |
| ニュースの OG 画像 | `public/images/news/<slug>.svg`（手書きの SVG。第三者の写真・ロゴは使わない） | XML コメントに `--` を書くと壊れる |
| 一覧カード画像 | `public/images/card/<slug>-<hash>.png` と `src/data/card-images.ts` は `npm run og:cards` が生成する | **コミットし忘れると CI が「記事カードのコミット漏れ」で失敗**。Node を実行できない場合は「Prepare generated files」ワークフロー（Actions の画面で作業ブランチを選んで Run workflow）か、オーナーが手元で生成 |
| 台帳 | イベント記事は `npm run editorial:sync` で `data/editorial/event-registry.json` へ同期。Node を実行できない場合は「Prepare generated files」で `sync_registry` をオンにする | 手で追記するときは、その1件だけ足す（並べ替えで差分を膨らませない） |
| 内部リンク | `relatedArticleUrls` は実在するページだけ。文言は `src/data/internal-links.ts` に登録 | 未登録だと「関連情報」という汎用ラベルになる |
| 検証 | `npm run verify:article -- <slug>`、`npm run verify` | 日付を扱うなら `npm run date:check` |
| 公開後 | `npm run verify:article -- <slug> --prod`、または公開 URL・一覧・OG 画像の HTTP 200 を確認 | 反映直後は旧版がキャッシュで返る。新版にしかない文字列で確かめる |

## 3. 画面（UI）の改修

1. 対象のテンプレート・部品を特定する（[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)）。TOP は固定版（AGENTS.md）なので、必須構成（FV3枚・テーマ6件・地図44件・取材と編集3件・事業者導線）を残す
2. 色・余白は `src/styles/global.css` のトークンと `docs/UI_TOKENS.md` の breakpoint（560/760/900/1180）に従う。1列のグリッドは `minmax(0,1fr)`。日付の書式（`src/lib/date-only.js`）・パンくずと FAQ の構造化データ（`src/lib/seo.ts`）・記事の幅のトークンなど、共通の管理箇所があるものはページで組み直さない（[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)「表示・処理の管理箇所」）
3. 送客部品（BookingGuide など）を触るなら、GA4 イベントの送信回数を変えない（6. 計測）
4. 検証：`npm run verify`（CI の ui-smoke が 11幅で横スクロール・はみ出し・画像・JS エラー・44px 未満のボタンを検査）。Visual Regression の差が5%を超えたページは、意図した変更か PR に書く
5. 既存ページの見た目を広く変える改修は、オーナー（クリエイティブの判断者）の承認を先にとる
6. 観測中のページのテンプレートを変えると、observation-guard が警告を出す（止めはしない）。警告の件数を PR に書く

## 4. SEO の改修（title・description・本文・内部リンク）

1. **観測窓を確認**：`npm run growth:check -- <path> --type <種類>`（種類は `data/editorial/growth-engine.json` の `observationWindows` のキー。`fact`・`measurement` は観測中でも変えてよい）。観測中は変えない（事実・計測の修正は例外）
2. 変えたら SEO 変更履歴に記録：`npm run seo:log -- --url <path> --kind <on-page|internal-link|technical|ogp|new-article> --change "<何をなぜ>"` → コミット → `npm run seo:seal`（記録の `PENDING` を直前のコミット SHA で確定するコミットを1つ積む）
   - Node を実行できない場合：`src/data/seo-changes.ts` の先頭に既存の記録と同じ形で1件足し、`commit: 'PENDING'` のまま PR に入れる。マージ前に、同じ PR へ「PENDING を変更コミットの短い SHA に置き換える」コミットを積む
   - 複数の PR が同時に `seo-changes.ts` の先頭へ追記すると必ず競合する。解消するときは記録を `  {`〜`  },` の塊ごと残す（区切りが抜けても build は通ってしまう。`astro check` で気づく）
3. 観測中のページを事実の修正で変えるときは、PR 本文か最新コミットに `observation-exception: fact — <理由>` を1行書く（`measurement`・`seasonal-official` もある）。書き足したら空コミットを push して CI をやり直す
4. 既存 URL を変えない。変えるならリダイレクト（`public/_redirects`）と sitemap の確認
5. title・H1 の一括変更、隠しテキスト、AI 向けだけの文章はしない（[PLATFORM.md](PLATFORM.md)「絶対にやらないこと」）

## 5. 収益化の施策

1. 方針の正本は [REVENUE_OS.md](REVENUE_OS.md)。公式情報を先に出し、報酬の有無で順番を変えない。広告・提携は明示する
2. 提携先と成果リンクは `src/data/affiliates.ts`。新しい提携の申請・契約はオーナーが行う（費用のかかるものは対象外）
3. 記事の予約案内は frontmatter の `booking`（`items` に `provider`・`url`・`kind`）。`kind: official` は収益の損失ではない
4. 計測：提携リンクのクリックは `outbound_booking_click`＋`paid_booking_click` が1回ずつ、公式リンクは `outbound_booking_click` だけ。イベント名は `scripts/data-audit.mjs` の `ALLOWED_EVENTS` にあるものだけ
5. 数字の扱い：クリック（GA4）・発生成果・未確定報酬（ASP）・確定売上（`revenue-ledger.json`）・入金を混ぜない。取れない値は `null`（0 にしない）
6. CTA の実験は観測期間中に構造を変えない（`data/editorial/revenue-mvp.json` の rules）

## 6. データ・計測の更新

| データ | 更新方法 | 注意 |
|---|---|---|
| GA4・GSC の確定値（`performance-snapshot.json`） | GitHub Actions「Read-only GA4 and GSC」が同期 PR を作る（設定がオフなら Job Summary のリンクから開く。#442・`docs/GA4_GSC_DAILY_SYNC.md`）。ChatGPT の日次処理（Windsor.ai）が更新することもある | 同期が動いている間、日別の GA4/GSC はこの同期を正とする。暫定値と確定値を混ぜない |
| 計測障害（`measurement-incidents.json`） | 期間と根拠を記録 | 部分回復を完全復旧としない |
| ASP 実績（`asp-results.json`） | オーナーの報告（管理画面）を記録 | 期間が ASP ごとに違う。率を ASP 間で比べない |
| 確定売上（`revenue-ledger.json`） | 確定した成果だけ。CSV は `npm run revenue:import`（生データは `data/revenue-imports/private/`・Git に入れない） | クリックや推定を売上にしない |
| Google Trends（`search-trends.json`） | オーナーが CSV を保存 → `npm run trends:import -- <CSV>` | Trends は相対値（proxy） |
| 人気ページ（`popular-pages.json`） | 日次の手更新 | 自動で上書きしない |

## 7. 依存関係の更新

- Dependabot が毎週月曜に PR を作る。CI（npm audit・verify・CodeQL）が通り、変更内容（リリースノート）に破壊的変更が無いことを確認してからマージを提案する
- GitHub Actions の更新（`actions/*` のメジャー更新）は、ワークフローの変更なのでオーナー承認
- Astro のメジャー更新は、ビルド・画面検査の差分を見てから。単独の PR にする

## 8. 検証の地図（何がどこで止まるか）

| 見たいもの | 検査 | 止める（CI 失敗）／知らせる（警告） |
|---|---|---|
| HTML・Astro の構造 | astro check（型）・quality-audit（h1 が1つ・main）・ui-smoke（骨格） | 止める |
| スマホ表示・横スクロール | ui-smoke（320〜1440px の11幅） | 止める |
| 文字切れ・はみ出し・余白 | ui-smoke（親に切られる文字・はみ出し・狭すぎる文字列） | 止める |
| 見た目の差 | visual-diff（PR のときだけ本番と比較） | 知らせる（判定しない） |
| 内部リンク切れ | quality-audit・本番の ui-smoke | 止める |
| title・description・canonical | quality-audit・tech-audit（重複）・index-health（canonical） | 止める |
| 構造化データ | quality-audit（JSON-LD の構文） | 止める |
| サイトマップ | index-health（重複・noindex 混入・draft 混入・欠落） | 止める |
| 画像の表示・代替テキスト | quality-audit（alt）・ui-smoke（404・読み込み失敗・歪み） | 止める |
| 予約・購買 CTA | ui-smoke（CTA のはみ出し・送客イベントの回数） | 止める |
| GA4 イベント | data-audit（許可リスト）・analytics-audit（CSP と送信先）・ui-smoke（送信回数） | 止める |
| 依存の脆弱性 | Validate site の npm audit（本番依存 high・全体 critical）・CodeQL・Dependabot | 止める |
| 日付・年度 | date-integrity・freshness-guard（年度違いは失敗、期限切れ表現は警告） | 止める／知らせる |
| 観測中ページの変更 | observation-guard（PR のみ） | 止める |
| 本番の反映 | Deploy production の verify-production・本番 ui-smoke・`/build.json` の SHA 照合 | 止める（デプロイが失敗扱い） |
| 本番の応答・セキュリティヘッダー | Public security smoke monitor（毎朝） | 知らせる（ワークフローの失敗） |
| 計測データの鮮度 | operator-os（2日以上古いと「ブロッカー」に出す） | 知らせる |

新しい検査を足すときは、対象ページと許容差を書き、誤検知が多いものは足さない。重要な失敗だけ CI を止め、軽微なものは日次レポートに出す。

## 9. CI が落ちたとき

よくある原因（2026-10 の実績）：

1. **観測窓**：CI を回した時点で観測中だった → 窓が明けてから再実行、または `observation-exception` を書く
2. **記事カードのコミット漏れ**：`npm run og:cards` の生成物が無い → 生成してコミット
3. **台帳の未同期**：新しいイベント記事が `event-registry.json` に無い → `npm run editorial:sync`（またはその1件を手で追加）
4. **`eventInfo` の欠落**：イベントの日付が取れない
5. **seo-changes.ts の競合解消ミス**：`astro check` が大量のエラー
6. 事実ガード・年度：URL の年と開催年の不一致、曜日の誤り（年を書かない日付は今年として判定される）

ログは Actions の該当ジョブの失敗したステップから読む。`::error title=…::` の行に原因と直し方が書いてある。

## 10. ChatGPT が GitHub で行う操作と、必要な権限

ChatGPT の GitHub コネクタで何ができるかは接続の設定で変わるので、ここでは**必要な操作**と**最小の権限**だけを書く。できない操作は「代わりに誰がするか」の列に従う。

| 操作 | 何に使うか | 必要な権限（GitHub App／fine-grained token の例） | できないときの代わり |
|---|---|---|---|
| ファイル・履歴・ブランチ・PR の差分を読む | 調査・レビュー | Contents: Read、Pull requests: Read、Metadata: Read | — |
| ブランチを作り、ファイルを変更してコミット | 実装 | Contents: Read and write | オーナーが GitHub の画面で編集 |
| PR を作る・本文を直す・Draft を外す・コメント | 提出と記録 | Pull requests: Read and write | オーナー |
| CI の結果とログを読む | 検証 | Checks: Read、Actions: Read（ログ）、Commit statuses: Read | オーナーが Actions の画面で確認 |
| 失敗したジョブの再実行、ワークフローの手動実行（Prepare generated files など） | 再検証・生成物の作成 | Actions: Read and write | オーナーが画面で「Re-run」「Run workflow」 |
| PR のマージ | 公開 | Contents: Read and write、Pull requests: Read and write | **オーナー承認が前提**。承認が無ければしない |
| Issue を作る・読む | 依頼の受付 | Issues: Read and write | チャット |

**与えない権限（必要としない）**：Administration（ルールセット・ブランチ保護）、Secrets、Variables、Environments、Workflows（`.github/workflows/` の変更。必要なときはオーナー承認のうえで一時的に）、Deployments、組織の権限。本番の Cloudflare には、ChatGPT はどんな形でも直接触らない。

## 11. Claude が手元でしていた作業の代わり

| Claude がしていたこと | これからの方法 |
|---|---|
| 手元で `npm run verify` | PR の Validate site が同じ検査をする。PR を出せば必ず走る |
| 手元のブラウザで画面確認（4幅） | CI の ui-smoke（11幅）と Visual Regression。最終確認はオーナーのスマホ |
| 一次情報の確認（公式サイトをブラウザで読む） | ChatGPT の閲覧。開けない公式は「未確認」と書く |
| Commons などの写真のライセンス確認 | ChatGPT の閲覧でファイルページを確認し、作者・ライセンス・撮影地を記録 |
| `npm run og:cards`（カード画像の生成） | 「Prepare generated files」ワークフロー（#440）／オーナーが手元で |
| `npm run editorial:sync` | 手で1件追加（形式は既存の記録に合わせる）。CI の editorial:check が検査 |
| `npm run seo:log`・`seo:seal` | 4. の手順で手書き |
| `npm run trends:import`・`revenue:import` | オーナーが手元で実行（CSV を Git に入れない） |
| フォント（`scripts/build-web-fonts.py`）の作り直し | まれ。OG 画像に無い字が出たときだけ。オーナーが手元で（Python と fonttools が必要） |
| Actions のログを API で読む | GitHub の画面、またはコネクタの Actions: Read |

## 12. ChatGPT と GitHub Actions だけで続けられるか（移管テスト・2026-10-27）

ChatGPT の接続で実際にどの操作ができるかは、接続の設定しだいで、ここでは**成功扱いにしない**。「実績」は GitHub の記録で確かめられたものだけ。いずれの操作も GitHub の画面上はオーナーのアカウント名義になるため、ChatGPT が自分で行ったか、オーナーが画面で行ったかは記録から区別できない。

| # | 作業 | 手順（この文書の節） | ChatGPT に要る操作 | Actions がすること | 状態 | 制約・残る手作業 |
|---|---|---|---|---|---|---|
| 1 | 新しいイベント記事 | 2. | ブランチ作成・ファイル追加・PR | Validate site で全検査 | **手順あり・未検証**（ChatGPT による新規イベント記事の PR はまだ無い） | カード画像（#2）と台帳の同期が必要 |
| 2 | 記事カード画像の生成 | 2.・11. | ワークフローの手動実行（Actions: write） | Prepare generated files（#440）が生成・検査・コミットし、必須チェックを起動 | **実績あり**（2026-10-28。テスト用ブランチでカード画像を1枚消して実行し、ボットが main と同じ画像を作り直してコミット、Validate site・CodeQL が成功。初回は生成ステップの不具合で失敗し、修正後に再実行） | 起動はオーナーか Actions: write を持つ連携。ボットのコミット後、必須チェックが同じブランチで走り終わるまで待ってからマージ。PR を開いたブランチでは、ボットの push による PR の CI が「承認待ち（action_required）」になり、PR が BLOCKED と表示される → オーナーが PR の「Approve workflows to run」を押す（下の注）。台帳の同期（`sync_registry`）も 2026-10-28 に実行して成功 |
| 3 | 既存記事の SEO 改善 | 4. | 記事と `seo-changes.ts` の編集・PR | 観測窓ガード・品質監査 | **実績あり**（#434・#437：`chatgpt/` ブランチの PR。seo-changes の記録を含む） | `seo:seal` の代わりに PENDING を手で SHA に置き換える |
| 4 | 共通 UI コンポーネントの改修 | 3. | 部品の編集・PR | ui-smoke（11幅）・Visual Regression（PR のみ・判定しない）・本番の UI 検査 | **手順あり・未検証** | マージ前に画面を目で見る手段が無い（PR プレビューは本番へ 301）。最終確認はオーナーのスマホ |
| 5 | 収益導線の改修 | 5. | `affiliates.ts`・記事の `booking`・部品の編集・PR | ui-smoke の送客イベント検査、毎朝の収益レポート（#439） | **手順あり・未検証** | 提携の申請・契約はオーナー |
| 6 | 自動テスト | 8. | CI の結果を読む（Checks: Read） | `npm run verify` を PR ごとに実行 | **実績あり**（どの PR でも CI が走る） | ChatGPT は手元でテストを実行できない。CI の結果がすべて |
| 7 | Draft PR の作成 | 0. | Pull requests: write | — | **実績あり**（#434 は Draft） | — |
| 8 | オーナー承認後のマージ | 0. | マージ（Contents・Pull requests: write） | — | **実績あり（操作者は未確認）**（#437 は `chatgpt/` ブランチでマージ済み。名義はオーナー） | 承認が前提。承認が無ければしない |
| 9 | Cloudflare への本番反映 | 0. | なし（マージで自動） | Deploy production（main の Validate 成功で起動） | **実績あり**（#431・#437 のマージ後に成功） | 定期デプロイの計測依存は #441 で外す |
| 10 | 公開後の動作確認 | 0. | 公開 URL と `/build.json` を閲覧で確認 | Deploy production 内の本番検証・UI 検査・SHA 照合、毎朝の公開監視 | **可能**（自動の確認は実績あり） | キャッシュで旧版が返ることがある。新版にしかない文字列で確かめる |

**ChatGPT だけでは完結しない操作（オーナーが行う）**：リポジトリ設定・Secret・Environment・ルールセット、Cloudflare の画面、ASP の申請と CSV、Google Trends の CSV、フォントの作り直し、緊急時の Cloudflare での巻き戻し、ブランチや Environment の削除。

**注：ボット（GitHub Actions）の push と PR の CI（2026-10-28 確認）**
- GitHub の仕様（2026年6月の変更）で、`GITHUB_TOKEN` による push や PR では、PR の `pull_request` の CI が自動では走らず「承認待ち（action_required）」になる。Actions の一覧では失敗に似た表示だが、失敗ではない
- このとき PR の必須チェック欄にはその承認待ちが出て、同じコミットで起動した `workflow_dispatch` の成功が反映されず、PR が BLOCKED になる（#445 で観測）
- 解消：オーナー（書き込み権限のある人）が PR の画面で「Approve workflows to run」を押す。または人がそのブランチへ1コミット足す（その push で CI が普通に走る）
- 対象：Prepare generated files（記事カード・台帳）と GA4/GSC 日次同期のボットのコミット
