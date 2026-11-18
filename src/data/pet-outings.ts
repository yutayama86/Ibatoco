/**
 * ペットとおでかけ（TOPのペットの区画と /pet/）のデータ。
 * 載せるのは各施設・各店の公式案内に書かれた同伴条件だけ。料金や細かな規則は変わるので、
 * 金額は書かずに公式の案内へ送る。掲載は編集部の選定で、対価はない（広告ではない）。
 *
 * - rules は公式ページの記載の要約。書いていないことを補わない
 * - 確かめ直したら CHECKED_ON を更新する
 */

export const PET_CHECKED_ON = '2026-11-08';
export const PET_CHECKED_LABEL = '2026年11月8日確認';

export interface PetCafe {
  city: string;
  areaSlug: string;
  /** TOPのカードの見出し上 */
  kicker: string;
  name: string;
  text: string;
  rule: string;
  rules: string[];
  cta: string;
  href: string;
}

export interface PetFacility {
  town: string;
  areaSlug: string;
  name: string;
  rule: string;
  dogOnly: boolean;
  rules: string[];
  cta: string;
  href: string;
  sourceLabel: string;
}

export const PET_CAFES: PetCafe[] = [
  {
    city: 'つくば市', areaSlug: 'tsukuba', kicker: 'つくば市 ／ 愛犬とカフェへ', name: 'ペニーレイン つくば店',
    text: 'お散歩のあとは、愛犬とカフェ時間。', rule: '犬同伴・ドッグカフェ',
    rules: ['ドッグカフェとして営業しています。', '営業日と時間は、店の営業カレンダーで日ごとに確かめられます。'],
    cta: 'ドッグカフェの案内を見る', href: 'https://pennylane.company/pennylane_d_tsukuba',
  },
  {
    city: '土浦市', areaSlug: 'tsuchiura', kicker: '土浦市 ／ 木漏れ日のテラスへ', name: '森のカフェ',
    text: '木漏れ日のテラスで、のんびりひと休み。', rule: 'ペット同伴・テラス席',
    rules: ['テラス席はペット同伴可。リードフックとドッグメニューがあります。', '犬と入れる室内の部屋もあります（鑑札・狂犬病予防注射済票・混合ワクチン証明書・マナーパンツが必要）。', '大型犬や多頭で行くときは、事前に電話で問い合わせるよう案内されています。'],
    cta: 'お店と利用条件を見る', href: 'https://cafe.thomasforest.jp/',
  },
];

export const PET_FACILITIES: PetFacility[] = [
  {
    town: 'ひたちなか市', areaSlug: 'hitachinaka', name: '国営ひたち海浜公園', rule: 'ペット同伴可', dogOnly: false,
    rules: ['入園口で「ペット同伴誓約書」に署名して渡します。', 'リードは2m以内、混雑時は1m以内。伸縮リードはロックして使います。', 'シーサイドトレインや遊園地の遊具は、基本的にペット同伴で利用できません。サイクリングコースへの同伴も控えるよう案内されています。'],
    cta: '同伴条件を確認', href: 'https://www.hitachikaihin.jp/faq.php?c=1&code=22&lc=0&mode=detail', sourceLabel: 'よくある質問｜国営ひたち海浜公園',
  },
  {
    town: '石岡市', areaSlug: 'ishioka', name: 'いばらきフラワーパーク', rule: 'ペット同伴可', dogOnly: false,
    rules: ['入口でペット誓約書を書いて入園します。ペットの入園料がかかります。', '園内の建物や温室には入れません。乗り物にも乗せられません。', 'リードの装着とフンの後始末が必要です。'],
    cta: '同伴条件を確認', href: 'https://www.flowerpark.or.jp/faq/', sourceLabel: 'よくある質問｜いばらきフラワーパーク',
  },
  {
    town: '稲敷市', areaSlug: 'inashiki', name: 'こもれび森のイバライド', rule: '犬のみ同伴可', dogOnly: true,
    rules: ['犬の入園料がかかります。犬以外の動物は入れません。', 'ロングリード・伸縮リードは持ち込めません（無料の貸し出しあり）。', '狂犬病と混合ワクチンを1年以内に受けていることが条件。店舗内・牧場エリア・花壇などには入れません。ドッグランは体重12kgを境に分かれています。'],
    cta: '同伴条件を確認', href: 'https://www.ibaraido.co.jp/wp/5282/', sourceLabel: 'ワンちゃん入園について｜こもれび森のイバライド',
  },
  {
    town: '潮来市', areaSlug: 'itako', name: '水郷潮来あやめ園', rule: 'ペット同伴可', dogOnly: false,
    rules: ['市の施設案内に「ペット同伴：可」とあります。', '休園日はなく、終日自由に入れます（無料）。潮来駅から徒歩3分。', '花菖蒲は例年5月下旬〜6月下旬。桜・藤・紫陽花の季節もあります。'],
    cta: '施設情報を確認', href: 'https://www.city.itako.lg.jp/kankou/kankou-itakokankou/kankou-spot/kankou-mainspot/kankou-spot03/page001385.html', sourceLabel: '水郷潮来あやめ園｜潮来市',
  },
];
