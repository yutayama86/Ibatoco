# C. 技術設計：区分表示・PR 記事・非公開の取引管理

- 作成：2026-11-01／Claude Code
- 状態：**設計のみ（未実装）**。実装はオーナー承認後に Draft PR で行う
- 対象：Astro 7.4.2、Content Collections（`src/collections/`）、既存部品の `DisclosureBadge.astro`・`ReportingMeta.astro`・`AdDisclosure.astro`・`SponsorSlots.astro`

## 0. 方針

1. **既存の仕組みを広げる。新しい概念は最小にする。**
   - 記事・スポット・店舗には、すでに `disclosure`（editorial／partner／pr）と `disclosureNote` があり、Partner と PR は `disclosureNote` が必須
   - ニュースとイベントにだけ無いので、同じ型を足す
2. **公開データと非公開の取引情報を分ける。**
   - リポジトリは公開（オーナー判断で維持）
   - 金額・契約・連絡先・許諾メールはリポジトリに置かない
3. **派生できる値は保存しない。** 例えば「PR かどうか」は `disclosure` から決まるので、`isSponsored` を別に持たない。二重管理は食い違いの元になる。
4. **観測窓を守る。**
   - ニュース・イベントのテンプレートに表示を足すと、観測中のページ（あんこう祭は 11/21 まで）の見た目も変わる
   - 最小実装のマージは、紅葉・あんこう祭のピークが過ぎた 11/22 以降を推奨する
   - PR の受注がそれより早ければ、PR 記事のページだけに出す形で先行する

## 1. 依頼書の属性と、データ上の置き場所

| 依頼書の属性 | 置き場所 | 公開／非公開 | 理由 |
|---|---|---|---|
| contentType | コレクション（news／events／articles）＋ `disclosure` | 公開 | 既存の分け方で表せる |
| editorialIndependence | `disclosure` から派生（editorial なら独立） | 公開（表示） | 保存しない |
| isSponsored | `disclosure === 'pr'` から派生 | 公開（表示） | 保存しない |
| compensationType | `benefits`（招待・提供・費用負担の種類）は公開。金額・契約形態は非公開の台帳 | 一部公開 | 開示すべき事実と、取引条件を分ける |
| sponsorName | `sponsor`（PR のときだけ必須） | 公開 | PR の表示に必要 |
| disclosureLabel | `DisclosureBadge` が `disclosure` から決める（文言は部品が持つ） | 公開 | 自由記述にすると表記がぶれる |
| sourceOrganization | `providedBy`（資料・画像の提供元）＋既存の `sourceUrls` | 公開 | 提供資料に基づく編集記事の明示 |
| imageRightsStatus | 公開側は既存の `imageCredit`・`imageLicense`・`imageCaption`。許諾の範囲・期限・証跡は非公開の台帳 | 一部公開 | 許諾メールは個人情報を含む |
| reviewStatus | 既存の `draft`・`reviewed` | 公開 | 既存 |
| publishedAt | 既存の `pubDate` | 公開 | 既存 |
| expiresAt | `prPeriod.end`（PR のときだけ） | 公開 | 掲載終了の表示と自動判定に使う |
| lastVerifiedAt | 既存の `sourceUrls[].accessedAt` と `updatedDate` | 公開 | 既存 |
| （追加）dealId | `dealId`（PR・Partner だけ。中身の無い ID） | 公開 | 非公開の台帳と記事をつなぐ鍵。金額は含まない |

## 2. スキーマ（追加分）

`src/collections/foundations.ts` に共通の部品を置き、news・events の両方で使う。書き方は既存の `core.ts` に合わせる。

```ts
/** 記事の区分と開示（/about/pr-policy/ の約束を、ニュース・イベントにも適用する） */
export const disclosureFields = {
  disclosure: z.enum(['editorial', 'partner', 'pr']).default('editorial'),
  /** 関係・対価・便益の具体的な内容。Partner・PR・便益ありのときは必須 */
  disclosureNote: z.string().min(1).optional(),
  /** 資料や画像を直接受け取った提供元（例：主催者）。公開情報だけで書いた記事には付けない */
  providedBy: z.string().min(1).optional(),
  /** 個別開示が要る便益（方針ページの「個別に開示するもの」） */
  benefits: z.array(z.enum(['invitation', 'goods', 'expenses'])).default([]),
  /** PR の広告主。PR のときだけ必須 */
  sponsor: z.string().min(1).optional(),
  /** PR の掲載期間。終了日を過ぎたら「掲載期間終了」と表示する（日本の暦日） */
  prPeriod: z.object({ start: z.coerce.date(), end: z.coerce.date() }).optional(),
  /** 非公開の案件台帳との対応。金額などは含めない（例：PR-2026-001） */
  dealId: z.string().regex(/^(PR|PT)-\d{4}-\d{3}$/).optional(),
};

/** superRefine の中で呼ぶ。core.ts の既存チェックと同じ文言の流儀にそろえる */
export function checkDisclosure(data, ctx) {
  if (data.disclosure !== 'editorial' && !data.disclosureNote?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['disclosureNote'], message: 'Partner / PR は、関係性や対価の内容を具体的に記載してください。' });
  }
  if (data.benefits.length > 0 && !data.disclosureNote?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['disclosureNote'], message: '招待・提供・費用負担があるときは、その内容を disclosureNote に書いてください。' });
  }
  if (data.disclosure === 'pr' && !data.sponsor) {
    ctx.addIssue({ code: 'custom', path: ['sponsor'], message: 'PR には広告主（sponsor）が必要です。' });
  }
  if (data.disclosure === 'pr' && !data.dealId) {
    ctx.addIssue({ code: 'custom', path: ['dealId'], message: 'PR は案件台帳の dealId と対応させてください。' });
  }
  if (data.prPeriod && data.prPeriod.start > data.prPeriod.end) {
    ctx.addIssue({ code: 'custom', path: ['prPeriod'], message: '掲載期間の開始が終了より後です。' });
  }
}
```

- すべて省略可能か既定値付きなので、既存の記事（ニュース・イベント）は書き換えなしでビルドが通る
- 日付の比較・表示は `src/lib/date-only.js` を使う（日本の暦日。`new Date('YYYY-MM-DD')` は使わない）
- 横田医院の記事には `providedBy: "京都オカルト商会（主催者）"` を足すだけで、表示に「主催者提供の資料を基に作成」が出る。対価の確認（B §2）が済むまで、`benefits` と `disclosure` は変えない

## 3. 非公開の取引管理

公開リポジトリには置かない。追加費用ゼロを優先し、オーナーが既に使っている Google スプレッドシート（GA4・GSC の集計と同じ Google アカウント）に「掲載案件台帳」を作る。共有範囲はオーナーだけ。

| 列 | 例 | 備考 |
|---|---|---|
| dealId | PR-2026-001 | 記事の `dealId` と同じ。編集記事の案件は `ED-…`（記事側には書かない） |
| 受付日・経路 | 2026-11-05・/submit/ | |
| 依頼者（組織名） | — | 個人の氏名・連絡先は別の列に分け、閲覧者を絞る |
| 依頼の種類 | 情報提供／PR／協賛枠 | |
| 一次情報の確認 | 確認済み・URL | |
| 区分の判定 | editorial／partner／pr | B §1-1 の2軸 |
| 対価の種類・金額（税別・税込） | — | **公開しない** |
| 便益 | 招待2名 | 記事の `benefits`・`disclosureNote` と一致させる |
| 画像の許諾 | 権利者・範囲・期限・証跡の保存場所 | |
| 契約・掲載期間 | 合意日・開始・終了・修正回数 | |
| 記事 URL・PR 番号・公開 SHA | | 公開後に記入 |
| 報告日・請求日・入金日 | | 確定売上は入金後に `data/editorial/revenue-ledger.json` へ（既存ルール。案件別の金額を公開したくない場合は月合計で記録） |
| 終了処理 | 掲載終了日・対応 | |

- 公開の `docs/records/business-inquiries.csv` には、件数と状態だけを書く（社名・氏名・連絡先・金額のメモは書かない）
- 台帳の保管期間と削除のルールは専門家確認事項（B L-6）

## 4. 表示部品

| 部品 | 変更 | 出す場所 |
|---|---|---|
| `DisclosureBadge.astro`（既存） | 変更なし。`note` に `disclosureNote` を渡す | ニュース・イベントの見出しの直下（h1 の近く） |
| `ReportingMeta.astro`（既存、記事用） | 「現地取材」の行に `providedBy` の文言を足す（「京都オカルト商会（主催者）提供の資料と公開情報をもとに編集」） | ニュース・イベントの見出し周り（今は未使用なので、使うかどうかは見た目の判断が要る） |
| `PrNotice.astro`（新規） | PR 記事の冒頭と末尾に「この記事は ○○ の依頼で制作した広告（PR）です。掲載の対価を受けています。」を出す。`prPeriod.end` を過ぎたら「掲載期間（〜○月○日）は終了しました」に切り替える | `/pr/[slug]` の冒頭と末尾。見出し横は `DisclosureBadge type="pr"` |
| `AdDisclosure.astro`（既存） | 変更なし（アフィリエイトの「#アフィリエイト広告」）。PR とは別の表示として残す | 既存どおり |
| `GuideCta.astro`・`SponsorSlots.astro`（既存） | 変更なし。PR 記事の中の外部リンクは、`GuideCta` と同じく `rel` を部品で決め、`nofollow sponsored noopener` にする | 既存どおり |

- **区分表示の文言は色だけに頼らない**（既存の方針どおり）。`role="note"`・`aria-label` は既存部品が持っている
- **構造化データ**
  - 編集記事は現行どおり NewsArticle
  - PR は `Article` にし、`sponsor`（schema.org の CreativeWork のプロパティ、Organization）に広告主を入れる
  - news-sitemap には PR を出さない
- **推薦から外す**：PR は「人気」「次の行き先（growth-next）」「関連記事」など編集の推薦枠に入れない。PR 同士の一覧と、「PR」と明示した枠からだけリンクする（方針ページ「掲載順位を料金で購入できない」）

## 5. テスト設計

既存の `npm run verify` の経路に乗せる（新しい外部ツールは入れない）。

| 種類 | 置き場所 | 内容 |
|---|---|---|
| スキーマ | `node --test scripts/disclosure.test.mjs`（新規。`verify` の test 一覧に追加） | `checkDisclosure` の単体テスト：PR で sponsor・dealId・note が無いと失敗、便益ありで note が無いと失敗、prPeriod の逆転で失敗、editorial の既定値で成功 |
| 生成物 | `scripts/data-audit.mjs` に追加 | ① すべてのニュース・イベントのページに区分ラベルがある ② PR ページは見出し横・冒頭・末尾の3か所に PR 表示がある ③ PR ページの外部リンクはすべて `rel` に sponsored を含む ④ PR は news-sitemap と /news/ の一覧に無い ⑤ PR の JSON-LD が NewsArticle でない ⑥ `benefits` がある記事は本文に開示文がある |
| 日付 | `npm run date:check` | `prPeriod` の終了判定が米国時間のビルドでも日本の暦日で切り替わる |
| 記事単位 | `scripts/verify-article.mjs` | 出力に「区分」「提供元」「PR 期間」の行を足し、公開前に目で確かめられるようにする |
| 画面 | 既存の ui-smoke・本番画面検査 | PR のサンプルページを `sample: true`・`noindex: true` で作り、6幅で表示を確かめる（ローカル専用の検査対象。本番には出さない） |

## 6. 最小実装と将来拡張

| 段階 | 範囲 | 工数（推測） | 承認 | 時期の推奨 |
|---|---|---|---|---|
| **最小（M1）** | news・events に `disclosureFields` と `checkDisclosure` を追加、見出し直下に `DisclosureBadge` を表示、横田医院に `providedBy`、data-audit ①⑥、スキーマの単体テスト | 半日 | オーナー（テンプレート変更・全ニュースとイベントの見た目が変わる） | 11/22 以降（観測窓の後） |
| M2（最初の PR 受注時） | `/pr/[slug]` ルート（`articles` コレクションの `disclosure: pr` を使う）、`PrNotice`、JSON-LD の `sponsor`、data-audit ②〜⑤、推薦からの除外 | 1日 | オーナー（URL の新設） | 受注が決まってから |
| M3 | 案件台帳の運用開始（スプレッドシート）、`verify-article` の出力追加 | 2時間 | オーナー（台帳の作成） | M1 と同時でよい |
| 将来 | 事業者情報の有料拡張・協賛枠の自己申込（検証仕様 20261011 のゲートどおり）、PR の掲載期間終了の自動切り替えの日次確認 | 未定 | オーナー（決済・個人情報） | 需要の実測が出てから |

M1 は、新しい有料サービス・認証・課金を含まない。

**M2 の注意**：`articles` コレクションは `/[category]/[slug]/` でも公開されている。PR を `/pr/[slug]/` に出すときは、既存ルートの `getStaticPaths` から `disclosure: 'pr'` を除き、同じ記事が2つの URL で出ないようにする（canonical の重複を作らない）。今は PR の記事は0本なので、既存 URL への影響はない。
