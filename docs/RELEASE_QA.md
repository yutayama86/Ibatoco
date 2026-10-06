# Release QA（表示崩れはリリースブロッカー）

最終更新：2026-10-06

イバトコはスマホ中心のサイト。コードが正しい・ビルドが通った・デプロイが成功した、だけでは完了にしない。
**読者が見る本番画面が正常であること**を、PR と本番の両方で機械的に確かめる。

## 流れ

| 段階 | コマンド | 止まる条件 |
|---|---|---|
| PR・main の CI（Validate site） | `npm run verify` | ビルド・型・SEO監査・観測窓ガード（PRのみ）・単体テスト・年度チェック・UI検査のどれかが失敗 |
| 本番デプロイ（Deploy production） | `npm run deploy` の最後で `node scripts/ui-smoke.mjs --production` | 本番の版がデプロイしたコミットと違う、または本番の表示に問題 |
| 随時の点検 | `npm run qa:prod -- --any-commit` | — |

ワークフローファイル（`.github/workflows/`）は変えず、npm スクリプトの中で実行する。

## UI検査（scripts/ui-smoke.mjs・scripts/ui-smoke-checks.mjs・scripts/qa-pages.mjs）

- 幅：320 / 360 / 375 / 390 / 402 / 412 / 414 / 430 / 768 / 1280 / 1440px（本番は 320 / 360 / 375 / 390 / 430 / 768 / 1280 / 1440px）
- ページ：主要テンプレートを最低1ページずつ（TOP・ニュース一覧・最新ニュース・土浦花火・あんこう祭・袋田の滝・イベント一覧・紅葉テーマ・SPORTS・市町村2件・Discovery・事業者向け・情報送信・検索・Control Center）
- 失敗にするもの
  - 横スクロール（`scrollWidth > clientWidth`）・画面外へのはみ出し・CTAの viewport 外へのはみ出し・親に切られる文字・極端に狭い文字列
  - 画像：src 欠損・404・読み込めない（naturalWidth=0）・縦横比の歪み（6%超）
  - JS：pageerror・console.error・同じサイトの読み込み失敗（本番は 4xx/5xx も）
  - 骨格：ヘッダー・ナビ・main・フッターの欠損、main と h1 が1つずつでない、ページごとの主要DOM（GrowthNext・BookingGuide・出典など）の欠損
  - スマホ（430px以下）：16px未満のフォーム入力、44px未満の主要ボタン、小さすぎる本文
- 本番だけ：本番の `/build.json` がデプロイしたコミットと一致してから検査。375px では遅延読み込みの画像まで読ませる。内部リンク・画像のHTTP状態、`/control/` が次のどちらかであること：ログイン必須（未ログインはログイン画面へ、ログイン画面は noindex）／読み取り専用で公開（200・X-Robots-Tag noindex・Cache-Control no-store）
- 計測：GA4 等への通信は遮断し、本番では計測除外フラグ（`ibatoco_ga_optout`）も立てる。検査のアクセスは GA4 に1件も送らない

ローカル（サンドボックス等）で Chrome を起動できないときは警告を出して飛ばす。CI では失敗にする。

## Visual Regression（参考、scripts/visual-diff.mjs）

このビルドと、いまの本番を同じブラウザで撮って画素の差を数える（375px と 1440px、主要9ページ、上端から6000pxまで）。
人気・新着・今週・推薦・検索結果は毎回変わるので隠し、アニメーションは止め、外部画像は両方とも読み込まない。
**判定はしない**（合否は UI 検査で決める）。差が5%を超えたページは、PR で意図した変更かを確かめる。結果は CI のログと Job Summary に出る。

## 鮮度・年度（scripts/freshness-guard.mjs）

`docs/GROWTH_ENGINE.md` の 6. を参照。URL の年と開催年の不一致は CI を失敗させる。期限切れの表現などは警告として日次レポートと Control Center に出す。
