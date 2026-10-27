# 本番の取り消し（ロールバック）手順

最終確認：2026-10-27。本番公開の正本は [SECURE_DEPLOYMENT_POLICY.md](SECURE_DEPLOYMENT_POLICY.md)、事故対応は [SECURITY_INCIDENT_RESPONSE.md](SECURITY_INCIDENT_RESPONSE.md)。

## 原則

- 本番は **main の内容** で決まる。元に戻すときも「main を直す PR → Deploy production」の経路を使う
- 古いコミットを直接本番へ出す仕組みは無い（Deploy production は「最新の main と一致しない版」を拒否する）。だから**取り消しは revert のコミットで行う**
- 手元から `wrangler deploy`・`wrangler rollback`・`npm run deploy` は実行しない。main への直接 push・強制 push・ワークフローの無効化もしない

## どれを使うか

| 状況 | 方法 | かかる時間の目安 |
|---|---|---|
| マージした PR が原因の不具合（表示崩れ・リンク切れ・誤った情報） | **A. PR を revert する** | CI と本番反映で十数分（Validate site・Deploy production の上限はそれぞれ15分） |
| 記事の一部の事実だけ誤り | **B. 直す PR を出す（fix forward）** | 同上 |
| デプロイが途中で失敗した（本番は前の版のまま） | **C. 原因を直す／再実行** | 同上 |
| サイトが表示されない・重大な事故で、CI を待てない | **D. オーナーだけが行う緊急手段** | 数分 |

## A. PR を revert する（基本）

1. GitHub で、原因のマージ済み PR を開き「Revert」を押す（revert 用のブランチと PR が作られる）。押せないときは、作業ブランチで `git revert <マージコミット>` を作り PR にする
2. PR 本文に、何を取り消すか・なぜかを書く。観測中のページの本文を戻す場合は、本文か最新コミットに `observation-exception: fact — #<番号> の不具合の取り消し` を1行書く（観測窓ガードで止まらないように）
3. CI（`build`・`Analyze JavaScript/TypeScript`）の成功を確認する
4. オーナー承認 → squash でマージ
5. Deploy production の成功を確認し、`https://ibatoco.jp/build.json` の `commit` が revert のマージコミットと一致することを確かめる
6. 下の「戻したあとの確認」を行う

revert でまとめて戻るもの：記事の Markdown、カード画像とその一覧（`src/data/card-images.ts`）、SEO 変更履歴（`src/data/seo-changes.ts`）、台帳。戻したあとで改めて同じ変更を出すときは、新しい PR にする（revert の revert は避ける）。

## B. 直す PR を出す（事実の誤り）

- 誤りだけを直す小さな PR。観測中でも `observation-exception: fact — <理由>` で出せる
- 公開済み記事の訂正・取り下げは、オーナーの確認が必要（AGENTS.md「公開の判断」）。訂正は訂正履歴として記事に残す（`CorrectionHistory`、`/about/corrections/` の方針）

## C. デプロイが失敗した

- Deploy production が失敗しても、本番は前の版のまま（`/build.json` で確認）
- ログの失敗したステップで原因を確かめる。よくある原因：
  - 「Superseded deployment skipped」「Main advanced during build」：より新しい main がある。新しい方の Deploy が走るので待つ（失敗ではない）
  - 06:30 の定期実行の「Verified daily metric sync has not completed recently」：当日の確定指標が無い（#441 のマージ前だけ。マージ後は警告になり止まらない）。マージで動くデプロイには関係しない
  - 「… は Validate site（main）に合格していないため本番へ出さない」（#441 のマージ後）：その版の Validate site の完了を待つか、失敗の原因を直す
  - 監査・ビルドの失敗：main の内容に問題がある → A か B
- 一時的な失敗（ネットワークなど）なら、Actions の画面で Deploy production を **main で** 再実行（Run workflow / Re-run）

## D. 緊急手段（オーナーだけ）

CI を待てない重大な事故（サイトが表示されない、不正な内容が出ている）のときだけ。

1. Cloudflare のダッシュボードで Worker `ibatoco` のデプロイ履歴を開き、直前の正常な版へ戻す（画面の表記は Cloudflare の更新で変わることがある）
2. すぐに A の revert PR を作り、main を本番と同じ状態に戻す。そうしないと、次の Deploy production が問題の版を再び出す
3. 認証情報が漏れた疑いがあるときは [SECURITY_INCIDENT_RESPONSE.md](SECURITY_INCIDENT_RESPONSE.md) に従う（Secret の値をチャットや Issue に書かない）

AI（ChatGPT・Claude など）は D を実行しない。手順の案内とオーナーへの依頼までにする。

## 戻したあとの確認

- `https://ibatoco.jp/build.json` の `commit`
- 問題のあったページと、TOP・ニュース一覧・イベント一覧が HTTP 200 で、期待する内容になっていること（反映直後はキャッシュで旧版が返るので、戻した版にしかない文字列で確かめる）
- `/control/` が保護されたままであること（未ログインでログイン画面）
- 翌朝の Public security smoke monitor が成功すること
- 計測：GA4 の送信が止まっていないこと（数日分の日別 Views に穴が無いか。穴があれば `measurement-incidents.json` に記録）
- PR・Issue に、何が起きて何を戻したかを記録する
