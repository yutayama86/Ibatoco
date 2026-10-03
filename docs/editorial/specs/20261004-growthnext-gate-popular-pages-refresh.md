# GrowthNext 7日評価と人気ページ推薦の最新化

## 目的

11月10万PVへ向け、内部回遊モジュールを連続改修せず、最新のGA4実測に基づく推薦データだけを更新する。GrowthNextの7日ゲートを判定し、クリック率とPV/Sessionを分けて記録する。

## 実測と判断

- 対象期間: 2026-09-26〜2026-10-02
- GA4 Views: 3,935
- Sessions: 3,324
- Views/session: 1.1838（前7日1.1370、+4.12%）
- `growth_next_view`: 2,369
- `growth_next_click`: 112
- GrowthNext CTR: 4.73%
- 判定: クリック基準2%を達成。PV/Sessionは悪化せず改善したが、目標5%にはわずかに届かない。UI・文言・配置は変更せず、2026-10-25の28日評価まで観測を続ける。

## 実装

`data/editorial/popular-pages.json`を直近7日のGA4 Viewsで更新する。ホーム、終了済みで後継導線のないページを除外し、最大8件を保存する。11月需要につながる笠間の菊まつりを同数帯の候補から優先する。

推薦対象:

1. 茨城パスポート
2. かさま新栗まつり
3. 大洗あんこう祭
4. rockin'star Carnival
5. 水戸新スタジアムアクセス
6. 土浦カレーフェスティバル
7. 水戸信用金庫スタジアム駐車場
8. 笠間の菊まつり

## 変更禁止

- 既存URL・canonical
- 記事本文・title・description
- TOPページのレイアウト
- カードCSS・既存画像
- GrowthNextのUI・文言・配置・計測イベント

## 受入条件

- JSON管理ファイルが有効
- `npm run verify`とCIが成功
- 本番の主要URLが200
- GrowthNext表示ページで推薦導線が表示される
- 10月25日まで同モジュールを母数不足で再改修しない

## 検証

- 7日後（2026-10-11）: 人気ページ構成、GrowthNext CTR、Views/session、11月重点ページへの遷移を中間確認
- 28日後（2026-10-25）: CTR 2%以上、Views/session改善、11月重点ページの流入増を総合判定
- 継続条件: CTR 2%以上かつViews/sessionが悪化しない
- 再設計条件: 500 view以上でCTR 1%未満、またはViews/sessionが基準より悪化
