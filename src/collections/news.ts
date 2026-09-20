import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { NEWS_CATEGORY_KEYS } from '../data/news';
import { bookingSchema, businessIntentSchema, commercialPrioritySchema, eventLifecycleSchema, guideCta, municipalitySlugs, sportsContentTypes, sportsTeamSlugs } from './foundations';

/**
 * 茨城ニュース解説（/news/）。
 * AIや外部ワークフローからMarkdownを追加する場合も、公開前に同じ検証を通す。
 */
export const news = defineCollection({
  loader: glob({ pattern: '**/[!_]*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(40).max(180),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('イバトコ編集部'),
    category: z.enum(NEWS_CATEGORY_KEYS),
    tags: z.array(z.string().min(1)).default([]),
    prefecture: z.literal('茨城県').default('茨城県'),
    municipalities: z.array(z.enum(municipalitySlugs)).default([]),
    /** スポーツ記事のときだけ指定する。/sports/ 配下の絞り込みに使う */
    sportsTeam: z.enum(sportsTeamSlugs).optional(),
    /**
     * 1記事を複数チームのページへ出すときに使う（例：水戸 vs 鹿島）。
     * 先頭のチームが sportsMatch の「視点」になる。
     * sportsTeam 単体の既存記事はそのまま動く（後方互換）。
     */
    sportsTeams: z.array(z.enum(sportsTeamSlugs)).min(1).optional(),
    sportsContentType: z.enum(sportsContentTypes).optional(),
    /**
     * 試合そのものを扱う記事だけに付ける。チームページの
     * NEXT MATCH / LATEST RESULT はここから組み立てる。
     * 記事URLの一覧を手で持たないための土台なので、
     * 試合を書いたら必ずここにも入れる。
     * score は終了した試合だけ。未確定の結果・順位は書かない。
     */
    sportsMatch: z.object({
      date: z.coerce.date(),
      opponent: z.string().min(1),
      homeAway: z.enum(['home', 'away', 'neutral']),
      /** 開始時刻 HH:mm。未定なら省く（「未定」と書かない） */
      kickoff: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      competition: z.string().min(1).optional(),
      venue: z.string().min(1).optional(),
      score: z.object({ own: z.number().int().min(0), opponent: z.number().int().min(0) }).optional(),
    }).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(true),
    reviewed: z.boolean().default(false),
    sample: z.boolean().default(false),
    noindex: z.boolean().default(false),
    ogImage: z.string().optional(),
    ogImageAlt: z.string().default(''),
    imageCredit: z.string().optional(),
    imageCreditUrl: z.url().optional(),
    imageLicense: z.string().optional(),
    imageLicenseUrl: z.url().optional(),
    conclusion: z.string().min(1),
    /**
     * keyPoints / whatHappened / whatChanges / editorialAnalysis / regionalImpact / businessImplications は、
     * 標準の解説記事では必須（下の superRefine で検査する）。
     * guide を持つガイド型記事（申請方法・受け取り方など、読者の手順に沿って読む記事）では、
     * 要点カードと自由見出しの節が代わりを務めるため省略できる。
     */
    keyPoints: z.array(z.string().min(1)).default([]),
    whatHappened: z.string().min(1).optional(),
    whatChanges: z.string().min(1).optional(),
    accessGuide: z.object({
      location: z.string().min(1),
      homeUseStarts: z.string().min(1),
      parking: z.array(z.object({ heading: z.string().min(1), detail: z.string().min(1) })).min(1),
      publicTransport: z.array(z.object({ heading: z.string().min(1), detail: z.string().min(1) })).min(1),
      returnTrip: z.string().min(1),
    }).optional(),
    /**
     * 一覧記事の本体。冠水注意箇所や河川の指定状況のように、
     * 何十件かをまとまりごとに並べるためのもの。
     * 段落フィールドへ詰め込むと1つの <p> になって読めないので、
     * accessGuide と同じく「何が起きた？」の中に置いて表として出す。
     */
    referenceList: z.object({
      heading: z.string().min(1),
      intro: z.string().optional(),
      groups: z.array(z.object({
        label: z.string().min(1),
        items: z.array(z.string().min(1)).min(1),
      })).min(1),
      note: z.string().optional(),
    }).optional(),
    editorialAnalysis: z.string().min(1).optional(),
    regionalImpact: z.string().min(1).optional(),
    businessImplications: z.array(z.string().min(1)).default([]),
    /**
     * ガイド型記事の本体。「申し込める？」「どこでもらえる？」のように、
     * 読者の疑問の順に見出しを立てて答える記事で使う。
     * これがある記事は、標準の7節（何が起きた？〜地域事業者への示唆）の代わりに
     * 要点カード・行動ボタン・sections を描画する。FAQ・情報源・関連情報は共通。
     */
    guide: z.object({
      /** 冒頭の要点カード。日付や締切など、検索して来た人が最初に知りたい事実だけ置く */
      summaryCards: z.array(z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        /** 締切など、見落とすと困るものだけ true */
        emphasis: z.boolean().default(false),
      })).min(1),
      /** 冒頭の行動ボタン */
      cta: guideCta.optional(),
      sections: z.array(z.object({
        /** ページ内リンクと目次に使う */
        id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        heading: z.string().min(1),
        /** 見出しの上の英字ラベル（例 HOW TO APPLY）。他の記事の「02 / KEY POINTS」と同じ位置 */
        kicker: z.string().min(1).optional(),
        /** 見出しの直後に太字で置く、問いへの短い答え */
        lead: z.string().min(1).optional(),
        paragraphs: z.array(z.string().min(1)).default([]),
        /** 手順など、順番に意味がある箇条書き */
        steps: z.array(z.object({ title: z.string().min(1), detail: z.string().min(1) })).default([]),
        items: z.array(z.string().min(1)).default([]),
        /** 窓口・施設など、名前ごとに詳細を並べるもの */
        details: z.array(z.object({
          title: z.string().min(1),
          rows: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).min(1),
        })).default([]),
        /** 節の末尾に置く補足（注意書き） */
        notes: z.array(z.string().min(1)).default([]),
        cta: guideCta.optional(),
        /** 節の末尾に差し込む、データから組み立てる一覧 */
        block: z.enum(['passport-stamp-spots']).optional(),
      })).min(1),
      /** 本文の最後（FAQの前）に置く行動ボタン */
      bottomCta: guideCta.optional(),
    }).optional(),
    faq: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).default([]),
    /** 予約・確認先への導線（任意）。読者の目的が宿泊・体験・店舗利用につながる記事だけに置く */
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
    event: z.object({
      name: z.string(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      url: z.url().optional(),
      placeName: z.string().optional(),
      address: z.string().optional(),
    }).optional(),
    place: z.object({
      name: z.string(),
      address: z.string().optional(),
      url: z.url().optional(),
    }).optional(),
  }).superRefine((data, ctx) => {
    if (!data.draft && !data.reviewed) {
      ctx.addIssue({ code: 'custom', path: ['reviewed'], message: 'ニュース公開には編集部の事実確認（reviewed: true）が必要です。' });
    }
    // 標準の解説記事は7節すべてが必要。ガイド型（guide あり）だけが省略できる。
    if (!data.guide) {
      const required = ['whatHappened', 'whatChanges', 'editorialAnalysis', 'regionalImpact'] as const;
      for (const key of required) {
        if (!data[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} は必須です（guide を持つガイド型記事だけ省略できます）。` });
      }
      if (data.keyPoints.length === 0) ctx.addIssue({ code: 'custom', path: ['keyPoints'], message: 'keyPoints は1件以上必要です（guide を持つガイド型記事だけ省略できます）。' });
      if (data.businessImplications.length === 0) ctx.addIssue({ code: 'custom', path: ['businessImplications'], message: 'businessImplications は1件以上必要です（guide を持つガイド型記事だけ省略できます）。' });
    }
    if (data.guide) {
      const ids = data.guide.sections.map((section) => section.id);
      const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicated.length > 0) ctx.addIssue({ code: 'custom', path: ['guide', 'sections'], message: `guide.sections の id が重複しています: ${duplicated.join(', ')}` });
    }
    // スポーツ用のフィールドは、どのチームの記事か決まっていないと置き場所が無い。
    // 付け忘れるとチームページに出ないまま気づけないので、ビルドで止める。
    // sportsTeam（単体）と sportsTeams（複数）のどちらかがあればよい。
    const hasTeam = Boolean(data.sportsTeam) || (data.sportsTeams?.length ?? 0) > 0;
    if (data.sportsContentType && !hasTeam) {
      ctx.addIssue({ code: 'custom', path: ['sportsTeam'], message: 'sportsContentType を指定した記事には sportsTeam または sportsTeams が必要です。' });
    }
    if (data.sportsMatch && !hasTeam) {
      ctx.addIssue({ code: 'custom', path: ['sportsTeam'], message: 'sportsMatch を指定した記事には sportsTeam または sportsTeams が必要です。' });
    }
    // 対戦カード記事で相手を自分自身にしていると、反転表示が壊れる
    if (data.sportsMatch && data.sportsTeams && data.sportsTeams.length > 2) {
      ctx.addIssue({ code: 'custom', path: ['sportsTeams'], message: 'sportsMatch のある記事の sportsTeams は2チームまでです（1試合の当事者は2チームのため）。' });
    }
    if (!data.draft && data.sourceUrls.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['sourceUrls'], message: '公開ニュースには一次情報または信頼できる情報源URLが必要です。' });
    }
    if (data.sample && !data.noindex) {
      ctx.addIssue({ code: 'custom', path: ['noindex'], message: '実装確認用サンプルは noindex: true にしてください。' });
    }
    if (data.ogImage && !data.ogImageAlt.trim()) {
      ctx.addIssue({ code: 'custom', path: ['ogImageAlt'], message: 'OG画像を指定する場合は代替テキストが必要です。' });
    }
  }),
});

