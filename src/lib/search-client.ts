/**
 * サイト内検索・行き先診断のブラウザ側の共通処理。
 * 索引は /search-index.json（src/pages/search-index.json.ts）。
 * 日付は日本時間の暦日（YYYY-MM-DD の文字列）で比べる。new Date('YYYY-MM-DD') は使わない。
 */
import { addDateOnlyDays, dateOnlyWeekday, parseDateOnly } from './date-only.js';

export interface Row {
  t: string;
  d: string;
  u: string;
  k: 'news' | 'event' | 'area' | 'theme';
  p: string[];
  r: string[];
  g: string[];
  i: string[];
  /** 読み（かな・ローマ字） */
  y: string[];
  /** 日付のないガイドの見頃の月 */
  m?: number[];
  /** 月ごとのまとめ記事の年月（YYYY-MM） */
  ym?: string;
  s?: string;
  e?: string;
  x?: 1;
}

export const KIND_LABEL: Record<Row['k'], string> = { event: 'イベント', news: 'ニュース', theme: 'テーマ', area: '市町村' };

let cache: Promise<Row[]> | null = null;
export function loadIndex(): Promise<Row[]> {
  if (!cache) cache = fetch('/search-index.json').then((res) => (res.ok ? res.json() : []));
  return cache;
}

/** 全角・半角、大文字・小文字、カタカナ・ひらがなの違いを吸収する */
export function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, ' ')
    .trim();
}

/** 日本時間の今日（YYYY-MM-DD） */
export function todayJst(): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/** YYYY-MM-DD に日数を足す */
export function addDays(value: string, amount: number): string {
  return addDateOnlyDays(parseDateOnly(value), amount).toISOString().slice(0, 10);
}

/** 今週末（日本時間）。今日が土日なら今日から日曜まで */
export function weekendRange(today: string): { start: string; end: string } {
  const weekday = dateOnlyWeekday(parseDateOnly(today));
  if (weekday === 6) return { start: today, end: addDays(today, 1) };
  if (weekday === 0) return { start: today, end: today };
  const toSaturday = 6 - weekday;
  return { start: addDays(today, toSaturday), end: addDays(today, toSaturday + 1) };
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
function label(value: string): string {
  const date = parseDateOnly(value);
  const [, month, day] = value.split('-').map(Number);
  return `${month}月${day}日(${WEEK[dateOnlyWeekday(date)]})`;
}

/** 「11月7日(土)」「9月18日(金)〜11月3日(火)」 */
export function formatRange(start?: string, end?: string): string {
  if (!start) return '';
  if (!end || end === start) return label(start);
  return `${label(start)}〜${label(end)}`;
}

/** 期間 [from, to] に含まれる月（1〜12） */
export function monthsBetween(from: string, to: string): number[] {
  const months: number[] = [];
  let cursor = from.slice(0, 7);
  const last = to.slice(0, 7);
  for (let i = 0; i < 14 && cursor <= last; i += 1) {
    const [year, month] = cursor.split('-').map(Number);
    months.push(month);
    cursor = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  }
  return months;
}

/** 期間が [from, to] と重なるか */
export function overlaps(row: Row, from: string, to: string): boolean {
  if (!row.s) return false;
  return row.s <= to && (row.e ?? row.s) >= from;
}

/** HTML に差し込む文字列を無害化する */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
}

/** 結果1件のHTML */
export function rowHtml(row: Row, reason = ''): string {
  const date = formatRange(row.s, row.e);
  const meta = [KIND_LABEL[row.k], date, row.p.slice(0, 2).join('・')].filter(Boolean).map(escapeHtml).join('｜');
  return `<li class="sr-item${row.x ? ' is-ended' : ''}">
    <a href="${escapeHtml(row.u)}">
      <span class="sr-meta">${meta}${row.x ? '<b class="sr-ended">終了</b>' : ''}</span>
      <strong class="sr-title">${escapeHtml(row.t)}</strong>
      ${reason ? `<span class="sr-reason">${escapeHtml(reason)}</span>` : ''}
      ${row.d ? `<span class="sr-desc">${escapeHtml(row.d)}</span>` : ''}
    </a>
  </li>`;
}
