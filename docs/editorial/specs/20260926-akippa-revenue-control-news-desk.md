# 2026-09-26 Growth Batch：akippa収益正本更新＋News Desk 3本

## 目的

mainで正式登録されたakippaのaffiliate設定と、申請中のまま残っていた収益管理データを一致させる。同時に、茨城県内の地域行動に必要な一次情報ニュースを3本公開する。

## Growth Batch

- `src/data/affiliates.ts`に存在する登録済みakippa設定を正本として扱う。
- `data/editorial/revenue-opportunities.json`と`data/editorial/strategy-scorecard.json`の「申請中」表記を削除する。
- 対象URL以外のakippaリンクは追加しない。
- provider別クリック、成果件数、売上は取得できていないため`missing`または0のままにする。
- 既存記事本文、既存URL、TOPページ、カードCSSは変更しない。

## News Desk

### 1. 茨城空港「空の日」イベント

- slug: `ibaraki-airport-sky-day-2026`
- 検索意図: 開催日時、当日プログラム、駐車場、混雑注意
- 一次情報: https://www.ibaraki-airport.net/soranohi2026/
- CTA: `/odekake/`、`/events/`

### 2. 茨城県9月1日推計人口

- slug: `ibaraki-population-september-2026`
- 検索意図: 最新人口、前月増減、市町村別傾向
- 一次情報: https://www.pref.ibaraki.jp/somu/hodo/hodo/pressrelease/hodohappyoushiryou/2203/documents/260925toukei.pdf
- CTA: `/life/`、`/biz/`

### 3. 県委託事業のメール誤送信

- slug: `ibaraki-outsourced-email-leak-2026`
- 検索意図: 発生内容、影響件数、対象者の対応、再発防止
- 一次情報: https://www.pref.ibaraki.jp/somu/hodo/hodo/pressrelease/hodohappyoushiryou/2203/documents/260925tayousei.pdf
- CTA: `/life/`、`/biz/`

## SEO・構造化データ

- frontmatterの`title`、`description`、`conclusion`、`keyPoints`、`faq`を完成原稿として使用する。
- canonicalは各`/news/<slug>/`。
- `NewsArticle`、OGP、カード画像は既存Newsテンプレートと正規生成処理を使用する。
- 日付と曜日はAsia/Tokyoで確認する。

## Analytics

- 既存の`page_view`、`growth_next_view/click`、`booking_guide_view`、`outbound_booking_click`を維持する。
- 新しい推測イベントは追加しない。

## 変更禁止

- TOPページ
- 既存カードCSS
- 既存記事画像
- 既存URL、canonical、slug
- 登録されていないakippaリンク
- 未確認の成果・売上値

## 公開前確認

- 3本が`draft: false`、`reviewed: true`。
- 一次情報URLと確認日がある。
- 3枚の1200×630カード画像と`src/data/card-images.ts`の対応がある。
- `npm run verify`が成功する。
- 本番`/news/`に3本が表示され、個別URLと画像が200。

## KPI

- 7日後: 3記事のViews、検索流入、内部遷移、GrowthNext CTR。akippaはprovider別クリックが取得できるかを確認する。
- 28日後: ニュース経由の再訪、予約導線クリック、確定affiliate成果、Revenue/1,000 Views。
- 継続条件: 公式短報が再訪または地域行動を生み、カード・公開運用が安定する。
- 中止条件: 重複意図、一次情報不足、誤情報、収益導線が読者価値を損なう場合。
