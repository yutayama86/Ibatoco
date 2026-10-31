/**
 * 記事から参照する店舗・施設・事業者の登録簿。
 *
 * ## このファイルの役割と、既存の places / stores との違い
 *
 * イバトコには「場所」のデータが3つある。混ぜないための整理：
 *
 *  1. `src/content/places/*.md`（4件・全て draft）
 *     イバトコが取材して**自前のページ（/place/<id>/）を持つ**場所。
 *  2. `src/data/stores.csv`（12件・全て draft）
 *     無料一括掲載の店舗。同じく /place/<id>/ を持つ。
 *     ※1も2も、いまは実装確認用のサンプル名（「珈琲 ひとひら」等）が入っているため
 *       draft のままにしてある。実在の店ではないので公開してはいけない。
 *  3. **このファイル**
 *     イバトコがページを持たず、**記事から外部サイトへ送客する先**。
 *     大洗ホテル、深作農園など。IDを付けるのは、同じ事業者に触れている記事を
 *     機械的に集めるためと、送客のクリックを名寄せするため。
 *
 * 将来1と3を統合する余地はあるが、いま統合すると
 * 「自前ページを持つ／持たない」の区別が消えるので分けている。
 *
 * ## 入れる条件
 *  - 実在を公式サイトで確認したもの（**架空の店舗を作らない**）
 *  - 記事から実際に参照しているもの（使われないIDを増やさない）
 *
 * ## ID の付け方
 *   <市町村slug>-<業種>-<3桁の連番>   例) oarai-hotel-001
 *   一度付けたIDは変えない（記事から参照されるため）。
 */
import { MUNI_BY_SLUG, type MunicipalitySlug, type RegionKey } from './areas';

export type BusinessCategory =
  | 'hotel'
  | 'restaurant'
  | 'cafe'
  | 'shop'
  | 'farm'
  | 'parking'
  | 'onsen'
  | 'sauna'
  | 'museum'
  | 'activity'
  | 'station'
  | 'other';

/**
 * イバトコとの関係。**Editorial / Partner / PR を混ぜないための区分**。
 *  - editorial … 対価を受けていない。編集部の判断で載せている（既定）
 *  - partner   … 情報整備・制作・運用を有料で支援している
 *  - pr        … 広告・タイアップ。読者が判別できるよう明示する
 *
 * partner や pr であることが、記事の評価や掲載順に影響してはいけない。
 * 並び順に使わないこと（表示の区分にだけ使う）。
 */
export type PartnerType = 'editorial' | 'partner' | 'pr';

export interface Business {
  /** <市町村slug>-<業種>-<連番>。付け替えない */
  id: string;
  name: string;
  municipality: MunicipalitySlug;
  category: BusinessCategory;
  /** 1〜2文。公式の表記か、確認できた事実だけを書く */
  description?: string;
  officialUrl?: string;
  /** 予約ページ。公式と別の場合だけ入れる */
  reservationUrl?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  instagram?: string;
  x?: string;
  /** 有料の支援関係があるか。既定は false（編集記事） */
  isPartner?: boolean;
  partnerType?: PartnerType;
  /** 情報を確認した日（YYYY-MM-DD）。古い情報を「最新」と言わないために必須に近い */
  verifiedAt?: string;
  note?: string;
}

export const BUSINESSES: Business[] = [
  {
    id: 'oarai-hotel-001',
    name: '大洗ホテル',
    municipality: 'oarai',
    category: 'hotel',
    description: '大洗海岸沿いの宿泊施設。夕食ビュッフェは日帰りでも利用できる。',
    officialUrl: 'https://www.oarai-hotel.co.jp/',
    verifiedAt: '2026-09-19',
    note: '夕食ビュッフェの記事とバスツアーの記事から参照',
  },
  {
    id: 'hokota-farm-001',
    name: '深作農園',
    municipality: 'hokota',
    category: 'farm',
    description: '鉾田市のメロン農園。直売所とカフェは通年、メロン狩りは初夏。',
    officialUrl: 'https://fukasaku.com/',
    verifiedAt: '2026-09-19',
    note: 'メロン専用サイト（fukasaku-melon.com）も併設',
  },
  {
    id: 'hitachinaka-shop-001',
    name: '那珂湊おさかな市場',
    municipality: 'hitachinaka',
    category: 'shop',
    description: '那珂湊漁港に隣接する市場。鮮魚店と飲食店が並ぶ。',
    officialUrl: 'https://www.nakaminato-osakanaichiba.jp/',
    verifiedAt: '2026-09-19',
  },
  {
    id: 'hitachinaka-activity-001',
    name: '国営ひたち海浜公園',
    municipality: 'hitachinaka',
    category: 'activity',
    description: '春のネモフィラ、秋のコキアで知られる国営公園。',
    officialUrl: 'https://www.hitachikaihin.jp/',
    verifiedAt: '2026-09-19',
    note: '紅葉ページと秋のおでかけ記事から参照',
  },
];

export const BUSINESS_BY_ID: ReadonlyMap<string, Business> = new Map(
  BUSINESSES.map((b) => [b.id, b]),
);

export function businessesInMunicipality(slug: string): Business[] {
  return BUSINESSES.filter((b) => b.municipality === slug);
}

/** 地域区分は市町村から引く。事業者側に重複して持たない（食い違いが起きるため） */
export function regionOf(business: Business): RegionKey | undefined {
  return MUNI_BY_SLUG.get(business.municipality)?.region;
}

export function businessesInRegion(region: RegionKey): Business[] {
  return BUSINESSES.filter((b) => regionOf(b) === region);
}

/**
 * 情報が古くなっていないか。**自動で書き換えない。**
 * 再確認の候補を出すだけで、内容を触るのは人が公式を見てから。
 */
export type FreshnessLevel = 'fresh' | 'check90' | 'check180' | 'stale365' | 'unknown';

export function freshnessOf(business: Business, now: Date = new Date()): FreshnessLevel {
  if (!business.verifiedAt) return 'unknown';
  const verified = new Date(`${business.verifiedAt}T00:00:00+09:00`);
  if (Number.isNaN(verified.valueOf())) return 'unknown';
  const days = Math.floor((now.valueOf() - verified.valueOf()) / 86_400_000);
  if (days >= 365) return 'stale365';
  if (days >= 180) return 'check180';
  if (days >= 90) return 'check90';
  return 'fresh';
}

/** 再確認したほうがよい事業者。古い順に返す */
export function businessesNeedingReview(now: Date = new Date()): { business: Business; level: FreshnessLevel }[] {
  return BUSINESSES
    .map((business) => ({ business, level: freshnessOf(business, now) }))
    .filter(({ level }) => level !== 'fresh')
    .sort((a, b) => (a.business.verifiedAt ?? '').localeCompare(b.business.verifiedAt ?? ''));
}
