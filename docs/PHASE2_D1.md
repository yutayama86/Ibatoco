# Phase2：動的基盤（Cloudflare D1 / Workers / Access）ロードマップ

戦略の「書く側（SaaS）」をエッジに載せる。**読む側（Astro静的・SEO）は今のまま**変えない。
静的の速さ・低コストを保ちつつ、会員・口コミ・店舗管理・課金・送客だけをDBとAPIで足す。

## いま出来ていること（このリポジトリ内で完結・検証済み）

- **DBスキーマ**：`db/schema.sql`（SQLite=D1互換。municipalities/categories/users/stores/store_media/reporters/reviews/subscriptions/leads/analytics_events）。
- **CSV→DB移行**：`node scripts/csv-to-d1-seed.mjs` が `src/data/stores.csv` と静的データから `db/seed-stores.sql` を生成。
  → 無料一括掲載CSVがそのままDBへ移行できる（＝供給エンジンとDBの接続）。
- **ローカル検証**：`sqlite3` でスキーマ＋seedの適用・冪等性・結合クエリを確認済み。

```bash
# ローカルで試す（sqlite3）
node scripts/csv-to-d1-seed.mjs
sqlite3 /tmp/ibatoco.db < db/schema.sql
sqlite3 /tmp/ibatoco.db < db/seed-stores.sql
sqlite3 -header /tmp/ibatoco.db "SELECT name,area,plan FROM stores;"
```

## 静的 ↔ 動的の境界

| データ | いまの持ち方 | Phase2 |
|---|---|---|
| 市町村・ジャンル | `src/data/areas.ts`, `content.config.ts` | DBにも seed（結合キー：slug/key）。表示は静的のまま |
| 店舗（無料・大量） | `src/data/stores.csv` | **D1 `stores`**。CSVは取り込み口として継続可 |
| 店舗（作り込み） | `src/content/places/*.md` | 当面md。将来D1へ寄せる |
| 記事・レポーター | Markdown / `src/data/reporters.ts` | 当面静的（編集部運用）。著者＝Person（実装済） |
| 口コミ・会員・課金・送客・行動ログ | なし | **D1**（reviews/users/subscriptions/leads/analytics_events） |

## あなた（オーナー）がCloudflareでやること

シークレットやDB作成はダッシュボード操作（＝Claudeは代行しません）。手順のみ提示します。

1. **D1データベースを作成**（Cloudflareダッシュボード → Workers & Pages → D1 → Create）。名前例 `ibatoco`。
2. できた **database_id** を控える。
3. `wrangler.jsonc` に D1 バインディングを追記（下記テンプレ）。
4. スキーマ適用：`wrangler d1 execute ibatoco --remote --file db/schema.sql`
5. seed投入：`node scripts/csv-to-d1-seed.mjs && wrangler d1 execute ibatoco --remote --file db/seed-stores.sql`
6. （認証）**Cloudflare Access** で `/dashboard/*`（店舗オーナー）と `/admin/*`（編集部）を保護。

### wrangler.jsonc に足すバインディング（テンプレ）

```jsonc
  "d1_databases": [
    {
      "binding": "DB",            // Worker内で env.DB
      "database_name": "ibatoco",
      "database_id": "<ダッシュボードで発行されたID>"
    }
  ]
```

> 注：`database_id` が未確定のうちは追記しない（デプロイが壊れるため）。DB作成後に足す。

## 実装の順序（次のインクリメント）

Phase2は大きいので、価値の出る順に小さく載せる。各ステップは独立してデプロイ可能。

1. **送客(leads)＋口コミ(reviews)投稿API**（`worker/index.js` に `/api/*` を追加）
   - 静的な店舗ページ／予約フォームから `POST /api/leads`・`POST /api/reviews` を叩く。
   - まずは投稿を貯めるだけ（承認は編集部が手動）。→ **送客課金とUGC資産の起点**。
2. **編集部ダッシュボード `/admin`**（Access保護）：leads/reviews の承認・一覧。
3. **店舗オーナー自己編集 `/dashboard`**（Access保護 + owner紐付け）：自店の情報・写真・クーポン編集、アクセス分析。＝公式店舗プランの価値。
4. **課金(subscriptions)**：Stripe等と連携し plan を official/growth/partner に。
5. **読む側への反映**：D1の公開データを（a）ビルド時取り込み（今のCSVと同じ静的化）＝SEO最速、または（b）一部を動的レンダリング。基本は(a)でSEOを守る。

## 設計メモ

- 日時は ISO8601 文字列。`ON CONFLICT DO UPDATE` で冪等 upsert。
- `features`/`genres`/`sns`/`payload`/`photos` は JSON文字列で保持（D1=SQLiteのため）。
- 承認フロー：`reviews.status` `leads.status` で pending→published/handled。公開だけを静的側に出す。
- 行動ログ `analytics_events` は将来のデータ提供／AIモデルコースの燃料。


> 注意：本書の `wrangler d1 execute --remote` は本番DBへの書き込みです。実施する場合は、手元のWranglerではなくGitHub Actionsの承認付きワークフローとしてPRで用意してください（docs/SECURE_DEPLOYMENT_POLICY.md）。
