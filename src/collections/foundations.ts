import { SPORTS_TEAMS, SPORTS_CONTENT_TYPES } from '../data/sports';
import { MUNICIPALITIES } from '../data/areas';
import { z } from 'astro/zod';

/** 公開URLと既存frontmatterの互換性を守る共通列挙値。 */
export const CATEGORIES = {
  eat: { label: '食べる', reading: 'たべる', path: 'eat', accent: '#315c68' },
  life: { label: '暮らす', reading: 'くらす', path: 'life', accent: '#315c68' },
  'sauna-play': { label: '出かける', reading: 'でかける', path: 'sauna-play', accent: '#315c68' },
  beauty: { label: '整える', reading: 'ととのえる', path: 'beauty', accent: '#315c68' },
  stay: { label: '泊まる', reading: 'とまる', path: 'stay', accent: '#315c68' },
  company: { label: '働く・つくる', reading: 'はたらく・つくる', path: 'company', accent: '#315c68' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
export const categoryKeys = Object.keys(CATEGORIES) as [CategoryKey, ...CategoryKey[]];
export const municipalitySlugs = MUNICIPALITIES.map((municipality) => municipality.slug) as [string, ...string[]];
export const sportsTeamSlugs = SPORTS_TEAMS.map((team) => team.slug) as [string, ...string[]];
export const sportsContentTypes = Object.keys(SPORTS_CONTENT_TYPES) as [string, ...string[]];

/**
 * 読者が次に予約・確認する先への導線（記事末）。src/components/BookingGuide.astro が描画する。
 *
 * - **公式の一次情報を先に置く。** 予約サイトは比較できるよう2件以上並べる
 * - 並び順の理由を basis に書く（報酬の高さで並べ替えない）
 * - provider は src/data/affiliates.ts のID。提携が成立している提供元だけ広告リンクになる
 */
export const bookingSchema = z.object({
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
export const businessIntentSchema = z.object({
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
export const commercialPrioritySchema = z.enum(['low', 'medium', 'high']);

/**
 * イベントの状態。**保存せず計算する**のが既定。
 * 保存すると必ず古くなる（開催日を過ぎても upcoming のまま残る）ため、
 * src/lib/lifecycle.ts が eventInfo の日付から毎ビルド判定する。
 * この enum は、計算では表せない例外を人が上書きするときだけ使う。
 */
export const eventLifecycleSchema = z.enum(['upcoming', 'today', 'ended', 'evergreen']);

export const guideCta = z.object({
  label: z.string().min(1),
  href: z.union([z.url(), z.string().regex(/^[/#]/)]),
  /** ボタンの下に置く短い補足 */
  note: z.string().min(1).optional(),
});

