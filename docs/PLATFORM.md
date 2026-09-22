# イバトコの構造と、壊してはいけない約束

最終更新：2026年9月20日（GitHubリポジトリは同日 `yutayama86/-` → `yutayama86/ibatoco` に改名）

このファイルは、**あとから来た人（人でもAIでも）が設計思想を壊さないため**にある。
「なぜそうなっているか」を書く。手順書ではない。

---

## 0. 何のための仕組みか

```
検索で人を集める
  → 茨城を回遊してもらう
  → 地域の店・施設へ送客する
  → 送客データを蓄積する
  → 地域事業者へ価値を証明する
  → 掲載・取材・Web/SNS/MEO/DX支援を受注する
```

**この循環に効かない機能は作らない。** 機能を増やすこと自体は目的ではない。

---

## 1. コンテンツの構造

| コレクション | URL | 何を置くか |
|---|---|---|
| `news` | `/news/<slug>/` | 茨城の出来事の解説。事実と考察を分けて書く |
| `events` | `/events/<slug>/` | 日程・場所・料金・駐車場の実用情報 |
| `articles` | `/<category>/<slug>/` | 取材記事 |
| `places`（md） | `/place/<id>/` | 取材してページを持つ場所 |
| `stores`（csv） | `/place/<id>/` | 無料一括掲載の店舗 |

**news の本文Markdownは描画されない。** frontmatterの構造化フィールドだけが表示される。
`---` の下に書いても出ないので、`conclusion` や `whatHappened` へ移すこと。

### 場所のデータ（2026-09-20 に整理）

- `places` / `stores` … **中身は空**。2026年9月20日に、実装確認用の
  架空サンプル16件（「珈琲 ひとひら」「サウナ 森の音」など）を削除した。
  1年近くdraftのまま残っており、将来「なぜdraftなのか」が分からなくなるため。
  仕組み（スキーマ・CSVの読み込み・`/place/<id>/` テンプレート・雛形）は残してある。
  **実在の店を確認してから入れること。**
- `businesses.ts`（4件）… **実在を確認した事業者だけ**。イバトコはページを持たず、
  記事から外部サイトへ送客する先として登録している。

将来 `places` と `businesses` を統合する余地はあるが、
「自前ページを持つ／持たない」の区別が消えるので、いまは分けている。
**4つ目のモデルを作らないこと。**

---

## 2. business の構造

`src/data/businesses.ts`。

```
id            <市町村slug>-<業種>-<3桁>  例) oarai-hotel-001。付け替えない
municipality  44市町村のslug。地域区分（region）はここから引く。二重に持たない
category      hotel / restaurant / farm / shop / activity ...
verifiedAt    確認した日。古い情報を「最新」と言わないために入れる
isPartner     有料の支援関係があるか
partnerType   editorial（既定）/ partner / pr
```

記事からは frontmatter の `relatedBusinesses` で参照する。
**本文へ自動で差し込むためのものではない。** どの事業者に触れた記事かを集めるために持つ。

`freshnessOf()` が 90日 / 180日 / 365日 で再確認の候補を返す。
**自動で内容を書き換えない。** 人が公式を見てから直す。

---

## 3. Editorial / Partner / PR

混ぜない。これがイバトコの土台。

- **Editorial** … 対価を受けていない。編集部の判断で載せている
- **Partner** … 情報整備・制作・運用を有料で支援している
- **PR** … 広告・タイアップ。読者が判別できるよう明示する

**Partner や PR であることが、掲載順や記事の評価に影響してはいけない。**
`partnerType` を並び替えのキーに使わないこと。表示の区分にだけ使う。

---

## 4. 収益導線

### アフィリエイト（`src/data/affiliates.ts`）

- **ASPが生成したURLを書き換えない。** 計測用パラメータが入っており、
  組み立て直すと成果が計上されない。`affiliateLinks` は「元URL → 生成リンク」の対応表
- 広告リンクの rel は **`nofollow sponsored noopener`**。
  **`noreferrer` を付けない**（参照元が消えると掲載サイトの照合ができず否認されうる）
- 公式の一次情報を必ず先に置く。**報酬の高さで並べ替えない**
- 広告リンクを含むページは、記事の冒頭に `#アフィリエイト広告` を表示する
- 提携が成立していない提供元を「広告」として出さない（`status: 'active'` のときだけ）
- **`status` を変えたら、記事の `booking.basis` も直す。**
  「いずれも提携していません」と書いたまま提携済みにすると、同じカードの中に
  「アフィリエイト広告を含みます」と「提携していません」が並ぶ。実際に4記事で公開されていた
  （2026-09-20に修正）。`scripts/data-audit.mjs` が検査するが、検査は最後の砦で、直すのは人
- **URLの綴りから提供元のページを推測しない。**
  `travel.rakuten.co.jp/yado/ibaraki/tsuchiura.html` は土浦ではなく**鹿嶋・潮来・北浦**を返す。
  貼る前に必ず開いて、どのエリアかを確かめる
- **`booking.items` の `provider` は、必ず `LINK_PROVIDERS` に登録してから使う。**
  `providerName()` は未登録のIDを素のまま返すので、日本語のページに
  `rockinstar-official` のような英語スラッグが読者に見えてしまう。
  公式サイトや公式のチケット受付先は `status: 'none'`（広告ではない）で登録する
  （`cn-playguide`・`eplus`・`rockinstar-ticket` がその例）

### /biz/（有料支援）

課題起点の入口（WHERE TO START）→ 各サービス → 問い合わせ。
**「何を頼めばいいか決まっていない」を受ける項目を消さないこと。**
それが一番多い相談だから置いてある。

---

## 5. GA4 イベント

**この7つ以外を送らない。** 増やすときは `scripts/data-audit.mjs` の
`ALLOWED_EVENTS` も直す（名前のゆらぎを防ぐため）。

| イベント | いつ |
|---|---|
| `outbound_booking_click` | 予約・確認先リンクを押した |
| `business_cta_view` / `business_cta_click` | 記事末の事業者向けCTA |
| `contact_form_view` / `contact_form_start` | 問い合わせフォーム到達・入力開始 |
| `generate_lead` | 送信先が2xxを返した送信だけ |
| `local_business_click` | 事業者の公式・予約・SNSへ移動（IDを付けられるリンクだけ） |
| `next_action_click` | 「今週できること」「ここから続けて読む」を押した |

`next_action_click` のパラメータ：`destination_type`（event / sports / season / theme / nearby /
month / area）、`when_bucket`（today / tomorrow / weekend / thisWeek）、
`action_source`（this_week / article_next / events_find）。
**どの区分・どの種類が押されるかで、次にどのデータを厚くすべきかを決める。**

`this_week`（`ThisWeek.astro`）は `pageType` を受け取る。TOP以外に置くときは必ず渡すこと。
渡さないと `page_type: 'home'` で送られ、どのページの反応か分からなくなる。

### 地域行動数（North Star の候補）

PVではなく「地域で行動したか」を見る。いまは次の合計を観測するだけで、
正式なKPIの計算式は固定しない（同一ユーザーの重複などがあるため）。

```
local_business_click + outbound_booking_click + next_action_click
```

まず観測する。数字の意味が分かってから定義を決める。

**キーイベントは `generate_lead` だけ。** ほかは途中経過で、
キーイベントにすると「届いていない問い合わせ」を成果として数えてしまう。

共通パラメータ（`commonParams()`）で `source_page` / `page_type` /
`municipality` / `content_category` を揃える。揃っていないと横断で見られない。

**氏名・メール・電話番号をGA4へ送らない。**
どのCTAから来たかは sessionStorage に30分だけ持つ（URLに `utm_*` を付けない。
内部リンクに付けると Organic の成果が Referral に化ける）。

---

## 6. イベントのライフサイクル

`src/lib/lifecycle.ts`。**保存せず毎ビルド計算する。**

保存した値は必ず古くなる。実際、街のページで開催済みイベントが残り続ける
不具合が起きた。日付で落とすのは `articleType: 'event'` だけで、
ガイドや開業情報の `startDate` は「情報の基準日」なので落とさない。

終了した記事は**消さない・URLを変えない・404にしない**。
「終了しました」と表示し、翌年版があれば `supersededBy` でつなぐ。

---

## 7. 内部リンク

`src/lib/related.ts`。ルールだけで選ぶ。AI・外部APIは使わない。

一致軸（スポーツ > 市町村 > 商業意図 > カテゴリ > 地域区分 > タグ）で重みづけし、
**一致が地域区分だけのものは候補にしない**（同じ県北というだけで並べると無関係が混ざる）。
終了したイベントと noindex は除外する。

**根拠のない自動リンクを作らない。** 似ていそう、で並べない。

---

## 8. 検査

```
npm run verify        型検査 → 品質監査 → 技術監査 → データ監査
npm run audit:tech    canonical / sitemap / robots / 重複メタ / JSON-LD / alt / 重い画像
npm run audit:data    business ID / relatedBusinesses / GA4イベント名 / 広告rel / 広告表示と本文の食い違い
npm run opportunity   送客先が無い「地域 × 意図」を出す（営業候補）
```

エラー0件でないと公開しない。

---

## 8.5 公開が止まったとき

mainへpushすると Cloudflare が自動でビルドし、本番へ出る。`npm run deploy` は要らない。

**ただし、失敗しても自動でやり直さない。** 2026-09-22 に実際に止まった。

- GitHub Actions の `build` は成功していた（コードの問題ではない）
- Cloudflare の `Workers Builds: ibatoco` が **所要0秒で failure**
- GitHubのcheckには**理由が出ない**。ビルドへのリンクだけが載る

確認のしかた。

```
GET /repos/yutayama86/Ibatoco/commits/<sha>/check-runs
→ "Workers Builds: ibatoco" の conclusion を見る
```

`conclusion: success` なのに本番が古いときは、単に反映待ち（1〜3分）。
`failure` なら止まっている。**本番を見ただけでは区別できない。**

直し方は2つ。

1. Cloudflareのダッシュボードで、そのビルドを Retry する（失敗の理由もここでしか見られない）
2. mainに新しいコミットを積んで、ビルドを起こし直す。
   **直接pushはしない。**PRを作ってマージする

繰り返し失敗するなら、コミットを積み直しても直らない。
ダッシュボードで理由を読むこと（無料プランのビルド枠など、リポジトリ側では分からない）。

---

## 9. 絶対にやらないこと

- 既存URLを変える／記事を大量削除する／大量リダイレクトを作る
- 検索で順位が付いている記事の title・H1 を一括変更する
- 架空の店舗・口コミ・実績・取材履歴・SNS URL を作る
- 未確認の情報を書く（確認できないなら「確認できていない」と書く）
- 口コミ点数のスクレイピング、他社レビューの無断転載
- 読者に見えないSEOテキスト、AI向けだけの隠し文章
- 広告のポップアップ、本文への広告の自動挿入
- 実績値の捏造（データが無いなら表示しない）
- 外部の有料AI APIの追加

---

## 10. いま止まっているもの

- **`places` / `stores` が空**。架空サンプルを削除した。実在の店を確認してから入れる
- **`commercialPriority` は2026-09-20にGSCの実データで設定済み**（8本）。
  根拠は表示回数・CTR・順位・導線の有無。推測では入れない
- **CASE STUDY の実績表示**。送客データがまだ無い。
  数字が出るまで作らない（捏造しないため）
