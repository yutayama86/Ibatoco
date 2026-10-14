# 公開・計測・Growthの統合ゲート

更新: 2026-10-12。既存の `AGENTS.md`、`docs/IBATOCO_UNIFIED_GROWTH_OS.md` を優先し、独立したOSを増やさない。

## 並行運用

- Growth: 11月GA4 Views 100,000を最優先。記事・回遊・収益導線の実装は停止しない。
- Release: 記事変更は一次情報確認、frontmatter schema、イベント台帳の同期、`npm run verify`、PR CI成功後にmainへマージする。
- Measurement: GA4計測の健全性を独立に確認し、障害日を実際のPV減とみなさない。

## 公開完了の定義

1. PR CIが成功（失敗時はジョブログから根本原因を修正）。
2. mainにマージされたコミットSHAを記録。
3. mainのCloudflare本番デプロイ成功を確認。PRプレビューの成功だけでは不可。
4. 公開URLでHTTP 200、期待するタイトル・本文、canonical、index/noindex、内部リンクを確認。
5. 1〜4の証拠が揃うまで「公開完了」と報告しない。チェックできない項目は「未確認」。

## イベント記事の必須検査

- `sourceUrls` はURL文字列ではなく schemaに適合するURL・表示名オブジェクト。
- `data/editorial/event-registry.json` は既存IDを更新し、重複追加しない。新規イベント記事は `npm run editorial:sync` を実行する。
- 公開フラグ `draft/reviewed/noindex` と編集承認を確認。一次情報にない数字・駐車場・出演情報は公開しない。

## GA4計測異常の切り分け

- 配信面: GA4タグが実際に読み込まれること、CSP `script-src`/`connect-src` が必要なGA4送信先を許可することを検査。既存 `scripts/analytics-audit.mjs` を利用。
- 収集面: GA4 Views/Sessions/engagedSessions、日別欠損、前日比の急変を確認。engagedSessions/Sessionsが極端に低い場合は要調査として扱い、勝手に0補完しない。
- 外部比較: GSCクリック・表示回数はGA4 Viewsとは別指標。GSC正常かつGA4異常なら計測障害を優先調査する。判定は `src/lib/measurement-monitor.mjs`（GA4 日別 × GSC 日別。日次レポートの「計測の健全性」と `/control/`。docs/GROWTH_ENGINE.md「計測の健全性」）。
- `data/editorial/measurement-incidents.json` に障害期間と復旧確認の根拠を記録。部分回復を完全復旧としない。
- ASP送客クリックは確定成果・売上ではない。Revenue Funnelを分離する。

## 日次報告（1画面）

- Growth: 実施した公開施策、11月目標に対する最新の確定Viewsとギャップ、次の需要機会。
- Release: PR番号、CI結果、main SHA、本番デプロイ、公開URLの実地確認。
- Measurement: GA4確定最終日、欠損・障害の有無、GSC確定最終日、売上の確定有無。
- Blocker: オーナー操作が必要な場合だけ、必要な操作を具体的に1件ずつ提示。

追加の有料サービス・権限変更・公開UI大改修は無承認で実行しない。
