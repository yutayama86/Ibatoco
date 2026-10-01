# ひたちなか海浜鉄道×海浜公園ガイド 実装仕様

## 目的

- 2026年9月30日で割引販売が終了し、10月以降の料金が確定した時点で、湊線から国営ひたち海浜公園へ向かう検索意図へ正確に答える。
- コキア期から11月3日までの移動需要と、翌年以降も再利用できる公共交通ガイドを同時に獲得する。
- 国営ひたち海浜公園ガイド、コキア記事、那珂湊周辺記事へ文脈回遊させる。

## 対象

- URL: `/events/hitachinaka-kaihin-railway-guide/`
- File: `src/content/events/hitachinaka-kaihin-railway-guide.md`
- Primary keyword: `ひたちなか海浜鉄道 海浜公園 フリー切符`
- Secondary intent: `湊線 1日フリー切符 料金`、`阿字ヶ浦駅 海浜公園 バス`、`コキア シャトルバス`
- Search intent: 料金、買い方、乗換、阿字ヶ浦駅から公園までの移動を一度に確認したい。

## 確認済み事実（2026-10-02）

- 湊線1日フリー切符：大人1,100円、小人550円。
- 2026年9月の割引販売は9月30日で終了。
- 海浜公園入園券付き：通常期は大人1,400円・65歳以上1,300円、季節料金期は大人1,700円・65歳以上1,600円。2026年9月1日価格改定。
- 2026年秋の海浜公園季節料金期間：10月9日〜11月3日。
- 勝田駅〜阿字ヶ浦駅：約30分。
- 阿字ヶ浦駅〜海浜公園西口：スマイルあおぞらバスで約10分。南口まで徒歩約20分。
- 湊線勝田駅・那珂湊駅の窓口で販売。セブンチケットは利用日の5日前から。
- 2026年10月の土日祝日にコキアシャトルバスを運行。10月3日・4日は南口発着へ変更。

## SEO・本文

- title、description、summary、keyPoints、highlights、FAQ、booking、sourceUrlsは対象Markdownのfrontmatterを完成原稿とする。
- 公開日・更新日は日本時間の2026-10-02。
- Article typeは`guide`。イベント固有のEvent構造化データは付けず、サイト共通のArticle/Breadcrumbを使用する。
- canonicalは既存テンプレートから `https://ibatoco.jp/events/hitachinaka-kaihin-railway-guide/` を生成する。
- 個別OG画像がなければ正規のカード生成処理を使用する。公式写真・ロゴ・キャラクターは使わない。

## 内部リンク

- `/events/hitachi-seaside-park-guide/`
- `/events/hitachi-seaside-kochia-carnival-2026/`
- `/events/nakaminato-osakana-ichiba-guide/`
- `/events/nakaminato-ichibazushi-guide/`
- `/area/hitachinaka/`

観測窓中の既存記事へ新たな逆リンクは入れない。イベント一覧・タグ・エリア一覧からの通常掲載で発見可能性を確保する。

## CTA

- 公式の切符、シャトルバス、海浜公園アクセス、海浜公園料金の順に表示する。
- 未承認のASP・駐車場アフィリエイトは追加しない。
- `booking_guide_view`等の既存計測を利用し、新規イベント名を独自追加しない。

## 変更禁止

- 既存URL、TOPページ、既存カードCSS、既存記事本文を変更しない。
- 公式写真、ロゴ、鉄道キャラクターを転載しない。
- 9月の割引価格を10月の料金として表示しない。
- 公式確認できない列車・バス時刻を固定値で書かない。

## 公開前確認

- `npm run date:check`
- `npm run editorial:sync`
- `npm run verify`
- 料金・日付・曜日が日本時間で正しいこと。
- 個別URLが200、title/canonical/FAQ/公式CTA/内部リンクが表示されること。

## KPI

### 7日後

- インデックス・GSC表示の発生。
- Organic landing sessions、Views、Views/session、`booking_guide_view`、公式交通リンクのクリック。
- 表示母数が少ない場合は失敗判定しない。

### 28日後

- GSC clicks/impressions/CTR/position。
- 国営ひたち海浜公園・コキア・那珂湊記事への内部遷移。
- 11月3日後は季節シャトル情報を終了表示に切り替え、恒久の切符・アクセス情報を維持する。

## 継続・中止条件

- 継続：正確な交通情報として表示・流入・回遊のいずれかが発生する。
- 改善：200表示以上でCTRが1%未満、または検索意図とtitleに明確なずれがある。
- 中止/訂正：運賃・販売場所・シャトル運行について公式変更が確認された場合は即時訂正する。URLは削除しない。

## 一次情報

- https://www.hitachinaka-rail.co.jp/blog/2026/02/18/9633.html
- https://www.hitachinaka-rail.co.jp/blog/2026/08/28/8724.html
- https://www.hitachinaka-rail.co.jp/blog/2026/09/25/9039.html
- https://www.hitachinaka-rail.co.jp/gain
- https://www.hitachinaka-rail.co.jp/blog/2026/09/28/9065.html
- https://www.hitachikaihin.jp/access/train-bus.html
- https://www.hitachikaihin.jp/news/park/page001066.html
- https://www.city.hitachinaka.lg.jp/kurashi/kotsu/1001712/1009851/1012968.html
