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

- 幅：320 / 360 / 375 / 390 / 402 / 412 / 414 / 430 / 768 / 1280 / 1440px（本番は必須の 320 / 375 / 430 / 768 / 1280 / 1440px）
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

## Index Health（scripts/index-health.mjs）

`npm run build` の最後に実行（`npm run verify` と本番デプロイの両方を通る）。単独では `npm run audit:index`。`dist/sitemap.xml` と、ビルド結果の HTML・記事の frontmatter を突き合わせる。**ネットワークには触れない**（本番に配信されるのは dist そのもの。外部HTTPの一時エラーで CI が揺れない）。

CI を止めるもの：

| 種類 | 内容 |
|---|---|
| 重複 | sitemap に同じ URL（末尾スラッシュ違いを含む） |
| 存在しない URL | sitemap の URL に対応する HTML が dist に無い／サイト外の URL／リダイレクト用ページ |
| noindex 混入 | sitemap の URL が `noindex` |
| draft 混入 | `draft: true` または未レビュー（`reviewed` が true でない）の記事が sitemap にある |
| canonical 不整合 | sitemap の URL の canonical が自分自身でない、または canonical が無い |
| 公開記事の欠落 | events・news・articles で `draft: false`・`reviewed: true`・`noindex: false`・canonical が自分自身なのに sitemap に無い |

参考（止めない）：記事以外で、noindex でも canonical 違いでもないのに sitemap に無いページ（タグ一覧など）。意図した除外かを確かめる。`/control/`・`/preview/`・`/og/`・`/search/` などは対象外。

結果は `/control/` の Index Health カード（ビルド時点の値を `dist/control/index.html` に書き込む）、CI のログと Job Summary に出る。テストは `scripts/index-health.test.mjs`。

## 本番への自動アクセスと Cloudflare の上限

本番 QA（`ui-smoke.mjs --production`）・Visual Regression・`verify-production.mjs` は本番に実際にアクセスする。2026-10-06〜10 の Cloudflare では、全リクエスト約34万件のうち約23万件がこれらの自動アクセスだった（HeadlessChrome・IbatocoProductionQA・ibatoco-verify-production。Issue #226 の調査）。

- Workers の無料プランは Worker の実行が1日10万件まで。超えると Worker を通るリクエストが 429 になる（静的ファイルは無料・無制限）
- `wrangler.jsonc` の `run_worker_first` は、HTMLページと /control/ だけ Worker を通し、`/_astro/*`・`/images/*`・`/fonts/*`・`/og/*` などの静的ファイルは通さない。/control/ が範囲から外れていないかは `scripts/security-audit.mjs` が検査する
- 本番 QA は必須の6幅だけ、Visual Regression は PR のときだけ本番を撮る（main への push・定期実行では撮らない）
- 本番 QA は GA4 の送信経路（CSP）も検査するが、送信そのものは止める（計測は送らない）
- メンテナンス用の `SITE_PASSWORD` を設定したとき、静的ファイル（画像・CSS・JS）は保護されない（HTMLページは保護される）

