# Growth Engine（11月100,000 Views）

最終更新：2026-10-07（8〜12. Demand Radar / PV Relay / Pipeline / Revenue Funnel / Annual Learning を追加。検索語別 Demand Radar・節目（milestones）・multiple の除外を追加）

2026年11月の月間 GA4 Views 100,000 の達成確率を上げるための計算の正本。
「計測 → 予測 → Gap → 機会 → 優先順位」を毎日同じ式で出し、判断を人の勘に頼らない。
Growth Engine そのものを目的にせず、PV Gap を縮める施策を選ぶために使う。

## どこで動くか

| 場所 | 内容 |
|---|---|
| `src/lib/growth-engine.mjs` | 計算だけ（純粋関数）。ファイル・ネットワークに触れない |
| `src/lib/growth-os.mjs` | 全体の束ね（整合チェック → Growth Engine → Demand Radar・PV Relay・Pipeline・Next Winners → Batch → Revenue Funnel・Annual Learning）。日次レポートと Control Center はこれを呼ぶ |
| `src/lib/demand-radar.mjs` / `revenue-funnel.mjs` / `seasonal-learning.mjs` | 8〜12. の計算（純粋関数）。`growth-engine.mjs` の式は変えず、その関数を呼んで使う |
| `scripts/growth-engine.mjs` | 日次レポート。`npm run growth:target`（CI の定期実行 Validate site でも生成され、Job Summary に載る） |
| `reports/editorial/growth-target.md` / `growth-engine.json` | 出力（Git に入れない） |
| `data/editorial/growth-engine.json` | 目標・重点ページ・季節の想定・観測窓・SEOのしきい値 |
| `data/editorial/demand-radar.json` | Demand Score の重み・PV Relay のしきい値・商用意図の語・先の季節・Annual Learning のカテゴリ |
| `data/editorial/asp-results.json` | ASP の発生・確定成果の報告（クリックは入れない） |
| `data/editorial/seasonal-learning.json` | Annual Learning の台帳（`npm run learning:sync -- --write` で記事から同期） |
| `scripts/freshness-guard.mjs` | 期限切れ・年度違いのチェック（`npm run verify` で実行） |
| `scripts/growth-engine.test.mjs` / `growth-os.test.mjs` | 計算式の単体テスト（`npm run verify`・`npm run test:growth` で実行） |
| `src/pages/control/` | Control Center（同じ計算を表示） |

追加費用ゼロ。外部API・有料SaaSは使わない。数値の実測は `data/editorial/performance-snapshot.json`（GA4/GSC、Windsor.ai 経由で日次更新）だけ。

## 実測と想定の区別

- **実測**：GA4 Views・sessions、GSC の表示回数・クリック・CTR・順位（performance-snapshot）
- **想定（運用上の仮定）**：季節の需要期間・需要の立ち上がり日数・検索順位別CTRの目安（`growth-engine.json`）。記事には出さない。GSC の実測が貯まったら更新する
- 無い値は `null`（表では「—」）。推測で埋めない。推定を含む値には必ず根拠（basis）と確度（confidence）を付ける

### 実測の整合チェック（src/lib/snapshot-quality.mjs）

エンジンに渡す前に、矛盾する実測を計算から外し、理由を Alerts に「データ不整合」として出す（値を推測で直すことはしない）。

- ページ別GSC（`pageMetrics[].gsc`）の28日の表示回数が、同じページの検索語1つの表示回数（`gscDiscovery`、期間が28日の中）より少ない → そのページのGSC値を null にし、検索語別の所見で代わりに判定する。ページ全体が検索語1つより少ないことはあり得ないので、取得漏れ（URLの表記ゆれ・取得行数の上限など）とみなす
- 表示回数0のページの CTR・順位は計算できないので null（0% と書かない）
- query が `multiple` など検索語ではない集計行（ページ合算・複数ページの照合の記録）は、検索語の所見・`gscQueries` から外す。2026-10-07 に Windsor の直接取得で、`multiple` という検索語は実在しないと確認した（58,792 はパスポート 24,583 と新栗まつり 34,209 の2ページ合算だった）
- `gscQueries` の1語の28日表示が、同じページのページ別28日表示より大きい場合も不整合として外す。検索語の合計がページ合計より少ないのは匿名化のため正常

## 1. 100k Gap Controller

| 項目 | 式 |
|---|---|
| Target | 100,000（`growth-engine.json` の target） |
| Current Run Rate | 直近7日 Views ÷ 7 × 28 |
| November Forecast | 11月前：直近7日の1日平均 × 30日。11月に入ったら：11月の実績（`monthToDate`）＋ 残り日数 × 直近7日の1日平均 |
| Gap | Forecast − Target（不足は負の数） |
| Target Daily Average | 11月前：100,000 ÷ 30。11月中：（Target − 実績）÷ 残り日数 |
| Current Daily Average | 直近7日 Views ÷ 7 |
| Achievement Status | Forecast ÷ Target が 1 以上 ON TRACK、0.8 以上 AT RISK、それ未満 OFF TRACK |

季節の上振れは、実測が出るまで予測に加えない（楽観で判断を誤らないため）。

## 2. Page Forecast

重点ページ（`growth-engine.json` の focusPages：袋田の滝・竜神大吊橋・花貫渓谷・筑波山の紅葉、土浦花火、大洗あんこう祭、あんこう鍋、11月イベントまとめ）と、GA4上位・GSC所見から自動検出したページ。

| 項目 | 内容 |
|---|---|
| views7 / views28 | pageMetrics → GA4上位ページ（ga4TopPages）の順で取る |
| 表示・CTR・順位 | pageMetrics（ページ別）→ GSC所見（gscDiscovery、検索語×ページ）の順 |
| 有効日数 | 11月のうちページが読まれうる日数。開催前〜終了後の余韻まで（花火なら終了後2日）。常設ページは30日 |
| forecast | 直近の1日平均 × 有効日数 |
| upside（推定） | 表示回数はそのまま、目標順位（11位以下→8位、4〜10位→3位）の一般的なCTR目安に近づいた場合の追加クリック × Views/session × 有効日数 |
| confidence | high：ページ別GA4+GSCがあり3日以内 / medium：Viewsと検索の両方 / low：どちらか / none：なし |
| status | ENDED・OBSERVING・ACT NOW（季節の需要前〜ピーク）・OPPORTUNITY・NO DATA・STABLE |

## 3. SEO Opportunity Engine

| 種類 | 条件（28日） | 推奨 |
|---|---|---|
| STRIKING_DISTANCE | 8〜20位、表示100以上 | 見出し・本文の不足を補い、文脈リンクを足す |
| LOW_CTR | 7位以内、表示100以上、CTRが目安の60%未満 | title・description の見直し |
| RISING_DEMAND | 表示が前期間比 +50%以上 | 公式情報の確認と本文の最新化 |
| HIGH_IMPRESSION_LOW_CLICK | 表示1,000以上、CTR 1%未満 | 検索結果での見え方の改善 |
| INTERNAL_LINK_OPPORTUNITY | 重点ページへの文脈リンク（ヘッダー・フッター・ナビを除く）が5ページ未満 | 同じ市町村・タグの記事からリンク（候補を出す） |
| SEASONAL_WINDOW | 季節の段階が index-window・demand-rising・peak | 通常より優先度を上げる |

観測期間中のページは推奨を「観測中」に置き換え、優先度を下げる。

## 4. Seasonal Deadline Engine

開催日（季節ガイドは需要期間の開始日）から逆算する。

```
prepare → index-window（公開・更新の締切）→ demand-rising（需要の立ち上がり）→ peak → live（開催・見頃）→ aftermath（終了処理）→ ended
```

- 締切 = 需要の立ち上がり − 検索評価の猶予（14日）
- カテゴリ（花火・紅葉・祭り・あんこう・コキア・梅・GW・夏休み・年末年始）は記事のタグ・キーワード・slug から判定。日数は `seasonalRules`、開催日を持たない季節ガイドの期間は `seasonWindows`
- 段階ごとの緊急度（`phaseUrgency`）を、ページ予測・SEO機会・施策の優先度に掛ける
- 終了後は src/lib/lifecycle.ts の「終了しました」「次回情報待ち」「翌年版はこちら」へ。削除はしない

## 5. Observation Window Guard

`src/data/seo-changes.ts` の変更履歴から、ページごとに last_change・experiment_type・observe_until・status を出す。

| 種類 | 観測日数 |
|---|---|
| fact・measurement（事実・計測の不具合） | 0（即修正） |
| cta・ui（CTA・小さなUI） | 7 |
| metadata・internal-link（title/description・OGP・技術・内部リンク） | 14 |
| body・template・ia・new-article（本文・テンプレート・構成・新規） | 28 |

種類は `kind` から決める（on-page は title/description だけの変更なら metadata、それ以外は body）。
seo-changes.ts のエントリに `experimentType: 'cta'` などを書けば、それを優先する。

変更前の確認：

```bash
npm run growth:check -- /events/oarai-ankou-matsuri-2026/ --type metadata
```

観測中で控えるべきときは終了コード 2。事実・計測の修正と、季節イベントの公式発表・期限変更の反映は例外として常に可。

### CI で止める（scripts/observation-guard.mjs、npm run verify・pull_request のときだけ）

PR で変わった記事（`src/content/{events,news}/*.md`）とページ（`src/pages/**.astro`）のうち、観測中のページを変えていれば **CI を失敗させる**。

- 観測期限は base（main）側の変更履歴で計算する（PR 自身が追加した記録では止まらない）
- 変更の種類は差分から判定：title・description・ogImage・ogImageAlt・keyword だけ → metadata、relatedArticleUrls だけ → internal-link、それ以外 → body（updatedDate だけの変更は数えない）
- 例外は PR 本文か、PR の最新コミットのメッセージに1行で宣言する（理由も必須）。CI は起動した時点の本文を読むため、本文を書き足したときは空コミットを push してやり直す：

```
observation-exception: fact — 公式発表で開催時刻が変わったため
```

種類は `fact`（事実の誤り・訂正）/ `measurement`（計測の不具合）/ `seasonal-official`（季節イベントの公式発表・期限変更の反映）。

```bash
git commit --allow-empty -m "observation-exception: fact — 終了した試合の時制を訂正（オーナー承認）"
```
- テンプレート・共通部品（`src/pages/{events,news}/[slug].astro`・`src/components`・`src/layouts`・`src/styles`）の変更は止めず、影響しうる観測中ページの数を警告する
- 手元で試す：`node scripts/observation-guard.mjs --base origin/main --body-file <PR本文>`

## 6. Freshness / Expiry Guard と年度誤認防止

`npm run audit:freshness`（`npm run verify` では `--strict`）。自動で削除・書き換えはしない。

| 種類 | 重さ | 内容 |
|---|---|---|
| expired-cta | 警告 | `expiresAt`（PR #198 の期限付き導線）の期限を過ぎたまま残っている |
| stale-deadline | 警告 | 「10月7日まで受付」など、期限を過ぎた受付・販売・予約の文言（終了・実績・前回の文脈は除く） |
| ended-live-wording | 警告 | 開催終了後も「受付中」「販売中」「本日開催」「開催中」「残り○日」 |
| year-slug | **エラー** | URL の年と開催年が違う（CI が失敗する） |
| year-title | 警告 | タイトルの年に開催年が無い |
| year-source-url | 警告 | 出典URLの年が開催年より古い |
| year-source-access | 警告 | 出典の確認日が開催日の1年以上前 |

## 7. Growth Action Queue

`data/editorial/action-queue.json` の各施策に、次の項目を付けると優先度が計算される（無い項目は推測で埋めず、score は null）。

| 項目 | 内容 |
|---|---|
| `expectedPvImpact` | 期待される追加 Views（根拠を `reason` に書く） |
| `confidence` | `high` / `medium` / `low`、または 0〜1 |
| `effort` | `S`（1時間）/ `M`（3時間）/ `L`（8時間）/ `XL`（16時間）、または時間数 |
| `deadline` | 締切（無ければ `dueDate`） |
| `page` | 対象ページ（無ければ `targetUrl`） |
| `source` / `reason` | 根拠（GSC・季節・公式発表など） |

```
優先度 = 期待PV × 確度 ÷ 工数（時間）× 緊急度
緊急度 = max（締切まで2日以内 2.0 / 7日以内 1.5 / 14日以内 1.2 / それ以外 1.0、季節の段階の緊急度）
```

Today's Growth Batch は、スコアの付いた施策と、エンジンが見つけたページの伸びしろ（ACT NOW・OPPORTUNITY）から上位3件。
同じ2時間なら、新規記事1本（+1,000）より既存記事の改善（+5,000）を選ぶ。記事数はKPIにしない。

## 8. Demand Radar（次に伸びる需要）

「流入が落ちてから気づく」をなくすため、**需要の大きさより増加速度**を重く見て、次に伸びるテーマを先に出す（`demandRadar`）。
対象は3種類を同じ物差しで並べる。リスト（コキア・土浦花火・紅葉・あんこう…）は固定せず、実測・台帳・季節から毎日出し直す。

- 既存ページ：`pageMetrics` の実測（7日Views の前週比、28日の検索表示の前期間比、順位、CTR）
- 台帳の未掲載イベント：`event-registry.json` の `discovered` / `verified` で、90日以内に始まり記事が無いもの
- 先の季節：`demand-radar.json` の `upcomingSeasons`（イルミネーション・年末年始・初詣・梅・桜。120日先まで）

Demand Score（0〜100、優先順位の目安＝推定）：

| 要素 | 重み | 値 |
|---|---|---|
| velocity（増加速度） | 3 | 7日Views前週比・28日表示の前期間比の大きい方。log2(1+増加率)/3（+700%で1）。新規の立ち上がりは1 |
| size（規模） | 2 | 28日の検索表示 log10(1+表示)/5 |
| positionOpportunity | 2 | 平均順位 8〜20位 1、4〜7位 0.7、1〜3位 0.2 |
| ctrGap | 1 | 順位別CTRの目安（ctrCurve）との差 |
| timing | 2 | 開催まで 0〜30日 1、31〜60日 0.6、61〜90日 0.3、開催中 0.8、終了 0 |
| commercialIntent | 1 | 駐車場・宿泊・予約・アクセス・交通規制など（`commercialIntentWords`） |
| effort | 1 | 既存ページの改善 1、既存の季節ページの更新 0.6、新規記事 0.3 |
| competition | 1 | 競合の実測が無いので null |

**実測できない要素は null にし、分母からも外す**（0点にしない）。使えた重みの割合を `coverage`、それに応じた `confidence`（0.7以上 high / 0.4以上 medium / それ未満 low）を付ける。
**検索語別**（`performance-snapshot.json` の `gscQueries`）：検索語 × ページごとに同じ物差しで並べ、次を「上昇中」とする（`demand-radar.json` の `queryRadar`）。

- 直近7日の表示が `minImpressions7`（20）以上で、前7日から `risingPct`（+30%）以上、または前7日0からの立ち上がり
- 伸びしろ（forecast）＝ 28日の表示 ÷ 28 × 30 ×（3位相当のCTR目安 − 今のCTR）。4〜20位だけ。表示回数は今のまま、と仮定した追加クリック
- 終了したページ・観測中のページは Batch に入れない（観測中は「観測後に」と表示）
- 検索語は PV Relay の代替候補・Pipeline には入れない（ページ単位で扱う）

## 9. PV Relay / PV at Risk と流入急減の事前警戒

今の主要流入ページ（直近7日Viewsの上位10件、全体の2%以上）ごとに、需要の終わりと、失う可能性のある Views を出す（`pvRelay`）。

| 項目 | 中身 |
|---|---|
| 終わり | 記事の終了日（無ければ開始日、季節の期間の終わり） |
| 状態 | `ACTIVE` / `ENDING`（14日以内）/ `ENDED` / `MILESTONE`（終わりではない節目がある）/ `END UNKNOWN`（終わりの日付データが無い） |
| 失う可能性（forecast） | 直近7日の1日平均が「終わり＋余韻（seasonalRules.aftermathDays）」の後に止まる想定で、今後7・14・30日に失う Views |
| 代替候補 | これから需要期に入る（timing 0.6 以上の）ページ・候補。同じ市町村を優先。現在の7日Views と次の仕込みの節目、公開・更新の締切を過ぎていれば「至急」 |

失う可能性は **forecast（推定）** で、実測として保存しない。2026年の実測で減衰の速さを学習したら（12. Annual Learning）、「止まる」想定を置き換える。

事前警戒（Alerts に出す）：

| 種類 | 条件 |
|---|---|
| PV at Risk（重大） | 今後7日で失う可能性が直近7日の20%以上 |
| PV at Risk | 14日以内に終わる主要ページ（全体の5%以上）／終わりの日付が無い主要ページ（全体の10%以上） |
| 流入急減 | 7日Viewsが前週比 -30% 以下（実測） |
| 検索表示急減 | 28日の検索表示が前期間比 -30% 以下（実測） |
| 順位下落 / CTR悪化 | 前期間の値（`positionPrev28`・`ctrPrev28`）があるときだけ。順位が3以上下落、CTRが -30% 以下 |
| 依存度 | 上位1ページが直近7日の25%以上 |

**節目（milestones）**：申請締切・交付開始など、催しの終わりではない日付は、記事に `event` として入れない（入れると締切後に「終了しました」が付き、おすすめから外れる）。`demand-radar.json` の `milestones` に、ページごとに公式一次情報で確認した日付・出典・効果（`demand-may-drop` / `demand-may-rise`）を入れる。状態は `MILESTONE` になり、失う可能性の合計には入れず、「次の節目の後に止まった場合の上限」（forecast）を別に出す。例：茨城パスポート（追加申請の締切 10/16・追加交付の開始 11/10）。

催しの記事で終わりの日付が無いときは、記事の `event` に公式の開催日を入れる。

**参考値**：上位2ページを除いた直近7日 ÷ 7 × 30日（`baselineExcludingTop2`）を表示する。季節需要の変化を含まないので、11月 forecast の正本には使わない。

## 10. 30/60/90日 Pipeline・Next Winners・Today's Growth Batch

- **Pipeline**（`demandPipeline`）：開催日・季節の開始までの日数で 0〜30日 / 31〜60日 / 61〜90日 に分け、締切と次の一手を出す。11月だけを見ず、10月の時点で12月・年末年始・1月まで仕込む
- **Next Winners**（`nextWinners`）：終わっておらず、急減中（前週比 -50% 以下）でもなく、伸びしろ（Growth Engine の upside）か速度があるページ。観測中のページは「観測後に」として表示だけする
- **Today's Growth Batch**（`relayBatch`）：既存の式「期待PV × 確度 ÷ 工数 × 緊急度」を維持し、緊急度に次を掛ける（`growth-engine.mjs` の式は変えない）

```
緊急度 = 季節の段階の緊急度（Growth Engine）× 速度（前週比 +100%以上 1.5、+30%以上 1.2）× 失うPVの代替（PV Relay の代替候補 1.3）
工数 = 新規記事 L（8時間）、本文・FAQ・事実更新・内部リンク M（3時間）、title・description だけ S（1時間）
```

候補は3種類：Growth Engine の施策・伸びしろ、Next Winners、上昇中の検索語（`gscQueries`。期待PV＝検索語の伸びしろ、確度 medium）。同じページは最もスコアの高い1件だけ残す。
期待PVを推定できない候補は順位を付けない（推測で埋めない）。既存ページが7位前後で表示が急増しているなら、新規記事より既存ページの改善が先に来る（期待追加PV ÷ 工数）。

## 11. Revenue Funnel

`revenueFunnel`。PV → CTA表示 → CTAクリック → ASPへの送客クリック → 発生成果 → 確定成果 → Revenue に分ける。詳しくは `docs/REVENUE_OS.md` の「Growth OS の Revenue Funnel」。

- クリックを成果・売上として扱わない。取得できない値は 0 ではなく null
- 期間がそろわない値で率を出さない（7日のクリック ÷ 累計の成果 はしない。発生CVR・EPC は null）
- 送客クリックがあるのに発生成果0 → 「CTAを増やす」前に、検索意図 × 商材のミスマッチを疑う（ページ × 提供元を一覧）

## 12. Annual Learning（2027年へ実測を残す）

`data/editorial/seasonal-learning.json`。季節記事ごとに1行。2027年に「何月何日までに何を公開・更新すれば、どの程度の需要を狙えるか」を2026年の実測から決めるための台帳。

| 区分 | 項目 | 誰が入れるか |
|---|---|---|
| 構造 | path・title・category・year・eventStart・eventEnd・publishedAt・updatedAt | `npm run learning:sync -- --write` が記事から同期 |
| 実測 | demandStartDate（需要の立ち上がり日）・impressionsPeakDate・viewsPeakDate・peakImpressions・peakViews・ctr・position・leadDays（立ち上がり→開催の日数）・decayDays（終了後の減衰）・internalLinkEffect・ctaClicks・conversionsOccurred・conversionsConfirmed・revenueYen・impressionsTotal・clicksTotal・measurementPeriod（合計の期間）・measuredAt・measurementSource | ChatGPT の日次処理が GA4/GSC の実測で埋める（推測しない・null のまま可） |

- 同期は実測の項目を上書きしない。記事が無くなった行も `archived: true` で残す
- カテゴリ（花火・紅葉・あんこう・グルメイベント・梅・桜・GW・海水浴・夏祭り・スポーツ・年末年始・初詣・祭り）ごとに、**実測が2件以上**そろったときだけ平均を出す。足りなければ「データ不足」
  - 需要の立ち上がり（demandStartDate → 開催日の日数）
  - 検索表示・Views のピークが開催の何日前か（impressionsPeakDate・viewsPeakDate と開催日の差）
- 2026-10-07 時点：実測5件（新栗まつり・rockin'star・常総きぬ川花火・利根川大花火・大洗海上花火）。花火は「検索表示のピークは開催の平均0.8日前」（4件）。需要の立ち上がり日は未実測
- `growth-engine.json` の `seasonalRules` は自動で書き換えない。学習結果を見て、人が置き換える

## performance-snapshot への追加（ChatGPT の日次処理が入れる）

次の2つが入ると、ページ予測・SEO機会の確度が上がる（無くても動く）。Windsor.ai の GA4/GSC から取得できる範囲で。

```jsonc
// ページ別の実測（重点ページ＋GSC上位を推奨）
"pageMetrics": [
  {
    "path": "/events/tsuchiura-hanabi-2026/",
    "views7": 0, "viewsPrev7": 0, "views28": 0,
    "gsc": { "impressions28": 0, "clicks28": 0, "ctr28": 0, "position28": 0, "impressionsPrev28": 0 }
  }
],
// 11月に入ったら、11月1日からの実績
"monthToDate": { "month": "2026-11", "views": 0, "days": 0, "through": "2026-11-05" }
```

Demand Radar・事前警戒の確度を上げるため、次も入れられると良い（無ければ null として扱う）。

```jsonc
// pageMetrics[].gsc に前期間（前28日）の順位・CTR（順位下落・CTR悪化の警戒に使う）
// position = Σ(順位 × 表示) ÷ Σ表示、CTR = Σクリック ÷ Σ表示（小数。0.034 = 3.4%）。表示0なら null（0で埋めない）
"gsc": { "positionPrev28": 0, "ctrPrev28": 0 },
// 検索語別の推移（Demand Radar の速度）。検索語 × ページに集約。ctr28 は小数。query が "multiple" などの集計行は入れない
"gscQueries": [
  { "query": "土浦花火 駐車場", "page": "/events/tsuchiura-hanabi-2026/",
    "impressions7": 0, "impressionsPrev7": 0, "impressions28": 0, "impressionsPrev28": 0, "position28": 0, "ctr28": 0 }
]
```

ASP の成果は `data/editorial/asp-results.json` に、管理画面で確認した値だけを入れる（確認できない値は null）。

## Control Center

`/control/` の最上部に、同じ計算（`runGrowthOS`）で Target・Forecast・Gap・Status、Growth Velocity、Today's Growth Batch、Alerts、PV at Risk、Demand Radar、Next Winners、30/60/90 Day Pipeline、Priority Pages、Revenue Funnel、Annual Learning を出す。
