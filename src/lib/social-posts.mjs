/**
 * SNS 投稿の下書き（Threads・X・Instagram）を、公開済み記事の確認済みの事実だけから作る。
 * 文面に使うのは記事の title・description・日付・市町村・URL だけ（新しい事実を足さない）。
 * 画像は各記事の OG カード（/og/{events|news}/{slug}.png。サイトが自動生成）。
 * 投稿はしない。Control Center に並べ、オーナーが確認して手で貼る。
 * 日付は「明日」などの相対語を使わない（毎日のビルドが止まった日にずれるため）。docs/editorial/specs/20261122-brand-and-ai-visibility.md
 */
import { addDateOnlyDays, dateOnlyWeekday, parseDateOnly, toDateOnlyString } from './date-only.js';

const SITE = 'https://ibatoco.jp';
const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];
export const X_LIMIT = 280; // X の重み付き文字数（全角は2、URL は23）
export const THREADS_LIMIT = 500;
export const INSTAGRAM_LIMIT = 2200;

const shift = (ymd, days) => toDateOnlyString(addDateOnlyDays(parseDateOnly(ymd), days));
const valid = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Instagram 用の縦長カードのパス（src/pages/og-ig/[...route].ts が作る） */
export function igCardPath(page) {
  return `/og-ig/${page.type === 'news' ? 'news' : 'events'}/${page.slug ?? page.path.split('/').filter(Boolean).pop()}.png`;
}

/** 「11/23（月）」 */
export function md(ymd) {
  if (!valid(ymd)) return null;
  return `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}（${WEEKDAY[dateOnlyWeekday(parseDateOnly(ymd))]}）`;
}

/** X の重み付き文字数。URL は 23、U+1100 以上（日本語など）は 2 */
export function xWeight(text) {
  let n = 0;
  for (const part of String(text).split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(part)) { n += 23; continue; }
    for (const ch of part) n += ch.codePointAt(0) >= 0x1100 ? 2 : 1;
  }
  return n;
}

/** 開催日から冒頭の一言を作る。確認できない日付（dateStatus が confirmed 以外）では作らない */
export function timingLine(page, today) {
  if (page.type !== 'event' || !valid(page.startDate) || (page.dateStatus && page.dateStatus !== 'confirmed')) return null;
  const end = valid(page.endDate) ? page.endDate : page.startDate;
  if (end < today) return null;
  if (page.startDate <= today) return end === page.startDate ? `${md(page.startDate)}開催` : `開催中・${md(end)}まで`;
  return end === page.startDate ? `${md(page.startDate)}開催` : `${md(page.startDate)}〜${md(end)}開催`;
}

function hashtags(page, muniName) {
  const tags = ['#イバトコ'];
  for (const slug of page.municipalities.slice(0, 2)) { const n = muniName(slug); if (n) tags.push(`#${n}`); }
  tags.push(page.type === 'news' ? '#茨城ニュース' : '#茨城イベント');
  return tags;
}

/**
 * 1記事ぶんの下書き
 * @param {any} page
 * @param {{ today: string, muniName?: (slug: string) => string | null }} options
 */
export function buildDrafts(page, { today, muniName = () => null }) {
  const url = `${SITE}${page.path}`;
  const timing = timingLine(page, today);
  const tags = hashtags(page, muniName);
  const head = timing ? `${timing}｜${page.title}` : page.title;

  // X：収まらなければ title の「｜」より前だけにする（事実は削らず、詳細は記事へ）
  let xHead = head;
  let x = `${xHead}\n${url}\n${tags.join(' ')}`;
  if (xWeight(x) > X_LIMIT) {
    xHead = timing ? `${timing}｜${page.title.split('｜')[0]}` : page.title.split('｜')[0];
    x = `${xHead}\n${url}\n${tags.join(' ')}`;
  }
  if (xWeight(x) > X_LIMIT) x = `${xHead}\n${url}\n#イバトコ`;

  let threads = `${head}\n\n${page.description}\n\n${url}\n${tags.join(' ')}`;
  if ([...threads].length > THREADS_LIMIT) threads = `${head}\n\n${url}\n${tags.join(' ')}`;

  const instagram = `${head}\n\n${page.description}\n\n詳しくはプロフィールのリンクから「イバトコ」へ。\n\n${tags.join(' ')}`;

  return {
    path: page.path,
    title: page.title,
    reason: null,
    igImage: `${SITE}${igCardPath(page)}`,
    image: `${SITE}/og/${page.type === 'news' ? 'news' : 'events'}${page.path.replace(/^\/(events|news)/, '').replace(/\/$/, '')}.png`,
    x, xWeight: xWeight(x), threads, instagram,
  };
}

/**
 * 今投稿したい記事を選ぶ：開催が近い（14日以内に始まる・開催中）イベントと、7日以内に公開した記事。
 * 公開中（下書き・noindex・sample でない）だけ。最大 limit 件。
 */
/**
 * @param {Iterable<any>} pages
 * @param {{ today?: string, limit?: number, freshSlots?: number }} [options]
 */
export function selectPostCandidates(pages, { today, limit = 12, freshSlots = 3 } = {}) {
  if (!today || !valid(today)) return [];
  const soon = shift(today, 14);
  const weekAgo = shift(today, -7);
  const pub = [...pages].filter((p) => !p.noindex && !p.frontmatter?.sample && p.frontmatter?.reviewed !== false && (p.type === 'event' || p.type === 'news'));
  const upcoming = pub
    .filter((p) => timingLine(p, today) && p.startDate <= soon)
    // 近い日付順：これから始まるものは開始日、開催中のものは終了日（終わりが近いものを先に）
    .map((p) => {
      const ongoing = p.startDate <= today;
      const end = valid(p.endDate) ? p.endDate : p.startDate;
      const reason = !ongoing ? '開催が近い' : p.startDate === end ? '開催当日' : end <= shift(today, 3) ? 'まもなく終了' : '開催中';
      return { page: p, reason, sort: ongoing ? end : p.startDate };
    });
  const fresh = pub
    .filter((p) => valid(p.pubDate) && p.pubDate >= weekAgo && p.pubDate <= today)
    .map((p) => ({ page: p, reason: '新着', sort: `0${p.pubDate}` }));
  // 開催が近いもので埋まって新着が出なくならないよう、新着に最大 freshSlots 件の枠を取る
  const seen = new Set();
  const pick = (list, max) => {
    const got = [];
    for (const c of list) {
      if (got.length >= max) break;
      if (seen.has(c.page.path)) continue;
      seen.add(c.page.path);
      got.push(c);
    }
    return got;
  };
  const freshPicked = pick(fresh.sort((a, b) => b.sort.localeCompare(a.sort)), freshSlots);
  const upcomingPicked = pick(upcoming.sort((a, b) => a.sort.localeCompare(b.sort)), limit - freshPicked.length);
  const out = [...upcomingPicked, ...freshPicked];
  return out;
}

/**
 * 投稿の予定（いつ出すか）。イバトコの実績がまだないため、一般的な運用の型から始め、4週間後にインサイトで見直す仮説。
 * - 短いイベント（3日以内）：7日前の昼（告知）と前日の夜（前日）。開催日の朝（当日）
 * - 長いイベント（4日以上）：個別には終了2日前の昼（まもなく終了）だけ。週末の案内は木・金の「今週末の茨城」まとめに入れる
 * - 記事の公開日（新着）：その日の夜
 * 日付は日本の暦日（YYYY-MM-DD）だけで判定する。
 */
export const SLOT = {
  当日: { time: '8:00', rank: 1 },
  前日: { time: '19:00', rank: 2 },
  まもなく終了: { time: '12:00', rank: 3 },
  告知: { time: '12:00', rank: 4 },
  新着: { time: '19:00', rank: 5 },
};
export const DAILY_CAP = 3;

/** @param {any} page @param {string} today @returns {{ slot: string, date: string, time: string } | null} 今日以降で最も近い投稿予定 */
export function nextPostSlot(page, today) {
  const plans = [];
  const add = (slot, date) => { if (valid(date) && date >= today) plans.push({ slot, date, time: SLOT[slot].time }); };
  if (valid(page.pubDate)) add('新着', page.pubDate);
  if (timingLine(page, today)) {
    const end = valid(page.endDate) ? page.endDate : page.startDate;
    const days = Math.round((parseDateOnly(end).valueOf() - parseDateOnly(page.startDate).valueOf()) / 86_400_000) + 1;
    if (days <= 3) {
      add('告知', shift(page.startDate, -7));
      add('前日', shift(page.startDate, -1));
      add('当日', page.startDate);
    } else {
      add('まもなく終了', shift(end, -2));
    }
  }
  plans.sort((a, b) => a.date.localeCompare(b.date) || SLOT[a.slot].rank - SLOT[b.slot].rank);
  return plans[0] ?? null;
}

/**
 * 候補を「今日出す（最大 DAILY_CAP 件）」「今日、余裕があれば」「近日（予定日つき）」に分ける
 * @param {Array<{ page: any, reason: string }>} candidates
 * @param {string} today
 */
export function schedulePosts(candidates, today) {
  const withSlot = candidates.map((c) => ({ ...c, plan: nextPostSlot(c.page, today) }));
  const due = withSlot.filter((c) => c.plan?.date === today).sort((a, b) => SLOT[a.plan.slot].rank - SLOT[b.plan.slot].rank);
  return {
    today: due.slice(0, DAILY_CAP),
    extra: due.slice(DAILY_CAP),
    later: withSlot.filter((c) => c.plan && c.plan.date > today).sort((a, b) => a.plan.date.localeCompare(b.plan.date)),
  };
}

/**
 * 木曜・金曜に出す「今週末の茨城」のまとめ投稿。今週の土日に開催がある記事（最大6件）を並べ、/events/ へ案内する。
 * @param {Iterable<any>} pages
 * @param {string} today
 */
export function weekendRoundup(pages, today) {
  if (!valid(today)) return null;
  const wd = dateOnlyWeekday(parseDateOnly(today));
  if (wd !== 4 && wd !== 5) return null;
  const sat = shift(today, 6 - wd); const sun = shift(sat, 1);
  const items = [...pages]
    .filter((p) => !p.noindex && !p.frontmatter?.sample && p.frontmatter?.reviewed !== false && p.type === 'event' && timingLine(p, today))
    .filter((p) => { const end = valid(p.endDate) ? p.endDate : p.startDate; return p.startDate <= sun && end >= sat; })
    // その週末だけの短いイベントを先に、長期開催（イルミネーション等）は後に
    .map((p) => ({ p, len: (parseDateOnly(valid(p.endDate) ? p.endDate : p.startDate).valueOf() - parseDateOnly(p.startDate).valueOf()) / 86_400_000 }))
    .sort((a, b) => (a.len > 3) - (b.len > 3) || a.p.startDate.localeCompare(b.p.startDate))
    .map((x) => x.p)
    .slice(0, 6);
  if (items.length < 2) return null;
  const lines = items.map((p) => `・${p.title.split('｜')[0]}`);
  const head = `今週末（${md(sat)}・${md(sun)}）の茨城`;
  return {
    sat, sun, count: items.length,
    threads: `${head}\n\n${lines.join('\n')}\n\n日時・会場・駐車場は公式情報で確かめてまとめています。\n${SITE}/events/\n#イバトコ #茨城イベント #茨城週末`,
    instagram: `${head}\n\n${lines.join('\n')}\n\n日時・会場・駐車場は公式情報で確かめてまとめています。\n詳しくはプロフィールのリンクから「イバトコ」へ。\n\n#イバトコ #茨城イベント #茨城週末 #茨城おでかけ`,
  };
}
