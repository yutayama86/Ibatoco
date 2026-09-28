/**
 * 同じ話題を扱う記事のまとまり。
 *
 * なぜあるか：TOPの「いま読まれている記事」に、水戸信用金庫スタジアムの
 * 「駐車場」と「アクセス・駐車場」が4位・5位に並び、同じ話題で2枠を使っていた
 * （2026-09-28）。読者には1行で見せ、細かい記事へは行の下の小さなリンクで案内する。
 *
 * - hub … 行のリンク先。話題全体を案内している記事
 * - pages … 話題に属する記事。hub 以外は行の下に label で出す
 * 記事は1つの話題にだけ入れる。URLを変えたら、ここも直す（build時に存在を確認する）。
 */
export interface Topic {
  id: string;
  /** 行に出す見出し */
  title: string;
  hub: string;
  pages: { path: string; label: string }[];
}

export const TOPICS: Topic[] = [
  {
    id: 'mito-shinkin-stadium',
    title: '水戸信用金庫スタジアムのアクセス・駐車場',
    hub: '/news/mito-hollyhock-new-stadium-access/',
    pages: [
      { path: '/news/mito-hollyhock-new-stadium-access/', label: 'アクセス・最寄り駅' },
      { path: '/news/mito-shinkin-stadium-parking/', label: '駐車場の予約と5か所' },
    ],
  },
  {
    id: 'tsuchiura-hanabi-2026',
    title: '土浦全国花火競技大会2026',
    hub: '/events/tsuchiura-hanabi-2026/',
    pages: [
      { path: '/events/tsuchiura-hanabi-2026/', label: '時間・駐車場・有料席' },
      { path: '/events/tsuchiura-hanabi-2026-kaeri/', label: '帰り方' },
      { path: '/events/tsuchiura-hanabi-2026-kaisai/', label: '雨・延期のとき' },
    ],
  },
];

const byPath = new Map<string, Topic>();
for (const topic of TOPICS) {
  if (!topic.pages.some((page) => page.path === topic.hub)) {
    throw new Error(`topics.ts: ${topic.id} の hub が pages に入っていません`);
  }
  for (const page of topic.pages) {
    if (byPath.has(page.path)) throw new Error(`topics.ts: ${page.path} が2つの話題に入っています`);
    byPath.set(page.path, topic);
  }
}

export function topicOf(path: string): Topic | undefined {
  return byPath.get(path);
}
