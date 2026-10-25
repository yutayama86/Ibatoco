/**
 * 「茨城のおいしい図鑑」シリーズの台帳。
 *
 * 親ページ（/food-library/）の目次・旬・産地・品種の索引、各図鑑の共通部品、
 * 産地地図（/food-library/map/<slug>.svg）、sitemap、市町村ページからの導線が、すべてここを読む。
 * 図鑑を1本足すときは、ここに1件足してから src/pages/food-library/<slug>.astro を作る。
 *
 * 事実の書き方（docs/design/food-library.md）：
 * - 数値・順位・時期は一次情報の表記どおりに、年と出典を添える。出典の無い順位は書かない
 * - 出荷時期は「茨城をたべよう」（茨城県）の出荷カレンダーの読み取り。作型・品種・年で前後する
 * - 写真は Wikimedia Commons の自由ライセンスの写真だけ。撮影地が茨城県内と確認できたものに限り、
 *   品種や生産者を写真から断定しない（説明に無いことは書かない）
 */

export type FoodSlug = 'renkon' | 'kuri' | 'satsumaimo' | 'melon' | 'hakusai' | 'ichigo' | 'soba' | 'hoshiimo';

export interface FoodPhoto {
  /** Commons のファイル名（表示用） */
  file: string;
  /** 原本の URL（upload.wikimedia.org）。表示は src/lib/wikimedia-image.ts でサムネイルの srcset にする */
  src: string;
  width: number;
  height: number;
  alt: string;
  author: string;
  license: 'CC BY 3.0' | 'CC BY 4.0' | 'CC BY-SA 3.0' | 'CC BY-SA 4.0';
  /** Commons のファイルページ */
  page: string;
  /** 撮影地（Commons のカテゴリ・説明で確認できた範囲） */
  place: string;
  /** 撮影時期（Commons の記録） */
  taken: string;
  /** 原本の幅が 1920px 未満のときは、配信できる最大幅を指定する */
  maxWidth?: number;
}

export interface FoodArea {
  /** /area/<slug>/ の市町村 slug */
  slug: string;
  name: string;
}

export interface FoodGuide {
  slug: FoodSlug;
  path: string;
  /** 図鑑名（例：れんこん図鑑） */
  title: string;
  /** 品目名 */
  name: string;
  /** 目次に出す一行 */
  catch: string;
  /** 茨城の位置づけ（出典の年つき） */
  standing: string;
  /** 出荷・出回りのある月（1〜12）。空なら旬の表を出さない */
  months: number[];
  /** そのうち特に多い月 */
  peakMonths: number[];
  /** 旬の注記（出典と、地域・作型による差） */
  seasonNote: string;
  areas: FoodArea[];
  /** 品種・銘柄（親ページの「品種から探す」に出す。id は図鑑内のアンカー） */
  varieties: { name: string; id: string }[];
  /** アクセント色（細い罫・旬の帯だけに使う） */
  accent: string;
  hero: FoodPhoto | null;
  publishedAt: string;
  updatedAt: string;
}

const LICENSE_URL: Record<FoodPhoto['license'], string> = {
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/deed.ja',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/deed.ja',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/deed.ja',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/deed.ja',
};
export const licenseUrl = (license: FoodPhoto['license']) => LICENSE_URL[license];

const commons = 'https://upload.wikimedia.org/wikipedia/commons';

/** 図鑑で使う写真（すべて Wikimedia Commons。2026-10-25 にライセンス・撮影地・作者を確認） */
export const FOOD_PHOTOS = {
  renkonSummer: {
    file: '蓮田(れんこん) - panoramio.jpg',
    src: `${commons}/e/ee/%E8%93%AE%E7%94%B0%28%E3%82%8C%E3%82%93%E3%81%93%E3%82%93%29_-_panoramio.jpg`,
    width: 2736, height: 1824,
    alt: '夏の蓮田。大きな葉が一面に広がり、ところどころに淡い紅色の花が咲いている',
    author: 'Toshihiro Matsui', license: 'CC BY-SA 3.0',
    page: 'https://commons.wikimedia.org/wiki/File:%E8%93%AE%E7%94%B0(%E3%82%8C%E3%82%93%E3%81%93%E3%82%93)_-_panoramio.jpg',
    place: '茨城県南部（撮影位置は霞ヶ浦の北西）', taken: '2013年7月',
  },
  renkonWinter: {
    file: 'Lotus field in Tsuchiura, Ibaraki 01.jpg',
    src: `${commons}/6/6f/Lotus_field_in_Tsuchiura%2C_Ibaraki_01.jpg`,
    width: 3888, height: 2592,
    alt: '11月の土浦市の蓮田。枯れた茎が水面に立ち、泥の田が冬の収穫期を迎えている',
    author: 'Σ64', license: 'CC BY 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Lotus_field_in_Tsuchiura,_Ibaraki_01.jpg',
    place: '茨城県土浦市', taken: '2017年11月',
  },
  renkonPod: {
    file: 'HanaNoHasu3.jpg',
    src: `${commons}/0/0a/HanaNoHasu3.jpg`,
    width: 4928, height: 3264,
    alt: '花びらが落ちたあとのハスの花托。蜂の巣のような穴に実が並んでいる',
    author: 'Jennie Kondo', license: 'CC BY-SA 3.0',
    page: 'https://commons.wikimedia.org/wiki/File:HanaNoHasu3.jpg',
    place: '茨城県土浦市', taken: '2012年7月',
  },
  satsumaimoField: {
    file: 'Sweet potato field in Namegata, Ibaraki 05.jpg',
    src: `${commons}/8/88/Sweet_potato_field_in_Namegata%2C_Ibaraki_05.jpg`,
    width: 3837, height: 2558,
    alt: '夏の行方市のさつまいも畑。濃い緑の葉が畝を覆い、奥に林が見える',
    author: 'Σ64', license: 'CC BY 3.0',
    page: 'https://commons.wikimedia.org/wiki/File:Sweet_potato_field_in_Namegata,_Ibaraki_05.jpg',
    place: '茨城県行方市', taken: '2017年7月',
  },
  melonHokota: {
    file: 'Asahi Melons, Hokota, Ibaraki.jpg',
    src: `${commons}/f/f5/Asahi_Melons%2C_Hokota%2C_Ibaraki.jpg`,
    width: 4601, height: 1857,
    alt: '鉾田市の直売所の木箱に並ぶアンデスメロン。ひとつずつ白い緩衝材で包まれている',
    author: 'Miyuki Meinaka', license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Asahi_Melons,_Hokota,_Ibaraki.jpg',
    place: '茨城県鉾田市', taken: '2015年5月',
  },
  hakusaiHarvest: {
    file: 'Hakusai production - panoramio.jpg',
    src: `${commons}/f/f0/Hakusai_production_-_panoramio.jpg`,
    width: 1616, height: 1080, maxWidth: 1280,
    alt: 'つくば市の白菜畑の収穫。畝のあいだに出荷用の段ボール箱が積まれている',
    author: 'Toshihiro Matsui', license: 'CC BY-SA 3.0',
    page: 'https://commons.wikimedia.org/wiki/File:Hakusai_production_-_panoramio.jpg',
    place: '茨城県つくば市', taken: '2012年4月',
  },
  ichigoIbarakiss: {
    file: 'Ibarakiss, special strawberry created in Ibaraki prefecture.jpg',
    src: `${commons}/c/c9/Ibarakiss%2C_special_strawberry_created_in_Ibaraki_prefecture.jpg`,
    width: 4608, height: 2776,
    alt: 'パックに盛られた「いばらキッス」。濃い赤色で、やや縦長の実がそろっている',
    author: 'Miyuki Meinaka', license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:Ibarakiss,_special_strawberry_created_in_Ibaraki_prefecture.jpg',
    place: '茨城県小美玉市', taken: '2019年1月',
  },
  sobaFlowers: {
    file: 'Omitama, Ibaraki 小美玉市 - panoramio.jpg',
    src: `${commons}/8/8b/Omitama%2C_Ibaraki_%E5%B0%8F%E7%BE%8E%E7%8E%89%E5%B8%82_-_panoramio.jpg`,
    width: 4288, height: 2848,
    alt: '9月の小美玉市。白いそばの花が畑一面に咲き、奥に家と林が見える',
    author: 'AMANO Jun-ichi', license: 'CC BY 3.0',
    page: 'https://commons.wikimedia.org/wiki/File:Omitama,_Ibaraki_%E5%B0%8F%E7%BE%8E%E7%8E%89%E5%B8%82_-_panoramio.jpg',
    place: '茨城県小美玉市', taken: '2009年9月',
  },
  hoshiimo: {
    file: '茨城名産の干し芋.jpg',
    src: `${commons}/6/63/%E8%8C%A8%E5%9F%8E%E5%90%8D%E7%94%A3%E3%81%AE%E5%B9%B2%E3%81%97%E8%8A%8B.jpg`,
    width: 4526, height: 2547,
    alt: '茨城で撮影された、並べられた干し芋',
    author: 'ジョンドウ', license: 'CC BY-SA 4.0',
    page: 'https://commons.wikimedia.org/wiki/File:%E8%8C%A8%E5%9F%8E%E5%90%8D%E7%94%A3%E3%81%AE%E5%B9%B2%E3%81%97%E8%8A%8B.jpg',
    place: '茨城県', taken: '2024年3月',
  },
} satisfies Record<string, FoodPhoto>;

const area = (slug: string, name: string): FoodArea => ({ slug, name });

export const FOOD_GUIDES: FoodGuide[] = [
  {
    slug: 'renkon', path: '/food-library/renkon/', title: 'れんこん図鑑', name: 'れんこん',
    catch: '霞ヶ浦の水と低湿地が育てる、白くやわらかな節。',
    standing: '霞ヶ浦周辺は日本一のれんこん産地（農林水産省 作物統計 令和5年産）',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], peakMonths: [8, 9, 10, 11, 12, 1, 2],
    seasonNote: '大型ハウスと品種の改良で、ほぼ一年じゅう出荷されます。出荷量が多いのは8月から翌2月（茨城をたべよう）。',
    areas: [area('tsuchiura', '土浦市'), area('kasumigaura', 'かすみがうら市'), area('namegata', '行方市'), area('omitama', '小美玉市'), area('inashiki', '稲敷市'), area('kawachi', '河内町'), area('ami', '阿見町'), area('ishioka', '石岡市'), area('miho', '美浦村'), area('itako', '潮来市')],
    varieties: [{ name: '浮島れんこん', id: 'ukishima' }, { name: '玉里のれんこん', id: 'tamari' }],
    accent: '#4f6d78', hero: FOOD_PHOTOS.renkonSummer,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
  {
    slug: 'kuri', path: '/food-library/kuri/', title: '栗図鑑', name: '栗',
    catch: '早生から晩生へ。九月から十月、品種が入れ替わる秋の実。',
    standing: '栽培面積・出荷量とも全国1位（農林水産省 果樹生産出荷統計 令和7年産）',
    months: [9, 10, 11], peakMonths: [9, 10],
    seasonNote: '品種ごとの出荷は9月上旬から10月下旬。収穫後に低温で貯蔵する飯沼栗は10月下旬から11月中旬に販売されます（茨城をたべよう）。',
    areas: [area('kasama', '笠間市'), area('kasumigaura', 'かすみがうら市'), area('ishioka', '石岡市'), area('ibaraki-machi', '茨城町')],
    varieties: [
      { name: '丹沢', id: 'tanzawa' }, { name: 'ぽろたん', id: 'porotan' }, { name: '人丸', id: 'hitomaru' }, { name: '利平', id: 'rihei' },
      { name: '筑波', id: 'tsukuba' }, { name: '銀寄', id: 'ginyose' }, { name: '石鎚', id: 'ishizuchi' }, { name: '岸根', id: 'ganne' },
    ],
    accent: '#7a4a2e', hero: null,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
  {
    slug: 'satsumaimo', path: '/food-library/satsumaimo/', title: 'さつまいも図鑑', name: 'さつまいも',
    catch: '掘ってすぐより、寝かせて甘い。貯蔵がつくる一年の味。',
    standing: '産出額 全国1位（令和4年）、生産量は鹿児島県に次ぐ全国2位（令和5年産）',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], peakMonths: [],
    seasonNote: '品種のリレーと貯蔵で、一年を通して出荷されています（茨城をたべよう）。掘りたてより、貯蔵して追熟させたほうが甘みが増します。',
    areas: [area('namegata', '行方市'), area('hokota', '鉾田市')],
    varieties: [
      { name: 'べにはるか', id: 'beniharuka' }, { name: 'ベニアズマ', id: 'beniazuma' }, { name: 'シルクスイート', id: 'silksweet' },
      { name: '紅まさり', id: 'benimasari' }, { name: '玉豊', id: 'tamayutaka' }, { name: '泉13号', id: 'izumi' },
    ],
    accent: '#9c3b4f', hero: FOOD_PHOTOS.satsumaimoField,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
  {
    slug: 'melon', path: '/food-library/melon/', title: 'メロン図鑑', name: 'メロン',
    catch: '四月のオトメから十月のアールスまで、品種で巡る長い旬。',
    standing: '生産量 27年連続 全国1位（農林水産省 作物統計 平成10年産〜令和6年産）',
    months: [4, 5, 6, 7, 8, 9, 10], peakMonths: [],
    seasonNote: '品種によって出荷の始まりが違い、4月上旬のオトメから、10月まで出荷されるアールスまで続きます（茨城をたべよう）。',
    areas: [area('hokota', '鉾田市'), area('yachiyo', '八千代町'), area('ibaraki-machi', '茨城町')],
    varieties: [
      { name: 'オトメ', id: 'otome' }, { name: 'イバラキング', id: 'ibaraking' }, { name: 'アンデス', id: 'andes' },
      { name: 'クインシー', id: 'quincy' }, { name: 'タカミ', id: 'takami' }, { name: 'アールス', id: 'earls' },
    ],
    accent: '#5e7d43', hero: FOOD_PHOTOS.melonHokota,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
  {
    slug: 'hakusai', path: '/food-library/hakusai/', title: '白菜図鑑', name: '白菜',
    catch: '霜の季節に甘くなる、県西の冬の主役。',
    standing: '11〜1月に東京都中央卸売市場へ入る白菜の9割近くが茨城県産（茨城をたべよう）',
    months: [10, 11, 12, 1, 2, 3, 4, 5, 6], peakMonths: [],
    seasonNote: '10月中旬から翌6月中旬まで出荷され、冬場の量が特に多くなります（茨城をたべよう）。秋冬白菜と春白菜で、育つ季節と食感が違います。',
    areas: [area('yachiyo', '八千代町'), area('yuki', '結城市'), area('koga', '古河市'), area('bando', '坂東市'), area('tsukuba', 'つくば市'), area('joso', '常総市'), area('sakai', '境町'), area('shimotsuma', '下妻市'), area('chikusei', '筑西市'), area('ushiku', '牛久市')],
    varieties: [{ name: '秋冬白菜', id: 'autumn-winter' }, { name: '春白菜', id: 'spring' }],
    accent: '#7d8f5a', hero: FOOD_PHOTOS.hakusaiHarvest,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
  {
    slug: 'ichigo', path: '/food-library/ichigo/', title: 'いちご図鑑', name: 'いちご',
    catch: '冬から春へ。茨城生まれの「いばらキッス」を中心に。',
    standing: 'いちごの出荷量 全国7位（令和5年）。県オリジナル品種「いばらキッス」',
    months: [12, 1, 2, 3, 4, 5], peakMonths: [],
    seasonNote: '12月上旬から5月まで出荷されます（茨城をたべよう）。摘み取り（いちご狩り）の期間は農園ごとに違います。',
    areas: [area('hokota', '鉾田市'), area('namegata', '行方市'), area('chikusei', '筑西市'), area('omitama', '小美玉市'), area('ishioka', '石岡市'), area('ibaraki-machi', '茨城町'), area('mito', '水戸市'), area('hitachinaka', 'ひたちなか市'), area('inashiki', '稲敷市'), area('itako', '潮来市')],
    varieties: [{ name: 'いばらキッス', id: 'ibarakiss' }],
    accent: '#a8373b', hero: FOOD_PHOTOS.ichigoIbarakiss,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
  {
    slug: 'soba', path: '/food-library/soba/', title: '常陸秋そば図鑑', name: '常陸秋そば',
    catch: '金砂郷の在来種から生まれ、種を守り継ぐ茨城のそば。',
    standing: '1985年から茨城県の奨励品種。発祥は常陸太田市の金砂郷地区',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], peakMonths: [11],
    seasonNote: '玄そば・そば粉はほぼ一年じゅう出荷され、出荷量が多いのは11月（茨城をたべよう）。畑では8月上旬に種をまき、10月中旬に収穫します（常陸太田市）。',
    areas: [area('hitachiota', '常陸太田市'), area('chikusei', '筑西市')],
    varieties: [{ name: '常陸秋そば', id: 'birth' }],
    accent: '#5b5850', hero: FOOD_PHOTOS.sobaFlowers,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
  {
    slug: 'hoshiimo', path: '/hoshiimo/', title: '干し芋図鑑', name: '干し芋',
    catch: '同じ干し芋でも、品種で甘さも色も食感も違う。',
    standing: 'ほしいもの全国シェアは9割を超える（茨城をたべよう）',
    months: [], peakMonths: [],
    seasonNote: '出回りの時期は、商品や生産者によって違います。',
    areas: [area('hitachinaka', 'ひたちなか市'), area('tokai', '東海村'), area('naka', '那珂市')],
    varieties: [
      { name: 'べにはるか', id: 'beniharuka' }, { name: 'シルクスイート', id: 'silksweet' }, { name: '玉豊', id: 'tamayutaka' }, { name: 'いずみ', id: 'izumi' },
      { name: 'ほしこがね', id: 'hoshikogane' }, { name: 'ほしキラリ', id: 'hoshikirari' }, { name: 'ほしあかね', id: 'hoshiakane' }, { name: 'タマオトメ', id: 'tamaotome' },
    ],
    accent: '#b98058', hero: FOOD_PHOTOS.hoshiimo,
    publishedAt: '2026-10-25', updatedAt: '2026-10-25',
  },
];

export const FOOD_BY_SLUG = new Map(FOOD_GUIDES.map((guide) => [guide.slug, guide]));

/** 市町村ページ（/area/<slug>/）から出す図鑑 */
export function foodGuidesForArea(slug: string): FoodGuide[] {
  return FOOD_GUIDES.filter((guide) => guide.areas.some((item) => item.slug === slug));
}

/** 図鑑シリーズのURL（sitemap 用）。干し芋図鑑も含む */
export const FOOD_LIBRARY_PATHS = ['/food-library/', ...FOOD_GUIDES.map((guide) => guide.path)];
