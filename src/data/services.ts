/**
 * BtoB 受託（コンサル・Web制作・SNS運用）の料金と範囲。/biz/ はここから表示する。
 * スポンサー（PR）の料金は src/data/sponsorship.ts。運用は docs/SPONSORSHIP.md。
 *
 * 設計の考え方（2026-11-23 オーナー決定。仕様 docs/editorial/specs/20261123-biz-b2b-redesign.md）:
 *  - 少ない工数で高い利益。時間ではなく「中身と上限を決めた商品」を売る
 *  - 上限を超える作業・撮影・追加制作は断らず、協力者と連携して受ける（別途見積）
 *  - 月額は3か月から
 *  - 成果（順位・売上・AI検索での引用・来店）は保証しない
 *  - 料金を変えるときは、この正本と /biz/・契約書のひな形を一緒に直す
 * 受託の取引先を編集記事で扱うときは Partner と明示し、評価・並び順を変えない（/about/pr-policy/）。
 */

export interface ServicePlan {
  id: string;
  /** consult: コンサル／build: 制作／run: 運用／custom: 個別見積 */
  group: 'consult' | 'build' | 'run' | 'custom';
  name: string;
  /** 税別・円。個別見積は null */
  price: number | null;
  /** 例「一括」「月額」。price が null のときは表示に使わない */
  unit: string;
  /** 「〜」を付けるか（範囲で変わる料金） */
  from: boolean;
  summary: string;
  includes: string[];
  /** 契約の条件（期間など） */
  terms?: string;
}

export const SERVICE_PLANS: ServicePlan[] = [
  {
    id: 'diagnosis',
    group: 'consult',
    name: '現状診断',
    price: 100000,
    unit: '一括',
    from: false,
    summary: '検索・AI検索・発信の仕組みを診断し、改善の優先順位をレポートでお渡しします。発注前に、何から直すべきかを確かめたい方の入口です。',
    includes: [
      '検索（Google）とAI検索での見え方の確認',
      'サイト・発信の運用の現状確認',
      '改善の優先順位をまとめたレポート',
      '結果の説明（オンライン1回）',
      '続けてコンサルを契約した場合、診断の代金をコンサルに充当',
    ],
  },
  {
    id: 'consulting',
    group: 'consult',
    name: 'コンサル',
    price: 200000,
    unit: '月額',
    from: true,
    summary: '月次の分析と改善の指示で、検索・AI検索から見つけられ、選ばれる状態を一緒につくります。',
    includes: [
      'オンラインの打ち合わせ 月2回（各1時間）',
      '月次レポート（検索・AI検索・アクセスの推移）',
      '改善の優先順位と具体的な指示',
      'チャットでの相談（平日）',
    ],
    terms: '3か月から',
  },
  {
    id: 'consulting-impl',
    group: 'consult',
    name: 'コンサル＋実装',
    price: 400000,
    unit: '月額',
    from: true,
    summary: 'コンサルの内容に加えて、記事・技術・運用の自動化など、改善の実装までこちらで行います。',
    includes: [
      'コンサルの内容すべて',
      '改善の実装（記事の改善・技術的な修正・運用の自動化）を月の作業範囲内で',
      '実装した内容と結果の報告',
    ],
    terms: '3か月から',
  },
  {
    id: 'web',
    group: 'build',
    name: 'Web制作',
    price: 800000,
    unit: '一括',
    from: true,
    summary: '検索とAI検索で見つけられることを前提に、事業・観光・施設のサイトをつくります。',
    includes: [
      'サイトの構成設計と制作（ページ数は事前に決定）',
      'スマホ対応、検索・AI検索向けの情報設計と基本設定',
      '修正2回まで',
      '公開後の更新のしかたの説明',
    ],
  },
  {
    id: 'sns',
    group: 'run',
    name: 'SNS運用',
    price: 150000,
    unit: '月額',
    from: true,
    summary: '投稿の企画・作成から予約投稿までを行い、数字を見ながら改善します。',
    includes: [
      '投稿の企画と作成（月の投稿数は事前に決定）',
      '内容のご確認のあと、予約投稿',
      '月次レポートと改善の提案',
    ],
    terms: '3か月から',
  },
  {
    id: 'public',
    group: 'custom',
    name: '自治体・観光団体',
    price: null,
    unit: '',
    from: false,
    summary: '観光・地域の情報発信、サイトや発信の仕組みづくりを、年間の契約やプロポーザルにあわせてご提案します。',
    includes: ['情報発信の戦略と運用の設計', 'Web・SNS・記事の制作と運用', '効果の測定と報告'],
  },
];

/** すべてのプランに共通の条件。/biz/ に表示する */
export const SERVICE_TERMS = [
  '料金はすべて税別です。範囲・期間・費用は、現状と目的をうかがったうえで事前にお伝えし、合意いただいてから始めます。',
  '上限を超える作業や、現地での取材・撮影・追加の制作は、協力者と連携して対応します（別途お見積もり）。',
  '検索順位・売上・AI検索での引用・来店などの成果は保証しません。',
  'ご依頼いただいた支援は、編集記事の掲載や評価とは切り離しています。',
] as const;
