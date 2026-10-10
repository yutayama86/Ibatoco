# 実装仕様：「今日の茨城」/today/ を sitemap に載せる

## 管理情報

- action ID: 20261010-today-sitemap
- 作成日: 2026-10-10（Growth Director の委任：低リスク・オーナー判断不要の項目を ready に進める）
- 対象URL: /today/
- 施策種別: technical
- 実装可否: ready

## 目的と根拠

- /today/（「今日の茨城」Phase 1、20261008-today-ibaraki-mvp）は 2026-10-08 に公開済み（commit 611d664）。本番で 200・canonical は自分自身・noindex なし
- ただし sitemap.xml に無く、サイト内のどのページからもリンクされていない（2026-10-10 に dist で確認：/today/ への内部リンク 0件）。検索エンジンにも読者にも見つけられない状態
- sitemap への追加は表示を変えない。/sponsor/・/discover/ と同じ扱い（オーナー判断 2026-10-07 の前例）

## 実装指定

- 対象ファイル: `src/pages/sitemap.xml.ts`。`/discover/` の次に `/today/` を足す
- `src/data/seo-changes.ts` に technical として記録する
- サイト内リンク（TOP・ヘッダー・フッター・一覧ページからの導線）は、この仕様では足さない（見た目の変更でオーナー判断が必要。docs/editorial/specs/20261010-mvp-forecast-review.md）

## 変更禁止

- /today/ のURL・title・本文・TOPの確定デザイン

## 公開前確認

- [x] `dist/sitemap.xml` に `https://ibatoco.jp/today/` がある
- [x] `npm run verify` が成功

## 検証

- 28日後KPI：GSC で /today/ の表示が出るか（今の「今日・今週末」系の検索語はサイト全体で28日55語・表示59回と小さい。期待PVは設定しない）
- 中止・差し戻し条件：Index Health で重複・canonical の問題が出た場合
