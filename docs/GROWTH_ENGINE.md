# Growth Engine（11月100,000 Views）

最終更新：2026-10-06

2026年11月の月間 GA4 Views 100,000 の達成確率を上げるための計算の正本。
「計測 → 予測 → Gap → 機会 → 優先順位」を毎日同じ式で出し、判断を人の勘に頼らない。
Growth Engine そのものを目的にせず、PV Gap を縮める施策を選ぶために使う。

## どこで動くか

| 場所 | 内容 |
|---|---|
| `src/lib/growth-engine.mjs` | 計算だけ（純粋関数）。ファイル・ネットワークに触れない |
| `scripts/growth-engine.mjs` | 日次レポート。`npm run growth:target`（CI の定期実行 Validate site でも生成され、Job Summary に載る） |
| `reports/editorial/growth-target.md` / `growth-engine.json` | 出力（Git に入れない） |
| `data/editorial/growth-engine.json` | 目標・重点ページ・季節の想定・観測窓・SEOのしきい値 |
| `scripts/freshness-guard.mjs` | 期限切れ・年度違いのチェック（`npm run verify` で実行） |
| `scripts/growth-engine.test.mjs` | 計算式の単体テスト（`npm run verify` で実行） |
| `src/pages/control/` | Control Center（同じ計算を表示） |

追加費用ゼロ。外部API・有料SaaSは使わない。数値の実測は `data/editorial/performance-snapshot.json`（GA4/GSC、Windsor.ai 経由で日次更新）だけ。

## 実測と想定の区別

- **実測**：GA4 Views・sessions、GSC の表示回数・クリック・CTR・順位（performance-snapshot）
- **想定（運用上の仮定）**：季節の需要期間・需要の立ち上がり日数・検索順位別CTRの目安（`growth-engine.json`）。記事には出さない。GSC の実測が貯まったら更新する
- 無い値は `null`（表では「—」）。推測で埋めない。推定を含む値には必ず根拠（basis）と確度（confidence）を付ける

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
- 例外は PR 本文に1行で宣言する（理由も必須）：

```
observation-exception: fact — 公式発表で開催時刻が変わったため
```

種類は `fact`（事実の誤り・訂正）/ `measurement`（計測の不具合）/ `seasonal-official`（季節イベントの公式発表・期限変更の反映）。
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

## Control Center

`/control/` の最上部に、同じ計算で Target・Forecast・Gap・Status、Growth Velocity、Priority Pages、Today's Growth Batch、Alerts、Revenue を出す。
