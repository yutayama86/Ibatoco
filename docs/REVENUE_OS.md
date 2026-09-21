# イバトコ Revenue OS

## 目的

GA4 Views 100,000は集客目標であり、事業目標ではない。Revenue OSは「集客 → 意図 → 行動 → 送客/問い合わせ → 確定収益」を追い、アクセスを売上へ変える。

## 現在地（2026-09-21）

- GA4 28日 Views: 4,658
- Sessions: 3,477
- Organic Search Sessions: 2,957
- outbound_booking_click: 9
- business_cta_view: 180
- business_cta_click: 0
- generate_lead: 4
- affiliate-results.csv: 確定成果なし
- business-inquiries.csv: 確定B2B問い合わせ/受注なし

したがって現状の主問題は「収益機能がゼロ」ではなく、検索流入と高意図ページを、文脈に合う取引・送客・事業者接点へ十分に接続できていないこと。

## 毎日のRevenue Review

1. GA4 Views / Sessions / Organic Search
2. 高意図LPのViews、booking click、CTA、lead
3. ASPの確定成果・確定報酬（取得できる場合のみ）
4. B2B問い合わせ・受注・入金
5. Revenue / 1,000 Views
6. 収益モデル別のボトルネック
7. 翌日までに完了させるRevenue Growth Batch

## ページごとの monetizationIntent

ページを次の意図に分類する。

- discover: 情報探索。直接収益を無理に置かない
- visit: 行く/見る。交通・駐車場・周辺施設
- book: 泊まる/予約する。宿泊・体験・予約
- buy: 購入。地域産品・チケット等
- business: 店舗/事業者向け。診断・制作・運用相談
- repeat: 見頃/試合/運行/イベント更新。LINE/メール等の再訪導線

## 収益レーン

正本は `data/editorial/revenue-opportunities.json`。

特に初期は以下を優先する。

- 旅行・予約・送客: イベント/観光/SPORTSの「泊まる・駐車場・予約」意図
- 地域事業者リード: 汎用「相談」より検索需要レポートや予約導線診断
- Inbound: 東京起点の英語検索露出を宿泊/体験/回遊へ接続
- Sponsor: 大型イベント/エリア/SPORTSの協賛枠
- Data: イベントDB、44市町村、検索需要を法人/自治体向け資産へ
- Owned audience: 見頃・イベント変更・スポーツ等の更新需要を再訪Viewsへ

## 実行ルール

- 低リスク: CTA文脈最適化、内部送客、予約導線、計測、レポート型B2B入口、データ更新 → 自動実行可
- 要確認: 料金公開、スポンサー商品の価格、ASP新規申請、契約、決済、求人の有料掲載、URL/IA大変更 → 人の承認
- 確定成果が無いものを「売れた」「収益化済み」と表現しない
- 編集順位を販売しない。Editorial / Partner / PRを分離する

## 検証

収益施策は 7日/28日で、露出→クリック→CV→確定成果まで追う。クリック増だけで成功にしない。ASPの承認遅延がある場合は、クリック/発生/承認/入金を別々に扱う。


## Monetization Gap

毎日 `outbound_booking_click` を `partner_status` / `link_provider` / page で分解する。

- クリックされているが `partner_status: none` → 提携・直取引・別の収益導線候補
- BookingGuideが見られているのにクリックされない → 文言・位置・選択肢の問題
- クリックされているのに成果0 → 提携条件、商品適合、承認遅延、リンク品質を確認
- 成果が出る → 同じ検索意図・地域・イベントへ横展開

`booking_guide_view` を分母にして、BookingGuide CTRを計測する。ページPVだけを分母にしない。

2026-09-21時点では、確認できた9件の outbound booking click のうち、active affiliateへのクリックは楽天トラベル2件。残りは公式または未提携サービスへのクリックだった。したがって「クリック需要はあるが、収益対象への接続率が低い」が初期仮説。


## Lead Quality

`generate_lead` を一律に売上リードと数えない。毎日 `form_subject` で分類する。

- contributor: ローカルエディター等の応募
- editorial: 取材・掲載相談など。広告/有料支援とは限らない
- business: Web/SNS/SEO/予約導線等の有料相談
- other: その他

2026-08-24〜09-20の generate_lead 4件は、ローカルエディター2、取材・掲載相談1、その他1。有料B2B受注に直結した確定リードは記録上0。したがって「lead 4 = 商談4」と解釈しない。

## Monetized Click Share

`outbound_booking_click` 9件のうち、active affiliateへのクリックは2件。初期のMonetized Click Shareは22.2%。残り7件は公式または未提携先だった。

公式リンクを無理に広告へ置換しない。読者が実際に押している未提携サービスについてのみ、提携可能性・直取引・同等の収益導線を調べる。公式情報は常に優先する。
