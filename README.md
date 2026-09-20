# イバトコ (Ibatoco)

> 現地から、信頼を編む。— 茨城の地域価値編集ブランド

Astro 製の静的サイトです。現地取材、関係性の開示、事実確認、訂正履歴をコンテンツ構造に組み込んでいます。

> 日々の更新、細かな文言調整、公開前確認は [`docs/UPDATE_GUIDE.md`](docs/UPDATE_GUIDE.md) を最初に参照してください。

---

## 🚀 すぐ動かす

```bash
npm install
npm run dev
```

→ ブラウザで <http://localhost:4321> を開く

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動（ホットリロード） |
| `npm run build` | 本番ビルド（`dist/` に出力） |
| `npm run check` | 型確認＋本番ビルド。公開前に必ず実行 |
| `npm run preview` | ビルド結果をローカルで確認 |

---

## 🗂 サイト構成（企画書サイトマップ対応）

| URL | 内容 | 企画書の階層 |
| --- | --- | --- |
| `/` | トップページ | — |
| `/events/` `/news/` | イベント・実用ガイド／ニュース解説 | 集客・意思決定 |
| `/sports/` | 県内スポーツの試合・観戦情報 | 集客・地域行動 |
| `/area/` `/area/[slug]/` | 44市町村ハブ・市町村ガイド | 地域ハブ |
| `/eat/` `/life/` `/sauna-play/` `/beauty/` `/stay/` `/company/` | ジャンル別 記事一覧 | 体験・テーマ |
| `/eat/[slug]/` など | 体験レポート記事 | 階層1 |
| `/place/` | 掲載店舗・企業 一覧 | 階層2 |
| `/place/[id]/` | 店舗・企業専用LP（ペライチ） | 階層2 |
| `/reserve/` | 公式予約窓口への案内方針 | — |
| `/biz/` | 地域事業者向けの支援方針 | — |
| `/agency/` | `/biz/` への旧URLリダイレクト | — |
| `/contact/` | お問い合わせ | 階層4 |
| `/reporters/` | 本人確認済みローカルエディター | — |
| `/about/` `/privacy/` | 運営情報・ポリシー | — |

実装全体の現状・保護対象・改善順序は [`docs/growth-rebuild-audit.md`](docs/growth-rebuild-audit.md) を参照してください。

予約は各施設の公式窓口へ案内します。イバトコは現在、予約の受付・仲介を行いません。

---

## ✍️ コンテンツの増やし方

コンテンツは「育てていく」前提の設計です。方法は2通り。

> 📘 書き方・SEOチェックリストは [`docs/CONTENT_GUIDE.md`](docs/CONTENT_GUIDE.md)、
> コピペ用テンプレートは [`_template.md`](src/content/articles/_template.md)（記事）/
> [`_template.md`](src/content/places/_template.md)（店舗LP）にあります（`_`始まりは公開されません）。

### A. Markdownファイルを直接追加（エンジニア向け）

**記事**：`src/content/articles/<ジャンル>/<好きな名前>.md`

```markdown
---
title: 記事タイトル
description: 一覧・SEOに使う説明文
category: eat            # eat / life / sauna-play / beauty / company
cover: 画像URL           # 省略可（省略時はデザイン済みプレースホルダー）
publishedAt: 2026-07-20
reporter: 公式レポーター みお   # 省略可
area: 水戸市              # 省略可
place: tsukuba-ramen-kaze # 紐づく店舗LPのファイル名（省略可）
featured: true           # トップの特集に出す
---

本文をMarkdownで書きます。
```

**店舗LP**：`src/content/places/<店舗ID>.md`（項目は `src/content.config.ts` 参照）

### B. Decap CMS（編集部・非エンジニア向け）

`/admin/` にアクセスすると、ブラウザ上のUIで記事・店舗を追加できます。
初期設定は [`public/admin/config.yml`](public/admin/config.yml) の冒頭コメントを参照してください（GitHubリポジトリ名とOAuthの設定が必要）。

---

## 🌐 公開手順（Cloudflare Workers）

### 1. 初回ログイン

```bash
npx wrangler login
```

### 2. 監査してデプロイ

```bash
npm run deploy
```

`npm run deploy` は本番ビルドと品質監査に合格した場合だけ `npx wrangler deploy` を実行します。設定は [`wrangler.jsonc`](wrangler.jsonc)、配信対象は `dist/` です。

### 3. 独自ドメイン（ibatoco.jp）

- **Cloudflare Registrar** または **お名前.com** でドメイン取得
- Cloudflare の Worker「ibatoco」→ **設定** → **ドメインとルート** → `ibatoco.jp` を追加
- （お名前.com取得の場合）ネームサーバーをCloudflareに向けるか、CNAMEを設定
- 取得したドメインに合わせて [`astro.config.mjs`](astro.config.mjs) の `SITE` と [`public/robots.txt`](public/robots.txt) のSitemap URLを更新

詳細な最終手順は [`docs/TOMORROW_LAUNCH.md`](docs/TOMORROW_LAUNCH.md) を参照してください。

### 4. アクセス解析（Cloudflare Web Analytics）

1. Cloudflare → **Analytics & Logs** → **Web Analytics** → サイト追加
2. 発行された **トークン** を [`src/data/site.ts`](src/data/site.ts) の `cfAnalyticsToken` に貼り付け
3. commit & push（トークン未設定の間は解析スクリプトは読み込まれません）

### 4b. Google Analytics 4 / Search Console（環境変数）

GA4 と Search Console の所有権確認（HTMLタグ方式）は、**環境変数で後から設定**できます。
対象は `.env.example` の2つ（`PUBLIC_` 始まりはビルド時にHTMLへ埋め込まれる公開値です）。

| 変数 | 用途 | 例 |
| --- | --- | --- |
| `PUBLIC_GA_ID` | GA4 の測定ID。`<head>` に gtag.js を設置 | `G-XXXXXXXXXX` |
| `PUBLIC_GSC_VERIFICATION` | Search Console 確認用 `<meta google-site-verification>` | `abc123...` |

**挙動**
- GA4 は設定値がある場合だけ読み込まれます。導入後は実測値を確認し、表示速度への影響を監視してください。
- `PUBLIC_GSC_VERIFICATION` を設定すると、全ページの `<head>` に確認用metaが入ります（DNS/インポートで確認済みなら不要）。
- 新ブランドのメタ情報は [`src/layouts/BrandBase.astro`](src/layouts/BrandBase.astro) が担当します。

**ローカルで設定**

```bash
cp .env.example .env
# .env を編集：PUBLIC_GA_ID=G-XXXXXXXXXX など
```

**本番（Cloudflare）で設定** … ビルド環境変数として登録（コードに直書きしない）
1. Cloudflare → **Workers & Pages** → 対象プロジェクト → **Settings → 変数とシークレット（Build 用の環境変数）**
2. `PUBLIC_GA_ID`（必要なら `PUBLIC_GSC_VERIFICATION`）を追加
3. 再デプロイ（`PUBLIC_` 変数はビルド時に埋め込まれるため、**設定後の再ビルドが必要**）

> ⚠️ GA4 は Cookie を使用します。導入時は [`/privacy/`](src/pages/privacy.astro) のプライバシーポリシー（Cookie/アクセス解析の項）が実態と一致しているか確認してください（本リポジトリでは記載済み）。
> なお Cloudflare Web Analytics（Cookie不要）と併用も可能です。

### 5. お問い合わせフォームの送信先（Formspree）

問い合わせ [`/contact/`](src/pages/contact.astro) の送信先は [`src/data/site.ts`](src/data/site.ts) の `formEndpoint` で管理しています。`/reserve/` は予約フォームではありません。

1. [Formspree](https://formspree.io/) に登録し、New Form を作成
2. 発行された `https://formspree.io/f/xxxxxxx` を `formEndpoint` に貼り付け → commit & push
3. お問い合わせフォームからテスト送信し、受信先・自動返信・プライバシーポリシーとの整合を確認します

> `formEndpoint` が空の間は、送信ボタンでメール下書き（mailto）が開くフォールバックになります。
> 迷惑メール対策や自動返信は Formspree 側の設定で調整できます。

---

## 🎨 デザインの調整ポイント

- **ブランドカラー / タイポ / 余白**：[`src/styles/global.css`](src/styles/global.css) の `:root` で一元管理
  - `--color-ink` / `--color-tide` / `--color-paper` などを使用します
- **ジャンルのアクセント色**：[`src/content.config.ts`](src/content.config.ts) の `CATEGORIES`
- **サイト名・SNS・連絡先**：[`src/data/site.ts`](src/data/site.ts)

---

## 🖼 SNSシェア画像（OGP）は自動生成

記事・店舗LPごとに、タイトル入りのブランドOGP画像（PNG 1200×630）を**ビルド時に自動生成**します
（[`src/pages/og/[...route].ts`](src/pages/og/%5B...route%5D.ts)）。

- アイキャッチ（`cover`）がある記事 → その写真がシェア画像に
- `cover` が無い記事・店舗 → 明朝タイトル＋ジャンル＋IBATOCOのブランド画像を自動生成

日本語フォントは `src/assets/fonts/`（ビルド時のみ使用・ブラウザには配信されません）。

## 🛣 今後のロードマップ（企画書の育成計画）

- [ ] 実取材コンテンツの追加（モニター店舗10社 → 100社）
- [ ] Cloudflare Images 連携（画像最適化・帯域削減）
- [x] お問い合わせフォーム（Formspree対応・要エンドポイント設定）
- [x] 記事・店舗ごとのOGP画像 自動生成
- [ ] 予約機能を提供する場合は、責任範囲・規約・個人情報・施設連携を別途設計
- [ ] Decap CMS の本番OAuth設定

---

技術スタック：**Astro 5** / TypeScript / Content Collections / `@astrojs/sitemap` / `@astrojs/rss` — 依存は最小限、ランタイムJSもごく僅か。表示は爆速です。
