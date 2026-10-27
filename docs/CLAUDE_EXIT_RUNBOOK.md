# Claude Code の運用停止手順（Exit Runbook）

作成：2026-10-27（Claude Code が作成）。現状の監査は [CHATGPT_MIGRATION_AUDIT.md](CHATGPT_MIGRATION_AUDIT.md)、これからの開発手順は [DEVELOPMENT_PLAYBOOK.md](DEVELOPMENT_PLAYBOOK.md)。

> **この文書を作った PR では、何も停止・削除していない。** 下の「停止の手順」は、移行の確認（ステップ0）が終わってから、オーナーの承認を受けて別に行う。

## 1. 結論

- **本番の公開・CI・計測の取得は、Claude に依存していない。** Claude を止めても、PR → Validate site → main → Deploy production はそのまま動く
- Claude が止まると困るのは、**手元で Node を実行していた作業**（カード画像の生成など）と、**Claude だけが持っている作業の知識**。前者は代わりの方法を用意し（下の 3・4）、後者はこの文書の 9. と DEVELOPMENT_PLAYBOOK に移した
- Claude の停止に伴って失効させる認証情報は、この Mac の `gh` のログインと wrangler のログイン。どちらもオーナーの操作が必要

## 2. Claude を止めると動かなくなるもの

| 機能 | 今まで | 止めた後 |
|---|---|---|
| 大規模な Astro 改修・複雑な不具合修正（明示依頼のもの） | Claude Code | ChatGPT（GitHub 経由）または人。手元で検証できないため、CI の結果に頼る比率が上がる |
| 手元での `npm run verify` と、ブラウザでの4幅の画面確認 | Claude | CI の Validate site（同じ検査＋11幅の画面検査）。マージ前に PR のブランチを画面で見る手段は無い（PR プレビューは本番へ 301 される） |
| カード画像の生成（`npm run og:cards`） | Claude が手元で生成してコミット | 「Prepare generated files」ワークフロー（別 PR で追加予定）またはオーナーが手元で |
| `npm run editorial:sync`・`seo:seal` | Claude | ChatGPT が手で記録を足す（DEVELOPMENT_PLAYBOOK の 2.・4.） |
| Actions のログを API で読む・Commons の API で写真の権利を調べる | Claude | GitHub の画面・コネクタ、ChatGPT の閲覧 |
| `reports/editorial/claude-implementation-brief.md` | Claude が実装前に読む | `implementation-brief.md`（同じ内容。旧名は停止後に消してよい） |

## 3. ChatGPT と GitHub Actions で代わりにできるもの

| 機能 | 代わりの方法 |
|---|---|
| 記事の追加・更新、SEO、収益導線、データ台帳の更新 | ChatGPT が作業ブランチと PR を作る（DEVELOPMENT_PLAYBOOK） |
| 全検査 | PR の Validate site（`npm audit` → `npm run verify`）と CodeQL |
| 本番デプロイと本番確認 | main へのマージで Deploy production が自動。`/build.json` で確認 |
| 日次レポート（成長・収益・編集・実装指示） | Validate site の定期実行（05:45）が作り、Job Summary と artifact（30日）に出す |
| GA4・GSC の取得 | Actions「Read-only GA4 and GSC」（PR 作成の権限問題を解決したあと）、または ChatGPT の Windsor.ai 経由の日次処理 |
| 一次情報・写真の権利の確認 | ChatGPT の閲覧 |
| 依存の更新 | Dependabot の PR を ChatGPT が確認 |

## 4. 代わりがない（オーナーが手元で行う）もの

| 作業 | 頻度 | 必要なもの |
|---|---|---|
| ASP の CSV を確定売上へ取り込む（`npm run revenue:import`） | 成果が確定したとき | Node。生データは `data/revenue-imports/private/`（Git に入れない） |
| Google Trends の CSV を取り込む（`npm run trends:import`） | 月1回程度 | Node。または ChatGPT が `search-trends.json` の形式で書いて CI の検査に通す |
| フォントの作り直し（`scripts/build-web-fonts.py`） | OG 画像に無い字が出たときだけ | Python と fonttools |
| 市町村の境界の作り直し（`scripts/gen-geo.mjs --geo-dir …`） | ほぼ無い（市町村合併など） | Node と元の GeoJSON |
| Cloudflare・GitHub の設定、Secret、トークンの管理 | 必要なとき | オーナーの権限 |
| カード画像の生成 | 新しい記事のたび | 「Prepare generated files」ワークフローが入るまでは、Node |

## 5. 止めてはいけないもの

Claude の停止と一緒に止めたり消したりしない。

- GitHub Actions：Validate site・Deploy production・CodeQL・Dependency security audit・Public security smoke monitor・Read-only GA4 and GSC・Dependabot
- main のルールセット（PR 必須・必須チェック `build`・`Analyze JavaScript/TypeScript`）
- Actions の Secret `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`、Variable `GA4_PROPERTY_ID`・`GOOGLE_WIF_PROVIDER`・`GSC_SITE_URL`
- Cloudflare のトークン `IBATOCO Workers Deploy v2`（Actions が使う唯一のデプロイ用トークン）
- Cloudflare の Worker `ibatoco` の Secret（`/control/` の `CONTROL_PASSWORD`・`CONTROL_SESSION_SECRET`）
- Google Cloud の Workload Identity（GA4・GSC の読み取り用。鍵なし）
- `scripts/deploy-guard.mjs` と、その他の検査スクリプト
- ChatGPT の日次運用（Windsor.ai の取得、人気ページの手更新）
- `.claude/skills/news-post/SKILL.md` の中身（ニュースの手順書として有効。消すなら先に `docs/` へ移す）

## 6. 認証情報・トークン

値はどこにも書かない。オーナーが各サービスの画面で行う。

| 認証情報 | 場所 | 使っている人 | 停止時の扱い |
|---|---|---|---|
| GitHub CLI（gh）の OAuth トークン（scope：repo・read:org・gist・workflow） | この Mac のキーチェーン、`~/.local/bin/gh` | Claude（PR 作成・CI 確認・push） | ① ターミナルで `~/.local/bin/gh auth logout` ② GitHub の Settings → Applications → Authorized OAuth Apps で「GitHub CLI」を Revoke（オーナー自身が gh を使っていないなら）③ `~/.gitconfig` の `credential.https://github.com.helper` の行を消す |
| wrangler の OAuth ログイン | この Mac（`~/Library/Preferences/.wrangler/`） | 使っていない（手元からのデプロイは禁止） | ターミナルで `npx wrangler logout`（Claude のサンドボックスからは実行できなかった） |
| Cloudflare の旧トークン `GitHub Ibatoco Deploy`・`ibatoco build token` | Cloudflare | 使っていないはず（docs と作業記録で状態が食い違う） | Cloudflare の API Tokens 画面で状態を確認し、使っていなければ失効。最終使用日だけで判断しない（[SECURE_DEPLOYMENT_POLICY.md](SECURE_DEPLOYMENT_POLICY.md)） |
| GitHub Environment `daily-claude` | GitHub | 使っていない（Secret 0件・Variable 0件、10/27 確認） | Settings → Environments で削除 |
| Anthropic の API キー・Claude の GitHub App | 未確認（毎朝の自動実装 #421 の準備で作った可能性） | — | GitHub の Settings → Applications（Installed GitHub Apps）と Anthropic のコンソールで確認し、あれば削除・失効 |
| `IBATOCO Workers Deploy v2` | Actions の Secret | Deploy production | **残す** |

## 7. 本番公開が続くことの確認

停止の前と後に、次を確かめる。

1. ChatGPT が作った小さな PR（例：誤字の修正や docs）を、オーナーが承認してマージする
2. Validate site（main）→ Deploy production が成功する
3. `https://ibatoco.jp/build.json` の `commit` がそのマージコミットになる
4. 翌朝 06:20 の Public security smoke monitor が成功する

2026-10-26 時点の実績：#431（`2b114b1`）と #437（`ca25381`）は、マージ後の Deploy production が成功している。06:30 の定期 Deploy production は、GA4/GSC の確定値が当日分でないため毎日失敗している（下の 8. の「GA4/GSC 日次同期」）。

## 8. 移行後の定期点検

| 頻度 | 見るもの | 見る場所 |
|---|---|---|
| 毎朝 | Validate site（05:45）の成功と Job Summary（operator brief・実装指示・収益レポート） | Actions |
| 毎朝 | Read-only GA4 and GSC（05:30）の成功、スナップショット PR の有無 | Actions・PR |
| 毎朝 | Deploy production（マージ後・06:30）の成功、`/build.json` | Actions・本番 |
| 毎朝 | Public security smoke monitor（06:20） | Actions |
| 毎週 | Dependabot の PR、Dependency security audit、CodeQL のアラート | PR・Security タブ |
| 毎週 | 開いている PR と古いブランチ（マージ済み・不要なものの整理はオーナー承認） | PR・Branches |
| 毎週 | 計測障害の有無（`measurement-incidents.json`）、データの鮮度（operator brief の「ブロッカー」） | レポート |
| 毎月 | トークンと Secret の棚卸し、ルールセットの設定、`docs/SYSTEM_ARCHITECTURE.md` の「正本の地図」が現状と合っているか | GitHub・Cloudflare の画面 |
| 四半期 | 復元の訓練（[SECURITY_INCIDENT_RESPONSE.md](SECURITY_INCIDENT_RESPONSE.md)） | — |

## 9. 障害時の復旧

| 症状 | まず見る所 | 直し方 |
|---|---|---|
| PR の CI が落ちる | 失敗したステップの `::error` | DEVELOPMENT_PLAYBOOK の 9.（観測窓・カード画像・台帳・eventInfo・seo-changes の競合） |
| 本番がおかしい | `/build.json`、Deploy production のログ | [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md)（revert が基本、緊急時はオーナーが Cloudflare で戻す） |
| GA4/GSC 日次同期が失敗 | ジョブ「Publish verified daily metrics」の「Propose verified snapshot through protected PR」 | 「GitHub Actions is not permitted to create or approve pull requests」なら、オーナーがリポジトリ設定（Settings → Actions → General → Workflow permissions）の「Allow GitHub Actions to create and approve pull requests」を有効にするか判断する。有効にしない場合は、残ったブランチ `bot/google-analytics-daily-<run>` から人が PR を作る |
| 終わったイベントが「これから」に残る | 最後の Deploy production の日時 | 日付で決まる表示（終了・開催中・月別一覧）は**ビルド時に決まる**。定期デプロイが止まっている間は、何か1件マージすれば切り替わる |
| `/control/` が 503 | Cloudflare の Worker の Secret | `CONTROL_PASSWORD`（20字以上）・`CONTROL_SESSION_SECRET`（32字以上）をオーナーが確認 |
| ページが 429 | Cloudflare の Worker の実行回数 | 無料枠は1日10万回。自動アクセス（本番 QA など）を増やしていないか |
| 依存の脆弱性の警告 | Dependency security audit・Dependabot | 単独の PR で更新し、CI を通す |
| Apps Script の SEO 集計が止まる（使っている場合） | Apps Script の実行記録が増えているか | OAuth が切れると、エラー0%・トリガーありのまま黙って止まる。再承認はオーナー |

## 10. 停止の手順（順番どおりに。各段でオーナー承認）

**ステップ0（前提の確認）**
- [ ] この PR（移管の文書）がマージされている
- [ ] ChatGPT が、作業ブランチ → PR → CI → オーナー承認 → マージ → 本番確認 を Claude なしで1回以上完了している（7.）
- [ ] GA4/GSC 日次同期の扱いを決めた（9.）
- [ ] 新しい記事のカード画像を作る方法が決まっている（「Prepare generated files」ワークフローのマージ、またはオーナーの手元）
- [ ] 収益監査の不具合修正（PHASE 4 の PR）が判断済み

**ステップ1：Claude への依頼をやめる**
- [ ] AGENTS.md の「編集OSと実装分担」から Claude Code の役割を外す PR（ChatGPT が作成）

**ステップ2：手元の認証を止める（オーナー）**
- [ ] `gh auth logout`、GitHub で「GitHub CLI」の OAuth を Revoke、`~/.gitconfig` の credential helper の行を削除
- [ ] `npx wrangler logout`

**ステップ3：GitHub の残り物を片付ける（オーナー承認後）**
- [ ] Environment `daily-claude` を削除
- [ ] ブランチ `automation/daily-briefs`・`automation/20261024-daily-claude`・`bot/google-analytics-daily-*` を削除
- [ ] 一時ワークフローだけが残る古いブランチ（`*-temp.yml` などを含むもの）を確認して削除
- [ ] Claude の GitHub App・Anthropic の API キーがあれば削除・失効
- [ ] PR #383 など、Claude が作って開いたままの PR を、続けるか閉じるか判断

**ステップ4：この Mac の片付け（任意）**
- [ ] Claude アプリの予定タスク（一回限り・実行済み・無効の5件）を削除
- [ ] Claude の作業用 worktree を削除（`git worktree prune`。作業中の変更が無いことを確かめてから）
- [ ] 本体のフォルダ（`~/Desktop/Ibatoco`）は、作業ブランチ `editorial/20261023-camp-autumn-festa` を開いたままになっている。手元で使うなら main に切り替える

**ステップ5：リポジトリの Claude 専用ファイルを片付ける PR（ChatGPT が作成・オーナー承認）**
- [ ] `CLAUDE.md`・`.claude/launch.json` を削除
- [ ] `.claude/skills/news-post/SKILL.md` を `docs/` へ移し、AGENTS.md と DEVELOPMENT_PLAYBOOK の参照を直す
- [ ] `scripts/editorial-os.mjs` の旧名 `claude-implementation-brief.md` の出力をやめる
- [ ] `scripts/deploy-guard.mjs` のコメントの「Claude Code」は残してよい（手元からの実行を止める説明として正しい）

**ステップ6：確認**
- [ ] 7. の手順で本番公開が続くことを確認
- [ ] 1週間、8. の定期点検で異常が無いこと

## 11. Claude の作業記録から引き継ぐ知識

Claude は作業中に気づいたことを手元の記録に残していた（リポジトリの外）。開発に効くものをここに移す。

**事実確認**
- 直す基準は「一次情報で誤りが確定したもの」だけ。公式に記載があるが年が無い・出典で表現が割れる・数値が食い違うものは、オーナー判断で据え置き
- ChatGPT（Growth Director）由来の PR でも、差分の事実を1件ずつ出典で確かめてからマージする。CI は事実を見ない。「検索結果のスニペットで確認」は出典にしない
- 「発表なし」と書く前に、公式の過去の発表一覧（アーカイブ）まで見る。既定の一覧は直近の数件しか出ない
- JavaScript で描くページは、取得ツールによって本文が空で返ったり、無い更新を答えたりする。ブラウザで原文を見る
- 茨城県のホームページは 10 月に障害で臨時ページが続いた。開けない公式は「未確認」と書き、まとめサイトで埋めない。県のページは Internet Archive の保存版で確認し、そのことを出典に書く
- スポーツの試合情報は推測で補わない。鹿島戦の交通は運行会社の一覧（直行バス・臨時停車）で確かめる

**観測窓**
- 観測窓は URL ごとに最新の記録1件で決まる。観測中のページに事実訂正の記録（窓0日）を新しく足すと、ガード上は窓が消えたように見えるが、Growth Director は「事実の記録で SEO の観測は終わらない」と決めている。観測中のページの事実訂正は、記録を足さず、動いている記録の note に追記し、PR に `observation-exception: fact — 理由` を書く

**画面**
- スマホ中心。崩れは致命的。1列のグリッドは `minmax(0,1fr)`（`1fr` 単独は使わない）。`overflow-wrap: anywhere` は使わない（「料金」が「料／金」に割れる）
- 1文字だけの行は `text-wrap: pretty`（全体に設定済み）。1語の大見出しは `src/lib/text-fit.ts` で語幅に合わせる
- 横はみ出しを測るときは、body の `overflow-x` を外してから測る（付けたままだと常に0）
- `%` の余白は親の幅が基準。幅の決まった要素は grid の1列で寄せる
- Astro のテンプレートの `{…}` の中で `a <= b` と書くとタグと誤認されて `astro check` が落ちる。`b >= a` と書く

**計測・収益**
- 楽天トラベルの成果は、押したリンクの商品とは限らない（Cookie 30日・別商品も対象・報酬1%）。成果の商品名だけで導線を増やす判断をしない
- ASP の実績は期間と確認日つきで `asp-results.json` に手入力。未確定は売上に入れない
- `popular-pages.json`（TOP の「読まれている」）は Growth Director の日次の手更新。自動で上書きしない
- Apps Script の集計は OAuth が切れると黙って止まる（9.）

**速度**
- PageSpeed Insights はブラウザで `pagespeed.web.dev` を開いて測る（API はクォータ切れが多い）。日本語フォントは分割済み（`public/fonts/`）。Wikimedia の写真は `src/lib/wikimedia-image.ts` の srcset を通す（原本 URL を直接書かない）

**運用**
- 作業中に main は進む。着手前に最新の main と開いている PR を確認する（同じ変更が先にマージされていたことがある）
- 作業フォルダを別の担当と共有しているときは、自分が触っていない差分を消さない（`reset --hard` しない）
