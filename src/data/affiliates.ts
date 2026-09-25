/**
 * 外部の予約・購入サイトへ出すリンクの提供元と、提携（アフィリエイト）の状態。
 *
 * 方針:
 *  - **提携していないものを「広告」として出さない。** status が 'active' の提供元だけ、
 *    affiliateUrl でリンクを書き換え、画面に広告表示を出す。
 *  - 提携IDや報酬条件をここに推測で書かない。契約後に、本人が status と affiliateUrl を入れる。
 *  - 未提携のあいだは通常の公式リンクとして動く。切り替えても記事側の記述は変わらない。
 *  - 掲載順は報酬の高さで決めない。順番は記事の booking.items の並び（公式の一次情報を先に置く）。
 *
 * 提携後にやること（本人の作業）:
 *  1. 各ASP・プログラムへ申請し、承認を得る（docs/MONETIZATION.md に申請先と必要情報）
 *  2. ここの status を 'active' にし、affiliateUrl に「渡されたURLを広告リンクへ変える関数」を書く
 *  3. `npm run verify` を通してから公開する。公開後にクリックが計測されることを確認する
 */

export type AffiliateStatus =
  /** 申請していない */
  | 'none'
  /** 申請済み・審査中 */
  | 'applied'
  /** 提携成立。広告リンクとして扱う */
  | 'active';

export interface LinkProvider {
  id: string;
  /** 画面に出す提供元の名前 */
  name: string;
  status: AffiliateStatus;
  /** 提携先（ASP名など）。未提携のあいだは候補を書いておく */
  network?: string;
  /** 申請日・審査の状況など、運用のメモ */
  note?: string;
  /**
   * 提携後の広告リンク。**ASPの管理画面で生成したリンクを、そのまま貼る。**
   * キーは記事に書いてある元のURL、値は生成された広告リンク。
   *
   * 関数でURLを組み立てない理由：ASPによっては「生成されたリンクを変更しないこと」が
   * 条件になっている（例：じゃらんnetの商品リンクは計測用パラメータを含む）。
   * 組み立て直すと計測に反映されず、成果が計上されないことがある。
   */
  affiliateLinks?: Record<string, string>;
}

export const LINK_PROVIDERS: Record<string, LinkProvider> = {
  official: {
    id: 'official',
    name: '公式サイト',
    status: 'none',
    note: '施設・自治体・観光協会などの一次情報。広告ではない',
  },
  'rakuten-travel': {
    id: 'rakuten-travel',
    name: '楽天トラベル',
    status: 'active',
    network: '楽天アフィリエイト（提携審査なし／2026-09-17 リンク作成）',
    note: 'バリューコマース側では提携しない（同じ広告主を2つのASPで持たない）',
    affiliateLinks: {
      'https://travel.rakuten.co.jp/yado/ibaraki/oarai.html':
        'https://hb.afl.rakuten.co.jp/hgc/579937d6.d51864df.579937d7.bf4673dd/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2Fyado%2Fibaraki%2Foarai.html&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9',
      'https://travel.rakuten.co.jp/yado/ibaraki/mito.html':
        'https://hb.afl.rakuten.co.jp/hgc/579937d6.d51864df.579937d7.bf4673dd/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2Fyado%2Fibaraki%2Fmito.html&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9',
      // つくば・土浦・取手（117件）。土浦駅前の宿を含む。11月7日の土浦花火向け
      // ※ URLの綴りで判断しないこと。tsuchiura.html は鹿嶋・潮来・北浦を返す
      'https://travel.rakuten.co.jp/yado/ibaraki/tsukuba.html':
        'https://hb.afl.rakuten.co.jp/hgc/579937d6.d51864df.579937d7.bf4673dd/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2Fyado%2Fibaraki%2Ftsukuba.html&link_type=text&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9',
    },
  },
  jalan: {
    id: 'jalan',
    name: 'じゃらんnet',
    status: 'active',
    network: 'A8.net（提携承認 2026-09-16／プログラムID s00000005230001）',
    note: 'バリューコマース側では提携しない（同じ広告主を2つのASPで持たない）。表示回数計測用の1x1画像は入れていない（docs/MONETIZATION.md）',
    affiliateLinks: {
      'https://www.jalan.net/100000/LRG_101400/':
        'https://px.a8.net/svt/ejp?a8mat=4BCCJM+CULTTE+14CS+BW8O2&a8ejpredirect=https%3A%2F%2Fwww.jalan.net%2F100000%2FLRG_101400%2F',
      'https://www.jalan.net/100000/LRG_100500/':
        'https://px.a8.net/svt/ejp?a8mat=4BCCJM+CULTTE+14CS+BW8O2&a8ejpredirect=https%3A%2F%2Fwww.jalan.net%2F100000%2FLRG_100500%2F',
    },
  },
  'cn-playguide': {
    id: 'cn-playguide',
    name: 'CNプレイガイド',
    status: 'none',
    note: '大会公式のチケット受付先。広告ではない',
  },
  akippa: {
    id: 'akippa',
    name: 'akippa',
    status: 'none',
    network: '未提携（候補：A8.net、バリューコマース）',
    note: 'クラブ公式が案内している予約制駐車場サービス',
  },
  eplus: {
    id: 'eplus',
    name: 'イープラス',
    status: 'none',
    note: '大会公式のチケット受付先。広告ではない',
  },
  'rockinstar-official': {
    id: 'rockinstar-official',
    name: "rockin'star Carnival 公式",
    status: 'none',
    note: 'イベント公式サイト。広告ではない',
  },
  'rockinstar-ticket': {
    id: 'rockinstar-ticket',
    name: "rockin'star Carnival チケット",
    status: 'none',
    note: 'イベント公式のチケット案内。広告ではない',
  },
};

export function providerName(id: string): string {
  return LINK_PROVIDERS[id]?.name ?? id;
}

/**
 * 提携が成立していて、そのURLの広告リンクが登録されているときだけ書き換える。
 * 登録が無ければ通常の公式リンクのまま出す（勝手に組み立てない）。
 */
export function outboundHref(id: string, url: string): string {
  const provider = LINK_PROVIDERS[id];
  if (!provider || provider.status !== 'active') return url;
  return provider.affiliateLinks?.[url] ?? url;
}

/** そのリンクが広告（成果報酬あり）かどうか。URLごとに判定する */
export function isPaidLink(id: string, url: string): boolean {
  const provider = LINK_PROVIDERS[id];
  if (!provider || provider.status !== 'active') return false;
  return Boolean(provider.affiliateLinks?.[url]);
}

/** ページ内にひとつでも広告リンクがあるか。上部の広告表示を出すかの判定に使う */
export function hasPaidLink(links: { provider: string; url: string }[]): boolean {
  return links.some((link) => isPaidLink(link.provider, link.url));
}

/**
 * URLだけから広告リンクを引く。
 *
 * `booking.items` は provider を持つが、ガイド記事の cta（`guide.cta` /
 * `guide.bottomCta` / `section.cta`）は href しか持たない。
 * そこが素のリンクのままだと、一番押される導線が報酬にならない。
 *
 * `affiliateLinks` は「元URL → 生成リンク」の対応表で、同じ元URLを
 * 2つの提供元が持つことはない（同じ広告主を2つのASPで持たない方針）。
 * だからURLから提供元を一意に引ける。
 *
 * 提携していない、または生成リンクが未登録なら null。
 * そのときリンクは素のまま出て、広告表示も出ない（正しい挙動）。
 */
export function paidLinkFor(url: string): { provider: string; href: string } | null {
  for (const provider of Object.values(LINK_PROVIDERS)) {
    if (provider.status !== 'active') continue;
    const href = provider.affiliateLinks?.[url];
    if (href) return { provider: provider.id, href };
  }
  return null;
}

/** GA4へ送る提携状態。集計時に「未提携のまま押されている」ことが分かるようにする */
export function partnerStatus(id: string): AffiliateStatus {
  return LINK_PROVIDERS[id]?.status ?? 'none';
}
