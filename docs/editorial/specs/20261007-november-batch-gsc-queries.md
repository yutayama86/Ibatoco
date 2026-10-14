# 実装仕様：11月獲得バッチ（gscQueries 実測から 3件）

## 管理情報

- action ID: 20261007-tsuchiura-hanabi-hatsusu / 20261007-tsukuba-ropeway-fare / 20261007-kasama-kiku-relay-links
- 作成日: 2026-10-07
- 対象URL: /events/tsuchiura-hanabi-2026/ ・ /events/tsukuba-cablecar-ropeway-guide/ ・ /events/kasama-kiku-matsuri-2026/
- 施策種別: seo（title・description）／internal-link
- 実装可否: 実装済み（Claude Code、ChatGPT Growth Director 2026-10-07 の指示による）

## 目的と根拠

performance-snapshot.json の gscQueries（3,032件、GSC 2026-09-07..10-04、Windsor.ai）を「ページ × 検索意図」でまとめ（npm run growth:target の Query Clusters）、観測期間外で、事実が本文に既にある（または公式で当日確認した）ものから選んだ。

| 施策 | 現状（実測） | 打ち手 | 伸びしろ（推定） |
|---|---|---|---|
| 土浦花火 × 発数 | 「何発」系 28日98表示・8.1位・CTR 1.0% | title に約2万発、description を「何発」に答える形へ | +16/月（現状の表示のまま）。11月7日に向けた季節の増加は実測が無く数値化しない |
| 筑波山 × 料金 | 料金系 7日352表示（新規）・7.3位・CTR 2.3%。うちロープウェイ料金系は CTR 0% | title をロープウェイ先頭にし、ケーブルカーの当面運休を明記 | +52/月 |
| 笠間の菊まつり × 総合 | 7日204表示（新規）・7.4位・CTR 0.5% | 関連5ページから内部リンク（新栗まつり終了後の PV Relay 先） | +34/月 |

一次情報：
- 土浦花火の打ち上げ数：観光いばらき（茨城県観光物産協会）のイベント情報「約20,000発」（記事本文FAQと同じ帰属。大会公式の概要には記載なし）
- 筑波山ケーブルカー運休：筑波観光鉄道「9月25日(金)以降のケーブルカー・ロープウェイの運行につきまして」（https://mt-tsukuba.com/information/ から。2026-10-07 に再確認、ケーブルカーは当面運行休止・ロープウェイは通常運行）
- 菊まつりの会期：記事の既存出典（笠間稲荷神社 令和8年 祭典・行事予定、笠間観光協会 2026-09-28 掲載チラシ）

## 完成コンテンツ

- 土浦花火 title：土浦花火大会2026｜11月7日の時間・約2万発・駐車場・シャトルバス・有料席まとめ
- 土浦花火 description：第95回土浦全国花火競技大会は2026年11月7日（土）17:30開始、打ち上げは約20,000発（観光いばらき）。荒天時は11月14日に延期。シャトルバス、有料駐車場、バイク・自転車の駐車案内、有料観覧席の状況を公式情報で整理しました。交通規制図は公式が準備中です。
- 筑波山 title：筑波山ロープウェイ・ケーブルカーの料金と乗り方｜大人片道930円、ケーブルカーは当面運休
- 筑波山 description：筑波山ロープウェイとケーブルカーの運賃は2026年10月1日から大人片道930円・往復1,860円。ケーブルカーは9月25日から安全確認のため当面運休、ロープウェイは通常運行（10月7日確認）。小児運賃、運行時間、シャトルバス、駐車場も公式情報で整理しました。
- 菊まつりへの内部リンク元（relatedArticleUrls の先頭）：/events/kasama-inari-jinja-guide/、/news/kasama-kogiku-meigara-sanchi-2026/、/events/ibaraki-events-october-2026/、/events/ibaraki-ceramic-art-museum-guide/、/events/ibaraki-autumn-odekake-2026/

## 変更禁止

- 本文・H1・URL・構造化データは変えない（title・description・関連リンクのみ）
- 新栗まつり記事（10月13日まで観測中）からの導線は 10月14日以降
- 筑波山ケーブルカーの運行が再開されたら、title・description を即日直す（事実の更新。observation-exception: fact）

## 受入条件

- npm run verify 成功、本番 Responsive QA 通過
- src/data/seo-changes.ts に3件記録（14日で評価：2026-10-21）
