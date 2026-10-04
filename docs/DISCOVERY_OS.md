# Ibatoco Discovery OS v1

## 目的
イバトコを「記事を読む地域メディア」から、「茨城で今日・次の休日に何をするか決める意思決定基盤」へ進化させる。

## 絶対条件
- 一人運営を前提にする。売上増加に比例して運営工数が増える機能は採用しない。
- 元データを一度整備し、検索・推薦・SEO・SNS・LINE・将来APIで再利用する。
- 「リアルタイム」「空いている」「営業中」など、取得できない状態を推測で表示しない。
- 検索結果ゼロを放置しない。完全一致が少ない場合は、近い候補へ自動で緩和する。
- 自動生成SEOページを無制限にindexしない。十分な独自価値があるURLのみindex対象とする。
- 公式一次情報、確認日、終了判定は既存の品質ルールを維持する。

## v1
1. /discover/ 行きたいところ検索
2. 既存の公開イベント・おでかけガイドを共通のDiscovery Entityへ変換
3. 気分 / 同行者 / エリア / テーマによる絞り込み
4. 完全一致が0〜2件のとき、近い候補を返すフォールバック
5. GA4 discovery_search 計測
6. /events/ からDiscoveryへの主要導線

## v2候補
- Event / Place / Storeの共通Entity化
- 今日 / 明日 / 今週末
- 2時間 / 半日 / 1日の旅程生成
- 店舗・主催者のセルフ登録
- 有料PR / スポンサー / 成果報酬
- LINE配信
- API / Widget
- 需要指数

## 収益化原則
優先順位は、送客成果報酬 > セルフサーブ有料掲載 > スポンサー > SaaS/API > ディスプレイ広告。
受託制作・手作業SNS運用・個別コンサルを主収益にしない。


## Autonomous Operator

日次運用は追加費用ゼロで自動化する。

1. `editorial:daily` — 台帳・鮮度・実装キュー
2. `growth:target` — 10万PV進捗
3. `discovery:coverage:write` — 検索の穴
4. `discovery:priority:write` — 成長TOP10
5. `revenue:engine:write` — 収益機会TOP10
6. `monetization:audit:write` — URL単位の収益化漏れ
7. `operator:daily` — 上記を統合し、成長TOP5・収益TOP5・ブロッカー・人間承認事項だけを出す

記事本数はKPIにしない。追加費用が必要なSaaS/API、契約、課金、個人情報取得は自動実行しない。
