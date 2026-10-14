# イバトコ Revenue OS

## 目的

GA4 Views 100,000は集客目標であり、事業目標ではない。Revenue OSは「集客 → 意図 → 行動 → 送客/問い合わせ → 確定収益」を追い、アクセスを売上へ変える。

## 収益モデルの優先順位（2026-10-13 オーナー決定・現行）

楽天の初成果（報酬率は約1%）を受けて、アフィリエイト単独では大きな利益にならないと判断し、順番を組み替えた。**この節が 2026-10-11 の方針（下）より優先する。**

1. **地域事業者からの継続収益**：協賛・スポンサー（既存メニュー `src/data/sponsorship.ts`）、店舗・施設の有料掲載、予約・問い合わせの送客成果報酬
2. **既存アフィリエイト**：楽天トラベル・じゃらん・akippa ほか承認済みの案件（`data/editorial/asp-results.json`）
3. **将来の地域データ・予約基盤**

Web制作・SNS運用の受託は補助事業。最優先の集客KPIは 2026年11月の 100,000 Views で、収益化のために記事・SEO・季節の先行対応を止めない。

### 3モデルの比較（要点。価格は仮説で、オーナー承認なしに公開しない）

| | 協賛・スポンサー（推奨） | 月額掲載 | 送客の成果報酬 |
|---|---|---|---|
| 仕組み | 既存で揃っている（`/sponsor/`・申込・規約・`sponsors.ts` に1行で掲載・期間切替・GA4 `sponsor_view`/`sponsor_click`）。料金は 2026-09-27 に公開済み | `/place/` と `stores.csv`・`local_business_click` はあるが、公開中の掲載は0件 | 予約・問い合わせを事業者側と照合する印（専用コード等）が無い |
| 1件の工数 | 枠30分・PR記事2〜3時間・シーズン8時間前後（docs/SPONSORSHIP.md） | 新規1店 2〜3時間（公式確認・写真の許諾）＋毎月の報告 | 照合・請求で1社 月1〜2時間 |
| 現状の送客で売れるか | 季節のピークに露出を売る。あんこう祭は GSC 28日 1,556 クリック（平均3.4位） | 1店あたりの送客は月数件〜数十件の見込み（推定）で、継続の根拠が弱い | 成約が少なく（予約先クリックは週16〜47件）、月30万円には届かない |

**推奨：協賛・スポンサー**（イベント協賛枠を入口に、シーズン協賛・年間の継続へ）。工数が最も少なく、新しい機能が要らず、イバトコが実際に持っている「季節のピーク需要」をそのまま売れる。月額掲載は、10万Views到達と協賛の事例2件ができてから検証する。成果報酬は、協賛先1社で専用コードを試す付加価値として扱う。

営業の再開・提案先・年間協賛の価格・月額掲載の価格は**オーナー判断**（2026-09-27 から営業は保留中）。

### 協賛を売る材料（Growth OS）

`/control/` と `npm run growth:target` の「⑩-2 地域事業者への送客と協賛枠の在庫」に出す（`src/lib/local-revenue.mjs`）。

- **送客先別のクリック**：GA4 の page_path × link_url（期間つき）を、事業者・団体のサイト（公式）と提携（ASP）に分けて集計。表示名は記事の予約案内のラベルから引き、推測しない。例：9/27〜10/3 に大洗観光協会の宿泊施設一覧へ13クリック（あんこう祭11・あんこう鍋2）
- **協賛枠の在庫**：協賛枠を出せるページ（/events/・/news/）を実測で並べる。GA4 のページ別が計測障害で使えない期間は GSC クリック（28日）。終わったイベント・PR記事・防災や事故などの話題は除く。`/control/` では掲載中の枠と空き枠も出す
- 協賛の有無で記事の事実・評価・並び順を変えない（`/about/pr-policy/`）

## メディア主導収益化の優先方針（2026-10-11・上の 2026-10-13 決定で順番を変更）

オーナー判断：イバトコを地域の発見・検索・行動・取引の入口となる高収益メディアへ成長させる。Web制作/SNS運用受託は補助レーンであり、主たる事業モデルにしない。

優先順位：
1. **既存承認済み送客の収益化**：宿泊・体験・観光等の検索意図に適合する既存提携導線を改善。公式一次情報は保持し、成果発生・確定・入金を分離して追う。
2. **メディアの継続収益**：事業者向けセルフサーブ掲載/情報整備、明示された協賛・スポンサーを商品仮説として検証。料金公開・契約・決済導入はオーナー承認後。
3. **取引基盤・データ資産**：44市町村、店舗、イベント、体験の検証済み情報を共通データ化し、将来の予約送客・地域データ商品へ展開。無承認の予約・決済/個人情報取得はしない。
4. **補助的B2B支援**：キャッシュ創出と需要検証に必要な範囲に限定。オーナーの納品工数に比例してしか売上が伸びない受託モデルを中心に据えない。

最終経営目標は2027年9月時点で個人税引後年1億円を継続的に生む収益力（挑戦目標・未達可能性大）。自己資金50万円未満につき初期固定費を抑制し、退職・法人化・オフィス・正社員採用を先行しない。

検証指標：GA4 Views、予約導線表示、paid_booking_click、ASP発生成果、確定成果・入金、Revenue/1,000 Views、粗利益、MRR、継続率、運営工数。仮想PV転換率・架空の売上・未確認の成約を実績としない。

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
- 2026-10-10 から BookingGuide は提携リンクのクリックで `paid_booking_click` も送る（`outbound_booking_click` の内数・同じパラメータ）。10/11 以降の確定日は event_name = `paid_booking_click` で数え、それより前の期間（送客先ドメインで判定した値）と混ぜない。`paid_booking_click` が同じ期間・ページの `outbound_booking_click` を超えたら計測不具合として止める
- 予約案内の項目に、公式・申込ページで確認できた受付期限（`deadline`）がある場合、期限の翌日からは「その申込先の期限を過ぎた」文言を出し、リンクは残す。期限を過ぎた項目のクリックは `booking_deadline_passed_click` として別に数え、`outbound_booking_click`・`paid_booking_click`・提携送客率には入れない（#198）
- 2026-10-14 の確定日から、ニュースのガイド記事の**提携リンクのCTA**（`guide.cta`・`section.cta`・`guide.bottomCta` のうち affiliates.ts で成果URLになるもの。例：駐車場記事の akippa）も `outbound_booking_click` と `paid_booking_click` を送る（同じパラメータ＋`link_kind: guide_cta`・`cta_location: guide_top / guide_section / guide_bottom`）。それまで A8（akippa）へのクリックの一部は GA4 の送客イベントに出ていなかった。公式リンクのCTAは数えない。ガイド記事には `booking_guide_view` が無いので、提携送客率（paid ÷ booking_guide_view）は BookingGuide のあるページだけで出す
- 予約できるイバトコ MVP の主KPIは **提携送客率 = `paid_booking_click` ÷ `booking_guide_view`**（同じ期間・同じページ。観測 2026-10-11〜10-17、GA4 の 10/17 確定後に評価。Growth Director 最終判断 2026-10-10）。公式を含む `outbound_booking_click` ÷ `booking_guide_view` は副指標。定義と整合の条件は `data/editorial/revenue-mvp.json` の `primaryKpi`・`consistencyChecks`
- 二重送信の検査：本番 QA と CI のブラウザ検査（`scripts/ui-smoke.mjs` の「送客イベント」）が、提携リンク1クリック＝outbound 1回・paid 1回、公式リンク1クリック＝outbound 1回・paid 0回、予約案内の表示＝1ページ1回を毎回確かめる（gtag を記録用に包み、計測は送らない）
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
- 現状（2026-10-13 オーナー報告）：**楽天は直近30日 23クリック・発生2件（楽天トラベル。うち1件は高速バス）・売上25,450円・未確定報酬254円**（初の成果。確定は0）。**A8 は今月19クリック・発生0**。どちらも `asp-results.json` に期間つきで記録。未確定254円は `revenue-ledger.json` に入れない
- 成果0が続くときは「CTAを増やす」だけで対応しない。送客ページ × 提供元の一覧で、**検索意図 × 商材のミスマッチ**を先に疑う（例：アクセス・駐車場を調べる読者に宿泊予約を出していないか）
- 高商用意図のページ（駐車場・ホテル・宿泊・予約・飲食店・あんこう鍋の店・アクセス・交通規制・周辺観光）は収益化候補として評価する。ただし読者の検索意図に合う場合だけ置き、SEO・UX を損なう CTA の乱設はしない
- `asp-results.json` は管理画面の集計（成果0も含む）、`docs/records/affiliate-results.csv` は成果1件ごとの記録、`revenue-ledger.json` は確定売上の正本。ASP新規申請・契約は引き続きオーナー承認

## ASP実績の記録（2026-10-13〜）

ASP の管理画面は自動で取得できない（API・権限なし）。オーナーが画面で確認した値を、手で `data/editorial/asp-results.json` に入れる。

- `providers` は ASP ごとの最新の値。前の値は消さずに `history` へ移す
- 1件ごとに **期間**（`period.label`・`start`・`end`）と **確認日**（`checkedAt`）を必ず付ける。楽天は「直近30日」、A8 は「今月」のように ASP ごとに期間が違うので、**ASP をまたいで率を比べない**
- 項目：`clicks`（ASP 画面のクリック。GA4 の paid_booking_click とは別物）・`occurred`（発生件数）・`occurredSalesYen`（売上金額）・`pendingRewardYen`（未確定報酬）・`confirmed`・`confirmedRewardYen`（確定）・`services`（サービス別。グラフ読み取りなら `approximate: true`）・`sourcePages`（発生元ページ。画面で分からなければ null と「流入元未特定」）
- `linkProviders` は、その ASP の送客リンクの提供元（affiliates.ts の id。A8 なら `jalan`・`akippa`）。成果0の診断でページを拾うのに使う
- 取得できない値は null。**0 で埋めない**。未確定報酬は売上ではないので `revenue-ledger.json` に入れない。確定したら、確定日・確定報酬を `revenue-ledger.json` に1件ずつ入れる（`npm run revenue:import`、docs/REVENUE_IMPORT.md）
- 表示：`/control/` の Revenue Funnel と `npm run growth:target` の ⑩ に、ASP ごとの「クリック・発生・発生CVR（同じASP・同じ期間）・売上・未確定・確定」と、ページ別の送客（GA4 の page_path × link_provider、期間つき）が出る。Revenue / 1,000 Views は確定売上だけで出す

楽天トラベルの成果条件（楽天トラベル アフィリエイト仕様、2026-10-13 確認）：利用金額の1%（レンタカー・観光体験は2%）。Cookie は30日で、**リンク先と違う商品（高速バスなど）の予約も成果になる**。予約日の翌々月末までに利用が完了したものが対象。したがって発生した成果の商品から、読者が押したリンクやページを決めつけない。

