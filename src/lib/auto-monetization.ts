import type { Booking } from '../components/BookingGuide.astro';

type BusinessIntent = {
  booking?: boolean;
  accommodation?: boolean;
  parking?: boolean;
  food?: boolean;
  experience?: boolean;
  businessLead?: boolean;
};

interface AutoBookingInput {
  municipality?: string;
  businessIntent?: BusinessIntent;
  officialUrl?: string;
  officialName?: string;
  lifecycle?: string;
  existingBooking?: Booking;
}

const LODGING_BY_MUNICIPALITY: Record<string, {
  areaLabel: string;
  rakuten: string;
  jalan: string;
}> = {
  oarai: {
    areaLabel: '大洗・ひたちなか',
    rakuten: 'https://travel.rakuten.co.jp/yado/ibaraki/oarai.html',
    jalan: 'https://www.jalan.net/100000/LRG_101400/',
  },
  hitachinaka: {
    areaLabel: '大洗・ひたちなか',
    rakuten: 'https://travel.rakuten.co.jp/yado/ibaraki/oarai.html',
    jalan: 'https://www.jalan.net/100000/LRG_101400/',
  },
  mito: {
    areaLabel: '水戸',
    rakuten: 'https://travel.rakuten.co.jp/yado/ibaraki/mito.html',
    jalan: 'https://www.jalan.net/100000/LRG_100500/',
  },
  tsuchiura: {
    areaLabel: '土浦周辺',
    rakuten: 'https://travel.rakuten.co.jp/yado/ibaraki/tsukuba.html',
    jalan: 'https://www.jalan.net/100000/LRG_101100/',
  },
};

/**
 * 既存の提携済み宿泊リンクを、明示的に「宿泊意図あり」とされた記事だけへ自動配置する。
 *
 * ガードレール:
 * - frontmatter に booking があれば必ずそちらを優先
 * - accommodation: true が無い記事には出さない
 * - 終了済みイベントには出さない
 * - 対応エリアと公式URLが両方あるときだけ出す
 * - URLは affiliates.ts で既に承認済みの元URLのみ。新しい提携先やURLは推測しない
 * - 並び順は公式情報 → 楽天 → じゃらん。報酬で並べ替えない
 */
export function autoBookingForEvent(input: AutoBookingInput): Booking | undefined {
  if (input.existingBooking) return input.existingBooking;
  if (!input.businessIntent?.accommodation) return undefined;
  if (input.lifecycle === 'ended') return undefined;
  if (!input.municipality || !input.officialUrl) return undefined;

  const lodging = LODGING_BY_MUNICIPALITY[input.municipality];
  if (!lodging) return undefined;

  return {
    heading: '遠方から行くなら、周辺の宿も確認',
    intro: '日帰りが難しい場合に備え、開催情報の公式確認先と周辺の宿泊予約サイトをまとめています。',
    basis: '開催情報の公式ページを先に置き、そのあとに同じ周辺エリアの宿を比較できる既存提携先を並べています。報酬額で順番は変えていません。',
    items: [
      {
        label: input.officialName ? `${input.officialName}で最新情報を確認` : '公式サイトで最新情報を確認',
        provider: 'official',
        url: input.officialUrl,
        kind: 'official',
        note: '日程・会場・変更情報は、予約前に公式情報で確認してください。',
      },
      {
        label: `${lodging.areaLabel}の宿を探す（楽天トラベル）`,
        provider: 'rakuten-travel',
        url: lodging.rakuten,
        kind: 'ota',
        note: '空室と料金を比較できます。',
      },
      {
        label: `${lodging.areaLabel}の宿を探す（じゃらんnet）`,
        provider: 'jalan',
        url: lodging.jalan,
        kind: 'ota',
        note: '別の予約サイトでも空室と料金を比較できます。',
      },
    ],
    note: 'イバトコは宿泊予約を受け付けていません。料金・空室・キャンセル規定は各予約サイトで確認してください。',
  };
}

export function hasAutoLodgingCoverage(municipality?: string): boolean {
  return Boolean(municipality && LODGING_BY_MUNICIPALITY[municipality]);
}
