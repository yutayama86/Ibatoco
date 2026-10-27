# イバトコ実装・公開ルール

このファイルを、開発を担当するすべてのツール（ChatGPT・Claude Code・Codex・人）に共通の品質・実装・公開判断の正本とする。ツール固有の差分だけを各ツールの設定（Claude は CLAUDE.md）に置く。

## 開発の入口（最初に読む）

- 構成と主要ファイルの責務：[docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)（「正本の地図」でどの文書を読むか分かる）
- 作業の手順（記事・UI・SEO・収益・データ・依存更新・CI が落ちたとき・GitHub で必要な権限）：[docs/DEVELOPMENT_PLAYBOOK.md](docs/DEVELOPMENT_PLAYBOOK.md)
- 本番の取り消し：[docs/ROLLBACK_RUNBOOK.md](docs/ROLLBACK_RUNBOOK.md)
- 現状の監査（維持・改善・廃止候補・未確認）：[docs/CHATGPT_MIGRATION_AUDIT.md](docs/CHATGPT_MIGRATION_AUDIT.md)
- 依頼は Issue テンプレート「開発依頼」、PR は `.github/pull_request_template.md` を使う

## 開発の原則

- 最新の main を正本とする。着手前に main と開いている PR を確認し、同じ変更を重複して作らない。
- すべての変更は 作業ブランチ → Draft PR → CI → オーナー承認 → マージ → GitHub Actions「Deploy production」。main へ直接 push しない。
- 1つの PR に1つの目的。公開対象と関係のない差分を混ぜない。大規模なリファクタリングを目的にしない。
- 既存の機能・URL・SEO（title・canonical・構造化データ・サイトマップ）・計測（GA4 イベント）・収益導線を壊さない。
- 事実は一次情報で確認する。確認できないことは書かないか「未確認」と書く。取得できない数値は 0 で埋めず null や「未取得」とする。
- 売上・推定収益・発生成果・確定報酬・入金を混同しない（docs/REVENUE_OS.md）。
- 実行できなかった検証は成功扱いにせず「未実施」と報告する。

## 変更してはいけないもの（オーナーの個別承認が必要）

- 本番デプロイの経路と `scripts/deploy-guard.mjs`、`.github/workflows/`、main のルールセット、CodeQL・Dependabot・依存の監査
- Cloudflare・GitHub の Secret・Variable・Environment・トークン（値を出力・保存・送信もしない）
- `/control/` の認証（`worker/index.js`）と `wrangler.jsonc` の `run_worker_first`、`public/_headers` の CSP を弱める変更
- GA4・GSC の計測設定、`scripts/data-audit.mjs` の `ALLOWED_EVENTS` を増やす以外の計測の変更
- 既存 URL・TOP の必須構成・44市町村の地図データ
- 有料サービス・有料 API・従量課金の追加、提携・広告の契約
- 削除（記事・ブランチ・Environment・PR のクローズ）とマージ

## 検証の手順

1. `npm ci`
2. `npm run verify`（事実ガード・型・ビルド・Index Health・品質/技術/セキュリティ/データ/計測の監査・観測窓（PR）・単体テスト・鮮度・画面検査）。手元で実行できない場合は PR の Validate site の結果で確認する
3. 記事は `npm run verify:article -- <slug>`、日付を扱う変更は `npm run date:check`
4. PR の必須チェック `build`・`Analyze JavaScript/TypeScript` の成功を確認する（`Workers Builds: ibatoco` の失敗は既知で必須ではない）
5. マージ後は Deploy production の成功と `https://ibatoco.jp/build.json` の commit を確認し、公開 URL で中身を確かめる

## ニュース公開の安全基準

- 架空の出来事、発言、数値、制度、店舗、人物を生成しない。
- 日付、数値、制度、運行、料金、試合・イベント情報は一次情報で確認する。
- 他媒体の記事を丸写し、または表現だけを変えて再掲載しない。事実を確認し、イバトコ独自の解説を加える。
- 公式写真、ロゴ、キャラクター、SNS画像は、利用条件を確認せずに使用しない。
- `sourceUrls` に確認した情報源URLと表示名を保持する。
- `draft`、`reviewed`、`noindex` の公開制御を削除・迂回しない。
- 実装確認用サンプルは `sample: true` かつ `noindex: true` とし、実際のニュースと誤認させない。
- 既存URL、canonical、構造化データ、TOPの確定デザインを破壊しない。
- 公開前に `npm run verify` を通す。事実ガード、型検査、ビルド、内部リンク・メタ情報等の品質監査を一回の経路で行う。


## 日付は日本基準で固定

- イバトコの「今日」「明日」「今週末」、開催中・終了判定、曜日、公開画面の表示はすべて `Asia/Tokyo`（日本時間）を基準にする。
- `YYYY-MM-DD` は時刻ではなく日本の暦日として扱う。`new Date('YYYY-MM-DD')`、暗黙のローカル時刻変換、`getFullYear/getMonth/getDate/getDay` による暦日処理は禁止する。
- 日付の解析・比較・加算は `src/lib/date-only.js` を使う。表示時もタイムゾーンを `Asia/Tokyo` と明示する。
- 開始日、終了日、曜日は公式一次情報と公開画面の両方を照合する。frontmatterが正しくても、画面が1日前後していれば公開不可。
- 日付を扱う変更では `npm run date:check` と `npm run verify` を必ず通す。米国時間のビルド環境でも日本の公式日付が変わらないことを維持する。

## 公開の判断

- 原則は下書きで作成し、未確認のまま reviewed: true にしない。
- 既存の自動公開承認は、依頼された通常のEditorialニュースについて、事実の裏付け・必要な検証・既存URL維持をすべて満たす範囲に限る。下書きのみの依頼では公開しない。
- 公式一次情報を優先し、裏付けのない事実は掲載しない。npm run verify が成功し、既存URLを変更せず、公開対象以外の差分を含めないこと。
- 既存記事の訂正・取り下げ、広告・提供・PR、URL変更、解釈の分かれる事実、workflow・権限・認証・課金の変更は、自動公開承認の範囲外。対象を示して確認する。
- 編集責任者の確認、または上記の承認済み条件の確認を終えてから reviewed: true にする。公開する場合だけ draft: false にする。実行時の承認要求を迂回しない。
- ニュース作成・検証・公開の具体手順は .claude/skills/news-post/SKILL.md を必要時に読む。進行中のGit操作を自動で中断・続行・rebaseしない。

## 本番公開の経路

- 正本は [docs/SECURE_DEPLOYMENT_POLICY.md](docs/SECURE_DEPLOYMENT_POLICY.md)。本番公開は GitHub Actions の「Deploy production」（main）だけ。緊急時も同じワークフローを main で手動実行する。
- 変更は 作業ブランチ → PR → CI・セキュリティ検証・観測窓ガード → 承認後に main へマージ。main へ直接 push しない。マージは上記「公開の判断」と既存の承認ルールに従う。
- 手元のPC・Claude Code・Codex から `npm run deploy`・`npx wrangler deploy`・`wrangler login`・`wrangler secret` を実行しない。`npm run deploy` は `scripts/deploy-guard.mjs` により Deploy production（main）以外では止まる。Cloudflareトークン・GitHub Secrets を作成・変更・削除せず、値を出力しない。

## 現行TOPは固定版

2026年8月9日に本番確認したTOPページを唯一の正とします。旧プレビュー、旧バックアップ、過去の設計書、git履歴上の旧`index.astro`からTOPを復元してはいけません。

TOPを変更する前に、必ず次の現行ファイルをすべて確認してください。

- `src/pages/index.astro`
- `src/components/HomeThemeNav.astro`
- `src/components/HomeAreaExplorer.astro`
- `src/components/HomeEditorialProcess.astro`

現行TOPに必須の構成：

- 5秒間隔のFVスライド3枚
- 「イバトコをつくった理由」
- 横一列のテーマカード6件
- PCではテキスト左・地図右の44市町村マップ
- TOPの市町村選択は概要表示ではなく、各`/area/[slug]/`へ直接遷移
- 「取材と編集」は3項目
- 地域事業者向け導線

これらを削除、旧版へ置換、別コンポーネントへ差し戻す変更は禁止します。変更が必要な場合は、現在の実装へ最小差分で加えてください。

## ブランドと品質

- ブランドの中核は「信頼」「地域の一次情報」「地域の価値が正しく伝わる仕組み」。
- 地域情報の羅列ではなく、地域価値編集ブランドとして設計する。
- 短期PVより長期的な信頼と紹介を優先する。
- 架空の写真、人、口コミ、取材履歴、SNS URL、数値、実績、順位表現を作らない。
- PR・Partner・Editorialを混同しない。広告・提供・招待は明示する。
- `地域No.1`、`本物だけ`、`必ず集客`など、根拠のない断定を使わない。
- 既存URLを変更する場合はリダイレクトを用意し、確認する。
- モバイル、キーボード操作、セマンティックHTML、Core Web Vitals、reduced-motionを守る。

## 地図の保護

44市町村の正確な境界、地名、5地域分類は中核資産です。`IbarakiMap.astro`と`ibaraki-geo.ts`のデータを、汎用シルエットや5地域だけのリンクへ置き換えてはいけません。

TOP専用の挙動は`HomeAreaExplorer.astro`、下層・一覧用の二段階操作は`AreaExplorer.astro`です。用途を混同しないでください。

## 作業方法

- 既存のユーザー変更を上書きしない。
- 作業前後に`git diff`を確認する。
- `npm run verify`を通し、エラー・警告0件を確認する。
- TOP変更時は、FV3枚、ブランド背景、テーマ6件、地図44件、取材と編集3件が残っているか確認する。
- 視覚判断を独断で変えず、未定義の変更はCodex／クリエイティブディレクターへ確認する。

## 編集OSと実装分担

- 情報監視・記事判断・SEO設計・完成原稿と、通常の実装・PR作成はChatGPT側が担当する。Claude Codeは、大規模なAstro改修・複雑な不具合修正・多数のファイルを対象とする変更・高負荷/長時間の開発のうち、ChatGPTまたはオーナーから明示的に依頼されたものだけを実装する（2026-10-25 オーナー決定）。
- Claude Codeを定期的・自動的に起動しない。毎朝の自動実装（daily-claude）は運用を中止した。
- Claude Code の運用を止めるときの手順と、止めても動き続けるもの・代わりが必要なものは `docs/CLAUDE_EXIT_RUNBOOK.md` を正本とする。
- `data/editorial/event-registry.json` の未掲載候補を、記事化しないことを理由に削除しない。
- Claude Codeが実装するのは、`data/editorial/action-queue.json` で `status: "ready"` の案件か、ChatGPT/オーナーの明示的な依頼だけ。
- `ready` の正本は `docs/editorial/specs/` の指定ファイル。正本にない調査・構成・本文・URL変更を独自に追加しない。
- ready 案件を実装するときは、実装前に `npm run editorial:daily` を実行し、`reports/editorial/implementation-brief.md` を確認する（毎朝の Validate site の artifact にも入る。旧名 `claude-implementation-brief.md` も当面は同じ内容で出る）。
- 新しいイベント記事を追加したら `npm run editorial:sync` で台帳へ同期する。
- 詳細は `docs/EDITORIAL_OS.md` を正本とする。


## Discovery OS（一人運営の事業基盤）

- イバトコの新機能は、一人運営で維持できることを前提とする。売上や掲載件数に比例して手作業が増える設計は原則採用しない。
- 記事・イベント・スポット・店舗は、検索、推薦、SEO、配信、将来APIへ再利用できる共通データとして扱う。
- 「営業中」「空いている」「リアルタイム混雑」など、取得できない状態を推測で表示しない。
- 行きたいところ検索は、完全一致がない場合に近い候補へ条件を緩和し、ゼロ件だけを見せて終わらせない。
- 自動生成URLを大量indexしない。独自価値と十分な掲載件数があるページだけをindex対象にする。
- 収益化は、送客成果報酬、セルフサーブ有料掲載、スポンサー、SaaS/APIを優先し、受託制作や手作業運用を主力化しない。
- Discovery OSの正本は `docs/DISCOVERY_OS.md` とする。


## 追加費用ゼロ原則

- イバトコの自動化・運用改善は、原則として追加費用ゼロで実装する。
- 新規の有料SaaS、有料API、従量課金API、外部AI API、メール/LINE配信の有料基盤、地図/ルートAPI、有料DBを無断で導入しない。
- GitHub Actions、Astro、Cloudflare、GA4、Search Console、既存の契約済み・無料枠の範囲を優先する。
- 無料枠に上限や将来課金リスクがある場合は、課金に自動移行しない設計にする。
- 有料化しないと実現できない機能は、無料代替へ落とすか保留し、オーナー承認なしに契約・申請・決済を進めない。
- アフィリエイト提携など「利用料が発生しない収益化契約」は、別途契約条件・表示義務を守る。
