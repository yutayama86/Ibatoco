# Revenue Import

ASPの確定成果を、追加費用なしで `revenue-ledger.json` へ取り込む仕組みです。

## 安全方針

ASPの生CSVは注文ID等を含む可能性があるため、GitHubへコミットしません。
`data/revenue-imports/private/` はGit管理対象外です。

## 正規化CSV

列はこの順でなくても構いません。

```csv
provider,transaction_id,status,confirmed_at,revenue_yen,page,order_amount_yen,note
rakuten-travel,example-001,confirmed,2026-10-04,120,/events/oarai-ankou-matsuri-2026/,12000,test
```

必須:
- provider
- transaction_id
- status
- confirmed_at
- revenue_yen

任意:
- page
- order_amount_yen
- note

`status=confirmed` のみ取り込みます。ページが特定できない場合は `page` を空欄にし、推測で割り振りません。

## 実行

```bash
npm run revenue:import
```

または任意のCSVを直接指定:

```bash
node scripts/revenue-import.mjs --input=/path/to/file.csv --write-ledger
```

## ASP固有CSV

A8.net / 楽天アフィリエイト等の実際のエクスポートCSVを一度確認できれば、そのヘッダーに対応するアダプターを追加します。
未知の形式を推測で読み込むことはしません。
