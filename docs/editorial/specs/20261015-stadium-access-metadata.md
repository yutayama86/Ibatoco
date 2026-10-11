# 実装仕様：水戸信用金庫スタジアムのアクセス記事を「アクセス」中心の title・description に

## 管理情報

- action ID: 20261014-stadium-access-parking-cluster
- 作成日: 2026-10-11（Growth Director 最終判断 2026-10-10 の6：title・description を作成し、10/14 以降に観測窓ガードを守って反映）
- 着手日（notBefore）: 2026-10-15（アクセス記事は 2026-09-16 の body 変更で 2026-10-14 まで観測中）
- 対象URL: /news/mito-hollyhock-new-stadium-access/
- 施策種別: seo（metadata のみ）
- 実装可否: ready（10/15 から）

## 目的と根拠

- オーナー判断（2026-10-07）：アクセス記事と駐車場記事は統合せず、役割を分ける。アクセス記事＝電車・バス・徒歩・当日の動線、駐車場記事（/news/mito-shinkin-stadium-parking/）＝駐車場の予約・場所
- GSC（28日・gscQueries）：アクセス記事は 6,514 表示・137 クリック・平均 8.3位・CTR 2.1%
  - アクセス系：「水戸信用金庫スタジアム アクセス」1,497 表示・7.7位・CTR 1.0%、「東海駅から水戸信用金庫スタジアム」97・4.6位・CTR 0%、「最寄り 駅」60・5.5位・0%、「最寄駅」40・5.4位・0%、「水戸駅から水戸信用金庫スタジアム」30・5.4位・0%
  - 駐車場系もアクセス記事に来ている：「水戸信用金庫スタジアム 駐車場」679・9.7位、「駐 車場」420・9.6位。駐車場記事は同じ語で 206 表示・8.4位・CTR 9.7%（駐車場記事のほうがクリックされている）
- 仮説：title・description を「最寄り駅・東海駅から・水戸駅から」に合わせると、アクセス系の CTR が上がり、駐車場系は駐車場記事へ寄る
- 一次情報（記事の sourceUrls。文言の事実はすべて記事内で確認済みの値）：
  - https://www.mito-hollyhock.net/match/stadium/mito/
  - https://www.mito-hollyhock.net/lp26/20260912/
  - https://www.mito-hollyhock.net/news/p=53959/

## 完成コンテンツ

- title（43字）：`水戸信用金庫スタジアムへのアクセス｜最寄り駅は東海駅、水戸駅からの行き方・無料シャトル`
- description（136字）：`水戸信用金庫スタジアム（笠松運動公園）への行き方を公式情報で確認。最寄り駅はJR東海駅で、西口から無料シャトル約10分、徒歩約40分。水戸駅からは常磐線で東海駅へ移動して乗り継ぎます。車は那珂IC・東海スマートICから。駐車場の予約と場所は駐車場ガイドで詳しく案内します。`
- 文言の根拠（記事内）：最寄り駅 JR東海駅・西口から無料シャトル約10分・徒歩約40分（conclusion・keyPoints）、水戸駅は常磐線で東海駅へ移動して西口で乗り継ぎ（keyPoints・whatChanges）、那珂IC・東海スマートIC（conclusion）、笠松運動公園（whatHappened）

## 実装指定

- 対象ファイル：`src/content/news/mito-hollyhock-new-stadium-access.md`
- 変更は frontmatter の `title` と `description` だけ。本文・keyPoints・FAQ・relatedArticleUrls・updatedDate・URL は変えない（1ページ1仮説）
- `src/data/seo-changes.ts` に on-page・experimentType metadata で記録する。queries は「水戸信用金庫スタジアム アクセス」「東海駅から水戸信用金庫スタジアム」「水戸信用金庫スタジアム 最寄り 駅」「水戸駅から水戸信用金庫スタジアム」
- 10/14 以前は実装しない（`node scripts/growth-engine.mjs --check /news/mito-hollyhock-new-stadium-access/ --type metadata` が「変更可」になってから）

## 変更禁止

- URL・canonical・本文の交通・駐車場の事実、駐車場記事（別ページ）

## 公開前確認

- [ ] 観測窓の確認が「変更可」
- [ ] 本番の title・description・og:title が新しい文言
- [ ] `npm run verify` が成功

## 検証

- 期待PV：+281 Views（推定。growth:target の Query Clusters：アクセス系 28日 1,950 表示を、校正済み CTR で3位相当に届いた場合。2026-10-09 時点）
- 14日後KPI（観測：2026-10-15〜10-28）：アクセス系の CTR（変更前 28日 1.0〜2.1%）、2ページ合計の駐車場系クリック
- 中止・差し戻し条件：2ページ合計のクリック（アクセス系＋駐車場系）が変更前 28日の同期間比で 20% 以上下がった場合は、元の title・description に戻す
