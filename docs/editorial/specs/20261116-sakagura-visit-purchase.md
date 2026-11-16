# 酒蔵ガイド第3弾：潮来・那珂・大洗の訪問と購入

確認日：2026-11-16（日本時間）。個別6本の公開後、オーナーの「進めて！」を受けて通常の編集ガイド3本を追加する。前回分の検索効果が実測できたという判断ではない。

| URL | 検索意図と独自の整理 |
| --- | --- |
| `/events/aiyu-shuzo-tour-guide/` | 愛友酒造の無料見学。開始時刻、45分の内訳、10人前後・バスの予約条件、潮来駅からのアクセス |
| `/events/kiuchi-brewery-honten-guide/` | 木内酒造本店で何が利用できるか。見学休止と売店・きき酒処を区別し、終了時刻の違い、最寄り駅、別施設を整理 |
| `/events/tsukinoi-shuzo-shop-guide/` | 月の井の直売所・購入先。見学不可、銘柄の違い、彦市の窓口ごとの販売条件、大洗の町歩きへの接続 |

## 範囲と一次情報

新規3本、カード画像・索引、内部リンクラベル、SEO履歴、この仕様のみ。既存まとめは2026-12-14まで本文の観測中で、初回・第2弾の記事も変更しない。新規記事の関連リンクは表示される3件に絞り、まとめ・地域ガイド・市町村へつなぐ。UI、権限、認証、計測、workflow、有料サービス、契約は変更しない。

- 愛友：見学 https://aiyu-sake.jp/service1/ 、FAQ https://aiyu-sake.jp/faq/ 、会社 https://aiyu-sake.jp/about/
- 公式FAQの「10人以内の乗用車は予約不要」と「10名以上は予約」の境界が重なる。人数条件を推測で統一せず、10人前後は電話確認とする。個人の見学不要、バス予約制、所要時間・開始時刻・バス駐車料金は公式へ帰属。高速バスの運行間隔はページ間で異なり運行会社未確認なので掲載しない。子ども・車いすの案内はFAQに限定。歩行時間は蔵元の目安として示す。
- 木内：本店 https://kiuchibrewery.co.jp/shop/honten/ 、体験 https://kiuchibrewery.co.jp/tours/ 、鴻巣 https://kiuchibrewery.co.jp/brewery/sakagura/ 、休止発表 https://kiuchibrewery.co.jp/news/2026-06-22/ 、菊盛 https://kiuchibrewery.co.jp/products/sake/
- 見学休止を冒頭で示し、買い物・試飲は通常どおりとの案内を併記。試飲料金・定休日・駐車台数は記載なし。日本酒ツアー、鴻巣のビール工房、石岡の八郷蒸溜所を混同しない。別体験の料金・空き・受付可否は掲載しない。
- 月の井：直売 https://tsukinoi.co.jp/tsukinoi-shop/ 、由来 https://tsukinoi.co.jp/ 、銘柄 https://tsukinoi.co.jp/products/tsukinoi/ 、和の月 https://tsukinoi.co.jp/products/nanotsuki/ 、彦市 https://tsukinoi.co.jp/products/hikoichi/ 、現行公式販売案内 https://shop.tsukinoi.co.jp/pages/hikoichi 、県内販売店 https://tsukinoi.co.jp/shop_list/
- 彦市の蔵元紹介は特約店販売と自社ショップ販売なしを記載する一方、現行オンラインはギフト・頒布会で提供と説明。現行の販売窓口に帰属させ、オンライン購入を一律不可とせず、店頭在庫や現在の申込受付も保証しない。定期便の過去の締切や価格は転載しない。
- 有機の説明を健康効果・飲酒量の推奨へ結び付けない。味の実体験、写真・ロゴの無断使用、架空の取材・順位は追加しない。既存の自動カードを使う。

## 公開・計測

- 事実確認後に公開フラグを変更し、npm ci、verify、各verify:article、date:check、必須CIを確認する。ローカルの画面検査が実行不能なら未実施とし、CIの結果を記録する。
- Draft PRから既存の承認済み編集記事の経路で公開。Deploy production成功、本番SHA一致、新規3URLの本文・確認日・公式CTA・canonicalを確認して完了とする。
- 検索需要・期待PV・収益は未測定。commercialPriorityは未設定。公開後7/28日のGSC・公式リンク送客、8〜12週の実測と運用時間で次の拡張を判断する。クリックを予約・来訪・売上と扱わない。新しい自動タスクは作らない。
