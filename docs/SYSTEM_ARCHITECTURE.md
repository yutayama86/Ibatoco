# イバトコのシステム構成と、主要ファイルの責務

最終確認：2026-10-27（main `ca25381` 時点）。開発のルールは [AGENTS.md](../AGENTS.md)、作業手順は [DEVELOPMENT_PLAYBOOK.md](DEVELOPMENT_PLAYBOOK.md)。
この文書は「どこに何があり、何を壊すと何が止まるか」を、初めて触る担当（ChatGPT・人・ほかのAI）が Claude に聞かずに分かるように書く。

## 全体の流れ

```
編集判断（ChatGPT・オーナー）
   │  一次情報の確認・記事の完成原稿・仕様（docs/editorial/specs/）
   ▼
作業ブランチ → Pull Request（main へ直接 push しない）
   │  Validate site（npm audit → npm run verify）・CodeQL が必須チェック
   ▼
オーナー承認 → main へマージ（squash / rebase。直線履歴）
   │
   ▼
Validate site（main）成功 → Deploy production（GitHub Actions だけ）
   │  deploy-guard → 監査とビルド → wrangler deploy → 本番検証 → 本番の画面検査 → /build.json の SHA 照合
   ▼
Cloudflare Workers（ibatoco.jp）
   │  dist/ を静的配信。HTML と /control/ だけ worker/index.js を通す
   ▼
読者 → GA4 / GSC → 日次の取得（GitHub Actions・ChatGPT）→ data/editorial/performance-snapshot.json
   │
   ▼
日次レポート（Validate site の定期実行 05:45）→ Job Summary・artifact → 次の編集判断
```

## ディレクトリ

| 場所 | 中身 | 触るときの注意 |
|---|---|---|
| `src/pages/` | URL ごとのページ（Astro）。`[slug].astro` はコレクションから生成 | 既存 URL を変えない（変えるならリダイレクト） |
| `src/content/` | 記事の Markdown：`news/`・`events/`・`articles/`・`places/` | 本文の Markdown ではなく frontmatter の構造化フィールドが描画される記事がある（news-post 手順を参照） |
| `src/content.config.ts`・`src/collections/` | frontmatter のスキーマ（zod）。足りない・型違いはビルドが落ちる | スキーマ変更は全記事に効く |
| `src/layouts/` | `BrandBase.astro`（全公開ページの外枠：head・SEO・JSON-LD・GA4・`<main>`）、`ControlBase.astro`（/control/）、`PreviewBrand.astro` | BrandBase は全ページに効く。変えたら verify と画面検査 |
| `src/components/` | 部品。TOP 専用は `Home*`、送客は `BookingGuide`・`BusinessCta`・`SponsorSlots`、図鑑は `food/` | 送客部品は計測と一体（GA4 イベント） |
| `src/data/` | サイト設定と台帳：`site.ts`（サイト名・GA4 の既定 ID・フォーム送信先）、`areas.ts`（44市町村と5地域）、`ibaraki-geo.ts`（市町村の境界）、`affiliates.ts`（提携先と成果リンク）、`internal-links.ts`（内部リンクの文言）、`seo-changes.ts`（SEO 変更履歴）、`food-library.ts`（食の図鑑） | `ibaraki-geo.ts`・`areas.ts` は中核資産 |
| `src/lib/` | 共通ロジック。`date-only.js`（日本時間の暦日）、`analytics-events.ts`（GA4 送信）、`growth-engine.mjs`・`growth-os.mjs`（成長の計算）、`revenue-funnel.mjs`（収益の段階）、`measurement-monitor.mjs`（計測の健全性）、`wikimedia-image.ts`（Commons 画像の srcset） | `.mjs` の多くは scripts と Control Center の両方から使う |
| `src/styles/` | `global.css`（色・余白のトークン）、`interior.css`（記事本文）、`fonts.generated.css` | トークンは `docs/UI_TOKENS.md` |
| `worker/index.js` | Cloudflare Worker：/control/ の認証、www・http の 301、メンテナンス用 Basic 認証 | 認証は `scripts/control-auth.test.mjs` が守る |
| `wrangler.jsonc` | Worker 名・配信フォルダ・Worker を通す範囲（`run_worker_first`） | /control/ を除外しない（security-audit が検査） |
| `public/` | そのまま配信：`_headers`（CSP など）、`_redirects`、`robots.txt`、画像、フォント、OG の既定画像 | CSP を変えるときは GA4 の送信先（analytics-audit） |
| `scripts/` | 検査・レポート・取り込みの Node スクリプト（57本）。`npm run` から呼ぶ | 下の「npm スクリプト」 |
| `data/editorial/` | 編集・成長・収益の台帳（JSON）。下の「データ台帳」 | 取得できない値は `null`。0 で埋めない |
| `docs/` | 方針と手順。下の「正本の地図」 | |
| `.github/workflows/` | CI と本番デプロイ。下の「GitHub Actions」 | 変更はオーナー承認が必要（AGENTS.md） |
| `reports/editorial/` | 日次レポートの出力先（Git には入れない。CI の artifact に残る） | |

## npm スクリプト（よく使うもの）

| コマンド | 何をするか | いつ |
|---|---|---|
| `npm ci` | lockfile どおりに依存を入れる | 作業の最初 |
| `npm run verify` | 公開前の全検査（下の「検証」） | PR を出す前。CI でも必ず走る |
| `npm run verify:article -- <slug>` | 記事1本の検査（`--prod` で本番も） | 記事の追加・修正 |
| `npm run build` | ビルド＋Index Health | verify に含まれる |
| `npm run date:check` | 暦日の1日ずれの回帰検査 | 日付を扱う変更 |
| `npm run editorial:sync` | イベント記事を台帳へ同期 | イベント記事を足したら |
| `npm run editorial:daily` | 日次ブリーフと実装指示を `reports/editorial/` に出す | 実装前（CI でも毎朝） |
| `npm run seo:log -- --url … --kind … --change …` | SEO 変更履歴を追記（commit は `PENDING`） | title・description・内部リンクなどを変えたとき |
| `npm run seo:seal` | `PENDING` を直前のコミットで確定し、確定コミットを1つ積む | seo:log のあと |
| `npm run growth:check -- <path> --type <種類>` | 観測窓の中か確認（控えるべきなら終了コード2） | 既存ページを変える前 |
| `npm run trends:import -- <CSV…>` | Google Trends の CSV を台帳へ | オーナーが CSV を用意したとき |
| `npm run revenue:import` | ASP の CSV を確定売上の台帳へ（生データは Git に入れない） | オーナーが手元で |
| `npm run deploy` | **使わない**。Deploy production（main）以外では deploy-guard が止める | — |

## データ台帳（`data/editorial/`）

| ファイル | 中身 | 誰が更新するか |
|---|---|---|
| `event-registry.json` | 茨城のイベント台帳（記事の有無・一次情報・確認期限） | 編集担当（`editorial:sync` で記事と同期）。未掲載候補を消さない |
| `action-queue.json` | 実装キュー（`candidate` → `ready` → `done`） | 編集担当。`ready` の正本は `docs/editorial/specs/` |
| `performance-snapshot.json` | GA4・GSC の確定値と上位ページ・送客イベント | GA4/GSC 日次同期（Actions）または ChatGPT の日次処理 |
| `measurement-incidents.json` | 計測障害の期間と根拠 | 計測を見る担当 |
| `asp-results.json` | ASP 管理画面の実績（発生・未確定・確定を分ける） | オーナーの報告を記録 |
| `revenue-ledger.json` | 確定売上だけ | 確定した成果・入金のみ |
| `revenue-opportunities.json`・`revenue-mvp.json` | 収益の方針・実験の記録 | 収益担当 |
| `growth-targets.json`・`growth-engine.json`・`growth-opportunities.json`・`demand-radar.json`・`search-trends.json`・`seasonal-learning.json`・`popular-pages.json`・`strategy-scorecard.json`・`recovery-plan.json` | 成長の目標・機会・需要・学び | 成長担当 |
| `localos-place-schema.json` | 店舗データの将来スキーマ | 変更しない（構想） |

## GitHub Actions

| ワークフロー | 役割 | 必須チェック |
|---|---|---|
| Validate site（`validate.yml`） | PR・main・毎朝。`npm audit` と `npm run verify`。毎朝は日次レポートも作る | `build` |
| CodeQL（`codeql.yml`） | コードの脆弱性検査 | `Analyze JavaScript/TypeScript` |
| Deploy production（`deploy.yml`） | 唯一の本番デプロイ。main の Validate 成功で自動。手動は main だけ | — |
| Read-only GA4 and GSC（`google-analytics-daily.yml`） | GA4/GSC を読み、スナップショット更新の PR を作る | — |
| Dependency security audit | 週次の `npm audit` | — |
| Public security smoke monitor | 毎朝、本番の応答とセキュリティヘッダー | — |

main のルールセット：PR 必須、必須チェック2本、直線履歴、強制 push と削除の禁止、バイパスなし。Actions の Secret は `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`、Variable は `GA4_PROPERTY_ID`・`GOOGLE_WIF_PROVIDER`・`GSC_SITE_URL`。

## 検証（`npm run verify` の中身）

1. 日付の回帰（date-integrity）・事実ガード（fact-guard）・OG 画像の字形・型検査（astro check）・ビルド＋Index Health
2. quality-audit（h1・description・canonical・JSON-LD・alt・リンク切れ・禁止語）
3. tech-audit（重複・OGP・重い画像）・security-audit・data-audit（GA4 イベント名）・repository-audit・analytics-audit（CSP と GA4）
4. editorial:check・observation-guard（PR のときだけ。観測窓）
5. 単体テスト（node --test 7本）
6. search-trends と GA4 日別の形式・freshness-guard（年度違いは失敗、期限切れ表現は警告）・city-hero 監査
7. ui-smoke（画面検査）・visual-diff（参考）— CI で必須。手元で Chrome が起動しない環境では警告を出して飛ばす

## 本番

- ドメイン：`https://ibatoco.jp`（Cloudflare Workers の Worker `ibatoco`）
- 反映の確認：`https://ibatoco.jp/build.json` の `commit` がマージしたコミットと一致すること
- /control/：オーナー専用のダッシュボード。パスワード（Cloudflare の Secret）で保護。公開ナビからリンクしない
- 自動アクセスの上限：Worker の無料枠は1日10万回。静的ファイルは Worker を通さない設定（`run_worker_first`）

## 正本の地図（何を決めるときに、どれを読むか）

| 決めたいこと | 正本 |
|---|---|
| 開発・公開のルール全般 | [AGENTS.md](../AGENTS.md) |
| 作業の手順（記事・UI・SEO・収益・依存更新・ロールバック） | [DEVELOPMENT_PLAYBOOK.md](DEVELOPMENT_PLAYBOOK.md)・[ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md) |
| 本番公開と認証情報 | [SECURE_DEPLOYMENT_POLICY.md](SECURE_DEPLOYMENT_POLICY.md) |
| ChatGPT 主導の日次運用・承認が必要なもの | [IBATOCO_UNIFIED_GROWTH_OS.md](IBATOCO_UNIFIED_GROWTH_OS.md)・[prompts/IBATOCO_DAILY_GROWTH_DIRECTOR.md](prompts/IBATOCO_DAILY_GROWTH_DIRECTOR.md) |
| 記事の判断・台帳・実装キュー | [EDITORIAL_OS.md](EDITORIAL_OS.md)、ニュースの手順は [.claude/skills/news-post/SKILL.md](../.claude/skills/news-post/SKILL.md)（中身はツールに依存しない） |
| 成長の計算（観測窓・鮮度・需要） | [GROWTH_ENGINE.md](GROWTH_ENGINE.md) |
| 収益（送客・ASP・確定売上） | [REVENUE_OS.md](REVENUE_OS.md)・[REVENUE_IMPORT.md](REVENUE_IMPORT.md)・[MONETIZATION.md](MONETIZATION.md)・[SPONSORSHIP.md](SPONSORSHIP.md) |
| 画面の品質 | [RELEASE_QA.md](RELEASE_QA.md)・[UI_TOKENS.md](UI_TOKENS.md)・[BRAND_GUIDE.md](BRAND_GUIDE.md) |
| 公開・計測の完了の定義 | [RELEASE_MEASUREMENT_GATES.md](RELEASE_MEASUREMENT_GATES.md) |
| GA4 の設計 | [GA4_MEASUREMENT.md](GA4_MEASUREMENT.md)（イベント一覧の正本は `scripts/data-audit.mjs` の `ALLOWED_EVENTS`） |
| 構造と壊してはいけない約束 | [PLATFORM.md](PLATFORM.md) |
| Discovery（行きたいところ検索） | [DISCOVERY_OS.md](DISCOVERY_OS.md)・[IBATOCO_DISCOVERY_SYSTEM_V1.md](IBATOCO_DISCOVERY_SYSTEM_V1.md) |
| /control/ | [CONTROL_CENTER.md](CONTROL_CENTER.md) |
| 事故対応 | [SECURITY_INCIDENT_RESPONSE.md](SECURITY_INCIDENT_RESPONSE.md) |
| 現状の監査と、Claude の停止 | [CHATGPT_MIGRATION_AUDIT.md](CHATGPT_MIGRATION_AUDIT.md)・[CLAUDE_EXIT_RUNBOOK.md](CLAUDE_EXIT_RUNBOOK.md) |

記録として残っているだけの文書（現在の手順ではない）：`TOMORROW_LAUNCH.md`・`PRELAUNCH_AUDIT.md`・`growth-rebuild-audit.md`・`revenue-growth-audit.md`・`SITE_STABILIZATION_AUDIT_20261019.md`。
