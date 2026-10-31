# コード整理の棚卸し（2026-10-31）

依頼書「イバトコ全体のコード整理・共通化・不要コード削除」（2026-10-31）に対する棚卸しと判断の記録。調査の基準は main `d017b18`。
これからの「何を変えるならどこを直すか」は [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) の「表示・処理の管理箇所」が正本で、この文書は判断の理由と残した課題の記録。

## 実装した PR

| PR | 内容 | base | マージの順 |
|---|---|---|---|
| #474 | 置き換え済みの旧部品（Header・Footer・SEO）と、使われていない関数・変数・CSS を削除 | main | どの順でもよい |
| #475 | 日付の書式と「日本時間の今日」を `date-only.js` に、パンくず・FAQ の構造化データを `seo.ts` に集約 | main | #476 より先 |
| #476 | ニュース・イベント詳細の幅・見出し・結論・広告表記・CTA の管理箇所を1つに（AdDisclosure・GuideCta・幅のトークン） | #475 | #475 の後（base を main に付け替える） |
| #477 | どの要素にも当たらない CSS を削除（市町村の旧見出し・TOP の旧イラストなど） | main | どの順でもよい |
| #478 | 管理箇所の地図と、この棚卸し | main | 最後 |

4つを同時に取り込んだ状態でもビルドが通り、生成 HTML が main と同じになることを確認した（`git merge` で衝突なし）。

## 確認の方法（各 PR で共通）

- **HTML**：main とこの変更を、同じ時刻（2026-10-31 12:00 JST に固定）でビルドし、`dist/` の全 667 HTML を正規化して比べた。正規化は、スコープ用の `data-astro-cid-*`・`astro-*` クラス、資産名のハッシュ、JSON-LD のキー順と `@graph` の展開だけ
- **画面**：main を `/`、変更後を `/__new/` で同じオリジンから配信し、2つの iframe の全要素の computed style（約350項目）・`::before`/`::after`・配置（x・y・幅・高さ）を突き合わせた。わざと 3px ずらすと検出することを確かめてから使った
- **計測**：iframe の `gtag` を差し替え、実データを送らずにクリックしたときのイベント名・パラメータ・回数を main と比べた
- 手元の Node は 22.17 で Astro 7 の要件（22.23.4 以上）に足りないため、手元のビルドと検査は同じ端末の Node 24.22.1 で実行した。正は CI（Node 22.23.4）

## 棚卸しと判断

### レイアウト・部品・ページテンプレート

| 対象 | 判断 | 理由・PR |
|---|---|---|
| `Header.astro`・`Footer.astro`・`SEO.astro` | 削除 | 参照なし。`SiteHeader`・`SiteFooter`・`BrandBase` に置き換え済み（#474） |
| ニュース詳細 `news/[slug].astro` | 整理 | 冒頭・各節・最後の CTA の組み立てを `news/GuideCta.astro` に、広告表記を `AdDisclosure.astro` に。h1・結論の枠の指定をページ1か所に（#476） |
| イベント詳細 `events/[slug].astro` | 整理 | 広告表記を `AdDisclosure`、幅をトークンに。日付の書式は `date-only.js`（#475・#476） |
| ニュースとイベントの目次・FAQ・情報源 | 現状維持 | 見た目と操作が違う（ニュースは枠つきの目次と Q./A. の開閉、イベントは一覧）。依頼書のとおり一律にしない。幅だけ共有した |
| 通常記事 `[category]/[slug].astro` | 現状維持 | 73行で既に部品（ReportingMeta・CorrectionHistory）を使っている。公開中の記事が無い |
| `BrandBase.astro` | 現状維持 | 共通の head・ヘッダー・フッター・計測を既に一元化している。別の共通基盤は作らない |
| 市町村 `AreaGuide`・`HitachiAreaGuide`・`DaigoAreaGuide` | 一部整理 | 旧見出しの当たらない CSS を削除（#477）。日立と大子は同じ CSS 規則を 62 個重ねて持つが、マークアップの違い（画像の有無・ラッパー・FAQ）が大きく、1部品にすると分岐が多くなるため固有実装のまま（課題1） |
| 図鑑 `FoodGuideLayout`・`FoodStyles` | 現状維持（小さな整理） | 8ページが共通レイアウトを使う既存の形が適切。構造化データ・日付の書式だけ共通関数へ（#475）、当たらない CSS を1つ削除（#477） |
| TOP（`index.astro`・`Home*`） | 小さな整理 | 当たらない CSS（旧イラスト・透かし）を削除（#477）、日付の関数を共通化（#475）。必須構成（FV3枚・テーマ6件・地図44件・取材と編集3件・事業者導線）の HTML は不変 |
| パンくず | 一部整理 | 構造化データはすべて `breadcrumbJsonLd()` に（#475）。画面のパンくずは、部品（40ページ）と各ページの手書き（about 4ページ・ニュース・テーマ・花火など約11ページ）が並存。手書きの側は現在地を出さない・区切りの扱いが違うなど見た目が異なるため、揃えると表示が変わる（課題2） |
| 多言語（`Intl*`・`intl-guides.ts`） | 小さな整理 | 構造化データだけ共通関数へ（#475） |
| スポーツ（`sports/`・`Sports*` 部品・`lib/sports.ts`） | 小さな整理 | 4部品とチーム・一覧ページの日付の書式を共通化（#475）。試合データの解決は既に `lib/sports.ts` の1か所 |
| 事業者向け・フォーム・固定ページ（biz・sponsor・contact・submit・reserve・about） | 小さな整理 | 協賛ページの FAQ の構造化データと日付だけ共通化（#475）。フォームの送信先・計測・文面は触っていない。about の4ページは手書きのパンくずと同じ `.policy-foot` の CSS を重ねて持つ（課題2で扱う） |
| 検索・診断・Discovery | 小さな整理 | `search-client.ts` の「今日」と「M月D日(曜)」を `date-only.js` へ（#475） |
| 管理画面（`/control/`） | 小さな整理 | 未使用の変数を1つ削除（#474）。認証・秘密情報の扱いは触っていない |
| プレビュー（`src/pages/preview/`） | 現状維持 | URL で開く確認用ページ。外部からの参照を否定できない。当たらない CSS だけ削除（#477） |
| `EditorialProcess`（about）と `HomeEditorialProcess`（TOP） | 現状維持 | 内容（5項目と3項目）と置き場所が違う |

### CSS・デザイントークン

| 対象 | 判断 | 理由・PR |
|---|---|---|
| 記事の幅（本文 700・目次 210・ニュースの外枠 960） | トークン化 | `--content-reading`・`--toc-width`・`--content-article`。ニュースの見出しは共通の読みカラム `--reading-col` を自分の要素で置き換え、#473 の上書きを外した（#476） |
| ニュースの h1・結論の枠の `!important` | 削除（6つ） | ページ・articles.css・responsive.css の3か所が張り合い、効いていない指定もあった。効いている値だけをページに残した（#476） |
| どの要素にも当たらない CSS | 削除 | スコープ付き 76 セレクタ（＋空になった・もとから空だった @media 2）、共通 CSS 21 セレクタ（#474 の2つを含む）。CSS 合計 −9.6KB（#474・#477） |
| interior/*.css の残りの `!important`（約45） | 現状維持 | 見出しの全幅バンドなど、ページ側の幅指定（`.bp-wrap`）に勝つために入っているものが多い。一括で外すと表示が変わる（課題3） |
| breakpoint（25種類） | 現状維持 | 4つに寄せるとそのあいだの幅で表示が変わる（UI_TOKENS.md の方針どおり、部品を触るときに寄せる） |

### データ取得・変換・共通処理

| 対象 | 判断 | 理由・PR |
|---|---|---|
| 日付の書式（約25か所の `Intl.DateTimeFormat`） | 共通化 | `date-only.js` の5関数へ。6か所はタイムゾーン未指定で、米国時間でビルドすると日付が1日前に出ていた（本番は UTC のため影響なし）。`date-integrity` が `src` での直書きを検出する（#475） |
| 「日本時間の今日」 | 共通化 | `todayDateOnlyString()`。scripts 3本（editorial-os・seo-change・sports-status）も同じ関数へ（#475）。TOP の `HomeNow` だけは、外部 JS を増やさないためインラインの計算を残した（理由はコード内） |
| `growth-engine.mjs` の `todayJst(now)` | 現状維持 | 既に `date-only.js` の上の薄い関数で、テスト用に日時を差し込む引数を23か所が使う |
| パンくず・FAQ の構造化データ | 共通化 | 15ファイル・9ファイルの手組みを `seo.ts` へ（#475） |
| `publisher` の Organization | 現状維持 | ページによって `url` の有無が違い、揃えると構造化データが変わる（課題4） |
| `<time datetime>` の `toISOString()`（36か所） | 現状維持 | `2026-11-22T00:00:00.000Z` を日付だけにすると HTML が変わる（課題5） |
| 公開可能な記事と index 対象の記事（`getNews` と `getIndexableNews` など） | 現状維持 | 公開条件と検索面の条件は別物（依頼書の注意どおり） |
| `content.ts` の未使用の絞り込み関数4つ | 削除 | 呼び出し元なし（#474） |
| `taxonomy.ts` の `queryFacets`・`countBy`、`businesses.ts` の `freshnessOf`・`businessesNeedingReview` など | 現状維持 | 未使用だが、Discovery OS・PLATFORM.md に書かれた台帳の照会口 |

### スクリプト・型・設定・依存関係

| 対象 | 判断 | 理由・PR |
|---|---|---|
| 依存関係 | 削除なし | すべて直接または間接（`@astrojs/check` は `astro check`、`@types/node` は型検査）に使われている |
| `scripts/`（60本＋`lib/` 4本） | 削除なし | すべて package.json・workflow・ほかの scripts から呼ばれている |
| JSON の読み書き・引数処理のヘルパー | 現状維持 | どれも1行で、共通モジュールにする利益が小さい |
| `data-audit.mjs` の広告リンク検査 | 移設 | CTA の組み立てが `GuideCta.astro` に移ったので、検査も移し、3か所が GuideCta を通ることも見る（#476） |
| `astro check` の未使用変数の警告 | 7件解消 | `revenue-engine.mjs` の1件は、消すと JSON が壊れているときに止まらなくなるため残した（#474） |
| `public/` の素材 | 対象外 | 公開 URL で、外部（SNS のキャッシュ・被リンク）からの参照を否定できない |

## 削除したもの（一覧）

| パス／名前 | 元の役割 | 未使用と判断した根拠 | 代替先 | PR |
|---|---|---|---|---|
| `src/components/Header.astro` | 旧ヘッダー | import・動的 import・ファイル名の組み立て・専用クラス・`data-header` の参照なし | `SiteHeader.astro` | #474 |
| `src/components/Footer.astro` | 旧フッター | 同上 | `SiteFooter.astro` | #474 |
| `src/components/SEO.astro` | 旧 head | 同上 | `BrandBase.astro` | #474 |
| `global.css` の `.wrap-wide`・`.btn--lg` | 旧ヘッダー・フッターの外枠とボタン | 上の削除で使う要素が無くなった | 不要 | #474 |
| `content.ts` の `getFeatured`・`getStoresByArea`・`getArticlesByArea`・`getPlacesByArea` | 絞り込み | 呼び出し元なし | `getAreaSummary` と各ページの filter | #474 |
| `auto-monetization.ts` の `hasAutoLodgingCoverage` | 宿泊案内の対象判定 | 呼び出し元なし | 不要 | #474 |
| `businesses.ts` の `isValidBusinessId` | ID の形の検査 | 呼び出し元なし | `scripts/data-audit.mjs`（同じ正規表現） | #474 |
| `i18n.ts` の `INTL_LOCALES` | 海外向け言語の並び | 参照なし（UI は `LOCALES` に従う） | `LOCALES` | #474 |
| `analytics.ts` の `classifyTraffic` ほか型・定数 | 流入区分の判定（TS 版） | 参照・テストなし | `BrandBase.astro` のインラインスクリプト | #474 |
| 未使用の変数・引数（AreaGuide・control・measurement-monitor・monetization-audit・growth-engine） | — | `astro check` の ts(6133) | 不要 | #474 |
| `search-client.ts` の `todayJst` | 日本時間の今日 | `todayDateOnlyString()` と同じ計算 | `date-only.js` | #475 |
| ページ・部品の日付の書式（約25か所） | 表示用の日付 | 共通関数と同じ書式 | `date-only.js` | #475 |
| パンくず・FAQ の JSON-LD の手組み（15＋9ファイル） | 構造化データ | 共通関数と同じ出力 | `seo.ts` | #475 |
| `articles.css` の `route-news` の見出し幅の上書き | #473 の修正 | 見出しの幅と列を同じ変数から決めるようにした | `--content-article`・`--reading-col` | #476 |
| `articles.css`・`responsive.css` のニュースの h1・結論の枠の指定 | 共通 CSS からの上書き | 効いている値をページへ移した（効いていなかったものは削除） | `news/[slug].astro` | #476 |
| ニュース・イベントの `.ad-disclosure` の CSS、ニュースの CTA の組み立て（3か所） | 広告表記・CTA | 部品に移した | `AdDisclosure.astro`・`news/GuideCta.astro` | #476 |
| 当たらない CSS（スコープ付き 76、共通 19） | 市町村の旧見出し・TOP の旧イラスト・旧一覧の部品など | 部品のテンプレート、またはサイトのどこにも無いクラスを指す | 不要 | #477 |

## 残した課題（理由）

1. **日立・大子のガイドの重複 CSS**（62規則）：共通化するなら、ルート・季節・基本情報などの節を小さな部品にして、マークアップごと寄せる必要がある。固有のコピー（「一字一句の改変不可」の注記あり）を保ったまま、節単位で部品化するのが次の手。全体を `is:global` に移すと中の `CityEditorialHero` にも当たるため不可
2. **画面のパンくずの手書き**（約11ページ）：部品に寄せると「現在地を出す」「区切りに aria-hidden」などで表示と読み上げが変わる。見た目の判断（オーナー）を先にとる
3. **interior/*.css の `!important`**：見出しの全幅バンドの仕組み（`.bp-wrap` との兼ね合い）を作り直さない限り外せない。バンドを部品にするときに合わせて整理する
4. **`publisher` の表記ゆれ**：揃えるなら `seo.ts` に `organizationJsonLd()` を置き、構造化データの変更として SEO 履歴に記録する
5. **`<time datetime>` の値**：日付だけ（`2026-11-22`）にするのが正しいが、HTML が変わるため別 PR。`toDateOnlyString()` を使えばよい
6. **手元の Node**：22.17 のままでは Astro 7 をビルドできない。手元で検査する担当は Node 22.23.4 以上（CI と同じ）を入れる
