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


## CSVの形式が未対応の場合

生CSVの中身を表示せず、ヘッダー・件数・文字コードだけを確認できます。

~~~bash
npm run revenue:inspect
~~~

または:

~~~bash
node scripts/revenue-import-inspect.mjs --input=/path/to/file.csv
~~~

出力:
- reports/editorial/revenue-import-inspect.md
- reports/editorial/revenue-import-mapping-stub.json

mapping stubにはCSVの列名だけが入り、注文ID・金額・顧客情報などの行データは入りません。

A8.netは2026年の新管理画面でレポート体系が変更されており、楽天アフィリエイトはダウンロード項目を利用者側で選択できます。そのため、ASP名だけで固定列を仮定せず、実際のヘッダーを1度確認してから専用mappingを固定します。
