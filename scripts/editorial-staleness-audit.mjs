/**
 * 公開済みのニュース・イベント記事から、「日付を過ぎたのに、現在形・予定のまま残っている記述」の候補を出す。
 * 編集確認の順番を決めるための候補抽出だけで、記事は書き換えない。
 * 事実の訂正は、一次情報を確認した人が行う（過去の日付が書かれていても、誤りとは限らない）。
 *
 *   node scripts/editorial-staleness-audit.mjs                 … 今日（日本時間）を基準に、優先度の高い記事だけ
 *   node scripts/editorial-staleness-audit.mjs 2026-11-01      … 基準日を指定
 *   node scripts/editorial-staleness-audit.mjs --all           … 優先度の低い候補も含めて出す
 *   node scripts/editorial-staleness-audit.mjs --limit 5       … 1記事あたりに出す文の数（既定3）
 *
 * ## 見ているもの
 * - 文ごと（「。」で区切る）に、過ぎた日付と、その文の言い方を組み合わせて点数を付ける
 * - 年のない「10月28日」「10/28(水)」は、記事の updatedDate（無ければ pubDate）に最も近い年として読む
 * - 「現在」「時点」「予定」「見込み」「まで」「受付中」「運転休止」、未来形の「行われます」などは点数を上げる
 * - 「終了しました」「でした」「当時の記録」など、過去のこととして書いてある文は点数を下げる
 * - 「9月1日時点の人口」「9月1日時点で住民登録がある人」のような統計・資格の基準日は点数を下げる
 * - 同じ記事の候補は1件にまとめ、点数の高い文から数件だけ見せる
 * - 「開催前に確認した案内の記録です」などと書いてある記事は、確認済みとして優先度の対象から外す（--all では出す）
 * - 出典（sourceUrls）・関連URL・日付の構造化フィールドは、主張ではないので見ない
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseDateOnly, toDateOnlyString, todayDateOnlyString } from '../src/lib/date-only.js';

const DAY_MS = 86_400_000;
/** この点数以上の記事を「優先して確認する」とする */
export const PRIORITY_SCORE = 4;
/** 「〇月〇日現在」の状況が、この日数より古ければ点数を上げる */
const STATUS_STALE_DAYS = 7;

/** 主張ではない（出典・構造化データ・分類）ため、見ないフィールド */
const SKIP_KEYS = new Set([
  'sourceUrls', 'relatedArticleUrls', 'pubDate', 'updatedDate', 'tags', 'municipalities', 'ogImage', 'ogImageAlt',
  'eventInfo', 'sportsMatch', 'event', 'place', 'businessIntent', 'commercialPriority', 'evergreen', 'lifespan',
  'keyword', 'searchIntent', 'prefecture', 'author', 'category', 'sportsTeam', 'sportsTeams', 'sportsContentType',
  'featured', 'draft', 'reviewed', 'noindex', 'sample', 'articleType',
]);
/** 検索結果や記事の冒頭に出るため、古いままだと目に付きやすいフィールド */
const VISIBLE_KEYS = new Set(['title', 'description', 'summary', 'conclusion', 'keyPoints']);

/** 言い方ごとの点数。上から順に見て、当てはまったものを全部足す */
const RULES = [
  { re: /現在|時点/, weight: 2, reason: '時点つきの状況' },
  { re: /予定|見込み|予想|見通し/, weight: 3, reason: '予定・見込み' },
  { re: /(?:行われ|開かれ|開催し|始まり|実施し|運行し|販売し|受け付け|発売し|再開し|オープンし|対戦し|戦い)ます/, weight: 3, reason: '未来形' },
  { re: /受付中|販売中|募集中|発売中|配布中|公開中|運行中|開催中|実施中|営業中|休止中|運休中|運転休止|通行止め/, weight: 3, reason: '継続中の状態' },
  { re: /期限は|締切|申込期日|まで(?:です|となります|の予定|受け付け|販売|開催|運休|休止)/, weight: 2, reason: '期限' },
  { re: /受付終了|販売終了|申込終了|終了しました|終了済み|終了してい|終わりました|終わってい|経過してい|過ぎました/, weight: -3, reason: '終了済みと明記' },
  { re: /でした|ました|されていた|していた|当時|記録|振り返/, weight: -2, reason: '過去形・記録' },
  { re: /(?:現在|時点)の(?:推計)?(?:人口|世帯数)|時点で[^。]*(?:住民登録|住所|在住|居住|在籍)|基準日/, weight: -3, reason: '統計・資格の基準日' },
];

/** 記事全体が「開催前の案内の記録」だと明記している。編集で確認済みのため、優先度の対象から外す */
const ARCHIVED_RE = /開催前に(?:確認|公開)し|当時の案内|保存したもの/;

const FULL_DATE_RE = /(20\d{2})(?:年(\d{1,2})月(\d{1,2})日|[-/](\d{1,2})[-/](\d{1,2}))/g;
const REIWA_DATE_RE = /令和(\d{1,2}|元)年(\d{1,2})月(\d{1,2})日/g;
const MONTH_DAY_RE = /(?<![\d年/月])(\d{1,2})月(\d{1,2})日/g;
// 「1/2」のような分数を日付と読まないよう、年のない M/D は曜日か期間の言葉が続くときだけ拾う
const SLASH_MONTH_DAY_RE = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?=\s*[（(][月火水木金土日]|まで|〜|～|から|時点|現在|確認)/g;

const daysBetween = (a, b) => Math.round((a.valueOf() - b.valueOf()) / DAY_MS);

/** 存在する日付だけを返す（2月30日などは undefined） */
function dateOf(year, month, day) {
  try {
    return parseDateOnly(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  } catch {
    return undefined;
  }
}

/**
 * 年のない月日を、基準日（記事を書いた・確認した日）に最も近い年として読む。
 * 9月に書いた「2月16日」は翌年、11月に書いた「10月28日」は同じ年になる。
 * @param {number} month @param {number} day @param {Date} ref date-only の Date
 */
export function inferYear(month, day, ref) {
  const year = Number(toDateOnlyString(ref).slice(0, 4));
  const candidates = [year - 1, year, year + 1].map((y) => dateOf(y, month, day)).filter(Boolean);
  candidates.sort((a, b) => Math.abs(daysBetween(a, ref)) - Math.abs(daysBetween(b, ref)));
  return candidates[0];
}

/**
 * 文中の日付を YYYY-MM-DD で返す。年のない日付は ref から年を補う
 * @param {string} text @param {Date} ref
 */
export function extractDates(text, ref) {
  const found = [];
  const spans = [];
  for (const m of text.matchAll(FULL_DATE_RE)) {
    const date = dateOf(Number(m[1]), Number(m[2] ?? m[4]), Number(m[3] ?? m[5]));
    if (date) found.push({ date: toDateOnlyString(date), yearless: false });
    spans.push([m.index, m.index + m[0].length]);
  }
  for (const m of text.matchAll(REIWA_DATE_RE)) {
    const date = dateOf(2018 + (m[1] === '元' ? 1 : Number(m[1])), Number(m[2]), Number(m[3]));
    if (date) found.push({ date: toDateOnlyString(date), yearless: false });
    spans.push([m.index, m.index + m[0].length]);
  }
  const insideFullDate = (index) => spans.some(([s, e]) => index >= s && index < e);
  for (const re of [MONTH_DAY_RE, SLASH_MONTH_DAY_RE]) {
    for (const m of text.matchAll(re)) {
      if (insideFullDate(m.index)) continue;
      const date = inferYear(Number(m[1]), Number(m[2]), ref);
      if (date) found.push({ date: toDateOnlyString(date), yearless: true });
    }
  }
  return found;
}

/**
 * 1文の点数。過ぎた日付が無ければ候補にしない（score 0）
 * @param {string} sentence
 * @param {{ today: Date, ref: Date, field?: string, eventEnded?: boolean }} context
 */
export function scoreSentence(sentence, { today, ref, field, eventEnded = false }) {
  const dates = extractDates(sentence, ref);
  const todayString = toDateOnlyString(today);
  const pastDates = [...new Set(dates.filter((d) => d.date < todayString).map((d) => d.date))].sort();
  if (pastDates.length === 0) return { score: 0, reasons: [], pastDates };

  let score = 0;
  const reasons = [];
  for (const rule of RULES) {
    if (!rule.re.test(sentence)) continue;
    score += rule.weight;
    reasons.push(rule.reason);
  }
  if (/まで/.test(sentence) && !reasons.includes('期限')) {
    score += 1;
    reasons.push('まで');
  }
  const latestPast = parseDateOnly(pastDates.at(-1));
  if (reasons.includes('時点つきの状況') && daysBetween(today, latestPast) > STATUS_STALE_DAYS) {
    score += 1;
    reasons.push(`${STATUS_STALE_DAYS}日より前の状況`);
  }
  if (eventEnded && (reasons.includes('予定・見込み') || reasons.includes('未来形') || reasons.includes('継続中の状態'))) {
    score += 2;
    reasons.push('終わった催しの記事');
  }
  // これからの日付も含む文（「11月7日〜1月31日に開催」など）は、続いている期間の説明であることが多い
  if (dates.some((d) => d.date >= todayString)) {
    score -= 2;
    reasons.push('これからの日付も含む');
  }
  if (score > 0 && field && VISIBLE_KEYS.has(field)) {
    score += 1;
    reasons.push('冒頭・検索結果に出る項目');
  }
  return { score, reasons, pastDates };
}

const frontmatterDate = (src, key) => src.match(new RegExp(`^${key}:\\s*(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];

/** 記事の扱う催し・試合の最終日。eventInfo / event / sportsMatch の日付のうち最も遅いもの */
function eventEndOf(lines) {
  let key = '';
  let latest;
  for (const line of lines) {
    const top = line.match(/^([A-Za-z]\w*):/);
    if (top) key = top[1];
    if (!['eventInfo', 'event', 'sportsMatch'].includes(key)) continue;
    const m = line.match(/^\s+(?:startDate|endDate|date):\s*(\d{4}-\d{2}-\d{2})/);
    if (m && (!latest || m[1] > latest)) latest = m[1];
  }
  return latest;
}

/** YAML の行から、地の文だけを取り出す（キー名・引用符・箇条書きの記号を外す） */
const textOf = (line) => line
  .replace(/^\s*-\s+/, '')
  .replace(/^\s*[A-Za-z]\w*:\s*/, '')
  .replace(/^["']|["']$/g, '');

/**
 * 1記事を点検する。候補の文を点数の高い順に返す
 * @param {string} src Markdown（frontmatter つき）
 * @param {{ path: string, today: Date }} options
 */
export function auditFile(src, { path, today }) {
  if (/^draft:\s*true\s*$/m.test(src) || !/^reviewed:\s*true\s*$/m.test(src)) return undefined;
  const refString = frontmatterDate(src, 'updatedDate') ?? frontmatterDate(src, 'pubDate');
  const ref = refString ? parseDateOnly(refString) : today;
  const lines = src.split('\n');
  const eventEnd = eventEndOf(lines);
  const eventEnded = Boolean(eventEnd) && eventEnd < toDateOnlyString(today);

  const candidates = [];
  let key = '';
  let fence = 0;
  lines.forEach((line, i) => {
    if (line.trim() === '---') { fence += 1; return; }
    if (fence === 1) {
      const top = line.match(/^([A-Za-z]\w*):/);
      if (top) key = top[1];
    } else if (fence >= 2) {
      key = 'body';
    }
    if (SKIP_KEYS.has(key) || /^\s*(?:url|accessedAt|href):/.test(line)) return;
    for (const sentence of textOf(line).split(/(?<=[。！？])/)) {
      const text = sentence.trim();
      if (!text) continue;
      const result = scoreSentence(text, { today, ref, field: key, eventEnded });
      if (result.score <= 0) continue;
      candidates.push({ line: i + 1, field: key, ...result, excerpt: text.slice(0, 170) });
    }
  });
  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => b.score - a.score || a.line - b.line);
  const strong = candidates.filter((c) => c.score >= PRIORITY_SCORE).length;
  // 強い候補が複数ある記事を少しだけ上げる。件数で大きく動かさない（長い記事ほど件数は増えるため）
  const archived = ARCHIVED_RE.test(src);
  const raw = candidates[0].score + Math.min(2, Math.max(0, strong - 1));
  const score = archived ? Math.min(raw, PRIORITY_SCORE - 1) : raw;
  const slug = path.split('/').pop().replace(/\.md$/, '');
  const section = path.includes('/events/') ? 'events' : 'news';
  return {
    path,
    url: `/${section}/${slug}/`,
    score,
    priority: score >= PRIORITY_SCORE,
    eventEnded,
    archived,
    candidates,
  };
}

function main(argv) {
  const all = argv.includes('--all');
  const limitArg = argv.includes('--limit') ? Number(argv[argv.indexOf('--limit') + 1]) : 3;
  const limit = Number.isInteger(limitArg) && limitArg > 0 ? limitArg : 3;
  const asOf = argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? todayDateOnlyString();
  let today;
  try {
    today = parseDateOnly(asOf);
  } catch {
    console.error('基準日は YYYY-MM-DD で指定してください');
    process.exit(2);
  }

  const files = [];
  for (const dir of ['src/content/news', 'src/content/events']) {
    for (const name of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const path = join(dir, name);
      const result = auditFile(readFileSync(path, 'utf8'), { path, today });
      if (result) files.push(result);
    }
  }
  files.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const priority = files.filter((f) => f.priority);
  const shown = all ? files : priority;

  console.log(JSON.stringify({
    asOf,
    scope: 'published news and events markdown',
    reviewOnly: true,
    note: '候補の抽出だけで、記事は書き換えません。過去の日付があっても誤りとは限らないため、一次情報で確認してから直してください',
    summary: {
      files: files.length,
      candidates: files.reduce((n, f) => n + f.candidates.length, 0),
      priorityFiles: priority.length,
      priorityCandidates: priority.reduce((n, f) => n + f.candidates.filter((c) => c.score >= PRIORITY_SCORE).length, 0),
    },
    files: shown.map(({ candidates, ...file }) => ({
      ...file,
      candidateCount: candidates.length,
      top: candidates.slice(0, limit),
    })),
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
