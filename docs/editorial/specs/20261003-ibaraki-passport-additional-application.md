# 茨城パスポート追加申請・追加交付 更新仕様

## 目的

- 直近7日で897 Viewsを得た既存の総合案内ページに、2026年10月3日から始まる追加申請を即日反映する。
- 「申請受付は終了」という事実と異なる案内を解消し、追加申請、初回落選者、初回当選者の行動を分けて即答する。
- 11月10日からの追加交付に向け、総合案内と10月2日公開の速報を相互リンクし、既存URLへ検索資産を集約する。

## 対象

- URL: `/news/ibaraki-passport-2026/`
- File: `src/content/news/ibaraki-passport-2026.md`
- 関連URL: `/news/ibaraki-passport-additional-issuance-2026/`
- 関連File: `src/content/news/ibaraki-passport-additional-issuance-2026.md`
- OG: `public/images/news/ibaraki-passport-2026.svg`
- Primary keyword: `茨城パスポート`
- Secondary intent: `茨城パスポート 申請`、`茨城パスポート 追加申請`、`茨城パスポート どこでもらえる`

## 実測根拠

- GA4 2026-09-25〜10-01: 897 Views、825 Sessions。
- GSC 2026-09-23〜09-29: `茨城パスポート` 307 impressions、5 clicks、平均7.41位。
- Growth Batch planning estimate: 変更前7日Viewsを基準に14日間で5%の保全・上積みを置き、期待増分90 Views、confidence 0.7、confidence-adjusted 63 Views。これは検索ボリュームではなく、観測済み自サイト流入を使った保守的な施策比較値。

## 確認済み事実（2026-10-03）

- 追加申請は2026年10月3日(土)10:00〜10月16日(金)18:00。
- 初回申請期間に申請して落選した人は、再申請不要で追加交付対象。
- 初回当選者は10月10日から交付開始。
- 初回落選者と追加申請者は11月10日から順次交付開始。
- 追加申請が多数の場合は交付期間を複数回に分け、具体的な時期は10月19日以降に公式ページで案内予定。
- 追加申請者は受付完了メールの整理番号を交付時に提示する。

## 変更内容

- title、description、結論、要点カード、日程、申請手順、FAQを追加申請の現況へ更新する。
- 総合案内と追加交付速報を双方向リンクする。
- OG図版内の期限を追加申請・追加交付へ更新する。
- 公式Xより検証しやすい観光いばらき公式ページと追加交付プレスリリースを一次情報の先頭に置く。

## 変更禁止

- URL、canonical、記事テンプレート、TOPページ、共通カードCSSを変更しない。
- 県公式の写真、ロゴ、パスポート画像を使わない。
- 交付時期を全員一律の確定日として書かない。
- 初回落選者へ再申請を促さない。

## 公開前確認

- `npm run date:check`
- `npm run verify`
- 個別URLが200。
- title、canonical、更新日、追加申請期間、FAQ、公式CTA、相互リンク、OG画像が表示される。

## KPI

### 7日後

- GA4 Views、Organic landing sessions、GSC clicks/impressions/CTR/position。
- 公式申請CTA、追加交付速報への内部遷移。
- 変更日を含むGSCデータが揃う前、または表示母数不足では失敗判定しない。

### 28日後

- `茨城パスポート`と追加申請関連クエリのGSC clicks/impressions/CTR/position。
- 11月10日の追加交付開始に向けた継続流入と44市町村一覧への回遊。

## 継続・中止条件

- 継続: 追加申請・追加交付の事実が有効で、検索流入または回遊が続く。
- 改善: 200 impressions以上でCTRが1%未満、または公式が交付時期・窓口を更新した場合。
- 即時訂正: 申請期限、交付開始、対象者、窓口に公式変更が出た場合。URLは変更・削除しない。

## 一次情報

- https://www.ibarakiguide.jp/special/ibaraki_passport/passport.html
- https://www.ibarakiguide.jp/special/ibaraki_passport/info/page002309.html
- https://www.ibarakiguide.jp/special/ibaraki_passport/page002241.html
