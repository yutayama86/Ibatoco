# 大洗海上花火大会2026｜直前交通情報更新

## 目的

開催4日前に主催者が公開した大洗鹿島線の臨時ダイヤと乗車券注意を既存記事へ反映し、来場者の移動失敗と帰宅時の混乱を減らす。新規ページは作らず、既存URLの交通意図を補強する。

## 対象

- URL: `/events/oarai-kaijo-hanabi-2026/`
- ファイル: `src/content/events/oarai-kaijo-hanabi-2026.md`
- 変更種別: 季節期限を優先した既存記事の事実更新
- 変更禁止: URL、slug、title、description、canonical、広告URL、既存の駐車場・雨天・フードイベント情報、ページデザイン

## 一次情報

- 大洗海上花火大会2026公式「大洗鹿島線で大洗町へお越しのお客様へ」  
  https://www.oarai-hanabi.jp/traffic/page000042.html
- 確認日: 2026-09-22（Asia/Tokyo）

## 確認済み事実

- 大会当日は大洗鹿島線が臨時列車を含む特別ダイヤで運行予定
- 水戸発〜大洗着は15:00〜17:00頃、大洗発〜水戸着は花火終了後19:30〜23:00頃に特に混雑予想
- 大洗鹿島線ではSuica・PASMOなどのIC乗車カードを利用できない
- 水戸駅での往復乗車券、またはデジタル企画乗車券「ひたちのくに紀行」の事前準備を公式が案内

## 実装内容

- `updatedDate` を2026-09-22へ更新
- summary、keyPoints、highlights、notes、FAQへ上記の確認済み事実を追加
- sourceUrlsへ主催者の交通情報URLと確認日を追加
- 推測時刻、未確認の運賃、増発本数は書かない
- akippaは申請中のため導線を追加しない

## 受入条件

- 日付と曜日が日本時間基準で矛盾しない
- 臨時ダイヤ、混雑時間帯、ICカード非対応、事前乗車券案内が記事に表示される
- URL、title、description、デザイン、既存広告URLに差分がない
- `npm run date:check` が成功する
- `npm run editorial:check` が成功する
- `npm run verify` が成功する

## 検証

- 7日後: 開催終了後のため、GSCの交通・アクセス系query、GA4 Views、engagement、outbound_booking_clickを確認。因果は断定しない
- 28日後: 季節終了ページの後継導線と、来年再利用する恒久情報の残し方を確認
- 中止条件: 公式情報の変更・中止・臨時ダイヤ撤回が出た場合は即時訂正

