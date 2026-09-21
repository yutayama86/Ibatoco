# GA4計測の設計と、管理画面側でやること

対象プロパティ：`G-2DNYX7CSK6`（`PUBLIC_GA_ID` があればそちらが優先）

コードで完結している部分と、GA4の管理画面でしか設定できない部分を分けて書く。
**コード側は実装・検証済み。管理画面側は未実施。**

---

## 1. コードでやっていること

実装は `src/layouts/BrandBase.astro` のインラインスクリプトと `src/data/analytics.ts`。

### 1-1. 計測しない条件（gtagを読み込まない）

次のどちらかに当たると、`gtag.js` のタグを**そもそもDOMに挿入しない**。
GA4へは1リクエストも飛ばない。

| 条件 | 目的 |
|---|---|
| ホスト名が `ibatoco.jp` / `www.ibatoco.jp` 以外 | localhost・`astro preview`・プレビュー環境の除外 |
| `localStorage.ibatoco_ga_optout === '1'` | 運営者自身のアクセス除外 |

以前は「本番ビルドかどうか」だけで判定していたため、`npm run preview` で
本番ビルドをlocalhostに配信すると計測されてしまっていた。ホスト名で見るように変えた。

### 1-2. 運営者の自己除外のしかた

除外したいブラウザで、一度だけ次を開く。

```
https://ibatoco.jp/?ga-optout=1
```

`localStorage` にフラグが入り、以降そのブラウザからは計測されない。解除は `?ga-optout=0`。

**この方式を選んだ理由**：IPアドレスやUser-Agentからの推測除外は、
同じ回線・同じ端末構成の第三者を巻き込む。localStorageは自分で明示的に
セットしたブラウザだけに効くので、第三者を誤除外しない。

設定・解除のどちらも、画面下に確認メッセージが8秒間出る。出なければ効いていない。

**注意**：ブラウザ・端末ごとに設定が必要。シークレットウィンドウでは効かない。
サイトデータを消すと解除される。**普段使う端末すべて**（PC・スマホ、
Chrome・Safariなど）で1回ずつ開くこと。

### 1-3. 流入元の分類

全ページのイベントに、次の2つのパラメータが載る。

| パラメータ | 値 |
|---|---|
| `traffic_kind` | `ai_referral` / `search` / `other_referral` / `direct` |
| `ai_source` | `ai_referral` のときだけ。`chatgpt` `claude` `perplexity` `gemini` `copilot` など |

判定は referrer のホスト名と `utm_source` の両方を見る（ChatGPTは
`?utm_source=chatgpt.com` を付けてくることがあるため、そちらを優先）。

**AIに数えないもの（意図的）**

- **referrerが無い流入（Direct）**：AI経由か直接入力かを区別する材料が無い。`direct` のまま。
- **`google.com` / `bing.com` / `yahoo.co.jp` など検索エンジン**：AI Overviews や
  Bingのチャット結果からの流入も、通常の検索と同じrefererで届く。区別できないので `search`。
- **GA4側の `(not set)`**：GA4が判定できなかったもの。こちらでも判定できない。

対象ホスト一覧は `src/data/analytics.ts` の `AI_REFERRAL_HOSTS`。追加はそこへ1行足す。

### 1-4. CV（コンバージョン）

`src/lib/forms.ts`。フォーム送信先が **2xx を返したときだけ** `generate_lead` を送る。
ボタンのクリックや、送信に失敗したときは送らない（実際に届いた件数と一致させるため）。

| パラメータ | 内容 |
|---|---|
| `form_id` | `contact` |
| `form_subject` | 「ご用件」の選択値 |
| `page_path` | 送信元のパス |

送信先は Formspree（`https://formspree.io/f/mykrvjkg`）。本番で設定済み。

### 1-5. 事業者向け導線の計測（2026-09-15 追加）

記事詳細（`/news/*`）とイベント詳細（`/events/*`）の本文の最後に、地域事業者向けのCTAを1ブロック置いた
（`src/components/BusinessCta.astro`）。行き先は既存の `/contact/`（ご用件を選んだ状態で開く）。
イベント送信は `src/lib/analytics-events.ts`。

| 段階 | イベント名 | いつ送るか | キーイベント |
|---|---|---|---|
| CTA表示 | `business_cta_view` | CTAの半分以上が画面に入ったとき、1ページ1回 | しない |
| CTAクリック | `business_cta_click` | CTAのリンクを押したとき | しない |
| フォーム到達 | `contact_form_view` | `/contact/` を開いたとき（CTA経由以外も含む） | しない |
| 入力開始 | `contact_form_start` | フォームに初めてフォーカスしたとき、1回 | しない |
| 送信完了 | `generate_lead` | 送信先が 2xx を返したときだけ（1-4） | **これだけ** |

**途中の段階をキーイベントにしない。** 実際には届いていない問い合わせを成果として数えてしまう。

付くパラメータ：

| パラメータ | 値 | 付くイベント |
|---|---|---|
| `cta_type` | `listing`（掲載・情報提供）/ `consulting`（集客・Web・SNS相談）/ `biz_page`（/biz/ へのリンク） | click、および CTA経由のときの form_view / form_start / generate_lead |
| `cta_location` | `article_end` | 同上＋view |
| `cta_page_type` | `news` / `events` | 同上＋view |
| `cta_origin_path` | CTAを押した記事のパス | CTA経由の form_view / form_start / generate_lead |
| `link_url` | 押したリンク先 | click |
| `landing_traffic_kind` | `search` / `ai_referral` / `other_referral` / `direct` / `unknown` | **全イベント**（config に載る） |

- どのCTAから来たかは `sessionStorage` に30分だけ持つ。**内部リンクに `utm_*` を付けない**
  （GA4のセッションの流入元が上書きされ、Organic Search の成果が別チャネルに化けるため）。
- `traffic_kind` はページごとの referrer で決まるので、記事から `/contact/` へ移ると `other_referral` になる。
  CVを入口の流入で見るために、セッションの入口の区分を `landing_traffic_kind` として別に持つ。
  サイト内から来たのに入口の記録が無いときは `unknown`（推測で埋めない）。途中の Direct は入口を上書きしない。
- 既存の `traffic_kind` の意味は変えていない（シート・探索の過去データと比較できるように）。

#### Organic Search 由来のCVの見方

1. **標準のチャネル**：探索で、ディメンション「セッションのデフォルト チャネル グループ」、
   指標「イベント数」、フィルタ「イベント名 = generate_lead」。Organic Search の行が検索由来のCV。
2. **入口の区分で見る（補助）**：カスタムディメンション `landing_traffic_kind` を登録後、
   「イベント名 = generate_lead」×「landing_traffic_kind = search」。
3. **ファネル**：探索 → ファネルデータ探索で
   `business_cta_view` → `business_cta_click` → `contact_form_view` → `generate_lead`。
   内訳に「セッションのデフォルト チャネル グループ」を入れると、Organic 経由の各段階の数が出る。
   CTAクリック率 = `business_cta_click` ÷ `business_cta_view`。

**有効問い合わせ件数**は GA4 では判定できない（中身を見ないと分からない）。
Formspree に届いたメールを週1回数え、`generate_lead` の件数と並べて記録する。

### 1-6. CTAクリック計測の確認（2026-09-21）

`business_cta_click` は **実装済み**。未実装ではない。

- `src/components/BusinessCta.astro` で、CTAリンクのclick時に `business_cta_click` を送信
- news / events / sports の主要詳細テンプレートすべてに `BusinessCta` を接続
- `cta_type`, `cta_location`, `cta_page_type`, `source_page`, municipality / category を付与
- CTA起点は30分だけsessionStorageへ保持し、フォーム到達・開始・`generate_lead` まで引き継ぐ
- 内部CTAにUTMを付けず、Organic Search等の元セッション帰属を壊さない

Windsor.ai経由のGA4直接取得で、2026-09-14〜09-20は次を確認した。

| イベント | 件数 |
|---|---:|
| `business_cta_view` | 180 |
| `business_cta_click` | 0 |
| `contact_form_view` | 4 |
| `contact_form_start` | 1 |
| `generate_lead` | 1 |
| `outbound_booking_click` | 9 |

したがって `business_cta_click = 0` だけを見て「計測の穴」と断定しない。
コード上の計測経路は存在するため、`npm run audit:analytics` が通っている限り、まず
**CTAを180回見られてクリック0回というCROシグナル**として扱う。
実ユーザーのクリックが発生したのにイベントが出ない証拠が得られた場合のみ、計測障害へ昇格する。

---

## 2. 管理画面でやること（コードからは設定できない）

### 2-1. カスタムディメンションの登録 ※これをやるまでレポートに出ない

管理 → データの表示 → カスタム定義 → カスタムディメンションを作成

| ディメンション名 | 範囲 | イベントパラメータ |
|---|---|---|
| 流入区分 | イベント | `traffic_kind` |
| AI流入元 | イベント | `ai_source` |
| フォーム種別 | イベント | `form_id` |
| 問い合わせ用件 | イベント | `form_subject` |
| CTAの種類 | イベント | `cta_type` |
| CTAの位置 | イベント | `cta_location` |
| CTAを置いたページ種別 | イベント | `cta_page_type` |
| CTAを押した記事 | イベント | `cta_origin_path` |
| 入口の流入区分 | イベント | `landing_traffic_kind` |

登録した時点より後のデータにしか適用されない（遡及しない）。

### 2-2. `generate_lead` をキーイベントに設定

**先に本番の [/contact/](https://ibatoco.jp/contact/) からテスト送信を1件行う。**
（`?ga-optout=0` で除外を解除した状態で。送信内容は「その他」＋テストと分かる本文でよい）

これには2つの意味がある。

1. フォーム → Formspree → メール受信 → GA4イベント の経路が通ることを実地で確認できる
2. イベント一覧に `generate_lead` が現れ、キーイベントに設定できるようになる

送信後、管理 → データの表示 → イベント で `generate_lead` を探し、
「キーイベントとしてマークを付ける」をオンにする。

一覧に出てこない場合は「キーイベント」画面の「新しいキーイベント」から
イベント名 `generate_lead` を直接入力しても作成できる（大文字小文字を区別する）。
ただし、その場合もイベントが実際に発生していないと計上はされない。

リアルタイムレポートで即座に確認したいときは、送信直後に
レポート → リアルタイム を開く（通常のレポートへの反映は24時間程度かかる）。

### 2-3. 参照元除外リストに `localhost` を追加

管理 → データ ストリーム → 該当ストリーム → タグ設定を行う →
不要な参照のリスト → 参照ドメインに `localhost` を追加。

`localhost:3000 / referral` は、ローカルで動かしている別のツールのページから
ibatoco.jp へのリンクを踏むと発生する。1-1の除外は「イバトコ側がlocalhostで
表示されたとき」に効くもので、**参照元がlocalhostのケースは別**なのでこちらで塞ぐ。

### 2-4. AI Referral を独立して見る

カスタムディメンション登録後、次のどちらでも見られる。

- **探索**：ディメンションに「流入区分」「AI流入元」、指標にセッション数・エンゲージメント率
- **カスタムチャネルグループ**：管理 → データの表示 → チャネルグループ →
  新しいチャネルグループ。「AI Referral」を作り、条件を
  `参照元` が `chatgpt.com`, `chat.openai.com`, `claude.ai`, `perplexity.ai`,
  `gemini.google.com`, `copilot.microsoft.com` のいずれかに一致、で定義する。
  既定のチャネルグループより**上**に置かないと Referral に吸われる。

---

## 3. `(not set)` について

8/20の実測で `(not set)` が16件出ている件。

### 3-1. コード側で否定できた原因（2026-08-22 確認）

`(not set)` の典型的な技術的原因を本番で確認し、いずれも該当しないことを確かめた。

| 疑い | 確認方法 | 結果 |
|---|---|---|
| GA4タグの二重読み込み | 本番HTMLの `<script src=".../gtag/js">` を数える | **0件**（条件付き読み込みのみ） |
| Cloudflare Rocket Loader によるスクリプト遅延 | `rocket-loader` / `text/rocketscript` の痕跡 | **なし** |
| Referrer-Policy によるリファラ欠落 | レスポンスヘッダ | `strict-origin-when-cross-origin`。クロスオリジンでも**オリジンは送る**ので判定に支障なし |
| 別レイアウトからの重複計測 | `src/layouts/Base.astro` の参照元 | **どこからも使われていない**（後述） |

**対応済み（2026-09-21）**：未使用だった `src/layouts/Base.astro` は削除し、GA4起動処理を
`src/layouts/BrandBase.astro` の1系統へ統一した。さらに `npm run audit:analytics` をCIに追加し、
別レイアウトへの古いgtagスニペット混入、主要イベント実装の欠落、BusinessCtaの配線漏れを
ビルド前に検出する。

### 3-2. 管理画面で確認すること

コード側では特定できないので、推測で塞がず、管理画面で次を順に確認する。

1. **計測期間**：GA4の参照元は確定まで24〜48時間かかる。当日のレポートでは
   `(not set)` が多めに出る。数日後に同じ日付を見直す。
2. **ディメンションの組み合わせ**：「ユーザーの最初の参照元」など
   ユーザースコープの項目を、セッションスコープの指標と組み合わせると
   `(not set)` が出やすい。「セッションの参照元 / メディア」で見直す。
3. **タグ設置前のセッション**：計測開始前から続いているセッションは属性が付かない。
4. **上記で消えない場合**：DebugView でイベントに `page_referrer` が
   載っているかを確認する。

**やってはいけないこと**：`(not set)` や Direct を「たぶんAI経由」として
AI Referral に振り分けること。実態と乖離し、施策判断を誤らせる。

---

## 4. SEO改善履歴との突き合わせ

別系統。GA4ではなく Search Console を見る。

- 履歴データ：`src/data/seo-changes.ts`（変更日 / URL / 狙いクエリ / 変更内容 / commit）
- 配信：`https://ibatoco.jp/seo-changes.json`（robots非許可・sitemap未収録）
- 集計：`docs/seo-change-tracking.gs` を既存プロジェクト
  「イバトコ SEO自動集計」へ**新規ファイルとして追加**し、`updateSeoChangeLog` を実行

**拡張サービスの追加は不要です。** Apps Script のサービス一覧から
「Search Console API」は提供されなくなっており、`Webmasters.*` は使えません
（2026-08-23 に一覧を確認：Groups Settings → Merchant → Peopleapi → Tag Manager と続き、
S で始まる項目がない）。代わりに `UrlFetchApp` で Search Console の REST を直接叩きます。
必要なスコープ `webmasters.readonly` と `script.external_request` は、既存プロジェクトの
`appsscript.json` にすでに入っているため、設定変更なしで動きます。

既存の `コード.gs`（GA4/GSCの日次取得）には触れません。関数名の重複がないことと、
`createWeeklyTrigger` が `updateSeoChangeLog` のトリガーだけを削除することを確認済みです。

シートに書き出される列：

```
変更日 / URL / 種類 / 変更内容 / 狙いクエリ
変更前(7日) クリック・表示・CTR・掲載順位
変更後(7日) クリック・表示・CTR・掲載順位
変更後(28日) クリック・表示・CTR・掲載順位
判定(7日) / 判定(28日) / 備考 / commit
```

**指標はこのリポジトリに保存しない。** 変更日を起点に毎回GSCから取り直すので、
写し間違いも古い値の置き去りも起きない。判定のしきい値は
`src/data/seo-changes.ts` の `SEO_VERDICT_RULES`。

履歴の追加：

```bash
npm run seo:log -- --url /news/foo/ --kind on-page --change "titleを改善" --queries "茨城 道の駅"
```

過去の変更を後から記録するときは `--date 2026-08-21 --commit 2533320` を付ける。
日付がずれると比較期間ごとずれるので、**必ず本番反映日**を入れる。
URLは `/news/*` のように前方一致でも指定できる（複数ページに同時に効く変更用）。

---

## エンゲージメント0件の誤診について（2026年8月28日 調査済み）

**症状**：シート「GA4_日次」で 2026-08-27 が 49ユーザー・59セッションに対し
エンゲージメントセッション0件・エンゲージメント率0%。Unassigned 27、(not set) 27。

**結論：計測は壊れていない。データ処理待ちだった。**

同日21時にGA4 Data APIへ直接問い合わせた結果：

| 日付 | セッション | エンゲージ | 率 |
|---|---|---|---|
| 08-24 | 16 | 12 | 75.0% |
| 08-25 | 17 | 10 | 58.8% |
| 08-26 | 28 | 19 | 67.9% |
| **08-27** | **65** | **32** | **49.2%** |

8/27のチャネル内訳も Organic Search 24 / Referral 15 / Organic Social 12 /
Direct 11 / AI Assistant 3 と正しく分類され、**Unassignedは1件も残っていない**。

### 気づくための手がかり

シートの 8/27 は「エンゲージ0件」なのに**平均セッション時間258秒**（全日で最長）だった。
10秒を超えていればエンゲージ成立するはずで、この2つは両立しない。
**数字どうしが矛盾していたら、まず処理待ちを疑う。**

### なぜ起きるか

`コード.gs` の `runDailySeoReport()` は `endDate = getDateString(-1)`（前日）まで取得し、
毎朝7時台に走る。GA4はエンゲージメントとチャネル分類の確定に24〜48時間かかるため、
**最新日の行は毎回そういう未確定値になる**。

28日分を毎回取り直す設計なので、翌日以降の実行で自動的に正しい値へ上書きされる。
つまり**直す必要はない**。ただし読むときの約束として：

- **シートのいちばん下の行（前日）だけは暫定値。判断に使わない**
- 判断は2日前より古い行で行う
- 「0件だから壊れた」と結論する前に、平均セッション時間とセッション数の整合を見る

### 自動ブラウザについて（参考）

GA4のエンゲージメントは `document.hasFocus()` が true の間しか加算されない。
検証用の自動ブラウザは可視でもフォーカスを持たないため、タグが正常でも
エンゲージメントが一切成立しない（実測で確認）。クローラーも同様の挙動になる。
Unassignedや低エンゲージが**確定済みの日でも**続く場合は、この線を疑う。

### 翌日（8月29日）の再確認：同じ現象が繰り返した

処理待ちだという結論を、日をまたいで確かめた。

| 日付 | セッション | エンゲージ | 率 | Unassigned |
|---|---|---|---|---|
| 08-26 | 28 | 19 | 67.9% | 0 |
| **08-27** | **65** | **32** | **49.2%** | **0** |
| **08-28** | **31** | **2** | **6.5%** | **15** |

**8/27は昨日と同じ数字で確定した。** そして**8/28が、昨日の8/27とそっくり同じ症状**を出している
（エンゲージほぼ0、Unassignedあり）。前日ぶんが未確定になるのは毎日起きる。
**最新日の行を見て判断しない**という運用の約束で足りる。コードの修正は不要。

### traffic_kind の (not set) について

8月全体では (not set) 515 / other_referral 74 / search 65 / direct 56 / ai_referral 3。
(not set) が多いのはカスタムディメンションを8月24日に登録したためで、
**GA4は登録前に遡って値を埋めない**。登録後は4区分に正しく分類されており、
ai_referral も拾えている。異常ではない。

### 確認済み（2026-09-15）：generate_lead はキーイベントとして登録されている

GA4 Data API で 8/1〜9/15 を集計すると、`generate_lead` はイベント数4・キーイベント3だった（1件目は登録前）。
9/4以降キーイベントが0なのは、**フォーム送信そのものが無い**ためで、設定の不備ではない。

### （以下は8/29時点の記録）generate_lead がキーイベントとして登録されているか

8月のイベント数は first_visit / scroll 474 / click 48 / file_download 5 /
form_start 2 / **generate_lead 1**。イベント自体は届いている。
一方 keyEvents は 8/22〜8/29 の各日で 0 だった。

ただしこの2つは矛盾しない。**generate_lead の1件が8/21以前に発生していれば、
8/22以降のkeyEventsが0でも当然**である。
「キーイベント未登録」と断定できる材料はまだない。

確かめるには、GA4 Data API で期間を8/1〜8/29にして keyEvents を取る。
1件以上なら登録済み、0なら未登録の疑いが濃い。
