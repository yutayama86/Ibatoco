# イバトコ編集OS

## 目的

情報探索と、その日に実装する施策を分離します。記事を書かない日もイベント・行政・交通・SPORTSの発見を台帳へ残し、成長施策は完成仕様がある1件だけに限定します。公式情報と矛盾する誤情報・開催変更・重大なリンク切れの最小差分修正は緊急保守として別枠にします。

役割は次のとおりです。

| 担当 | 責任 |
| --- | --- |
| ChatGPT | 外部監視、GA4/GSC分析、一次情報確認、優先順位、完成仕様、低リスク施策のGitHub実装・PR・CI確認・マージ、7日/28日検証 |
| 編集OS | 台帳の永続化、公開在庫との照合、抜け漏れ検知、7日/28日の変更抑止、実装可否の機械判定 |
| Claude Code | 大規模・複雑な実装が必要な場合の補助。日次の標準経路ではない |
| 人 | URL変更、価格、契約・権利、広告表示、計測ID、重要な戦略変更など高リスク判断の承認 |

## 正本となるファイル

- `data/editorial/event-registry.json`：発見済みイベント。未掲載でも削除しない
- `data/editorial/performance-snapshot.json`：GA4/GSCの最新スナップショット。未取得時はnullのままにし、推測値を入れない
- `data/editorial/growth-targets.json`：North Starとガードレール。現在はGA4 `screen_page_views`（Views）ローリング28日100,000
- `data/editorial/action-queue.json`：施策候補と実装可否
- `data/editorial/growth-opportunities.json`：SEO/SNS/International/CRO/Product/Technicalの成長機会バックログと需要根拠
- `data/editorial/revenue-opportunities.json`：旅行送客、B2B、Sponsor、Owned Audience、求人、Data、Inboundの収益機会正本
- `docs/REVENUE_OS.md`：収益の定義、ファネル、実行・検証ルール
- `docs/IBATOCO_MASTER_STRATEGY.md`：20の戦略レンズ、週次・月次の資源配分ルール、長期の事業価値設計
- `data/editorial/strategy-scorecard.json`：20レンズの状態、集中リスク、実験観測窓
- `docs/editorial/specs/*.md`：ChatGPTが完成させた実装仕様
- `src/data/seo-changes.ts`：既存の改善履歴。7日・28日のクールダウン判定に使用

`reports/editorial/` は自動生成物です。直接編集しません。

## North Star と Growth Control

- 一次目標は GA4 `screen_page_views`（Views）のローリング28日100,000
- 安定達成は100,000以上を14日連続で維持した状態
- 毎日 `Growth_100k` へ、28日Views、進捗率、残差、直近7日Views、7日日平均、28日換算ランレート、必要日平均、判定を1行追記する
- 直近7日Viewsの28日換算が100,000未満なら、緊急保守以外の施策は「残差を最も効率よく縮めるか」を主要判断基準にする
- Viewsだけを増やす不要なページ分割・自動リロード・低品質量産はしない。active users / sessions / engagement / Organic Search sessions / GSC clicks・CTR・position / CTA / lead をガードレールにする
- GSC impressionsはNorth Starではなく、GA4 Viewsを増やすための検索獲得診断として扱う
- イベント単発ピークだけでは安定達成とみなさず、制度・交通・観光・SPORTS・地域DBなど再現性のある流入在庫を増やす
- CIのscheduled runでは `npm run growth:target` で `reports/editorial/growth-target.md` を生成する

## 日次フロー

1. ChatGPTがWindsor.aiでGA4/GSCを直接取得し、100k Growth Control、県・主要施設・交通・SPORTS、30日以内のイベントを確認する
2. News Deskとして、GitHubの公開可能なnews在庫と本番 `/news/` の最新公開日・最新タイトル・件数を照合する。記事ページが本番にあるのに一覧へ出ない場合は緊急保守として同日中に直す
3. 茨城県・44市町村・交通・主要施設・SPORTS・地域経済の公式一次情報を確認し、News Deskとして毎日最低3本、標準3〜5本を公開する。Growth Batchとは別枠で、当日中の公開完了まで行う
4. 新規情報をイベント台帳へ追加する。今日記事化しない情報も `discovered` で残す
5. 市町村は曜日ローテーションで詳細確認し、週1回は44市町村を完全棚卸しする
6. `npm run editorial:daily` でNews Deskの鮮度、公開在庫、未掲載候補、変更凍結、実装キューを生成する
7. ChatGPTがSEO/SNS/International/CRO/Product/Technicalを比較し、期待値最大の成長テーマを選ぶ。低リスクならgrowth batchとしてそのままGitHubへ実装し、PRを作成する。大規模でも高リスク項目を含まなければ同様に進める
8. 低リスク実装はCIで`npm run verify`が成功した場合だけマージする。失敗したら修正し、通るまでマージしない
9. `data/editorial/popular-pages.json` を直近7日GA4 Viewsで更新し、回遊モジュールの候補を最新化する
10. 公開後は当日/7日/28日のGA4/GSCとイベント指標で効果検証する。効果が弱ければ次の施策へ修正する
11. 日次報告の最後に「ゆうたさんにお願いすること」を出す。自動実行可能な範囲なら原則「対応不要」とする

## News Desk（毎日必須）

News Deskは「今日のGrowth Batch」と分離して必ず実行する。SEO改善や収益施策を選んだ日でも省略しない。

- 日本時間の1日ごとに新規公開を最低3本、標準3〜5本とする。3本未満は日次タスク未完了として扱う
- 3〜5本すべてを長文SEO記事にしない。重要案件は深掘り記事、その他は読者が短時間で把握できる短報とする
- 新規ニュースに個別の `ogImage` がない場合は、`npm run check` が生成する `public/images/card/<slug>-<hash>.png` と `src/data/card-images.ts` の対応表を記事と同じPRへ必ず含める。記事だけをmergeしてカードを画像なしにしない
- 公開後は本番 `/news/` 先頭の当日分3〜5本について、画像が全件表示され、16:9の画像枠とカード高さが同一行で揃っていることを確認する。TOPページ、既存カードCSS、既存の個別画像は変更しない
- 短報にも「結論」「確認できた事実」「誰に関係するか」「次に取る行動」「一次情報URL」「確認日」を必須とする
- 情報源は、茨城県、44市町村、公共交通、道路、主要施設、観光協会、SPORTS公式、地域企業の公式発表を優先する
- 同一カテゴリだけで埋めず、原則として行政・交通、イベント・観光、SPORTS、地域経済・暮らしから複数領域を組み合わせる
- SNSや検索で気軽に触れられる入口を増やすことを目的とし、重要ニュースは既存のEvergreen/Utility記事へ内部リンクする
- 日付判定は `Asia/Tokyo` の暦日だけを使う
- `src/content/news` の `draft: false` かつ `reviewed: true` と、本番 `/news/` の表示を照合する
- 最新記事の個別URLだけでなく、一覧の先頭、カテゴリ件数、公開日も確認する
- GitHubの最新ビルドに含まれる記事が本番一覧にない場合、公開・デプロイ・キャッシュの不具合として同日中に原因を切り分ける
- title、description、本文、一次情報URL、確認日、内部リンク、CTA、構造化データ、公開後確認まで完成させて実装する
- 数合わせ、公式発表の丸写し、未確認情報、既存記事と同じ検索意図の記事は禁止する。速報性が弱い日は、当日・近日の交通、募集期限、開催変更、チケット、駐車場、制度、季節実用情報を公式情報から短報化する
- 公開・更新後は本番 `/news/` と対象URLを実ブラウザで確認し、一覧先頭と日付が反映されたことを完了条件にする

## 自動実行ポリシー

ユーザーは「提案だけ」で止めず、進行・実行・検証までを日次OSへ委任している。したがって、期待値最大の施策が低リスクならChatGPTがGitHub上で直接完了させる。

### 自動実行してよい
- `data/editorial/popular-pages.json` の直近7日GA4 Views上位への更新
- 内部リンク、関連記事、回遊モジュールの候補データ更新
- 既存URLを変えない小規模な内部導線改善
- 公式一次情報で確定した日付・会場・交通等の最小修正
- 計測イベントの欠落修正、CIガード追加
- 構造化データやmetadataの明白な技術不整合修正（検索意図や訴求を大きく変えないもの）

実装は `growth/YYYYMMDD-slug` または `fix/YYYYMMDD-slug` ブランチ → PR → `npm run verify` を含むCI成功 → merge の順に行う。CI失敗時はマージしない。

### 人の確認が必要
- URL変更、削除、統合、リダイレクト方針
- 価格、契約、広告主、ASP、権利・許諾
- GA4/GSCの計測ID・アカウント変更
- 大規模なデザイン/IA変更
- 事実関係に一次情報で確証がない変更

### 毎日の人気ページフィード
`data/editorial/popular-pages.json` はGA4直近7日 `screen_page_views` を使い、ホーム、404、noindex、終了済みで後継導線のないページを除外して上位8件を保存する。`GrowthNextReads.astro` がnews/events上で最大3件を表示し、`growth_next_view` / `growth_next_click` で検証する。

7日後は最低500 viewを目安にCTRとViews/sessionを評価し、CTR 2%以上かつViews/session +5%以上を成功目安とする。500 view以上でCTR 1%未満、またはViews/session悪化なら候補選定・配置・文言を変更する。

## Revenue OS

GA4 Views 100,000は集客North Starであり、収益そのものではない。日次OSは必ずRevenue OSも並走させる。

- 確定収益、確定B2B受注、Revenue/1,000 Viewsを事業KPIとして別管理する
- 高流入ページを discover / visit / book / buy / business / repeat に分類し、意図に合う収益導線だけを置く
- 旅行/予約、地域事業者リード、Sponsor、Owned Audience、求人、地域データ、Inboundを収益レーンとして比較する
- 収益が0の場合は「収益化済み」と言わず、露出→クリック→発生→承認→入金のどこで止まっているかを特定する
- Google Drive `Revenue_Funnel` に日次/週次の実績を記録する
- `affiliate-results.csv` と `business-inquiries.csv` は確定値だけを記録し、推定値で埋めない
- 低リスクのCTA/送客/計測/レポート型B2B入口改善はGrowth Batchで自動実行可能
- 料金公開、ASP申請、スポンサー商品価格、契約、決済、有料求人掲載は人の確認対象

特に初期は、ページビューを増やすだけではなく、高意図ページの割合とRevenue/1,000 Viewsを同時に上げる。

## SEOマーケター運用

Organic Searchが大きい場合、GSCだけでなく市場需要を探索する。毎日 query×page を起点に候補KWを最低20件集め、検索意図でクラスタ化する。

需要根拠は4段階で保持する。
- `exact`: 外部キーワードツール等で確認できた月間検索ボリューム
- `observed`: GSCで実際に観測したimpressions
- `proxy`: Google Trends、関連検索、SERP等からみた相対需要
- `unknown`: 数値を確認できない

`exact`以外を月間検索ボリュームと呼ばない。検索需要、順位余地、CTR余地、季節性、収益/送客意図、既存URL有無、工数、期待増分Viewsを比較し、新規/改善/統合/見送りを決める。

## Channel Scout

毎日 SEO / SNS / International / CRO / Product / Technical を同じ土俵で比較する。SNSはThreads等の流入と検索急伸テーマ、InternationalはGA4 country/languageとGSC country/query、CROはViews/sessionとCTA/送客、Productは地域DBや予約/比較導線、Technicalは計測・構造・速度・indexationを確認する。

Internationalは多言語ページ量産を目的にしない。既にGSC露出がある国・言語・クエリを優先し、既存ページのCTR・検索意図・内部リンク・hreflang・現地語導線を改善する。

## Growth Batch / 大規模改修

成長テーマは原則1つだが、実装は複数ファイル・複数ページをまとめたgrowth batchでよい。小修正の連打より、同じボトルネックを横断的に解消する方が期待値が高い場合はテンプレート・内部リンク・IA・国際基盤・イベントDB等を大規模改修する。

URL変更/削除/統合、広告/契約/権利、計測ID、大規模IA/デザイン変更は人の承認対象。それ以外の横断コード改修はPRとCIを通して自動実行できる。

日次終了条件は『何か1つ直した』ではなく、当日の戦略テーマについて調査→実装→CI→公開可能状態→検証条件登録まで完了していること。

## GA4 Deep Discovery

合計PV・セッション・上位チャネルだけでは、少数だが質の高い流入や新しい参照元を見落とすため、日次フローに探索分析を組み込みます。ユーザーがGA4画面を毎日操作する前提にはしません。

### 毎日見るもの

- 最新確定日 / 直近7日 / 前7日 / 直近28日
- チャネル
- 参照元 / メディア（上位だけでなく取得範囲の全件）
- ランディングページ
- 参照元 × ランディングページ
- ページの参照元URL × ページパス
- CTA / キーイベント
- 必要時のみ地域・デバイス

### 自動発見ルール

- 新規参照元: 直近7日3セッション以上かつ前7日0、または直近7日初出
- 急増参照元: 直近7日5セッション以上、前7日比 +5以上かつ +100%以上
- 少数高品質: 直近7日5セッション以上、エンゲージメント率がサイト平均+15pt以上または80%以上
- 計測異常: 5セッション以上でエンゲージメント率10%未満、または日次値が不連続
- `(not set)` / Unassigned: 全体5%以上
- AI参照元: 3セッション以上または明確な週次増加
- LP急伸: 前7日比 +10セッション以上、または +100%以上

発見候補は、可能なら参照元URLの `q=` / UTM まで読む。検索結果URLから来た流入を「ニュース掲載」「おすすめ掲載」と推測しない。

### 保存先

- `data/editorial/performance-snapshot.json`: 当日の確定値と `ga4Discovery`
- Google Drive「イバトコ SEO・流入データ」`GA4_発見ログ`: 重要な発見の追記専用ログ

`GA4_発見ログ` は追記専用。元のGA4/GSC取得タブを日次分析側から変更しない。

必要なディメンションが取得できないときは `deepDiveBlocked: true` と不足項目を保存し、ユーザーへの日次手作業依頼に置き換えない。計測基盤の改善を施策候補として評価します。


## GSC Deep Discovery と収益ファネル

- Search Consoleは `query × page` で最新取得可能日 / 直近7日 / 前7日 / 直近28日を比較する
- 高表示・低CTR、8〜20位の伸びかけ、急伸/急落、カニバリ、行動意図クラスター、新規露出を日次発見する
- GSC固有の通常遅延を48時間警告と同一視しない
- 重要発見はGoogle Driveの `GSC_発見ログ` に追記する
- GA4は `business_cta_view → contact_form_view → form_start/contact_form_start → generate_lead` と `outbound_booking_click` をファネルとして監視する
- 流入増だけでなく、`流入元 → LP → CTA/送客 → lead` まで評価する
- 計測できない段階は成功扱いせず、計測改善候補にする
- 7日/28日評価では `src/data/seo-changes.ts` とGitHub変更履歴を照合し、季節性や外部要因が強ければ因果を断定しない

## コマンド

```bash
npm run editorial:sync
npm run editorial:check
npm run editorial:daily
```

- `editorial:sync`：公開イベント記事を台帳へ同期。未掲載の手入力候補は保持
- `editorial:check`：台帳と実装キューを検証
- `editorial:daily`：同期・検証・在庫集計・日次ブリーフ生成

## イベント台帳の追加例

```json
{
  "id": "municipality-event-2026",
  "name": "正式名称",
  "municipality": "mito",
  "startDate": "2026-10-10",
  "endDate": "2026-10-11",
  "officialUrl": "https://公式一次情報.example/",
  "discoveredAt": "2026-09-20",
  "verifiedAt": "2026-09-20",
  "articleUrl": null,
  "articleUpdatedAt": null,
  "status": "verified",
  "importance": "large",
  "signals": {
    "searchDemand": "high",
    "visitorDraw": "high",
    "localSpend": "high",
    "logisticsDemand": "high"
  },
  "notes": "需要シグナルの根拠を記載"
}
```

`signals` は `unknown / low / medium / high` の4段階です。外部ツールや一次情報で確認できない場合は `unknown` にします。

## 実装キューの追加例

```json
{
  "id": "20260920-example",
  "title": "施策名",
  "kind": "new-article",
  "targetUrl": "/events/example/",
  "priority": "high",
  "status": "ready",
  "createdAt": "2026-09-20",
  "specPath": "docs/editorial/specs/20260920-example.md",
  "primarySourceUrls": ["https://公式一次情報.example/"],
  "acceptanceCriteria": [
    "指定原稿とmetadataが反映されている",
    "npm run verifyが成功する"
  ]
}
```

`ready` は「Claudeが考えなくても実装できる完成仕様」がある場合だけ使います。調査中や本文未完成は `candidate` のままにします。

## 仕様を書くときの注意

- **`booking.items` の `provider` は、`src/data/affiliates.ts` に登録済みのIDを指定する。**
  未登録のIDを書くと、読者に英語スラッグがそのまま表示されます
  （`rockin'star Carnival 2026` で実際に起きました）。新しい提供元が必要なら、
  仕様の「実装指定」に登録内容（表示名・`status`・広告かどうか）も書いてください。
- 受入条件でフィールド名を書くときは、実データのキー名に合わせる。
  試合のスコアは `score.own` / `score.opponent` です（`score.home` / `score.away` ではない）。

## 日付品質（日本基準）

- 日次判断、イベント台帳、公開記事、TOPの「今週」表示はすべて `Asia/Tokyo`（日本時間）を唯一の基準にする
- 公式一次情報から、開始日・終了日・曜日・時刻・年をそれぞれ確認する。年またぎや複数日開催も推測しない
- `YYYY-MM-DD` は日本の暦日として保持し、実行環境のローカル時刻へ変換しない
- 台帳やfrontmatterの値だけで完了扱いにせず、公開画面の表示日、曜日、開催中／終了判定まで公式情報と照合する
- 1日前後のずれ、曜日不一致、開始日と終了日の入れ替わりがあれば緊急保守とし、成長施策とは別枠で即時修正する
- Claude Codeの受入条件には `npm run date:check` と `npm run verify` を含める

## 計測回帰を防ぐルール

- `npm run audit:analytics` で `business_cta_view` / `business_cta_click` / `outbound_booking_click` / `contact_form_view` / `contact_form_start` / `generate_lead` の実装と主要ページへのBusinessCta接続を機械検査する
- GA4の起動処理は `src/layouts/BrandBase.astro` の1系統だけにする。別レイアウトに古いgtagスニペットを置かない
- `business_cta_view > 0` で `business_cta_click = 0` は即「計測漏れ」と断定しない。auditが通っていればまずCROシグナルとして扱い、クリック実績と導線を確認する
- 内部CTAに `utm_*` を付けてセッション流入元を上書きしない

## 抜け漏れを防ぐルール

- 外部監視は日次実装1件の枠に含めない
- 開催30日以内・公式発表済み・未掲載は必ず日次ブリーフへ出す
- 開催14日以内かつ `importance: large` の未掲載は `urgent` になる
- 台帳にない公開イベント記事はCIエラーにする
- 完成仕様、一次情報URL、受入条件がない `ready` はCIエラーにする
- GA4/GSCが48時間より古い場合は警告し、数字を推測しない
- 改善後7日未満は原則凍結、8〜27日は観察、28日以降に再評価する
- 誤情報・開催変更・重大なリンク切れの最小差分修正は緊急保守として成長施策1件の枠外にする

## 外部監視の限界

リポジトリだけでは、公式サイトに新しく掲載されたイベントの存在を知ることはできません。ChatGPTの日次タスクが外部監視を担当し、この台帳へ発見結果を残します。編集OSは、発見後の消失・重複・未掲載・再編集しすぎを防ぐ仕組みです。

## ユーザーへの引き渡し

日次報告は分析や `ready` の通知だけで終えません。最終セクションを必ず「ゆうたさんにお願いすること」とし、次を守ります。

- Claude Code実装が必要なら、そのままコピーして渡せる指示文を提示する
- 指示文にはaction ID、完成仕様のパス、実装対象、変更禁止事項、`npm run verify` を含める
- 公開承認など人の判断が必要なら、判断事項だけを短く示す
- ユーザー作業がない日は「本日は対応不要」と明記する
- Claude実装後にChatGPTへ返してもらう報告文の例を1行付ける


## Strategy Reset

日次の最適化だけでは局所最適に陥るため、毎週金曜は `docs/IBATOCO_MASTER_STRATEGY.md` の20レンズを再監査する。

確認するもの:
- 新しい需要・流入面
- Organic Searchへの集中度
- Returning / Owned Audience
- Content Portfolioの寿命・季節性
- Revenue Funnel / Unit Economics
- Business Directory / Data Asset
- Sponsor / Partner Pipeline
- Brand / Backlinks / Referral
- International
- Technical / Indexation / Discover / News
- Trust / Freshness
- Automation / connector health
- Sellability / founder dependence

金曜は「今週やったことの報告」ではなく、来週の資源配分を変える必要があるかを判断する。

毎月最初の金曜は Business Model Review とし、Viewsよりも gross profit、Revenue/1,000 Views、Revenue/hour、recurring revenue share、channel concentration、Partner、Owned Audience、Data asset、founder dependenceを優先して見る。

## 実験観測窓

同一ページを短期間に何度も改修して因果を壊さない。

- 誤情報・計測不具合: 即時修正
- CTA/回遊/小UI: 7日または十分な母数まで
- SEO title/description/内部リンク: 原則14日
- 本文構造/テンプレート/IA: 原則28日
- 季節案件: 開催期限を優先し短縮可

母数不足は失敗ではない。複数の大変更を同じURLで重ねる場合は、明確な理由を記録する。

## Discovery Surface

検索だけでなく、Google Discover / News / Bing / AI / Referralを発見面として監視する。

- DiscoverはSearch Consoleにレポートが出た場合だけ専用KPI化する
- 大画像、独自性、地域専門性、タイムリーさを重視する
- News sitemapは直近2日以内のnews記事だけを含める
- IndexNowはBing等への更新通知候補。導入時は変更URLだけを送信し、全URL乱発はしない
