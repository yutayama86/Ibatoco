# 実装仕様：新栗まつり記事から笠間の菊まつりへ導線（観測明け）

## 管理情報

- action ID: 20261014-shinguri-to-kiku-relay
- 作成日: 2026-10-10（Growth Director の委任：仕様を確定し、着手日を予約する）
- 着手日（notBefore）: 2026-10-14（新栗まつり記事は 2026-09-15 公開の new-article で、2026-10-13 まで観測中）
- 対象URL: /news/kasama-shinguri-matsuri-2026/（リンク元）→ /events/kasama-kiku-matsuri-2026/（リンク先）
- 施策種別: internal-link
- 実装可否: ready（10/14 から）

## 目的と根拠

- PV Relay：新栗まつり記事は 10/4 に終了したが、直近7日（10/1〜7）は 1,350 Views、GSC 28日 35,264 表示（平均 6.0位）と、終了後も流入が残っている
- 同じ笠間市の次の山は「第119回笠間の菊まつり」（会期 2026-10-24〜11-23、笠間稲荷神社）。菊まつり記事は直近7日 54 Views、GSC 28日 367 表示（6.0位）
- 菊まつり記事は 10/7 に5ページから関連リンクを受けている（seo-changes 20261007-events-kasama-kiku-matsuri-2026。note に「新栗まつり記事からの導線は10月14日以降」と記載済み）
- 一次情報（菊まつりの会期・会場）：笠間稲荷神社 https://www.kasama.or.jp/event/kiku.html ／笠間市 https://www.city.kasama.lg.jp/page/page000117.html （菊まつり記事の sourceUrls。リンクの表示名に使う会期はこの記事の確認済みの値）

## 完成コンテンツ

- 変更は `relatedArticleUrls` だけ。先頭に `/events/kasama-kiku-matsuri-2026/` を足す（既存の5件は順序を変えずに残す）
- 表示名は既存の `src/data/internal-links.ts` の「笠間の菊まつり2026（10月24日〜11月23日）」をそのまま使う（新しい文言は書かない）

## 実装指定

- 対象ファイル: `src/content/news/kasama-shinguri-matsuri-2026.md`
- 追加・変更箇所: frontmatter の `relatedArticleUrls` の先頭に1行
- 本文・title・description・updatedDate は変えない
- `src/data/seo-changes.ts` に internal-link として記録する（url はリンク元の新栗まつり記事、queries は菊まつりの検索語「笠間菊まつり 2026」「笠間 菊まつり 2026」「菊まつり 2026」）
- 10/13 以前は実装しない（観測窓ガードが止める）

## 変更禁止

- 既存URL・canonical・新栗まつり記事の本文と開催情報（終了済みの表示を含む）
- 菊まつり記事（10/21 まで観測中）は変えない

## 公開前確認

- [ ] `node scripts/growth-engine.mjs --check /news/kasama-shinguri-matsuri-2026/ --type internal-link` が「変更可」
- [ ] 本番の新栗まつり記事の「関連情報」に菊まつりへのリンクが出る
- [ ] `npm run date:check` と `npm run verify` が成功

## 検証

- 期待PV：設定しない（終了イベントから次のイベントへの導線の効果の実測が無い）
- 14日後KPI：菊まつり記事の参照元に新栗まつり記事が出るか（GA4 の next_action / 内部遷移）、菊まつり記事の Views の変化
- 中止・差し戻し条件：新栗まつり記事の検索順位・CTR が下がった場合（GSC 28日）
