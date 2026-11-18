# 常磐線特急ガイド：割引の申込期限後の事実更新

Issue #279。対象は `/events/joban-line-hitachi-tokiwa-guide/` の既存記事1本。
実装キュー `20261120-joban-tokuwari-application-end` の正本。

## 着手条件と一次情報

- **2026-11-20以降（日本時間）に着手する。期限前に終了扱いにしない。**
- 2026-11-18、えきねっと公式で12月7〜11日・14〜17日乗車分と、乗車28日前23:50の申込期限を確認した。最後の12月17日乗車分の期限は11月19日23:50と計算できる。
- 実行時にも次の公式本文を開き、対象期間・申込条件・変更や延長の有無を再確認する。検索スニペットだけで判断しない。取得できない場合は未確認として公開せず、確認できた範囲と取得失敗をIssue #279へ残す。アクセス制限を回避しない。
  - https://www.eki-net.com/top/ticketless/
  - https://www.eki-net.com/top/product/tokkyu/tl-tokuwari.html
  - https://www.eki-net.com/top/tokudane/pdf/price/zairai/tl_sp28_joban.pdf

## 変更範囲

- summary・keyPoints・highlights・FAQ・本文にある「発売しています」等を、実行時に確認した申込状態に合わせる。延長等がなければ、当初の12月乗車分の新規申込期限が11月19日23:50で終了したことを明示する。
- **申込期限と乗車期間を分ける。** 12月の対象乗車日や購入済み予約の利用まで終了したと書かない。通常の在来線チケットレス特急券と、対象期間限定のトク割スペシャル28を混同しない。
- 乗車券は別途必要で、50％割引は指定席特急料金の割引であることを保つ。区間別の料金追加や新たなSEO改稿は対象外。
- title・H1・URL・canonical・デザイン・計測・workflow・依存は維持する。descriptionは申込期限の誤認防止に必要な事実訂正だけに限定する。
- 実際の公開日をJSTのupdatedDateとし、実際に再閲覧したsourceUrlsのaccessedAtを更新する。イベント台帳のarticleUpdatedAtを同じ日へ同期し、他の候補や手動編集情報を上書きしない。

## 検証と公開

1. 変更前にgrowth:checkで観測状況を確認する。PR本文に `observation-exception: fact — 割引の申込み期限が終わったため` と、公式再確認日・対象条件を記録する。
2. SEO変更履歴は実公開日・kind on-page・experimentType factで記録し、変更コミットを確定する。11/15の本文改稿記録と観測期限を消さない。
3. `npm run verify:article -- joban-line-hitachi-tokiwa-guide`、`npm run date:check`、`npm run verify` と必須build/Analyzeを確認する。
4. 既存のEditorial承認条件を満たす場合のみマージし、Deploy production・build.json一致と公開画面/FAQ JSON-LDを確認する。未確認の事実や新たな承認事項があれば公開しない。

## 効果の確認

- #614の改稿は11/15夜。最初の完全な変更後7日は11/16〜22、変更後28日は11/16〜12/13とする。11/15当日は比較から分ける。
- 7日分は11/25以降、28日分は12/16以降を目安に、実際のGSC確定日が各期間の末日まで届いたことを確認して評価する。データ未到着は未判定。
- 同じページ×検索語のクリック・表示・CTR・順位を比較し、順位・季節要因や今回の期限訂正を併記する。検索結果で回答を読んで離脱したという説明は仮説であり、原因確定としない。
