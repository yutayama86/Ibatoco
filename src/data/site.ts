import { CATEGORIES, type CategoryKey } from '../content.config';

export const SITE_CONFIG = {
  name: 'イバトコ',
  nameEn: 'IBATOCO',
  domain: 'https://ibatoco.jp',
  tagline: '現地から、信頼を編む。',
  description:
    '編集部とローカルエディターが現地を歩き、人と営みを取材する茨城の地域価値編集ブランド「イバトコ」。',
  // Cloudflare Web Analytics のトークンをデプロイ後にここへ（空なら読み込みません）
  cfAnalyticsToken: '',
  // Google Analytics 4 の測定ID（G-XXXXXXXXXX）。ここに書くだけで有効化できます（本番のみ）。
  // ※環境変数 PUBLIC_GA_ID を設定した場合はそちらが優先されます。
  gaMeasurementId: 'G-2DNYX7CSK6',
  // Google Search Console のHTMLタグ確認コード（<meta google-site-verification> の content）。
  // ※環境変数 PUBLIC_GSC_VERIFICATION を設定した場合はそちらが優先されます。
  gscVerification: '',
  // Formspree のフォームID付きエンドポイント。送信先は info@ibatoco.jp。
  // 空にするとメール下書き(mailto)にフォールバックします（docs/FORMS_SETUP.md）。
  formEndpoint: 'https://formspree.io/f/mykrvjkg',
  // 公式アカウントのURLが確定するまで、汎用SNSトップURLは掲載しない（信頼設計）。
  // 実在する公式URLのみをここに入れると、フッター・構造化データ(sameAs)に反映される。
  // 例: instagram: 'https://www.instagram.com/ibatoco_official/'
  social: {
    instagram: 'https://www.instagram.com/ibatoco/',
    tiktok: '',
    x: 'https://x.com/ibatoco',
    threads: 'https://www.threads.com/@ibatoco',
  },
  contactEmail: 'info@ibatoco.jp',
} as const;

export { CATEGORIES };
export type { CategoryKey };

export const CATEGORY_LIST = (Object.keys(CATEGORIES) as CategoryKey[]).map((key) => ({
  key,
  ...CATEGORIES[key],
}));

// 地名×ジャンルまとめページ用メタ（見出し・導入・引き当てる市町村コンテンツ）
export const CATEGORY_PAGE_META: Record<
  CategoryKey,
  { heading: string; lead: (n: string) => string; muniField: 'gourmet' | 'spotsExp' | null }
> = {
  eat: { heading: '食べる', lead: (n) => `${n}で食べる。店とつくり手の背景を、現地で確かめた情報から紹介します。`, muniField: 'gourmet' },
  life: { heading: '暮らし', lead: (n) => `${n}の暮らし・住まい。地元の日常に根ざした情報を。`, muniField: null },
  'sauna-play': { heading: '出かける', lead: (n) => `${n}へ出かける。休日に訪ねたい場所と体験を紹介します。`, muniField: 'spotsExp' },
  beauty: { heading: '整える', lead: (n) => `${n}で心と身体を整える場所を紹介します。`, muniField: null },
  stay: { heading: '宿・温泉', lead: (n) => `${n}の宿・温泉。泊まって楽しむ${n}。`, muniField: null },
  company: { heading: '働く・つくる', lead: (n) => `${n}で働く人、受け継がれる仕事と技術を紹介します。`, muniField: null },
};

// グローバルナビ（階層1 中心）
export const NAV = [
  { label: '食べる', href: '/eat/' },
  { label: '暮らす', href: '/life/' },
  { label: '出かける', href: '/sauna-play/' },
  { label: '整える', href: '/beauty/' },
  { label: '泊まる', href: '/stay/' },
  { label: '働く・つくる', href: '/company/' },
  { label: 'エリア', href: '/area/' },
] as const;

// 事業者向け（階層4 制圧導線）
export const BIZ_NAV = [
  { label: '地域事業者の方へ', href: '/biz/' },
  { label: '情報を送る', href: '/submit/' },
  { label: 'お問い合わせ', href: '/contact/' },
] as const;
