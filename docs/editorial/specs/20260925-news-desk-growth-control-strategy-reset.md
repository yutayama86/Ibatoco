# 2026-09-25 News Desk + Growth Control + Strategy Reset

## 目的

茨城県公式の2026年9月24日発表から、生活・地域経済・SPORTSに関係する短報4本を9月25日付で公開する。同時に、GA4直近7日の人気ページ導線、GA4/GSC確定窓、金曜の20レンズ戦略判断を更新する。

## 実装対象

- `src/content/news/hitachi-no-kagayaki-tonkatsu-fair-2026.md`
- `src/content/news/ibaraki-food-drive-autumn-2026.md`
- `src/content/news/ibaraki-robots-human-rights-leader-2026.md`
- `src/content/news/shimotsuma-keisui-melon-ginza-2026.md`
- `src/data/card-images.ts` と生成カード画像4枚
- `data/editorial/popular-pages.json`
- `data/editorial/performance-snapshot.json`
- `data/editorial/growth-opportunities.json`
- `data/editorial/strategy-scorecard.json`
- `data/editorial/event-registry.json`
- `data/editorial/action-queue.json`

## 一次情報と確認日

確認日はいずれも2026年9月25日。

- 常陸の輝きPR: https://www.pref.ibaraki.jp/somu/hodo/hodo/pressrelease/hodohappyoushiryou/2203/documents/260924hanbaisenryaku.pdf
- フードドライブ: https://www.pref.ibaraki.jp/seikatsukankyo/kansei/kankyo/foodloss/fooddrivecampaign.html
- 茨城ロボッツ人権啓発リーダー: https://www.pref.ibaraki.jp/somu/hodo/hodo/pressrelease/hodohappyoushiryou/2203/documents/260924hukusiseisaku.pdf
- 下妻産恵水梨・アールスメロン: https://www.pref.ibaraki.jp/somu/hodo/hodo/pressrelease/hodohappyoushiryou/2203/documents/260924pryuti.pdf

## SEO・検索意図

- とんかつフェア: 開催期間、参加店数、割引企画を短時間で確認したい。
- フードドライブ: 期間、寄付できる食品、受入場所を確認したい。
- 茨城ロボッツ: 委嘱対象者、動画開始日、発信内容を知りたい。
- 下妻産果実販売: 日時、場所、価格、試食日を確認したい。

各記事は結論を先に出し、確認できた事実、関係する人、次に取る行動、FAQ、一次情報を持つ。canonicalとNewsArticleは既存newsテンプレートから生成する。

## Growth Control

- GA4確定窓: 2026-08-27〜09-23、28日Views 5,334。
- GA4直近7日: 2026-09-17〜09-23、Views 1,903。前7日1,790、+6.31%。
- 2026-09-23は正常化したため確定値へ復帰。
- 2026-09-24はengagement rate 1.20%の異常値として採用しない。
- GSC最新確定日: 2026-09-22。直近7日858クリック、23,351表示、CTR 3.67%。
- GrowthNextは355 view / 5 clickで500view未満のため9月28日まで変更しない。

## Strategy Reset

20レンズを `strategy-scorecard.json` に保存し、翌週配分を次の通りとする。

- seasonal-search-and-news: 45%
- revenue-measurement-and-b2b-conversion: 25%
- trust-freshness-and-automation: 20%
- international-and-new-channels: 10%

## 変更禁止

- TOPページ
- 既存newsカードCSS
- 既存記事のカード画像
- 既存URL、canonical、slug
- 英語版ひたち海浜公園のtitle/H1/本文
- GrowthNextの配置・文言・ロジック
- 未承認のakippa導線

## 公開前・公開後確認

1. `npm run date:check`
2. `npm run verify`
3. PRのCI成功
4. mainへmerge
5. 本番 `/news/` に9月25日付4本が表示
6. 4個別URLが200
7. 4カード画像が200、1200×630、同一行カード高が揃う
8. NewsArticle、canonical、公開日、一次情報リンクを確認

## KPI

- 7日後: 4記事のViews、Organicクリック、内部リンククリック、GrowthNext総母数、常陸の輝き記事からの地域行動を確認。
- 28日後: News Deskの再訪・検索寄与、記事別の資産性、地域事業者接点を比較する。
- 母数不足は失敗扱いしない。日付誤り、リンク切れ、構造化データ不整合は即時修正する。
