# イバトコ Growth & Revenue Master Strategy

最終更新: 2026-09-21

## 目的

イバトコを「茨城の情報メディア」で終わらせず、検索・SNS・再訪・地域データを通じて、読者の行動と地域事業者の需要を接続する地域需要プラットフォームへ育てる。

短期の集客North Starは GA4 Views ローリング28日100,000。
ただし事業評価は Views 単独で行わず、確定収益、粗利、Revenue/1,000 Views、Returning、B2B受注、データ資産、チャネル集中度を並行管理する。

## 現在地

- GA4 28日 Views: 4,658
- Sessions: 3,477
- Organic Search Sessions: 2,957（約85%）
- Returning Sessions: 317（約9%）
- outbound_booking_click: 9
- active affiliateへのbooking click: 2
- business_cta_view: 180
- business_cta_click: 0
- generate_lead: 4（有料B2Bリード4件ではない）
- 確定Affiliate売上: 0
- 確定B2B受注売上: 0
- /place/ の公開確認済み店舗: 0

この状態では「検索流入を増やす」だけでは不十分。需要獲得、回遊、再訪、取引、地域データ、提携、ブランド、運用耐障害性まで一つのシステムとして扱う。


## 市場規模の根拠

2025年の茨城県観光客動態調査では、観光入込客数（延べ人数）は6,258万人、観光消費額は4,482億円。1人当たり観光消費額は全体13,161円、宿泊36,313円、日帰り8,060円だった。

観光目的の構成は、行祭事・イベント22.0%、スポーツ・レクリエーション15.7%、歴史・文化14.4%、都市型観光（買物・食等）13.1%。利用交通機関は自家用車等81.5%。

このため、イバトコのイベント・SPORTS・食・ドライブ/駐車場・宿泊の各テーマは、単なるPV獲得ではなく県内観光消費への接点として扱う。特に宿泊は日帰りより1人当たり消費額が大きいため、遠方客・大型イベント・SPORTS遠征・Inboundでは「泊まる」意図を優先的に計測する。

茨城県の2026年産業活性化指針が参照する2021年経済センサスでは、県内企業等数は72,900、うち中小企業72,818、小規模企業63,189。宿泊・飲食サービス業は11,100事業所、生活関連サービス・娯楽業は10,426事業所、卸売・小売業は26,387事業所。

B2B側の市場は十分に大きい。したがって「広告PV単価」だけに依存せず、店舗情報整備、予約導線、検索需要レポート、Web/SNS/SEO支援、Partner/Sponsor、Data提供を収益の主戦場候補として持つ。

Sources:
- 茨城県「2025年（令和7年）観光客動態調査の結果について」
- 茨城県「茨城県産業活性化に関する指針」（2026）

## 20の戦略レンズ

1. SEO需要獲得
2. Google Discover / News / 検索以外の発見面
3. SNS配信
4. International / Inbound
5. Owned Audience / 再訪
6. コンテンツポートフォリオと季節性
7. 回遊 / CRO
8. Affiliate / 予約・送客
9. 地域事業者B2Bリード
10. Verified Business Directory / Local Entity Graph
11. Sponsor / PR / 直接広告
12. 地域データ / API / 埋込ウィジェット
13. ブランド / 被リンク / PR
14. UGC / ローカルエディター / 地域情報網
15. Technical SEO / Indexation / Page Experience
16. 計測 / 実験設計
17. 正確性 / 鮮度 / 広告・編集分離
18. 自動化 / データ供給 / 無料ツール依存
19. Unit Economics / 粗利 / 運用時間
20. 売却可能性 / 運営者依存 / 継続収益

Google Driveの Strategy_Scorecard を週次で更新し、各レンズを active / execute / candidate / observe / blocked / done で管理する。

## チャネル設計

### Search

Organic Searchが最大チャネルである限り、GSC query×pageを需要センサーとして使う。
外部検索ボリュームは確認できた値だけ exact とする。GSC impressions は observed、Google Trends/SERPは proxy として扱う。

SEOは以下を優先する。

- 8〜20位で既に需要が見える既存ページ
- 高表示・低CTR
- 季節ピークの30〜90日前
- visit / book / buy の行動意図が強いテーマ
- 既存ページで意図を満たせない独立クエリだけ新規URL
- イベント終了後も翌年・周辺テーマへ資産化できるURL

### Discover / News / Preferred Sources

Google Discoverは検索キーワードとは別の増幅面として扱う。
大画像、独自性、タイムリーさ、地域専門性を前提に、Discover露出が出た場合だけ専用KPIを追う。
Discover狙いの記事量産はしない。

2026年のGoogle Discoverでは、ローカルに関連するコンテンツ、独自性、タイムリーさ、トピック単位の専門性が重視されているため、イバトコの地域特化性は活かす。ただし露出は保証されない。

Google Preferred Sourcesは、ユーザーがイバトコを優先ソースとして選べる場合、Top StoriesやAI Mode/AI Overviewsでの発見性を高める可能性がある。サイトがGoogleのsource preferences toolに出ることを確認できた場合のみ、Preferred Sourceボタン導入を候補化する。

Google Search Profileは、claim可能になった場合にWeb/SNSの横断フォロー導線として検討する。未確認のままバッジを置かない。

### SNS

SNSは独立したPV競争ではなく「需要発見→記事→SNS増幅→指名/Direct/再訪」の循環で評価する。
投稿文は毎日作成可能だが、送客・再検索・記事回遊が起きないフォーマットは縮小する。

### Owned Audience

SEO依存を下げるため、見頃、雨天変更、花火、スポーツ、交通、週末イベントのような更新需要に限定して LINE / メール / 通知 / 保存を検討する。
登録者数ではなく Returning Views / Sessions と送客を評価する。

## コンテンツポートフォリオ

記事は役割別に管理する。

- Evergreen: 通年検索され、毎年資産になる
- Seasonal: 花、紅葉、花火、祭りなどピークがある
- Breaking: 短命だがSNS/Discover/検索急伸を取る
- Utility: 今日/今週/アクセス/駐車場/雨天/料金など再訪される
- Transactional: 泊まる/予約/チケット/駐車場/体験
- Authority: 一次取材、独自データ、地域解説、専門ページ

本数の均等配分はしない。28日Views、検索寿命、収益意図、リンク獲得力、再利用性から限界効果で配分する。

## 収益設計

Revenue OSの7レーンを継続する。

1. 旅行・予約・送客
2. 地域事業者リード
3. Sponsor / PR
4. Owned Audience
5. 求人
6. 地域データ / 法人・自治体
7. Inbound
8. 地域産品・ふるさと納税・EC送客
9. Display Ads（床収益。後順位）

追加原則:

- discoverページに無理に広告を置かない
- 公式情報は常に広告より優先
- active partnerへのクリック率を追うが、広告化率そのものを最大化しない
- generate_leadは商談・応募・取材相談を分類する
- 確定売上と推定値を混ぜない
- Revenue/1,000 Views と粗利/運用時間を月次評価する

## Verified Business Directory

/place/ は長期の中核資産候補。

無料の公開確認済み基本情報と、有料の情報整備・予約導線・分析・制作支援を分離する。
掲載料でおすすめ順位を買える設計にはしない。

高需要の市町村・カテゴリから始め、以下を資産化する。

- 正式名称
- 住所・地理情報
- 営業/予約情報
- category
- verifiedAt
- 公式URL
- 関連記事
- 送客クリック
- Partner / PR / Editorial の関係

需要が無いカテゴリをプログラマティックに大量生成しない。

## データ資産と被リンク

イベントDB、市町村、事業者、検索需要、季節性、更新履歴を記事本文だけに閉じ込めない。

候補:
- Ibaraki event feed
- 埋込イベントウィジェット
- 法人向け検索需要レポート
- 自治体/観光協会向け地域動向
- white-label data
- public JSON / feed

無料ウィジェットや公開フィードは、利用者価値と自然な被リンク獲得の両方を狙える。
利用需要を確認する前に大規模APIを作らない。

## ブランド・被リンク

リンク購入や量産相互リンクは行わない。
一次情報、独自集計、地域データ、埋込ウィジェット、現地取材をリンクされる理由として設計する。

週次で:
- referral domain / source
- 自治体・施設・店舗からの引用
- 指名検索シグナル
- SNSからの再訪
を確認する。


## Geo Portfolio

44市町村を均等に埋めることを目標にしない。地域投資は次の需要シグナルで決める。

- GSC query / impressions / clicks
- GA4 Views / engagement / Returning
- 観光入込客・イベント規模
- visit / book / buy の行動意図
- 地域事業者の在庫とB2B可能性
- 競合の強さ
- 一次情報を継続更新できるか

2025年の観光入込客数上位は、ひたちなか市約508万人、大洗町約476万人、つくば市約376万人、常総市約350万人、笠間市約337万人。これは検索需要そのものではないが、市場需要proxyとしてSEO/GSCデータと組み合わせる。

「全市町村1記事ずつ」より、需要の厚い地域で Search → Event → Place → Booking → Partner の密度を高める方を優先する。

## Reader Utility Layer

記事を読むだけで終わらせず、読者の次の行動を短くする。

候補:
- Add to Calendar / ICS
- 地図・経路
- 駐車場
- 予約・チケット
- 雨天/開催変更
- 今週/今日
- 保存/通知
- 周辺の食・宿
- 公式情報への確認導線

実装する場合は view → utility click → next page / outbound / Returning を計測する。機能数を増やすこと自体は目的にしない。

## Discover Image Policy

現在のOGP生成カードには文字中心の図版が多い。SNSシェア用としては使えるが、Google Discoverは代表性の高い大画像と、テキスト過多ではない画像を推奨している。

今後、権利を確認できたオリジナル写真・現地写真・代表ビジュアルがある記事では、SNS用タイトルカードと検索/Discover向け代表画像を分離できる設計を優先する。権利の無い写真をDiscover目的で転載しない。

## International

翻訳量産をしない。
GSCで既に露出がある国・言語・queryを優先し、Tokyo起点の交通、季節、日帰り、宿泊、チケット、アクセスを改善する。

海外ページも discover / visit / book の意図を分ける。

## 実験ガバナンス

毎日改修することを目的にしない。
施策の因果が読めるよう変更種別ごとに最低観測窓を持つ。

- 計測修正・誤情報: 即時
- CTA/回遊/小UI: 7日、十分な母数が無ければ継続
- SEO title/description/内部リンク: 原則14日
- 本文構造/テンプレート/IA: 原則28日
- 季節イベント: 開催期限を優先し、通常の凍結期間を短縮可

同じページを短期間に何度も大改修しない。
母数不足を「失敗」と判定しない。

## Technical Discovery

継続確認:
- sitemap
- RSS
- News sitemap
- max-image-preview:large
- structured data
- canonical / hreflang
- Core Web Vitals / mobile UX
- noindex理由別の棚卸し
- Bing / IndexNow
- GA4/GSC計測
- 404 / stale / superseded content

技術施策はコンテンツ価値の代替ではない。

## 信頼・鮮度

高トラフィックかつ日付依存のページを優先して再確認する。
sourceUrls / verifiedAt / updatedDate / corrections を使い、未確認情報を推測で補完しない。

広告、Partner、PR、Editorialを混ぜない。

## 自動化の耐障害性

優先データソース:
1. Windsor.ai direct
2. Google Sheet mirror
3. GitHub persistent snapshot

接続切れや無料枠停止時は silent fallback しない。
データ欠損を明示し、数字を推測しない。

## Unit Economics

月次で必ず以下を見る。

- confirmed revenue
- gross profit
- tool / external cost
- estimated founder / operator hours
- Revenue/1,000 Views
- Revenue/hour
- revenue lane mix
- recurring revenue share

高PVでも低粗利・高運用負荷なら縮小する。

## 売却可能性

長期価値はPVだけではなく、以下で作る。

- 継続収益
- 顧客/Partnerの継続性
- 独自データ
- SEO以外の流入
- Owned Audience
- SOP/automation
- founder dependenceの低さ
- ブランドアカウント/契約/権利の整理
- データ/コンテンツの権利関係
- 収益レーンの集中度


## 成長ステージ

### Stage 0: 現在〜10,000 Views / 28日

目的は「流入と最初の取引を証明する」。

- SEO勝ち筋を増やす
- Booking/CRO計測を完成
- 最初のAffiliate確定成果
- 最初のPaid B2B lead / 受注
- /place/ の公開確認済み在庫を需要地域から作る
- Owned Audienceの最小検証
- Discover/News/Bingの技術面を整える

広告ネットワーク最適化、大規模アプリ、独自決済、会員課金には時間を使わない。

### Stage 1: 10,000〜30,000 Views

目的は「再現する収益レーンを2つ以上作る」。

- 旅行/予約送客の横展開
- B2B診断→制作/運用への商談化
- Verified Business Directory拡張
- Owned Audienceの再訪効果確認
- 地域産品/ふるさと納税等のTransactional SEO検証
- Sponsorの最小販売仮説

### Stage 2: 30,000〜100,000 Views

目的は「検索以外と継続収益を育てる」。

- Search concentration低下
- Sponsor/Partner継続化
- Data/Widgetの利用者獲得
- Inbound収益化
- Direct/Returning増加
- 必要ならディスプレイ広告を床収益として導入

### Stage 3: 100,000 Views安定後

目的は「利益と事業価値の最大化」。

- 粗利の低い施策を削る
- recurring revenue shareを増やす
- データ/API/法人契約を育てる
- founder dependenceを下げる
- M&Aで評価される権利・データ・顧客・SOPを整理する

## 後回しにするもの

機会があっても、現在は優先しない。

- 自社EC在庫・物流
- ネイティブアプリ
- 大規模な有料会員機能
- 自前イベント主催
- PV目的だけの大量プログラマティックSEO
- 需要確認前の求人媒体化
- 需要確認前の巨大API
- 広告枠だらけのメディア化
- 編集順位の販売

これらは「できるか」ではなく、現行レーンより期待値が高くなった時だけ再評価する。



## Cross-cutting Blind Spot Controls

20レンズだけでは見落としやすい横断課題を、5つのControlとして固定する。

### 1. Market Whitespace / Competitor Radar

GSCは「すでにイバトコが表示された需要」しか見えない。したがってGSCだけでSEO投資先を決めると、未露出の大市場を永続的に見落とす。

毎週、以下から新規需要を探索し、Google Drive `Market_Whitespace` に記録する。

- 競合/公式/観光メディアが獲得しているテーマ
- Google Trends、関連検索、SERPの派生意図
- 季節カレンダーと大型イベント
- 県の観光・産業データ
- SNSで急増している地域テーマ
- 読者/事業者から来た質問

検索ボリュームは確認できた場合だけ exact。確認できない場合は observed / proxy / unknown を維持する。

競合の記事本数を真似しない。イバトコが一次情報、地域密度、実用性、更新性、取引導線のいずれかで明確に強くできるテーマだけ投資する。

### 2. First-party Demand Sensor

外部検索データだけでなく、サイト内で読者が何を探しているかを将来の需要センサーにする。

候補:
- サイト内検索
- zero-result query
- 「次に知りたい」クリック
- 訂正/追加情報リクエスト
- 保存/通知
- FAQ展開
- 問い合わせ subject

トラフィックが十分になる前に大型検索システムは作らない。実装した場合は検索語をPII除去して保存し、zero-resultをSEO/Product backlogへ送る。

### 3. Local Action Value Proof

/place/ の価値はPVではなく、地域事業者へ実際の行動を生んだかで証明する。

最低限追う:
- `local_business_click` + `link_kind=official`
- `link_kind=map`
- `link_kind=tel`
- `link_kind=reservation`

将来は事業者ごとに Page Views → Action CTR → Booking/Lead を示せる状態にする。これが無料掲載から有料の情報整備・運用支援へつなぐ営業根拠になる。

### 4. B2B CRM / LTV

問い合わせ件数だけでは事業にならない。paid business leadを以下のstageで追う。

`new → qualified → meeting → proposal → won / lost → active → renewal / churn`

Google Drive `B2B_CRM` に流入ページ、チャネル、相談種別、見積、受注、MRR、更新/失注理由を記録する。

事業KPIは lead数ではなく:
- paid lead rate
- proposal rate
- win rate
- average order value
- MRR / recurring revenue
- renewal
- lead source別売上

個人情報は必要最小限にし、公開GitHubへ顧客情報を保存しない。

### 5. Governance / Legal / Security / Accessibility

成長速度が上がっても、以下を壊さない。

- 景品表示法・ステマ規制を含む広告表示
- Affiliate/ASP規約
- 写真・ロゴ・文章等の権利
- 個人情報/問い合わせデータ
- GA4等の計測とprivacy disclosure
- accessibility（キーボード、alt、contrast、semantic HTML）
- dependency/security alerts
- 外部ツールの権限最小化

法令や契約条件は推測で自動変更しない。問題が疑われる場合は公開拡大より修正を優先する。

## 新しいアイデアの処理

新しい施策を思いつくたびに戦略を作り直さない。必ず次のGateを通す。

1. **Evidence** — exact / observed / proxy / official market data のどれがあるか。根拠なしなら observe。
2. **Stage Fit** — 現在の成長ステージで今やるべきか。
3. **Existing Asset** — 既存URL、既存データ、既存テンプレートで解けないか。
4. **User Intent** — discover / visit / book / buy / business / repeat のどれか。
5. **Economic Path** — Views、Returning、Booking、Paid Lead、Revenue、Data Assetのどれを動かすか。
6. **Moat** — 一回限りか、データ・内部リンク・Entity・顧客・再訪として残るか。
7. **Cost / Risk** — 工数、運用負荷、権利、SEO、UX、vendor dependency。
8. **Measurement** — 7/14/28日後に何で継続/停止を判断するか。
9. **Opportunity Cost** — 現在の最優先Growth Batchより期待値が高いか。

Gateを通らない案は「面白い」だけで実行しない。observe / rejected に残す。

## 戦略を再検討するトリガー

通常は毎週金曜・毎月最初の金曜以外にMaster Strategyを作り直さない。

ただし以下は臨時再検討のトリガー。

- GA4/GSCの主要トレンドが明確に反転
- 主要チャネル構成が大きく変化
- 初めての確定収益、初めての有料B2B受注、初めての継続契約
- 新しい流入面が実データで急増
- Google等の大きな検索仕様変更
- Windsor.ai / GA4 / GSC等のデータ供給停止
- 重大な誤情報、権利、規約、広告表示リスク
- 開催日・季節ピークが近く通常の観測窓では間に合わない

それ以外は日次OSに任せ、場当たり的な方向転換をしない。

## 運用 cadence

### 毎日
需要・流入・収益ファネル・Deep Discoveryを確認し、期待値最大のGrowth Batchを実装する。

### 毎週金曜
Strategy_Scorecardの20レンズを再監査し、
- 新しい穴
- 伸びているレーン
- 止める施策
- 大規模改修候補
- チャネル集中リスク
- 収益化ギャップ
を更新する。

### 毎月最初の金曜
Business Model Reviewを行う。
Viewsではなく、粗利、継続収益、Revenue/hour、Partner、Owned Audience、Data asset、founder dependenceを見て資源配分を変える。

## 実行優先順位

現在の優先テーマは固定しない。毎回データで再評価する。

ただし2026-09-21時点では、構造上の大きな穴は以下。

- Organic依存を下げるOwned Audience
- 検索流入を取引へつなぐBooking/B2B
- /place/ を起点とするLocal Entity Graph
- 独自データを記事以外へ再利用するData/Widget
- Discover/News/Bing等の第二発見面
- ブランド/被リンク
- Unit Economics
- 売却可能性KPI

この文書を新しいアイデアの追加先とし、場当たり的に別戦略を増やさない。
