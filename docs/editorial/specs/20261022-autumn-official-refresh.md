# 2026-10-22 紅葉公式情報の即日更新

## 目的

11月の大型需要に対し、公式発表済みの筑波山もみじまつり・夜間運行と、袋田の滝の最新色づき速報を既存URLへ反映する。前年情報や未確認の見頃日は2026年情報として扱わない。

## 対象

- `/events/tsukuba-autumn-2026/`
- `/events/fukuroda-falls-autumn-2026/`

## 一次情報

- つくば観光コンベンション協会「秋の筑波山」: https://ttca.jp/autumnmttsukuba/
- 筑波山ケーブルカー&ロープウェイ公式: https://mt-tsukuba.com/
- 大子町観光協会「大子の紅葉スポット8選」: https://www.daigo-kanko.jp/themes/koyo.html

## 変更

- 筑波山: もみじまつり会期、標高別の紅葉目安、ロープウェイ夜間運行、ケーブルカー夜間運行予定を反映する。
- ケーブルカーは2026-10-22現在も運転休止中と併記し、夜間運行を確定運行と誤認させない。
- 袋田の滝: 2026-10-19現在「青葉」へ更新する。速報を見頃予想と混同しない。
- URL、canonical、画像は変更しない。公式画像・ロゴは使用しない。

## 期待PV

再現可能な因果根拠がないため `expectedPvImpact` は設定しない。必要な公式事実更新として実行し、獲得PVには計上しない。

## 検証

- `npm run growth:target`
- `npm run audit:freshness`
- `npm run verify`
- 本番200、title/canonical/主要表示/内部リンク/CTA
- 320/375/430/768/1280/1440pxのResponsive QA
