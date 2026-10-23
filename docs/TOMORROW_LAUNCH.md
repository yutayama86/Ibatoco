> **この文書は公開初日の手順の記録で、現在は使いません。** 本番公開は GitHub Actions の「Deploy production」だけです（[SECURE_DEPLOYMENT_POLICY.md](SECURE_DEPLOYMENT_POLICY.md)）。下記のローカルWrangler手順は実行しないでください。

# 明日の公開手順

作業時間の目安は10〜15分です。実記事の追加は待たず、ブランドサイトとして公開できます。

## 1. ターミナルを開く

```bash
cd /Users/yamanobeyuuta/Desktop/Ibatoco
```

## 2. Cloudflareへログイン

```bash
npx wrangler login
```

ブラウザが開いたらCloudflareへの接続を許可します。ログイン済みならこの工程は省略できます。

確認する場合：

```bash
npx wrangler whoami
```

## 3. 監査して公開

```bash
npm run deploy
```

この1コマンドで、ビルド、74ページの品質監査、Cloudflare Workersへのデプロイを順番に実行します。

## 4. 公開後にスマホで確認

- https://ibatoco.jp/
- https://ibatoco.jp/area/
- https://ibatoco.jp/about/editorial-policy/
- https://ibatoco.jp/contact/

確認するのは、文字ロゴ、スマホメニュー、44市町村地図、問い合わせフォームです。

## 5. フォームを1回送信

`/contact/` から自分宛てにテスト送信し、Formspreeで受信できることを確認します。初回に有効化メールが届いた場合は承認します。

## 6. GitHubへ反映

ローカルの最終コミットは作成済みです。公開確認後に次を実行します。

```bash
git push origin main
```

## 公開前にパスワードをかける場合

```bash
npx wrangler secret put SITE_PASSWORD
```

完全公開する場合は `SITE_PASSWORD` を設定しません。すでに設定されている場合はCloudflareのWorker設定から削除します。

## 更新するとき

- 文言や記事の更新: `docs/UPDATE_GUIDE.md`
- ロゴの使用ルール: `docs/BRAND_GUIDE.md`
- 公開前チェック: `docs/PRELAUNCH_AUDIT.md`
