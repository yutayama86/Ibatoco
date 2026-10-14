# 実装仕様：提携リンクへの送客クリック（paid_booking_click）をイベント名で計測する

## 管理情報

- action ID: 20261010-paid-booking-click
- 作成日: 2026-10-10（Growth Director の委任：低リスク・オーナー判断不要の項目を ready に進める）
- 対象URL: BookingGuide を置いている全ページ（予約・宿泊・駐車場の案内ブロック）
- 施策種別: measurement
- 実装可否: ready

## 目的と根拠

- 「予約できるイバトコ」MVP（20261008-bookable-ibatoco-mvp）の受入条件「GA4 で booking_guide_view / outbound_booking_click / paid_booking_click を計測できる」が満たされていない
- 現状：BookingGuide は `booking_guide_view` と `outbound_booking_click`（`is_paid_link` パラメータ付き）だけを送り、`paid_booking_click` は送っていない（2026-10-10 にコードで確認）
- そのため ASP への送客クリックは、`is_paid_link`（カスタムディメンション未登録）か送客先ドメインでしか数えられず、直近7日（10/1〜7）は「取得不能（null）」になっている（performance-snapshot の conversionDetail）
- Revenue Funnel（src/lib/revenue-funnel.mjs）と docs/REVENUE_OS.md は、すでに `paid_booking_click` を「ASPへの送客クリック」の正本として読む設計
- 9/28〜10/4 には提携クリックがあった（あんこう祭3・あんこう鍋1）が、`paid_booking_click` の値は返っていない。GA4 側で同名のイベントを作る設定は無いと判断した（二重計上にならない）

## 実装指定

- 対象ファイル: `src/components/BookingGuide.astro`
- リンクのクリック時、既存の `outbound_booking_click` はそのまま送り、提携リンク（`data-is-paid="1"`）のときだけ、同じパラメータで `paid_booking_click` も送る（`outbound_booking_click` の内数）
- 既存イベントの名前・パラメータ・CTA の表示・並び順・リンク先は変えない
- `scripts/analytics-audit.mjs` に、`paid_booking_click` の送信があることの検査を足す
- `src/data/seo-changes.ts` に計測の変更として記録する（experimentType: measurement。観測窓 0日）

## 変更禁止

- CTA の文言・順序・リンク先、`is_paid_link` などの既存パラメータ、GA4 の計測ID・CSP・gtag の読み込み
- キーイベント（GA4 の管理画面の設定）は変えない。`paid_booking_click` はクリックであって成果ではない

## 公開前確認

- [x] `npm run audit:analytics` で検査が通る
- [x] `npm run verify` が成功
- [ ] 本番デプロイ後、本番 QA（GA4 の送信経路）が通る

## 検証

- 取り込み：10/11 以降の確定日から、Windsor の GA4 で event_name = `paid_booking_click` を日別・ページ別に取る（conversionDetail.recent7.paid_booking_click）。それより前の期間は従来どおり送客先ドメインで判定した値（monetized_booking_click）とし、期間を混ぜない
- 7日後KPI：`paid_booking_click` ≤ `outbound_booking_click`（同じ期間・同じページ）。これが崩れたら計測不具合として止める
- 中止・差し戻し条件：本番 QA で GA4 の送信経路が止まる、または二重計上が見つかった場合
