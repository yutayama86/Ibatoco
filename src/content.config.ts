import { defineCollection, reference } from 'astro:content';
import { SPORTS_TEAMS, SPORTS_CONTENT_TYPES } from './data/sports';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { csvStoresLoader } from './loaders/csv-stores';
import { MUNICIPALITIES } from './data/areas';
import { NEWS_CATEGORY_KEYS } from './data/news';

/**
 * カテゴリ（階層1：集客メディア）
 * 企画書サイトマップに対応
 */
export const CATEGORIES = {
  eat: { label: '食べる', reading: 'たべる', path: 'eat', accent: '#315c68' },
  life: { label: '暮らす', reading: 'くらす', path: 'life', accent: '#315c68' },
  'sauna-play': { label: '出かける', reading: 'でかける', path: 'sauna-play', accent: '#315c68' },
  beauty: { label: '整える', reading: 'ととのえる', path: 'beauty', accent: '#315c68' },
  stay: { label: '泊まる', reading: 'とまる', path: 'stay', accent: '#315c68' },
  company: { label: '働く・つくる', reading: 'はたらく・つくる', path: 'company', accent: '#315c68' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
const categoryKeys = Object.keys(CATEGORIES) as [CategoryKey, ...CategoryKey[]];
const municipalitySlugs = MUNICIPALITIES.map((municipality) => municipality.slug) as [string, ...string[]];
// スポーツ記事の分類。CMSから追加・絞り込みできるよう、値は data/sports.ts に一本化する。
const sportsTeamSlugs = SPORTS_TEAMS.map((team) => team.slug) as [string, ...string[]];
const sportsContentTypes = Object.keys(SPORTS_CONTENT_TYPES) as [string, ...string[]];

/**
 * 体験レポート記事（/eat /life /sauna-play /beauty /company）
 */
const articles = defineCollection({
  // `_`始まりのファイル（テンプレート等）は公開対象から除外
  loader: glob({ pattern: '**/[!_]*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
      title: z.string(),
      description: z.string(),
      category: z.enum(categoryKeys),
      // アイキャッチ（当面はUnsplash等の外部URL or 後日Cloudflare Imagesへ）
      cover: z.string().optional(),
      coverAlt: z.string().default(''),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.string().default('イバトコ編集部'),
      // 現地アンバサダー / レポーター（第5章 共創モデル）
      reporter: z.string().optional(),
      tags: z.array(z.string()).default([]),
      area: z.string().optional(), // 市町村（例: 水戸市）
      // 紐づく店舗LP（Phase1導線）
      place: reference('places').optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),

      // === 2026 Renewal：開示・取材メタデータモデル（Editorial Contract）===
      // 「誰が・いつ・どこで・どう確かめ・どの関係性で発信したか」を明示する。
      disclosure: z.enum(['editorial', 'partner', 'pr']).default('editorial'),
      disclosureNote: z.string().optional(), // 情報提供・費用負担・招待の有無などの補足
      reportingDate: z.coerce.date().optional(), // 取材日
      onSiteReporting: z.boolean().default(false), // 現地取材の有無
      photographer: z.string().optional(), // 撮影担当
      editor: z.string().optional(), // 編集担当
      // 出典（公式情報・一次資料）
      sources: z
        .array(z.object({ label: z.string(), url: z.url().optional(), accessedAt: z.coerce.date().optional() }))
        .default([]),
      // 訂正・更新履歴
      corrections: z.array(z.object({ date: z.coerce.date(), note: z.string() })).default([]),
      reviewed: z.boolean().default(false), // 編集部の事実確認済みか。trueでなければ公開しない
    }).superRefine((data, ctx) => {
      if (data.disclosure !== 'editorial' && !data.disclosureNote?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['disclosureNote'], message: 'Partner / PR は、関係性や対価の内容を具体的に記載してください。' });
      }
      if (!data.draft && !data.reviewed) {
        ctx.addIssue({ code: 'custom', path: ['reviewed'], message: '公開には編集部の事実確認（reviewed: true）が必要です。' });
      }
    }),
});

/**
 * 店舗・企業専用LP（階層2：/place/[id]）
 * ペライチ。予約・問い合わせ導線の受け皿。
 */
const places = defineCollection({
  loader: glob({ pattern: '**/[!_]*.{md,mdx}', base: './src/content/places' }),
  schema: z.object({
    name: z.string(),
    kana: z.string().optional(),
    category: z.enum(categoryKeys),
    tagline: z.string(), // 一言キャッチ
    description: z.string(),
    cover: z.string().optional(),
    gallery: z.array(z.string()).default([]), // 写真強化（公式店舗プラン向け）
    // 取材班の推薦コメント（企画書サイトマップ記載）
    recommend: z.string().optional(),
    area: z.string(),
    address: z.string().optional(),
    access: z.string().optional(),
    hours: z.string().optional(),
    holiday: z.string().optional(),
    tel: z.string().optional(),
    budget: z.string().optional(),
    // 特徴タグ（駐車場あり・個室・カード可 等）＝検索・絞り込み・AI検索用の構造化情報
    features: z.array(z.string()).default([]),
    website: z.url().optional(),
    instagram: z.string().optional(),
    map: z.url().optional(), // Googleマップ埋め込み or リンク
    // メニュー・料金表
    menu: z
      .array(z.object({ name: z.string(), price: z.string(), note: z.string().optional() }))
      .default([]),
    // FAQ（SEO＋AI検索での引用に効く。FAQPage構造化データに使用）
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    // 予約・問い合わせ導線（階層3 /reserve へ）。未設定なら問い合わせフォームへ。
    reserveUrl: z.string().optional(),
    // 内部区分（既存データとの互換性を維持）：free=基本情報 / official=確認済み情報 / growth=発信支援 / partner=パートナー
    plan: z.enum(['free', 'official', 'growth', 'partner']).default('free'),
    publishedAt: z.coerce.date(),
    draft: z.boolean().default(false),
    reviewed: z.boolean().default(false),
    // 空コレクション時のAstro警告を防ぐ非公開プレースホルダー用。
    // 実コンテンツでは指定しない。
    sample: z.boolean().default(false),
    noindex: z.boolean().default(false),
    verifiedAt: z.coerce.date().optional(),
    disclosure: z.enum(['editorial', 'partner', 'pr']).default('editorial'),
    disclosureNote: z.string().optional(),
    sources: z.array(z.object({ label: z.string(), url: z.url().optional(), accessedAt: z.coerce.date().optional() })).default([]),
  }).superRefine((data, ctx) => {
    if (data.disclosure !== 'editorial' && !data.disclosureNote?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['disclosureNote'], message: 'Partner / PR は、関係性や対価の内容を具体的に記載してください。' });
    }
    if (!data.draft && !data.reviewed) {
      ctx.addIssue({ code: 'custom', path: ['reviewed'], message: '公開には公式情報との照合（reviewed: true）が必要です。' });
    }
    if (data.sample && !data.noindex) {
      ctx.addIssue({ code: 'custom', path: ['noindex'], message: '実装確認用サンプルは noindex: true にしてください。' });
    }
  }),
});

/**
 * 無料一括掲載の店舗（CSV → ビルド時生成）＝供給エンジン。
 * places(md)より項目は少なく、本文なし。両者は lib/content.ts の getStores() で統合。
 */
const stores = defineCollection({
  loader: csvStoresLoader('./src/data/stores.csv'),
  schema: z.object({
    name: z.string(),
    kana: z.string().optional(),
    category: z.enum(categoryKeys),
    tagline: z.string(),
    description: z.string(),
    cover: z.string().optional(),
    area: z.string(),
    address: z.string().optional(),
    access: z.string().optional(),
    hours: z.string().optional(),
    holiday: z.string().optional(),
    tel: z.string().optional(),
    budget: z.string().optional(),
    features: z.array(z.string()).default([]),
    website: z.url().optional(),
    instagram: z.string().optional(),
    map: z.url().optional(),
    plan: z.enum(['free', 'official', 'growth', 'partner']).default('free'),
    publishedAt: z.coerce.date().default(new Date('2026-07-01')),
    // 公開前の非表示フラグ（本番ビルドで除外）
    draft: z.boolean().default(false),
    reviewed: z.boolean().default(false),
    verifiedAt: z.coerce.date().optional(),
    disclosure: z.enum(['editorial', 'partner', 'pr']).default('editorial'),
    disclosureNote: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.disclosure !== 'editorial' && !data.disclosureNote?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['disclosureNote'], message: 'Partner / PR は関係性を明記してください。' });
    }
    if (!data.draft && !data.reviewed) {
      ctx.addIssue({ code: 'custom', path: ['reviewed'], message: '公開には確認済み（reviewed: true）が必要です。' });
    }
  }),
});

/**
 * 読者が次に予約・確認する先への導線（記事末）。src/components/BookingGuide.astro が描画する。
 *
 * - **公式の一次情報を先に置く。** 予約サイトは比較できるよう2件以上並べる
 * - 並び順の理由を basis に書く（報酬の高さで並べ替えない）
 * - provider は src/data/affiliates.ts のID。提携が成立している提供元だけ広告リンクになる
 */
const bookingSchema = z.object({
  heading: z.string().min(1),
  intro: z.string().min(1).optional(),
  /** 掲載順・選び方の基準。読者に見せる */
  basis: z.string().min(1),
  items: z.array(z.object({
    label: z.string().min(1),
    provider: z.string().min(1),
    url: z.url(),
    note: z.string().min(1).optional(),
    kind: z.enum(['official', 'ota', 'ticket', 'transport']).default('official'),
  })).min(2),
  note: z.string().min(1).optional(),
});

/**
 * ガイド型ニュースの行動ボタン。
 * href は公式の申請ページ（https://…）、サイト内ページ（/…）、ページ内の位置（#…）のどれか。
 * 外部URLは新しいタブで開く。
 */
/**
 * 記事の「商業属性」。記事を資産として集計するために持つ。
 *
 * すべて任意。既存記事に後から一括で入れることはしない（書いていない記事は
 * 「未設定」であって「該当しない」ではない、という区別を保つため）。
 * 未設定でもビルドは通り、画面の出しわけにも影響しない。
 *
 * 使い道：src/lib/taxonomy.ts から「水戸 × 宿泊意図」のような絞り込みを行う。
 */
const businessIntentSchema = z.object({
  /** 予約できる先（宿・チケット・駐車場など）への導線が意味を持つ記事か */
  booking: z.boolean().default(false),
  /** 泊まる判断に関わる */
  accommodation: z.boolean().default(false),
  /** 駐車場・車で行く判断に関わる */
  parking: z.boolean().default(false),
  /** 食べる先の判断に関わる */
  food: z.boolean().default(false),
  /** 体験・アクティビティの申し込みに関わる */
  experience: z.boolean().default(false),
  /** 読者ではなく事業者に関係する（/biz/ の見込み） */
  businessLead: z.boolean().default(false),
});

/** 収益導線を足す優先度。GSCの実データを見て人が決める。推測で埋めない */
const commercialPrioritySchema = z.enum(['low', 'medium', 'high']);

/**
 * イベントの状態。**保存せず計算する**のが既定。
 * 保存すると必ず古くなる（開催日を過ぎても upcoming のまま残る）ため、
 * src/lib/lifecycle.ts が eventInfo の日付から毎ビルド判定する。
 * この enum は、計算では表せない例外を人が上書きするときだけ使う。
 */
const eventLifecycleSchema = z.enum(['upcoming', 'today', 'ended', 'evergreen']);

const guideCta = z.object({
  label: z.string().min(1),
  href: z.union([z.url(), z.string().regex(/^[/#]/)]),
  /** ボタンの下に置く短い補足 */
  note: z.string().min(1).optional(),
});

/**
 * 茨城ニュース解説（/news/）。
 * AIや外部ワークフローからMarkdownを追加する場合も、公開前に同じ検証を通す。
 */
const news = defineCollection({
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
const events = defineCollection({
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

export const collections = { articles, places, stores, news, events };
