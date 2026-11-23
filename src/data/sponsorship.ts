/**
 * イバトコスポンサーの料金と中身の正本。運用は docs/SPONSORSHIP.md。
 * 2026-11-23 オーナー決定：旧「地域サポーター（3か月19,800円・TOPにロゴ）」を廃止し、月10万円の1本にする
 * （仕様 docs/editorial/specs/20261123-biz-b2b-redesign.md）。
 * - 価値の中心は、検索から読まれ続けるPR記事。表示回数は約束しない
 * - PRと必ず明示する（景品表示法のステルスマーケティング規制、/about/pr-policy/）
 * - 料金・中身を変えるときは、/sponsor/・申込・規約・TOPの事業者導線を一緒に直す
 */
export const SPONSOR_PLAN = {
  name: 'イバトコスポンサー',
  price: 100_000,
  unit: '月額',
  minTerm: '3か月から',
  billing: '毎月末に当月分をご請求します。お支払いは銀行振込で、期限は請求書の発行月の翌月末日です。',
  includes: [
    'PR記事を毎月1本（素材のご提供とオンライン取材30分で、イバトコの編集部が書きます）',
    'テーマや地域が合う、読まれている記事へのPR枠',
    'イバトコのSNSでのご紹介 月2回（PRと表示）',
    '月次レポート（PR記事とPR枠の表示数・クリック数の実測値）',
  ],
} as const;

export const yen = (value: number) => `${value.toLocaleString('ja-JP')}円`;
