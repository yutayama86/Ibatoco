type BusinessIntent = {
  booking?: boolean;
  accommodation?: boolean;
  parking?: boolean;
  food?: boolean;
  experience?: boolean;
  businessLead?: boolean;
};

export interface AutoBooking {
  heading: string;
  intro?: string;
  basis: string;
  items: Array<{
    label: string;
    provider: string;
    url: string;
    note?: string;
    kind?: 'official' | 'ota' | 'ticket' | 'transport';
  }>;
  note?: string;
}

interface AutoBookingInput {
  municipality?: string;
  businessIntent?: BusinessIntent;
  officialUrl?: string;
  officialName?: string;
  lifecycle?: string;
  existingBooking?: AutoBooking;
}

type LodgingProvider = {
  provider: 'rakuten-travel' | 'jalan';
  url: string;
  label: string;
};

const LODGING_BY_MUNICIPALITY: Record<string, {
  areaLabel: string;
  providers: LodgingProvider[];
}> = {
  oarai: {
    areaLabel: '大洗・ひたちなか',
    providers: [
      { provider: 'rakuten-travel', url: 'https://travel.rakuten.co.jp/yado/ibaraki/oarai.html', label: '大洗・ひたちなか' },
      { provider: 'jalan', url: 'https://www.jalan.net/100000/LRG_101400/', label: '大洗・ひたちなか' },
    ],
  },
  hitachinaka: {
    areaLabel: '大洗・ひたちなか',
    providers: [
      { provider: 'rakuten-travel', url: 'https://travel.rakuten.co.jp/yado/ibaraki/oarai.html', label: '大洗・ひたちなか' },
      { provider: 'jalan', url: 'https://www.jalan.net/100000/LRG_101400/', label: '大洗・ひたちなか' },
    ],
  },
  mito: {
    areaLabel: '水戸',
    providers: [
      { provider: 'rakuten-travel', url: 'https://travel.rakuten.co.jp/yado/ibaraki/mito.html', label: '水戸' },
      { provider: 'jalan', url: 'https://www.jalan.net/100000/LRG_100500/', label: '水戸' },
    ],
  },
  tsuchiura: {
    areaLabel: '土浦周辺',
    providers: [
      { provider: 'rakuten-travel', url: 'https://travel.rakuten.co.jp/yado/ibaraki/tsukuba.html', label: 'つくば・土浦・取手' },
      { provider: 'jalan', url: 'https://www.jalan.net/100000/LRG_101100/', label: '霞ヶ浦・土浦・鹿島・潮来' },
    ],
  },
  tsukuba: {
    areaLabel: 'つくば周辺',
    providers: [
      { provider: 'rakuten-travel', url: 'https://travel.rakuten.co.jp/yado/ibaraki/tsukuba.html', label: 'つくば・土浦・取手' },
    ],
  },
  toride: {
    areaLabel: '取手周辺',
    providers: [
      { provider: 'rakuten-travel', url: 'https://travel.rakuten.co.jp/yado/ibaraki/tsukuba.html', label: 'つくば・土浦・取手' },
    ],
  },
  kasumigaura: {
    areaLabel: '霞ヶ浦・土浦周辺',
    providers: [
      { provider: 'jalan', url: 'https://www.jalan.net/100000/LRG_101100/', label: '霞ヶ浦・土浦・鹿島・潮来' },
    ],
  },
  kashima: {
    areaLabel: '鹿島・潮来周辺',
    providers: [
      { provider: 'jalan', url: 'https://www.jalan.net/100000/LRG_101100/', label: '霞ヶ浦・土浦・鹿島・潮来' },
    ],
  },
  itako: {
    areaLabel: '鹿島・潮来周辺',
    providers: [
      { provider: 'jalan', url: 'https://www.jalan.net/100000/LRG_101100/', label: '霞ヶ浦・土浦・鹿島・潮来' },
    ],
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
export function autoBookingForEvent(input: AutoBookingInput): AutoBooking | undefined {
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
      ...lodging.providers.map((item) => ({
        label: `${item.label}の宿を探す（${item.provider === 'rakuten-travel' ? '楽天トラベル' : 'じゃらんnet'}）`,
        provider: item.provider,
        url: item.url,
        kind: 'ota' as const,
        note: '空室と料金を比較できます。',
      })),
    ],
    note: 'イバトコは宿泊予約を受け付けていません。料金・空室・キャンセル規定は各予約サイトで確認してください。',
  };
}

export function hasAutoLodgingCoverage(municipality?: string): boolean {
  return Boolean(municipality && LODGING_BY_MUNICIPALITY[municipality]);
}
