# イバトコ編集OS

## 目的

情報探索と、その日に実装する施策を分離します。記事を書かない日もイベント・行政・交通・SPORTSの発見を台帳へ残し、成長施策は完成仕様がある1件だけに限定します。公式情報と矛盾する誤情報・開催変更・重大なリンク切れの最小差分修正は緊急保守として別枠にします。

役割は次のとおりです。

| 担当 | 責任 |
| --- | --- |
| ChatGPT | 外部監視、GA4/GSC分析、一次情報確認、優先順位、完成原稿、SEO、内部リンク、CTA、KPI |
| 編集OS | 台帳の永続化、公開在庫との照合、抜け漏れ検知、7日/28日の変更抑止、実装可否の機械判定 |
| Claude Code | `ready`になった完成仕様の実装、build/typecheck/リンク確認 |
| 人 | 公開責任、事実・権利・広告表示・重要な戦略変更の承認 |

## 正本となるファイル

- `data/editorial/event-registry.json`：発見済みイベント。未掲載でも削除しない
- `data/editorial/performance-snapshot.json`：GA4/GSCの最新スナップショット。未取得時はnullのままにし、推測値を入れない
- `data/editorial/action-queue.json`：施策候補と実装可否
- `docs/editorial/specs/*.md`：ChatGPTが完成させた実装仕様
- `src/data/seo-changes.ts`：既存の改善履歴。7日・28日のクールダウン判定に使用

`reports/editorial/` は自動生成物です。直接編集しません。

## 日次フロー

1. ChatGPTがGA4/GSC、県・主要施設・交通・SPORTS、30日以内のイベントを確認する
2. 新規情報をイベント台帳へ追加する。今日記事化しない情報も `discovered` で残す
3. 市町村は曜日ローテーションで詳細確認し、週1回は44市町村を完全棚卸しする
4. `npm run editorial:daily` で公開在庫と同期し、未掲載候補・変更凍結・実装キューを生成する
5. ChatGPTが期待値最大の成長施策1件を選び、`docs/editorial/specs/` に完成仕様を作る。緊急保守があっても成長施策を省略しない
6. `action-queue.json` を `ready` にする。一次情報URL・受入条件・specPathが欠けると検証が失敗する
7. Claude Codeは生成された `reports/editorial/claude-implementation-brief.md` に従って実装する
8. 日次報告の最後に「ゆうたさんにお願いすること」を出し、Claude Codeへ渡す完成文、確認だけ必要な事項、または対応不要のいずれかを明示する
9. 公開後、`npm run seo:log` で改善履歴を残す。7日・28日後に評価する

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
