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


## Partner Pipeline

Google Driveの `Partner_Pipeline` に、検索/行動データから見つけた提携候補を記録する。

記録対象:
- 未提携なのに実クリックが出ているサービス
- 高需要イベント/エリアで、宿泊・駐車場・体験等の文脈が一致する事業者
- Sponsor/PR/Partnerの適合性がある既知事業者

ChatGPTは候補発見と根拠整理までは自動で行う。新規ASP申請、営業連絡、価格提示、契約はユーザー承認が必要。編集順位・おすすめ順位を販売しない。


## B2B CRM

paid business leadは `generate_lead` の件数ではなく、Google Drive `B2B_CRM` で商談ライフサイクルを追う。

`new → qualified → meeting → proposal → won / lost → active → renewal / churn`

最低限見る指標:
- paid business lead rate
- proposal rate
- win rate
- average order value
- MRR / recurring revenue
- renewal
- lead source / landing page別の受注金額

顧客の個人情報・連絡先を公開GitHubへ保存しない。

## Local Business Action Revenue Proof

`/place/` が公開されたら、事業者ページの価値をPVではなく `local_business_click` の official / map / tel / reservation で示す。Action CTRが出れば、無料掲載から情報整備・予約導線・Web/SNS/SEO支援へ提案する根拠になる。


## Page-level Revenue Funnel（必須）

Revenue Yield Engine のページ別判断を自動化するため、日次GA4取得ではサイト合計だけでなく **pagePath × eventName** を取得する。

対象イベント:
- `booking_guide_view`
- `outbound_booking_click`
- `booking_guide_view_a` / `booking_guide_view_b`
- `outbound_booking_click_a` / `outbound_booking_click_b`

BookingGuide側は既に `page_path` と `source_page` を送っている。Windsor.ai / GA4で取得できる標準のページパスを優先し、カスタムディメンション未登録を理由に止めない。

取得結果は `data/editorial/performance-snapshot.json` の `conversionDetail.byPage` に保存する。

例:

~~~json
{
  "conversionDetail": {
    "byPage": [
      {
        "path": "/events/oarai-ankou-matsuri-2026/",
        "booking_guide_view": 120,
        "outbound_booking_click": 18,
        "monetized_booking_click": 12,
        "booking_guide_view_a": 58,
        "booking_guide_view_b": 62,
        "outbound_booking_click_a": 7,
        "outbound_booking_click_b": 11
      }
    ]
  }
}
~~~

ルール:
- ページ別値が取得できない場合は `missing` とし、サイト合計をページへ按分しない。
- `monetized_booking_click` は `is_paid_link=1` が取得できる場合のみ使う。取得不能なら0ではなく未取得として扱う。
- ページ別ファネルが取れたら、Revenue Yield Engineは Actual RPM → Monetized Click / 1,000PV → Intent Proxy の順で判断する。
- 収益化施策の横展開は、単純なPV上位ではなくページ別Yield上位を優先する。

## Self-service Supply

`/submit/` を店舗・施設・イベント主催者からの構造化された情報入口として扱う。

- `event-submission`: イベント情報提供
- `business-submission`: 店舗・施設の新規掲載候補 / 修正

両方とも既存Formspreeを使い、追加費用は発生させない。送信内容は自動公開せず、一次情報確認を通す。

GA4では `contact_form_view` / `contact_form_start` / `generate_lead` を `form_id` で分解する。投稿件数ではなく、採用率・更新反映率・運営工数削減を評価する。

将来D1へ移行する場合も、投稿 → pending → verified → published / rejected の承認フローを維持し、店舗側からの入力だけで公開状態にしない。


## Experiment Promotion

`booking-experiment.mjs` が `a-candidate` または `b-candidate` を出した場合、日次OSは次を確認する。

1. 各variant 200 views以上
2. 各variant 8 clicks以上
3. 相対改善率10%以上
4. |z-score| 1.96以上
5. 計測異常・イベント開催直前など明白な交絡がない

条件を満たす場合、低リスクのCTA実験として `src/data/experiments.ts` の `winner` を勝者へ設定するPRを作成し、CI成功後にmergeできる。公式リンクの順位・内容は変更しない。

`winner` が設定された後は全ユーザーへ同じvariantを表示できる。結果が不安定、母数不足、交絡ありの場合は `winner: null` のまま継続する。


## Commercial Monetization Share

BookingGuide のクリックは、公式情報と広告・予約導線を混在させるため、全 `outbound_booking_click` を収益化率の分母にしない。

分類:
- `official`: 公式サイト・主催者の一次情報。収益損失ではない。
- `paid`: 実際の成果URLへ遷移したクリック。
- `active-unmapped`: 提携済みproviderだが、そのURLが成果URLへ変換されていないクリック。最優先修正。
- `non-partner-candidate`: 未提携providerへのクリック。新規提携の需要シグナルとして別管理。

KPI:

`Commercial Monetized Click Share = paid / (paid + active-unmapped)`

公式クリックは分母から除外する。未提携候補も既存提携の実装漏れではないため、このKPIの分母には含めない。

未提携候補はPartner Opportunity Engineで別途評価し、終了済みイベントの過去クリックは申請優先度に使わない。


## Growth OS の Revenue Funnel（2026-10-07 オーナー判断）

`src/lib/revenue-funnel.mjs`（`/control/` と `npm run growth:target` に表示）。収益を次の7段に分け、どこで止まっているかを見る。

| 段 | 値の出どころ | 期間 |
|---|---|---|
| PV | GA4 Views | 直近7日 |
| CTA表示 | GA4 `booking_guide_view` | 直近7日 |
| CTAクリック | GA4 `outbound_booking_click`（公式リンクを含む） | 直近7日 |
| ASPへの送客クリック | GA4 `paid_booking_click`（提携リンクのみ） | 直近7日 |
| 発生成果 | `data/editorial/asp-results.json`（ASP管理画面で確認した値） | 報告時点の累計 |
| 確定成果 | `data/editorial/revenue-ledger.json`（確定のみ） | 累計 |
| Revenue | 同上 | 累計 |

- **クリックを成果・売上として扱わない**。取得できない値は 0 ではなく null（画面では「未取得」）
- 指標：Revenue / 1,000 Views（確定売上 ÷ 直近28日Views × 1,000）、Affiliate CTR（ASP送客 ÷ CTA表示）、承認率（確定 ÷ 発生）。**発生CVR・EPC は、クリックと成果の期間がそろうまで計算しない**（7日のクリック ÷ 累計の成果で割らない）
- 現状（2026-10-07 オーナー報告）：**A8 はクリックあり・成果0**。`asp-results.json` に `occurred: 0`・`status: clicks-without-conversions` として記録
- 成果0が続くときは「CTAを増やす」だけで対応しない。送客ページ × 提供元の一覧で、**検索意図 × 商材のミスマッチ**を先に疑う（例：アクセス・駐車場を調べる読者に宿泊予約を出していないか）
- 高商用意図のページ（駐車場・ホテル・宿泊・予約・飲食店・あんこう鍋の店・アクセス・交通規制・周辺観光）は収益化候補として評価する。ただし読者の検索意図に合う場合だけ置き、SEO・UX を損なう CTA の乱設はしない
- `asp-results.json` は管理画面の集計（成果0も含む）、`docs/records/affiliate-results.csv` は成果1件ごとの記録、`revenue-ledger.json` は確定売上の正本。ASP新規申請・契約は引き続きオーナー承認

