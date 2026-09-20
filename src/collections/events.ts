import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { bookingSchema, businessIntentSchema, commercialPrioritySchema, eventLifecycleSchema, municipalitySlugs } from './foundations';

/**
 * イベント・おでかけの実用記事（/events/）。
 *
 * /news/ は「解説」の器で、conclusion や editorialAnalysis が必須。
 * 「日程・駐車場・アクセス」を調べに来た人にはその形が合わないため、器を分ける。
 *
 * 事実の扱い:
 *  - 詳細フィールドはすべて任意。**確認できていない項目は書かない**。
 *    画面側で「公式発表を確認できていません」と出す。空欄を推測で埋めない。
 *  - 開催日・料金・駐車場は変わる。sourceUrls に公式を必ず置き、
 *    読者が自分で最新を確認できる状態にする。
 */
export const events = defineCollection({
  loader: glob({ pattern: '**/[!_]*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(40).max(180),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('イバトコ編集部'),

    /** 記事の型。あとからカテゴリ別の伸びを見るために持つ */
    articleType: z.enum(['event', 'roundup', 'guide', 'gourmet', 'opening', 'closing', 'tourism']),
    /** 想定している検索意図。1行で書く */
    searchIntent: z.string().min(1),
    /** 主要キーワード。GSCのクエリと突き合わせる軸 */
    keyword: z.string().min(1),
    /** 毎年使えるか、その年限りか */
    lifespan: z.enum(['evergreen', 'seasonal']).default('seasonal'),

    prefecture: z.literal('茨城県').default('茨城県'),
    municipalities: z.array(z.enum(municipalitySlugs)).default([]),
    tags: z.array(z.string().min(1)).default([]),

    draft: z.boolean().default(true),
    reviewed: z.boolean().default(false),
    noindex: z.boolean().default(false),
    ogImage: z.string().optional(),
    ogImageAlt: z.string().default(''),

    /** 冒頭の結論。検索意図へ最初に答える */
    summary: z.string().min(1),
    /** 押さえる要点 */
    keyPoints: z.array(z.string().min(1)).default([]),

    /**
     * イベントの実務情報。articleType が 'event' のときに使う。
     * 確認できた項目だけ書く。無い項目は行ごと省く（「未定」と書かない）。
     */
    eventInfo: z.object({
      name: z.string().min(1),
      startDate: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      /** 開催時間。画面表示用の自由文。例「18:05〜19:50（開場は青ゲート14:00）」 */
      time: z.string().optional(),
      /**
       * 構造化データ（schema.org Event）用の開始・終了時刻。HH:mm。
       *
       * time は自由文なので機械可読ではない。JSON-LD の startDate / endDate に
       * 時刻まで載せたいときだけ、ここへ分けて書く。
       * **公式で確認できた時刻だけを入れる。** 分からないものは書かない。
       * 書かなければ JSON-LD は日付だけ（例 2026-11-07）になり、
       * 誤った時刻を主張することはない。
       */
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      venue: z.string().optional(),
      address: z.string().optional(),
      /** 料金。無料なら「無料」と書く */
      fee: z.string().optional(),
      parking: z.string().optional(),
      publicTransport: z.string().optional(),
      access: z.string().optional(),
      /** 雨天・荒天時の扱い */
      weatherPolicy: z.string().optional(),
      /**
       * 開催状況。構造化データ（schema.org Event の eventStatus）に出す。
       * 公式が中止・延期を発表したときだけ変える。推測で変えない。
       */
      status: z.enum(['scheduled', 'cancelled', 'postponed']).default('scheduled'),
      /** 主催者・公式サイト */
      officialName: z.string().optional(),
      officialUrl: z.url().optional(),
    }).optional(),

    /** 見どころ。事実として書けることだけ */
    highlights: z.array(z.object({ title: z.string().min(1), detail: z.string().min(1) })).default([]),
    /** 行く前の注意事項 */
    notes: z.array(z.string().min(1)).default([]),
    /** まとめ記事の候補。羅列にしないため、誰向けかまで書かせる */
    picks: z.array(z.object({
      name: z.string().min(1),
      area: z.string().min(1),
      forWhom: z.string().min(1),
      detail: z.string().min(1),
      /** 外部の公式サイト（絶対URL）か、サイト内のページ（/ 始まり）。
          サイト内リンクを絶対URLで書くと外部リンク扱いになるため、/ で書く */
      url: z.union([z.url(), z.string().startsWith('/')]).optional(),
    })).default([]),
    faq: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).default([]),
    /** 予約・確認先への導線（任意） */
    booking: bookingSchema.optional(),
    /** 商業属性（任意）。未設定＝未判定。src/lib/taxonomy.ts で集計に使う */
    businessIntent: businessIntentSchema.optional(),
    commercialPriority: commercialPrioritySchema.optional(),
    /** 時期に左右されず読まれ続ける記事か。未設定＝未判定 */
    evergreen: z.boolean().optional(),
    /** 計算結果を人が上書きしたいときだけ。通常は書かない（古くなるため） */
    eventLifecycle: eventLifecycleSchema.optional(),
    /**
     * 翌年版など、この記事の役割を引き継いだページ。
     * 過去記事は消さずURLも変えない。終了表示とあわせて次の版へ案内するために使う。
     */
    supersededBy: z.string().startsWith('/').optional(),
    /**
     * この記事が扱っている店舗・施設のID（src/data/businesses.ts）。
     * 本文へ自動で差し込むためのものではなく、
     * 「どの事業者に触れた記事か」を機械的に集めるために持つ。
     * 存在しないIDは scripts/data-audit.mjs が検出する。
     */
    relatedBusinesses: z.array(z.string().min(1)).optional(),

    sourceUrls: z.array(z.object({
      label: z.string().min(1),
      url: z.url(),
      accessedAt: z.coerce.date().optional(),
    })).default([]),
    relatedArticleUrls: z.array(z.string().startsWith('/')).default([]),
  }).superRefine((data, ctx) => {
    if (!data.draft && !data.reviewed) {
      ctx.addIssue({ code: 'custom', path: ['reviewed'], message: '公開には編集部の事実確認（reviewed: true）が必要です。' });
    }
    if (!data.draft && data.sourceUrls.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['sourceUrls'], message: '公開記事には公式の情報源URLが必要です。' });
    }
    if (data.articleType === 'event' && !data.eventInfo) {
      ctx.addIssue({ code: 'custom', path: ['eventInfo'], message: 'articleType が event の記事には eventInfo が必要です。' });
    }
    if (data.ogImage && !data.ogImageAlt) {
      ctx.addIssue({ code: 'custom', path: ['ogImageAlt'], message: 'ogImage を指定したら ogImageAlt が必要です。' });
    }
  }),
});

