/**
 * サイト内の索引。サイト内検索（/search/）・行き先診断（/shindan/）・TOPの「いま」の帯が
 * 同じデータを見るように、ここで一度だけ組み立てる。
 *
 * - 記事（ニュース・イベント）は getAllFacets() と同じ基準で、noindex を除く
 * - 終了したイベントも載せる（検索で過去の回を探す人がいる）。ended で区別し、並びでは後ろに回す
 * - 興味（interests）は見出し・タグ・分類の語から機械的に振る。推測で足さない
 */
import { getEvents, getNews } from './content';
import { getAllFacets } from './taxonomy';
import { MUNICIPALITIES, MUNI_BY_SLUG, REGIONS, type RegionKey } from '../data/areas';
import { THEMES } from '../data/themes';
import { dateOnlyFromCoercedDate } from './date-only.js';

export const INTERESTS = {
  flower: '花・紅葉を見る',
  festival: '祭り・花火・イベント',
  sea: '海と魚を楽しむ',
  nature: '山・滝・自然',
  onsen: '温泉・宿でゆっくり',
  town: '街歩き・歴史',
  sports: 'スポーツ観戦',
} as const;
export type Interest = keyof typeof INTERESTS;

const RULES: [Interest, RegExp][] = [
  ['flower', /紅葉|コキア|ネモフィラ|梅|桜|菊|ひまわり|あじさい|萩|花(?!火)|バラ|つつじ/],
  ['festival', /花火|まつり|祭|フェス|カーニバル|ライトアップ|イルミネーション|イベント|マルシェ/],
  ['sea', /海|あんこう|魚|漁港|大洗|那珂湊|ビーチ|海鮮|しらす/],
  ['nature', /山|滝|渓谷|吊橋|吊り橋|ハイキング|湖|霞ヶ浦|牛久沼|自然|キャンプ/],
  ['onsen', /温泉|宿|旅館|ホテル|泊まる/],
  ['town', /城|神社|寺|歴史|街歩き|まち歩き|偕楽園|弘道館|門前|宿場|美術館|博物館/],
  ['sports', /アントラーズ|ホーリーホック|ロボッツ|試合|観戦|スタジアム|アリーナ/],
];

const THEME_INTERESTS: Record<string, Interest[]> = {
  hana: ['flower'],
  kouyou: ['flower', 'nature'],
  koen: ['flower', 'nature'],
  matsuri: ['festival'],
  umi: ['sea'],
  kawa: ['nature'],
  yama: ['nature'],
};

/**
 * 市町村の読み。かなで入力されたまま検索されても見つかるようにする（表示には使わない）。
 */
const READINGS: Record<string, string> = {
  daigo: 'だいごまち', hitachiomiya: 'ひたちおおみやし', hitachiota: 'ひたちおおたし', kitaibaraki: 'きたいばらきし',
  takahagi: 'たかはぎし', hitachi: 'ひたちし', naka: 'なかし', tokai: 'とうかいむら', hitachinaka: 'ひたちなかし',
  shirosato: 'しろさとまち', mito: 'みとし', kasama: 'かさまし', 'ibaraki-machi': 'いばらきまち', oarai: 'おおあらいまち',
  omitama: 'おみたまし', ishioka: 'いしおかし', kasumigaura: 'かすみがうらし', tsuchiura: 'つちうらし', tsukuba: 'つくばし',
  ami: 'あみまち', miho: 'みほむら', inashiki: 'いなしきし', ushiku: 'うしくし', tsukubamirai: 'つくばみらいし',
  ryugasaki: 'りゅうがさきし', moriya: 'もりやし', toride: 'とりでし', kawachi: 'かわちまち', tone: 'とねまち',
  hokota: 'ほこたし', namegata: 'なめがたし', itako: 'いたこし', kashima: 'かしまし', kamisu: 'かみすし',
  sakuragawa: 'さくらがわし', chikusei: 'ちくせいし', yuki: 'ゆうきし', shimotsuma: 'しもつまし', yachiyo: 'やちよまち',
  joso: 'じょうそうし', bando: 'ばんどうし', koga: 'こがし', goka: 'ごかまち', sakai: 'さかいまち',
};
const yomiOf = (slugs: string[]) => slugs.flatMap((slug) => [READINGS[slug], slug.replace(/-/g, ' ')]).filter(Boolean);

/**
 * 日付を持たないガイド（紅葉・ネモフィラなど）の見頃の月。
 * 行き先診断で「これから1か月」に4月のネモフィラを出さないためだけに使う（画面に日付として出さない）。
 * 一般的な季節の目安で、各記事の本文では公式の発表を確認して書いている。
 */
const SEASON_RULES: [RegExp, number[]][] = [
  [/ネモフィラ/, [4, 5]],
  [/コキア/, [9, 10]],
  [/紅葉|もみじ/, [10, 11, 12]],
  [/梅/, [2, 3]],
  [/桜/, [3, 4]],
  [/菊/, [10, 11]],
  [/イルミネーション/, [11, 12, 1, 2]],
  [/あんこう/, [11, 12, 1, 2, 3]],
  [/氷瀑/, [1, 2]],
  [/海水浴/, [7, 8]],
  [/秋/, [9, 10, 11]],
];
const monthsOf = (text: string): number[] => [...new Set(SEASON_RULES.filter(([re]) => re.test(text)).flatMap(([, months]) => months))];

export function interestsOf(text: string): Interest[] {
  return RULES.filter(([, re]) => re.test(text)).map(([key]) => key);
}

export interface IndexEntry {
  /** 見出し（記事は「｜」より前の主題部分） */
  title: string;
  /** 補足（記事の description の冒頭など） */
  desc: string;
  url: string;
  kind: 'news' | 'event' | 'area' | 'theme';
  /** 市町村名（表示用・検索用） */
  places: string[];
  regions: RegionKey[];
  tags: string[];
  interests: Interest[];
  /** 検索用の読み（かな・ローマ字）。表示しない */
  yomi: string[];
  /** 日付を持たないガイドの見頃の月（1〜12）。行き先診断の絞り込みだけに使う */
  months?: number[];
  /** 月ごとのまとめ記事（「2026年10月のイベント」）の年月。YYYY-MM。月が過ぎたら勧めない */
  ym?: string;
  /** イベントの開催期間（日本時間の暦日） */
  start?: string;
  end?: string;
  ended?: boolean;
}

const KIND_ORDER: Record<IndexEntry['kind'], number> = { event: 0, news: 1, theme: 2, area: 3 };

export async function getSiteIndex(): Promise<IndexEntry[]> {
  const [facets, events, news] = await Promise.all([getAllFacets(), getEvents(), getNews()]);
  const eventInfo = new Map(events.map((entry) => [`/events/${entry.id.split('/').pop()}/`, entry.data.eventInfo]));
  const descByPath = new Map<string, string>([
    ...events.map((entry) => [`/events/${entry.id.split('/').pop()}/`, entry.data.description] as [string, string]),
    ...news.map((entry) => [`/news/${entry.id.split('/').pop()}/`, entry.data.description] as [string, string]),
  ]);
  const entries: IndexEntry[] = [];

  for (const facet of facets) {
    if (facet.noindex) continue;
    const places = facet.municipalities.map((slug) => MUNI_BY_SLUG.get(slug)?.name).filter((name): name is string => Boolean(name));
    const info = eventInfo.get(facet.path);
    const text = [facet.title, facet.tags.join(' '), facet.category].join(' ');
    entries.push({
      title: facet.title.split('｜')[0],
      desc: (descByPath.get(facet.path) ?? '').slice(0, 90),
      url: facet.path,
      kind: facet.collection === 'events' ? 'event' : 'news',
      places,
      regions: facet.regions,
      tags: facet.tags,
      interests: interestsOf(text),
      yomi: yomiOf(facet.municipalities),
      ...(!info && monthsOf(text).length > 0 ? { months: monthsOf(text) } : {}),
      ...(() => {
        const match = /(20\d\d)年(\d{1,2})月/.exec(facet.title);
        return match ? { ym: `${match[1]}-${match[2].padStart(2, '0')}`, months: [Number(match[2])] } : {};
      })(),
      ...(info ? {
        start: dateOnlyFromCoercedDate(info.startDate).toISOString().slice(0, 10),
        end: dateOnlyFromCoercedDate(info.endDate ?? info.startDate).toISOString().slice(0, 10),
      } : {}),
      ended: facet.eventLifecycle === 'ended',
    });
  }

  for (const theme of Object.values(THEMES)) {
    entries.push({
      title: theme.title,
      desc: theme.lead.slice(0, 80),
      url: `/${theme.slug}/`,
      kind: 'theme',
      places: [],
      regions: [],
      tags: theme.spots.map((spot) => spot.name),
      interests: THEME_INTERESTS[theme.slug] ?? [],
      yomi: [],
    });
  }

  for (const muni of MUNICIPALITIES) {
    entries.push({
      title: `${muni.name}の歩き方`,
      desc: REGIONS[muni.region].note,
      url: `/area/${muni.slug}/`,
      kind: 'area',
      places: [muni.name],
      regions: [muni.region],
      tags: [REGIONS[muni.region].label],
      interests: [],
      yomi: yomiOf([muni.slug]),
    });
  }

  return entries.sort((a, b) => Number(Boolean(a.ended)) - Number(Boolean(b.ended)) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}
