## 目的

<!-- 誰の何が良くなるか。依頼・Issue・仕様（docs/editorial/specs/…）があればリンク -->

## 変更内容

<!-- 変更したファイルと、その理由。公開対象と関係のない差分を混ぜない -->

## 一次情報（事実を扱う変更のとき）

<!-- 出典の URL・表示名・確認日（日本時間）。開けなかった公式は「未確認」と書く -->

## 検証

- [ ] `npm run verify`（手元で実行できないときは、この PR の Validate site の結果で確認）
- [ ] 記事の追加・修正：`npm run verify:article -- <slug>`
- [ ] 日付を扱う：`npm run date:check`
- [ ] 画面の変更：CI の画面検査（ui-smoke）が成功。Visual Regression の差が大きいページは意図した変更か下に記入
- [ ] 新しい記事：カード画像（`npm run og:cards` の生成物）と台帳（`event-registry.json`）を同じ PR に含めた
- [ ] SEO の変更：`src/data/seo-changes.ts` に記録した（観測窓：`npm run growth:check`）

<!-- 実行できなかった検証は、成功扱いにせず「未実施」と書く -->

## 影響と確認してほしいこと

<!-- 既存 URL・canonical・構造化データ・TOP の必須構成・計測（GA4 イベント）・収益導線への影響。無ければ「なし」 -->

## 公開の扱い

- [ ] 下書きのみ（マージしない）
- [ ] オーナー承認後にマージ → Deploy production → `/build.json` と公開 URL で反映を確認

<!--
観測中のページを事実の修正で変えるときは、次の1行を本文か最新コミットに書く（書き足したら空コミットを push して CI をやり直す）：
observation-exception: fact — 理由
-->
