/** 地域サポーターの料金と期間の正本。運用は docs/SPONSORSHIP.md。 */
export const REGIONAL_SUPPORTER_PLAN = {
  name: 'イバトコ地域サポーター',
  price: 19_800,
  duration: '3か月',
} as const;

export const yen = (value: number) => `${value.toLocaleString('ja-JP')}円`;
