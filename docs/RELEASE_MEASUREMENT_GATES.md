# 公開・計測の統合ゲート（2026-10-12）

目的：11月10万GA4 Views獲得を止めず、公開手戻りと計測障害の誤判断を減らす。既存の Unified Growth OS / editorial OS / npm run verify / GitHub Actions / Cloudflare を再利用し、新しい有料サービスや常時監視基盤は作らない。

## 1. 記事公開のゲート
1. 一次情報と出典、日付・曜日・公開権限を確認。未確認は draft:true / reviewed:false / noindex:true。
2. 新規イベント記事は `npm run editorial:sync` で既存のイベント台帳エントリを更新する。**同じ id の行を追加しない**。
3. `sourceUrls` は文字列の配列でなく、既存コレクションスキーマに従う URL/表示名オブジェクトの配列。
4. `npm run verify` を実行。PRの必須CIが成功するまでマージしない。失敗時は**ログの最初の具体的エラー**を修正し、修正後に再実行する。
5. マージ後は main のビルド、Cloudflare production deployment、対象URLのHTTP 200、canonical、noindex、記事本文を確認。いずれか未確認なら「公開完了」と報告しない。

## 2. GA4・GSCの計測ゲート
1. `scripts/analytics-audit.mjs` で gtag の単一起動・CSP connect-src 許可・イベント計測の静的検査を継続。静的成功は実測の正常性を保証しない。
2. `data/editorial/measurement-incidents.json` を障害の正本とし、疑わしい日付を欠損0に補完しない。障害日を平常日の比較から除外する。
3. 日次実測は `scripts/ga4-daily.mjs` の confirmedThrough / fetchedAt / coverage / engagedSessions / engagementRate を確認する。ページビューだけ戻っても engagement が極端に低ければ「全面復旧」としない。
4. GSC clicks/impressions と GA4 Views/sessions、ASP outbound clicks と確定成果を混同しない。更新時点が異なる数字は並記し、同一日の比較として扱わない。
5. 障害時は GA4→CSP/ブラウザ送信→取得元（Windsor等）→日次データ→GSC の順で切り分ける。追加課金・プラン変更はしない。

## 3. 毎朝の運用を3レーンで同時に進める
- **Growth**：11月の需要獲得記事・既存ページ改善・内部回遊を優先。実装なしの日は理由と次の実行候補を明示。
- **Reliability**：計測異常、CI、Cloudflare、本番URL、障害の継続・復旧を判定。未解決はオーナーに必要な操作だけ依頼。
- **Revenue**：承認済み送客のクリック、ASP確定成果、Revenue/1,000 Viewsを区別して報告。

## 完了報告テンプレート
- Growth：実装したURL/PR、公開確認、期待値（実測か仮説か）
- Reliability：CI、production、HTTP/canonical/index、GA4確認日、障害の有無
- Revenue：確定成果とクリックを別記、未取得は「未確認」
- Blocker：次に必要な操作・責任者。未公開/未計測を完了と書かない。

この文書は運用手順の整理であり、コードによる自動ゲート追加や監視自動化の実装完了を意味しない。既存の公開・認証・課金承認ルールを変更しない。
