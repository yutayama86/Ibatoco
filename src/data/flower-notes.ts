/**
 * 花だより（TOPの花の区画と /hana/now/）のデータ。
 * 開花・開催の状況は日で変わるので、公式の発表を確かめた日と出典を必ず持つ。
 *
 * - showUntil（YYYY-MM-DD、日本の暦日）を過ぎたものはビルド時に外れる。毎朝の定期デプロイで切り替わる
 * - top: true のものだけTOPに出す（TOPは3枚組のデザイン）
 * - /hana/now/ は残りが2件未満になると noindex にし、sitemap からも外す（中身の薄いページを検索に出さない）
 * - 差し替えるときは、公式の開花情報・開催案内を開いて確かめた日を checkedOn に書く
 */
import { todayDateOnlyString } from '../lib/date-only.js';

export interface FlowerNote {
  city: string;
  areaSlug: string;
  name: string;
  flower: string;
  spot: string;
  state: string;
  tone: '' | 'is-peak' | 'is-event';
  /** TOPのカードの一文 */
  text: string;
  /** /hana/now/ の行の説明（公式の記載の範囲で） */
  detail: string;
  /** TOPのカードの小さな注記 */
  source: string;
  /** 確かめた日（画面には「11/8 確認」のように出す） */
  checkedOn: string;
  officialLabel: string;
  officialUrl: string;
  /** TOPのカードの行き先。外部なら公式、内部なら既存の記事 */
  href: string;
  external: boolean;
  cta: string;
  /** イバトコの関連記事（あれば /hana/now/ に出す） */
  article?: { href: string; label: string };
  image: { src: string; width: number; height: number; alt: string };
  kiku?: boolean;
  top: boolean;
  showUntil: string;
}

export const FLOWERS_CHECKED_LABEL = '2026.11.08 確認';

const ROSE = { src: '/images/v42/v38-autumn-rose.webp', width: 480, height: 320, alt: '秋バラのイメージイラスト' };
const KIKU = { src: '/images/v42/chrysanthemums.webp', width: 420, height: 525, alt: '色とりどりの菊のイメージイラスト' };

export const FLOWER_NOTES: FlowerNote[] = [
  {
    city: 'ひたちなか市', areaSlug: 'hitachinaka', name: '国営ひたち海浜公園', flower: '秋バラ', spot: '常陸ローズガーデン',
    state: '咲いています', tone: '',
    text: '約120品種のローズガーデンで、秋咲きのバラ。',
    detail: '常陸ローズガーデンで、秋咲き性のバラが咲いています。約120品種・約3,400株（うちハマナス約1,600株）の庭で、バラを見るなら中央ゲートが便利です。',
    source: '公式の開花情報を確認', checkedOn: '2026-11-08',
    officialLabel: 'バラ｜国営ひたち海浜公園', officialUrl: 'https://www.hitachikaihin.jp/flower-plant/flower-info/page000482.html',
    href: 'https://www.hitachikaihin.jp/flower-plant/flower-info/page000482.html', external: true, cta: '最新の開花情報へ',
    image: { ...ROSE }, top: true, showUntil: '2026-11-15',
  },
  {
    city: '石岡市', areaSlug: 'ishioka', name: 'いばらきフラワーパーク', flower: '秋バラ', spot: 'バラの品種園',
    state: '品種園が見頃', tone: 'is-peak',
    text: '筑波山を望む品種園が見頃。テラスほかは見頃終盤。',
    detail: '筑波山を望むバラの品種園が10月23日から見頃。バラテラス・色別バラ・香りのバラは見頃終盤です（公式の11月7日の更新）。ダリアやマリーゴールドなど、秋の花も咲いています。',
    source: '公式更新：11月7日', checkedOn: '2026-11-08',
    officialLabel: '秋バラの開花状況2026｜いばらきフラワーパーク', officialUrl: 'https://www.flowerpark.or.jp/news-column/akibara2026/',
    href: 'https://www.flowerpark.or.jp/news-column/akibara2026/', external: true, cta: '最新の開花情報へ',
    article: { href: '/events/ibaraki-flowerpark-illumination-2026/', label: 'イルミネーションの記事を読む' },
    image: { ...ROSE }, top: true, showUntil: '2026-11-15',
  },
  {
    city: '笠間市', areaSlug: 'kasama', name: '笠間稲荷神社ほか', flower: '菊', spot: '門前の花めぐり',
    state: '菊まつり開催中', tone: 'is-event',
    text: '立菊や懸崖菊など、多彩な菊を境内で。',
    detail: '第119回「笠間の菊まつり」。会期は10月24日（土）から11月23日（月・祝）まで、笠間稲荷神社ほかが会場です。',
    source: '開催期間：10月24日〜11月23日', checkedOn: '2026-11-08',
    officialLabel: '笠間の菊まつり｜笠間稲荷神社', officialUrl: 'https://www.kasama.or.jp/event/kiku.html',
    href: '/events/kasama-kiku-matsuri-2026/', external: false, cta: '開催案内を読む',
    article: { href: '/events/kasama-kiku-matsuri-2026/', label: '菊まつりの記事を読む' },
    image: { ...KIKU }, kiku: true, top: true, showUntil: '2026-11-23',
  },
  {
    city: '下妻市', areaSlug: 'shimotsuma', name: '大宝八幡宮', flower: '菊', spot: '境内の菊まつり',
    state: '菊まつり開催中', tone: 'is-event',
    text: '関東最古の八幡神社とされる社の、秋の菊。',
    detail: '大宝八幡宮の菊まつりは11月1日から23日まで。22日・23日には菊まつりマルシェが開かれます（主催：ひだまりマルシェ）。',
    source: '開催期間：11月1日〜11月23日', checkedOn: '2026-11-08',
    officialLabel: '菊まつり 11月1日から開催｜大宝八幡宮', officialUrl: 'https://www.daiho.or.jp/news/news-i637-u1.html',
    href: '/events/shimotsuma-kiku-matsuri-2026/', external: false, cta: '開催案内を読む',
    article: { href: '/events/shimotsuma-kiku-matsuri-2026/', label: '菊まつりの記事を読む' },
    image: { ...KIKU }, kiku: true, top: false, showUntil: '2026-11-23',
  },
];

/** 今日（日本時間）まだ載せてよい花だより */
export const visibleFlowerNotes = (today = todayDateOnlyString()) => FLOWER_NOTES.filter((note) => today <= note.showUntil);

/** /hana/now/ を検索に出してよいか（2件以上の時だけ） */
export const FLOWER_NOW_MIN_INDEX = 2;

/**
 * 次に咲く花（例年の見頃）。公式のフラワーカレンダーや施設の案内にある「例年の時期」だけを書く。
 * いま咲いている・開催中と公式が出したら、FLOWER_NOTES に移して「いま見頃」として載せる。
 * 「咲いています」「見頃」とは書かない（その年の開花はまだ発表されていないため）。
 */
export interface UpcomingFlower {
  city: string;
  areaSlug: string;
  name: string;
  flower: string;
  /** 例年の時期（公式の記載どおり） */
  season: string;
  /** 花ごとの時期と場所（公式の記載の範囲で） */
  items: string[];
  officialLabel: string;
  officialUrl: string;
  checkedOn: string;
  showUntil: string;
}

export const UPCOMING_FLOWERS: UpcomingFlower[] = [
  {
    city: 'ひたちなか市', areaSlug: 'hitachinaka', name: '国営ひたち海浜公園', flower: 'ロウバイ・アイスチューリップ・ウメ',
    season: '例年12月下旬〜3月中旬',
    items: [
      'アイスチューリップ：12月下旬から1月上旬（グラスハウス）',
      'ロウバイ：12月下旬から1月下旬（みはらしの里入口）',
      'ウメ：1月下旬から3月中旬（スイセンガーデン周辺）',
      'フクジュソウ：2月上旬から2月下旬（記念の森レストハウス周辺）',
    ],
    officialLabel: '冬のフラワーカレンダー｜国営ひたち海浜公園', officialUrl: 'https://www.hitachikaihin.jp/flower-plant/winter.html',
    checkedOn: '2026-11-08', showUntil: '2027-03-15',
  },
  {
    city: '水戸市', areaSlug: 'mito', name: '偕楽園', flower: '梅',
    season: '水戸の梅まつり：毎年2月中旬から3月末日頃',
    items: [
      '偕楽園の公式案内では、水戸の梅まつりの期間は毎年2月中旬から3月末日頃です。',
      '梅まつりの期間は、偕楽園本園の入園料が通常時と変わります。',
      'その年の日程と開花の様子は、偕楽園の新着情報・開花情報で確かめてください。',
    ],
    officialLabel: '日本三名園 偕楽園（公式）', officialUrl: 'https://ibaraki-kairakuen.jp/',
    checkedOn: '2026-11-08', showUntil: '2027-03-31',
  },
];

/** 今日（日本時間）まだ載せてよい「次に咲く花」 */
export const visibleUpcomingFlowers = (today = todayDateOnlyString()) => UPCOMING_FLOWERS.filter((flower) => today <= flower.showUntil);
