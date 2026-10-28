# ChatGPT 移管監査（Claude Code 中心 → ChatGPT 中心）

- 監査日：2026-10-27（日本時間）
- 対象：`yutayama86/Ibatoco` の main `ca25381`（PR #437 マージ後）
- 監査した人：Claude Code（最後の大型開発として実施）
- 目的：Claude がいなくても、ChatGPT と GitHub Actions だけでイバトコの開発・公開・成長・収益化を続けられるか。そのために残すもの・直すもの・やめるものを決める
- 関連：開発の入口は [AGENTS.md](../AGENTS.md)、構成は [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)、手順は [DEVELOPMENT_PLAYBOOK.md](DEVELOPMENT_PLAYBOOK.md)、Claude の停止は [CLAUDE_EXIT_RUNBOOK.md](CLAUDE_EXIT_RUNBOOK.md)

## 分類の意味

| 分類 | 意味 |
|---|---|
| **維持** | そのまま使い続ける。ChatGPT からの開発でも前提として扱う |
| **改善** | 使い続けるが、直すべき点がある（本監査の PR で直したもの・別 PR に回すものを書く） |
| **廃止候補** | 役目を終えたか、重複している。削除はオーナー承認後に別 PR で行う（本 PR では消さない） |
| **未確認** | リポジトリの外（Cloudflare・GitHub の画面・Google の管理画面など）にあり、ファイルからは判断できない |

## 調べ方

- リポジトリの全ファイル（`src/`・`scripts/`・`.github/`・`worker/`・`docs/`・`data/`・設定ファイル）を読んだ
- GitHub API で読み取りだけ行った：ルールセット、Environment、Actions の Secret と Variable の**名前だけ**（値は読めないし読んでいない）、ワークフローの実行履歴、ブランチ、開いている PR
- `npm ci` と `npm run verify` を main のまま実行した（成功。結果は付録）
- Cloudflare・Google・ASP の管理画面は見ていない（権限がない。見るべき点は「未確認」に書いた）

---

## 最初に読む：重要な発見

1. **GA4/GSC の日次同期が、毎日 PR を作れずに失敗している。** `google-analytics-daily.yml` の最後のステップが `GitHub Actions is not permitted to create or approve pull requests` で落ちる（10/25・10/26 の定期実行で確認）。リポジトリ設定の「Allow GitHub Actions to create and approve pull requests」がオフのため（API でも `can_approve_pull_request_reviews: false` を確認）。ブランチ `bot/google-analytics-daily-<run>` だけが残り（いま3本）、`data/editorial/performance-snapshot.json` は 2026-10-21 のまま止まっている → **#442**（設定を変えなくても止まらない形・PR の重複防止・35日の取り直し。設定の比較は `docs/GA4_GSC_DAILY_SYNC.md`）
2. 1 の結果、**06:30 の定期 Deploy production が毎日失敗する**（「当日の確定指標がない」ので止まる設計どおりの動き）。main へのマージで動く本番デプロイは正常（#431 と #437 は本番反映を確認：Deploy production の workflow_run が success）。影響：イベントの「終了しました」「開催中」や月別一覧のように**ビルド時の日付で決まる表示は、マージが無い日は切り替わらない** → **#441**（計測が古くても警告だけにし、代わりに Validate 合格済みの main だけを出す）
3. **収益リンク監査（`monetization-audit.mjs`）が提携リンクを1本も数えていない。** frontmatter の字下げが変わり、正規表現が合わなくなった。79記事に予約リンクがあるのに「Bookingリンク総数 0」と出る。「提携済みなのに収益化されていないリンク」の検出が止まっている → #439 で修正（partner-opportunity にも同じ不具合と、終了判定の不具合があった）
4. Claude に依存する箇所は**コードに4か所だけ**（下の 3. 参照）。本番デプロイ・CI・計測は Claude に依存していない
5. 本番デプロイの経路（PR → Validate site → main → Deploy production → build.json の SHA 照合）は、すでに AI に依存しない形で完成している。**維持**
6. `daily-claude` Environment と `automation/daily-briefs` ブランチ、PR #383 が残っている（オーナー判断待ち。Claude の停止手順に含めた）
7. リモートブランチが 300 本以上ある。一時的なワークフロー（`*-temp.yml` など5本）が古いブランチにだけ残り、Actions の一覧に出続けている → **廃止候補**
8. docs は 37 本＋specs。正本が分散し、古い記述がある（README の「Astro 5」、PLATFORM.md の「GA4 イベントは7つ」など）。本 PR では正本の地図を作り、古い箇所に印を付ける

---

## 1. Astro のコンポーネント構成と共通デザイン

| 項目 | 現状（根拠） | 分類 | メモ |
|---|---|---|---|
| 静的サイト生成 | Astro 7.2.8（`package.json`）。`astro.config.mjs` の `SITE` が canonical の基準 | 維持 | README の「Astro 5」「@astrojs/sitemap」は古い → README を直した |
| 共通レイアウト | `src/layouts/BrandBase.astro`（`<main id="main-content">`・title・description・canonical・OGP・JSON-LD・GA4 の読み込み）。`ControlBase.astro`（/control/ 専用・GA4 なし）。`PreviewBrand.astro`（/preview/） | 維持 | ページの root を `<main>` にしない（BrandBase が既に main を持つ） |
| 共通スタイル | `src/styles/global.css`（`:root` のトークン）、`interior.css`（記事本文）、`fonts.generated.css`（自前ホストの日本語フォント） | 維持 | breakpoint は 560/760/900/1180（`docs/UI_TOKENS.md`） |
| TOP | `src/pages/index.astro`＋`HomeThemeNav`・`HomeAreaExplorer`・`HomeEditorialProcess`・`HomeNow` | 維持（固定版） | 必須構成は AGENTS.md「現行TOPは固定版」 |
| 地図 | `IbarakiMap.astro`・`src/data/ibaraki-geo.ts`（44市町村の境界）・`AreaExplorer.astro`（下層）・`HomeAreaExplorer.astro`（TOP） | 維持（中核資産） | `scripts/gen-geo.mjs` は Claude の作業フォルダを決め打ちしていた → 本 PR で引数指定に直した |
| 記事テンプレート | `src/pages/news/[slug].astro`・`src/pages/events/[slug].astro`・`[category]/[slug].astro` | 維持 | events / news の frontmatter スキーマは `src/content.config.ts`（`src/collections/*.ts`） |
| 食の図鑑 | `src/components/food/*`・`src/pages/food-library/*`・`src/pages/hoshiimo/` | 維持 | 2026-10-26 公開。方針は `docs/design/food-library.md` |
| 送客 UI | `BookingGuide.astro`・`BusinessCta.astro`・`SponsorSlots.astro`・`GrowthNextReads.astro`・`ThisWeek.astro` | 維持 | 計測イベントと一体。変えるときは 6. の計測を必ず確認 |
| 多言語 | `src/pages/en`・`ko`・`zh-tw`、`IntlHeader` など | 維持 | 更新頻度は低い |
| Decap CMS | `public/admin/config.yml`（OAuth 未設定のまま） | 廃止候補 | GitHub の PR で編集する運用に一本化済み。使っていないなら削除（`/admin/` は noindex） |

## 2. GitHub Actions の全ワークフローと依存関係

main にあるワークフローは6本。

| ワークフロー | 動く条件 | 役割 | 分類 | メモ |
|---|---|---|---|---|
| `validate.yml`「Validate site」 | PR・main への push・毎日 05:45 JST・手動 | `npm ci` → `npm audit`（本番依存 high 以上・全体 critical）→ `npm run verify`。定期実行では日次レポートを作り、Job Summary と artifact に出す | 維持 | ジョブ名 `build` が必須チェック |
| `codeql.yml` | PR・main への push・毎週・手動 | CodeQL（JS/TS） | 維持 | ジョブ名「Analyze JavaScript/TypeScript」が必須チェック |
| `deploy.yml`「Deploy production」 | Validate site（main への push）の成功・毎日 06:30 JST・手動（main のみ） | 最新 main か確認 → `npm ci` → `npm run deploy`（deploy-guard → 監査 → `wrangler deploy` → 本番検証 → 本番 UI 検査）→ `/build.json` の SHA 照合 → 本番ページの文字列待ち | 維持 | 唯一の本番経路。定期実行は「当日の確定指標」がないと止まる（重要な発見 2） |
| `google-analytics-daily.yml` | 毎日 05:30 JST・手動（main） | Workload Identity で GA4/GSC を読む（鍵なし）→ 検証 → スナップショットを更新する PR を作る | **改善** | PR 作成が権限設定で失敗（重要な発見 1）。actions のバージョンが SHA 固定でない（`@v4`・`@v2`） |
| `dependency-audit.yml` | 毎週月曜・依存ファイルの PR・手動 | `npm audit` | 維持 | validate.yml の audit と重なるが、定期の見張りとして残す。actions が SHA 固定でない |
| `public-security-monitor.yml` | 毎日 06:20 JST・手動 | 本番の `/`・`/control/` の応答と、nosniff・CSP・HSTS ヘッダーを確認 | 維持 | 侵入検知ではない（`docs/SECURITY_INCIDENT_RESPONSE.md`） |
| Dependabot（`.github/dependabot.yml`） | 毎週月曜 | npm と actions の更新 PR | 維持 | 未処理の PR が5本（#433・#432・#401・#381・#340） |

依存関係：Validate site（main・push）成功 → Deploy production。GA4 日次（05:30）→ スナップショット PR → マージ → Validate → Deploy。06:30 の定期 Deploy は、スナップショットが当日の確定値になっていることが前提。

| 古いブランチにだけ残るワークフロー（Actions の一覧に出る） | 分類 |
|---|---|
| `cloudflare-token-candidate.yml`・`event-card-asset-sync-temp.yml`・`event-card-manifest-diff-temp.yml`・`event-cta-production-audit-temp.yml`・`event-production-audit-temp.yml`・`prepare-security-patch.yml`・`temporary-node-types.yml` | 廃止候補（ブランチの整理で消える。main には無い） |

**ChatGPT にとっての意味**：Actions は Claude に依存していない。ChatGPT は PR を作り、CI の結果を読むだけでよい。本番デプロイの操作は不要（main へのマージで自動）。

## 3. Claude 関連の設定・プロンプト・定期実行・権限

### リポジトリの中

| 項目 | 現状 | 分類 | 対応 |
|---|---|---|---|
| `CLAUDE.md` | AGENTS.md を読み込み、Claude 固有の差分（ローカル設定・news-post スキル）だけを書く | 維持（Claude 停止時に削除可） | 停止手順に記載 |
| `.claude/skills/news-post/SKILL.md` | ニュース記事の作成手順。AGENTS.md から参照されている | **改善** | 手順の中身はツールに依存しない。`docs/DEVELOPMENT_PLAYBOOK.md` から同じ手順を参照できるようにした。Claude 停止後も消さずに残す（手順書として有効） |
| `.claude/launch.json` | ローカルのプレビュー設定（ポート 4321・4330） | 維持（Claude 停止時に削除可） | 他の開発者にも害はない |
| `scripts/editorial-os.mjs` | 日次ブリーフと `reports/editorial/claude-implementation-brief.md` を出す | **改善** | 本 PR で、ツールに依存しない `implementation-brief.md` も出すようにした（旧ファイルも互換のため当面出す） |
| `scripts/seo-seal.mjs` | 作るコミットに `Co-Authored-By: Claude Opus 5` を決め打ち | **改善** | 本 PR で外した（誰が実行しても Claude の名前が入っていた） |
| `scripts/gen-geo.mjs` | 入力フォルダが Claude の作業フォルダ（`/private/tmp/claude-501/...`）の決め打ち | **改善** | 本 PR で `--geo-dir` または環境変数 `GEO_DIR` で渡すようにした |
| `src/lib/search-trends.mjs` | オーナーへの依頼文に「Claude Code が取り込む」 | **改善** | 本 PR で「開発担当が取り込む」に直した |
| `data/editorial/action-queue.json` | `ready` の案件を Claude が実装する前提の文言が notes に残る | 維持 | 履歴として残す。今後は ChatGPT が実装担当 |
| `src/data/analytics.ts`（claude.ai からの流入の分類）・`public/robots.txt`・`llms.txt` | AI 検索からの流入計測・クローラ制御 | 維持 | Claude の運用とは無関係（読者・クローラとしての Claude） |
| `daily-claude` 系（`.github/workflows/daily-claude*.yml`・スクリプト） | 2026-10-25 に撤去済み（#425） | 済 | — |

### リポジトリの外（GitHub・この Mac）

| 項目 | 現状 | 分類 | 対応 |
|---|---|---|---|
| GitHub Environment `daily-claude` | 残っている（ブランチ制限つき。Secret 0件・Variable 0件を 10/27 に API で確認） | 廃止候補 | オーナー承認後に削除（停止手順） |
| ブランチ `automation/daily-briefs`・`automation/20261024-daily-claude` | 残っている | 廃止候補 | 同上 |
| PR #383（Astro 7.4 依存更新・Draft） | 開いたまま | 未確認 | 依存更新として必要か ChatGPT が判断。Claude 固有ではない |
| この Mac の `gh` CLI のログイン（`~/.local/bin/gh`・キーチェーンのトークン、scope：repo・read:org・gist・workflow） | Claude が PR 作成・CI 確認に使っている | **未確認（要失効）** | Claude 停止時にオーナーが `gh auth logout` と GitHub の「Authorized OAuth Apps」で失効（停止手順） |
| `~/.gitconfig` の credential helper（gh を使う） | 同上 | 未確認 | 同上 |
| Claude Code の設定（`~/.claude/settings.json` の deny・`.claude/settings.local.json`） | ローカルのみ | 未確認 | Claude 停止時に不要 |
| Claude の定期実行（cron・scheduled tasks） | 10/25 に毎朝の自動実装を停止済み。10/27 の確認で、セッションの cron は0件。Claude アプリの予定タスクは5件あるが、すべて一回限り・実行済み・無効（9/2〜10/15 分） | 済（掃除は任意） | 停止手順で削除 |
| wrangler の OAuth ログイン（`~/Library/Preferences/.wrangler/config/default.toml`） | 10/23 時点で残っている（サンドボックスから logout できなかった） | **未確認（要ログアウト）** | オーナーがターミナルで `npx wrangler logout` |

## 4. Cloudflare Workers の本番デプロイ

| 項目 | 現状 | 分類 | メモ |
|---|---|---|---|
| 配信 | `wrangler.jsonc`：Worker `ibatoco`、`dist/` を静的アセットとして配信。HTML と /control/ だけ Worker を先に通す（`run_worker_first`）。無料枠（1日10万回）対策 | 維持 | /control/ を除外パターンに入れないこと（security-audit が検査） |
| Worker | `worker/index.js`：/control/ のパスワード認証（4時間の署名付きセッション）、www・http の 301、`SITE_PASSWORD` によるメンテナンス保護 | 維持 | テスト `scripts/control-auth.test.mjs` |
| デプロイの入口 | `scripts/deploy-guard.mjs`：GitHub Actions の「Deploy production」かつ main 以外では止まる | 維持 | テスト `scripts/deploy-guard.test.mjs` |
| 認証情報 | Actions Secret `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`（名前だけ確認）。トークンは Workers Scripts: Edit のみ（docs/SECURE_DEPLOYMENT_POLICY.md） | 維持 | 値は誰にも見せない |
| 本番の確認 | `verify-production.mjs --wait`・`ui-smoke.mjs --production`・`/build.json` の SHA 照合・`wait-deploy.mjs` | 維持 | 最後の `wait-deploy` は特定記事の文言「このあと、どこ行く？」に依存 → **改善**（その記事を直すと本番確認が落ちる。別 PR で汎用の文字列に変える） |
| Workers Builds（Cloudflare の Git 連携） | ビルドは停止済みだが、PR ごとに「Workers Builds: ibatoco」が失敗として出る（必須チェックではない） | 廃止候補 | オーナーが Cloudflare で Git 連携を外せば消える |
| 旧トークン `GitHub Ibatoco Deploy`・`ibatoco build token` | docs は「未失効」、10/23 の作業記録では `ibatoco build token` は失効済み | **未確認** | オーナーが Cloudflare の API Tokens 画面で確認 |
| `/control/` の Secret（`CONTROL_PASSWORD`・`CONTROL_SESSION_SECRET`） | Cloudflare 側で設定 | 未確認 | 公開監視は 200/403 を確認している |

## 5. SEO・構造化データ・サイトマップ・内部リンク

| 項目 | 現状 | 分類 | メモ |
|---|---|---|---|
| title・description・canonical・OGP | BrandBase が出す。`quality-audit.mjs`（h1 1つ・description・canonical・JSON-LD 構文・img alt）・`tech-audit.mjs`（重複・OGP） | 維持 | |
| 構造化データ | ページごとに `jsonLd` を BrandBase へ渡す（Article・Event・FAQPage・BreadcrumbList・CollectionPage など） | 維持 | JSON-LD 625件（10/27 監査） |
| サイトマップ | `src/pages/sitemap.xml.ts`（自前）・`news-sitemap.xml.ts`・`rss.xml.ts`・`llms.txt.ts` | 維持 | `index-health.mjs` が sitemap と dist を照合（重複・noindex 混入・draft 混入・canonical 不整合・公開記事の欠落）。274 URL |
| 内部リンク | `src/data/internal-links.ts`（リンク文言）・`relatedArticleUrls`・`ArticleNextSteps`・`GrowthNextReads`・市町村ページの導線 | 維持 | リンク切れは quality-audit |
| SEO 変更履歴と観測窓 | `src/data/seo-changes.ts`・`npm run seo:log`・`seo:seal`・`observation-guard.mjs`（PR で観測中ページの変更を止める） | 維持 | 例外は PR 本文かコミットに `observation-exception: fact — 理由` |
| 日付・事実 | `date-integrity.mjs`・`fact-guard.mjs`・`freshness-guard.mjs` | 維持 | 日本時間の暦日。`src/lib/date-only.js` |

## 6. GA4・GSC・収益イベントの計測

| 項目 | 現状 | 分類 | メモ |
|---|---|---|---|
| GA4 の読み込み | BrandBase。本番ホストかつ計測除外フラグが無いときだけ。ID は `PUBLIC_GA_ID`（Actions Variable は**未設定**）→ 無ければ `SITE_CONFIG.gaMeasurementId` | 維持 | Variable 未設定でもコードの既定値で動く。意図どおりかはオーナー確認（未確認） |
| CSP と送信先 | `public/_headers`、`analytics-audit.mjs` が gtag の送信先を検査 | 維持 | |
| イベント | 許可リスト `scripts/data-audit.mjs` の `ALLOWED_EVENTS`（23種）。送客：`booking_guide_view`・`outbound_booking_click`・`paid_booking_click`（提携リンクのみ）・`business_cta_*`・`generate_lead`（唯一のキーイベント）・`sponsor_*`・`module_*` など | 維持 | `docs/PLATFORM.md` の「この7つ以外を送らない」は古い → 印を付けた |
| 送客イベントの二重送信防止 | 本番 UI 検査と CI：提携リンク1クリック＝outbound 1回・paid 1回、公式リンク＝outbound 1回・paid 0回 | 維持 | `docs/RELEASE_QA.md` |
| GA4/GSC の取得 | ① GitHub Actions（Workload Identity・読み取りのみ・鍵なし）② ChatGPT の Windsor.ai 経由（スナップショットの `source.primary` は Windsor） | **改善** | ① は PR 作成で失敗中（重要な発見 1）。② は ChatGPT 側の手作業。どちらを正にするか決める（停止手順・Playbook に書いた） |
| 計測障害の記録 | `data/editorial/measurement-incidents.json`・`src/lib/measurement-monitor.mjs`（GA4 日別 × GSC 日別） | 維持 | 0 で埋めない方針 |
| ASP の実績 | `data/editorial/asp-results.json`（発生・未確定・確定を分ける。取れない値は null） | 維持 | よくできている |
| 確定売上 | `data/editorial/revenue-ledger.json`（確定のみ。いまは 0 件） | 維持 | 楽天は「発生2件・未確定」（10/13）。確定したら ledger へ |

## 7. Growth OS・Operator OS・Revenue Engine

| 仕組み | 実体 | 出力 | 分類 | メモ |
|---|---|---|---|---|
| 編集 OS | `scripts/editorial-os.mjs`（sync/check/daily/inventory）・`data/editorial/event-registry.json`・`action-queue.json`・`docs/editorial/specs/` | daily-brief.md・実装指示 | 維持 | `editorial:check` は verify の中 |
| Growth Engine | `src/lib/growth-engine.mjs`・`growth-os.mjs`・`scripts/growth-engine.mjs` | growth-target.md・/control/ | 維持 | 11月10万 Views。予測と実測を分ける |
| Discovery | `discovery-coverage.mjs`・`discovery-priority.mjs`・`discovery-gate` | discovery-*.md | 維持 | |
| Revenue Engine | `scripts/revenue-engine.mjs` | revenue-engine.md | **改善** | 確定売上が未記録でも「¥0」と出る。GA4 上位リストに無いページを 0 Views と扱う |
| Monetization Audit | `scripts/monetization-audit.mjs` | monetization-audit.md | **改善（不具合）** | 提携リンクを数えられていない（重要な発見 3）→ #439 で修正 |
| Partner Opportunity | `scripts/partner-opportunity.mjs` | partner-opportunities.md | **改善（不具合）** | 同じ読み取りの不具合で候補を出せず、終了したイベントも除外できていなかった → #439 で修正 |
| Booking 実験 | `scripts/booking-experiment.mjs` | booking-experiment.md | **改善** | A/B のイベントが届いていないのに「0 views」と書く。未取得と書くべき |
| Revenue Yield | `scripts/revenue-yield.mjs` | revenue-yield.md/json | 維持 | 確定売上 0 の間は「クリック代理指標」で並べる（明記されている） |
| Revenue Funnel | `src/lib/revenue-funnel.mjs`・`local-revenue.mjs` | Growth Engine・/control/ | 維持 | 発生・未確定・確定を分ける |
| Operator OS | `scripts/operator-os.mjs`（上の全レポートを束ねる） | operator-brief.md | 維持 | データが2日以上古いと「ブロッカー」に出す（いまは出る状態） |
| Control Center | `/control/`（`src/pages/control/`・`components/control/`） | ブラウザで見る | 維持 | オーナー専用 |

レポートは Validate site の定期実行（05:45）で作られ、Job Summary と artifact（30日）に出る。**新しいダッシュボードは作らない**。どのレポートが何に答えるかは `docs/REVENUE_OS.md`「どのレポートで何を見るか」（#439 で追加）にまとめる。

## 8. テスト・監査・セキュリティ

`npm run verify` 1本で次を順に実行する（どれかが失敗すると CI も失敗）。

| 段 | 中身 | 分類 |
|---|---|---|
| check | 日付の回帰・事実ガード・OG 画像の字形・型検査（astro check）・ビルド＋Index Health | 維持 |
| 品質 | quality-audit（h1・description・canonical・JSON-LD・alt・リンク切れ・禁止語）・tech-audit・security-audit（秘密の直書き・/control/ の保護範囲）・data-audit（GA4 イベント名など）・repository-audit・analytics-audit | 維持 |
| 運用 | editorial:check・observation-guard（PR のみ）・freshness-guard --strict・GA4 日別と Trends の形式・city-hero 監査 | 維持 |
| 単体テスト | node --test（growth-engine・growth-os・search-trends・control-auth・index-health・discovery-gate・deploy-guard の7本・66件） | 維持 |
| 画面 | ui-smoke（11幅×主要ページ：横スクロール・はみ出し・画像・JS エラー・骨格・44px 未満のボタン・送客イベント）・visual-diff（参考） | 維持（ローカルでは Chrome が起動できず飛ばす。CI では必須） |
| 依存の脆弱性 | validate.yml の npm audit・dependency-audit.yml・Dependabot・CodeQL | 維持 |
| 本番 | deploy の中の verify-production・ui-smoke --production・SHA 照合、毎日の公開監視 | 維持 |

依頼の「重点対象」はすべて既存の検査で覆われている（対応表は `docs/DEVELOPMENT_PLAYBOOK.md`「検証の地図」）。**誤検知の多い検査は足さない**判断をした。足りないのは次の2点で、どちらも検査ではなくデータの問題：

- 計測スナップショットが古いことを CI は止めない（operator-os が警告するだけ）。止めると公開が全部止まるので、警告のままにする
- 収益リンク監査の不具合（上記。#439）

| セキュリティ | 現状 | 分類 |
|---|---|---|
| main の保護 | ルールセット「Protect main - Ibatoco」：削除・強制 push 禁止、直線履歴、PR 必須（承認0人・スレッド解決必須・帰属のない変更は追加承認）、必須チェック `build`・`Analyze JavaScript/TypeScript`、バイパスなし | 維持 |
| Actions の権限 | 各ワークフローは `contents: read` を基本に最小化。checkout は `persist-credentials: false` | 維持 |
| actions のバージョン固定 | validate・deploy・codeql は SHA 固定、google-analytics-daily・dependency-audit はタグ（`@v4` など） | 改善（別 PR。ワークフローの変更はオーナー承認） |
| 秘密情報 | リポジトリに直書きなし（security-audit）。`.env` 系は gitignore | 維持 |

## 9. ドキュメントの重複・陳腐化・整合性

正本の地図（どれを読めばよいか）は [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) の「正本の地図」にまとめた。

| ドキュメント | 状態 | 分類 |
|---|---|---|
| `AGENTS.md` | 開発の共通ルールの正本。ChatGPT・Claude・Codex 共通 | 改善（本 PR で開発の入口・禁止事項・検証手順を集約） |
| `docs/SECURE_DEPLOYMENT_POLICY.md` | 本番公開の正本 | 維持（旧トークンの記述は未確認） |
| `docs/IBATOCO_UNIFIED_GROWTH_OS.md` | 運用（ChatGPT 主導）の正本。10/25 更新 | 維持 |
| `docs/EDITORIAL_OS.md`・`GROWTH_ENGINE.md`・`REVENUE_OS.md`・`DISCOVERY_OS.md`・`RELEASE_QA.md`・`RELEASE_MEASUREMENT_GATES.md`・`GA4_MEASUREMENT.md`・`CONTROL_CENTER.md`・`SECURITY_INCIDENT_RESPONSE.md`・`SPONSORSHIP.md`・`REVENUE_IMPORT.md`・`UI_TOKENS.md`・`SPORTS_*` | 各分野の正本 | 維持 |
| `docs/prompts/IBATOCO_DAILY_GROWTH_DIRECTOR.md` | ChatGPT の日次プロンプト | 維持 |
| `README.md` | 「Astro 5」「@astrojs/sitemap」「GA4 は Cloudflare のビルド変数」「npm install」など古い | 改善（本 PR で直した） |
| `docs/PLATFORM.md` | 「GA4 イベントは7つ」など一部が古い | 改善（本 PR で古い箇所に注記） |
| `docs/TOMORROW_LAUNCH.md` | 公開初日の記録。冒頭に「現在は使わない」と明記済み | 廃止候補（記録として残してもよい） |
| `docs/PRELAUNCH_AUDIT.md`（8/1）・`growth-rebuild-audit.md`（9/20）・`revenue-growth-audit.md`（9/20）・`SITE_STABILIZATION_AUDIT_20261019.md` | その時点の監査記録 | 廃止候補（`docs/archive/` へ移すのが妥当。参照を確認してから別 PR） |
| `docs/PLATFORM_STRATEGY.md`（7/28）・`IBATOCO_MASTER_STRATEGY.md`・`IBATOCO_DISCOVERY_SYSTEM_V1.md`・`PHASE2_D1.md` | 戦略・構想 | 維持（戦略の参照。実装の正本ではない） |
| `docs/NEWS_AUTOMATION.md`（8/9） | ニュース自動公開の接続点。現在の PR 運用と一部ずれる | 改善（別 PR で DEVELOPMENT_PLAYBOOK に統合） |
| `docs/UPDATE_GUIDE.md`・`CONTENT_GUIDE.md`・`BRAND_GUIDE.md`・`FORMS_SETUP.md`・`STORES_CSV_GUIDE.md` | 8/1 前後の作成。内容は概ね有効 | 維持 |
| `docs/seo-change-tracking.gs` | Apps Script（GA4 シート連携） | 未確認（Google 側で動いているかは画面で確認） |

---

## 付録：この監査で実行した確認

| 確認 | 結果 |
|---|---|
| `npm ci` | 成功（Node 22.17.0。undici が 22.19 以上を推奨する警告のみ。CI は 22.23.4） |
| `npm run verify`（main `ca25381` のまま） | 成功。単体テスト 66 件合格、品質監査 639 ページ合格、技術監査の警告 14 件（既存ページのみ）、鮮度チェック 警告 4 件。UI 検査と Visual Regression はローカルで Chrome が起動できず**未実施**（CI では実施される） |
| 読み取り専用の GitHub API | ルールセット・Environment・Secret と Variable の名前・実行履歴・ブランチ・PR を確認。何も変更していない |
| 収益レポート（書き込みなし） | revenue-engine・monetization-audit・booking-experiment・revenue-yield・partner-opportunity を実行し、出力を確認（上の改善点） |
| 実施していないこと | Cloudflare・GA4・GSC・ASP・Google Cloud の管理画面の確認／本番への書き込み／Secret の値の確認 |

## 運用の簡素化（提案・オーナー承認待ち。この PR では何も止めていない）

| 対象 | 重複・不要の理由 | 提案 | 止めたときの影響 |
|---|---|---|---|
| `dependency-audit.yml` | Validate site が PR・main・毎朝の定期実行で同じ2つの `npm audit` を実行している | 削除してよい（Dependabot と CodeQL は残す） | なし（同じ検査が毎日走る） |
| `booking-experiment` のレポート | **削除候補ではない。** 実験は有効（`src/data/experiments.ts` の `enabled: true`）で、BookingGuide は `booking_guide_view_a/_b`・`outbound_booking_click_a/_b` を送っている。ところがスナップショットの取得対象（`conversionDetail.recent7`）に A/B のキーが無く、判定できない（#439 で `no-data` と表示） | ChatGPT の日次取得（Windsor）に A/B の4イベントを加えるか、実験を止めるかをオーナーが決める | 取得しないままだと、実験を続けても勝ち負けが出ない |
| `reports/editorial/growth-target.md` | `reports/editorial/` は .gitignore だが、このファイルだけ追跡されていて、レポートを作るたびに差分が出る | 追跡を外す（`git rm --cached`） | なし（CI の artifact に残る） |
| Workers Builds（Cloudflare の Git 連携） | ビルドは停止済みで、PR ごとに失敗のチェックだけが出る | Cloudflare で Git 連携を外す（オーナー） | なし（必須チェックではない） |
| 一時ワークフローだけが残る古いブランチ（`*-temp.yml` など5本） | Actions の一覧に出続ける | ブランチの整理で消す | なし |
| `bot/google-analytics-daily-<run>`（3本） | #442 後は固定ブランチ1本になる | 削除 | なし（データは Google 側と次の同期にある） |
| Decap CMS（`public/admin/`） | OAuth 未設定で使っていない | 削除 | `/admin/` が 404 になる |
| `claude-implementation-brief.md`・`CLAUDE.md`・`.claude/launch.json` | Claude 停止後は不要 | `docs/CLAUDE_EXIT_RUNBOOK.md` のステップ5で削除 | なし |

**残すもの（依頼どおり）**：SEO・記事品質検査（verify の各監査）、セキュリティ監査（security-audit・CodeQL・公開監視）、GA4/GSC 計測（日次同期）、予約・購買導線の計測（ALLOWED_EVENTS・ui-smoke の送客検査）、Revenue Engine、Growth OS、Cloudflare デプロイ、公開後の動作検証。

## 後続の PR（2026-10-27）

| PR | 内容 |
|---|---|
| #439 | 収益レポートが予約リンクを数えられない不具合・未取得を 0 とする表示 |
| #440 | 記事カード画像を GitHub 上で生成する手動ワークフロー（ChatGPT が新しい記事を出す前提） |
| #441 | 定期デプロイを計測データの鮮度から切り離し、Validate 合格済みの main だけを出す |
| #442 | GA4/GSC 日次同期：PR を作れない設定でも止まらない・PR を増やさない・35日の取り直し |

