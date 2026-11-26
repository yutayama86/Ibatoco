/**
 * 多言語（i18n）の一元管理。
 * 言語を追加するときは LOCALES と LOCALE_META に足すだけで、
 * html lang / hreflang / og:locale / 言語切替UI / sitemap がすべて追従する。
 *
 * 方針：
 *  - 日本語はプレフィックスなし（既存URLを1本も変えない）。
 *  - hreflang は「実在するページ」だけを相互参照する（存在しない翻訳URLを出さない）。
 *  - ブラウザ言語やIPによる自動リダイレクトはしない（ユーザーが選ぶ）。
 */
export const LOCALES = ['ja', 'en', 'zh-tw', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ja';

export interface LocaleMeta {
  /** 言語切替UIに出す表記（その言語自身の表記） */
  label: string;
  /** <html lang> に入れる値 */
  htmlLang: string;
  /** hreflang 属性に入れる値 */
  hreflang: string;
  /** og:locale に入れる値 */
  ogLocale: string;
  /** URLの接頭辞（日本語は空） */
  prefix: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  ja: { label: '日本語', htmlLang: 'ja', hreflang: 'ja', ogLocale: 'ja_JP', prefix: '' },
  en: { label: 'English', htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US', prefix: '/en' },
  'zh-tw': { label: '繁體中文', htmlLang: 'zh-Hant', hreflang: 'zh-Hant', ogLocale: 'zh_TW', prefix: '/zh-tw' },
  ko: { label: '한국어', htmlLang: 'ko', hreflang: 'ko', ogLocale: 'ko_KR', prefix: '/ko' },
};

/**
 * translationKey ごとの、実在する各言語ページのパス。
 * ここに書いたURLだけが hreflang / 言語切替の対象になる。
 * ＝ 存在しないページへのリンクは構造上つくれない。
 *
 * slugは言語間で共通の英語表記に揃える（保守性・被リンクの一貫性を優先）。
 */
export const TRANSLATIONS: Record<string, Partial<Record<Locale, string>>> = {
  home: {
    ja: '/',
    en: '/en/',
    'zh-tw': '/zh-tw/',
    ko: '/ko/',
  },
  'hitachi-seaside-park-from-tokyo': {
    en: '/en/hitachi-seaside-park-from-tokyo/',
    'zh-tw': '/zh-tw/hitachi-seaside-park-from-tokyo/',
    ko: '/ko/hitachi-seaside-park-from-tokyo/',
  },
  // 日本語版は年ごとの記事（/events/）、海外版は年を入れない常設URL。
  // 翌年は ja の行だけ差し替える。
  'hitachi-seaside-park-nemophila': {
    ja: '/events/hitachi-seaside-nemophila-2027/',
    en: '/en/hitachi-seaside-park-nemophila/',
    'zh-tw': '/zh-tw/hitachi-seaside-park-nemophila/',
    ko: '/ko/hitachi-seaside-park-nemophila/',
  },
  // 日本語版は冬の常設ガイド（氷瀑・冬の営業時間）。海外版も冬の情報を主題に含む通年ページ。
  'fukuroda-falls': {
    ja: '/events/fukuroda-falls-winter-guide/',
    en: '/en/fukuroda-falls/',
    'zh-tw': '/zh-tw/fukuroda-falls/',
    ko: '/ko/fukuroda-falls/',
  },
  // 日本語版は年ごとの記事（/events/mito-ume-matsuri-YYYY/）、海外版は年を入れない常設URL。
  // ja は未登録：/events/mito-ume-matsuri-2027/ が 2026-12-08 まで観測窓のため本文（translationKey）を変えていない。
  // 観測窓が明けたら ja: '/events/mito-ume-matsuri-2027/' をここに足し、記事の frontmatter に
  // translationKey: "kairakuen-plum-blossoms" を入れる（片方だけだと hreflang が相互にならない）。
  'kairakuen-plum-blossoms': {
    en: '/en/kairakuen-plum-blossoms/',
    'zh-tw': '/zh-tw/kairakuen-plum-blossoms/',
    ko: '/ko/kairakuen-plum-blossoms/',
  },
  // ja は未登録：/events/oarai-isosaki-jinja-guide/ が 2026-12 中旬まで観測窓（本文28日）のため本文（translationKey）を変えていない。
  // 観測窓が明けたら ja: '/events/oarai-isosaki-jinja-guide/' をここに足し、記事の frontmatter に
  // translationKey: "oarai-isosaki-shrine" を入れる。
  'oarai-isosaki-shrine': {
    en: '/en/oarai-isosaki-shrine/',
    'zh-tw': '/zh-tw/oarai-isosaki-shrine/',
    ko: '/ko/oarai-isosaki-shrine/',
  },
  // ja は未登録：/events/ushiku-daibutsu-guide/ が 2026-11-15 の title 変更で観測窓（14日）のため本文を変えていない。
  // 観測窓が明けたら ja: '/events/ushiku-daibutsu-guide/' をここに足し、記事の frontmatter に
  // translationKey: "ushiku-daibutsu" を入れる。
  'ushiku-daibutsu': {
    en: '/en/ushiku-daibutsu/',
    'zh-tw': '/zh-tw/ushiku-daibutsu/',
    ko: '/ko/ushiku-daibutsu/',
  },
};

export interface Alternate {
  locale: Locale;
  hreflang: string;
  path: string;
  label: string;
}

/** translationKey に対応する、実在する言語版だけを返す。 */
export function alternatesFor(key?: string): Alternate[] {
  if (!key) return [];
  const map = TRANSLATIONS[key];
  if (!map) return [];
  return LOCALES.flatMap((locale) => {
    const path = map[locale];
    if (!path) return [];
    return [{ locale, hreflang: LOCALE_META[locale].hreflang, path, label: LOCALE_META[locale].label }];
  });
}

/**
 * x-default に使うパス。
 * 日本語版があれば日本語（このサイトの既定言語）、無ければ英語を使う。
 */
export function xDefaultFor(key?: string): string | undefined {
  const list = alternatesFor(key);
  if (list.length < 2) return undefined;
  return list.find((a) => a.locale === 'ja')?.path ?? list.find((a) => a.locale === 'en')?.path;
}

/** 翻訳が無い言語へ切り替えるときのフォールバック先（その言語のトップ）。 */
export function localeHome(locale: Locale): string {
  return TRANSLATIONS.home[locale] ?? '/';
}
