/**
 * 公式サイト監視（scripts/official-source-watch.mjs）の結果から、「前日になかった新しいリンク」だけを
 * 直近の日数ぶん積み上げた小さな一覧を作る。/control/ のサマリーに出し、毎朝の取りこぼしを防ぐ。
 * 新着はキーワード一致のリンク題名にすぎず、イベントの確認済み情報ではない（記事化は一次情報で確認してから）。
 */
import { addDateOnlyDays, parseDateOnly, toDateOnlyString } from './date-only.js';

export const DIGEST_KEEP_DAYS = 14;

const shift = (day, n) => toDateOnlyString(addDateOnlyDays(parseDateOnly(day), n));
const normalize = (url) => String(url ?? '').trim().replace(/#.*$/, '').replace(/\/+$/, '');

/** 台帳（event-registry.json）に、そのURLが公式URLまたはメモとして既に入っているか */
export function registeredUrls(registry) {
  const urls = new Set();
  for (const event of registry?.events ?? []) {
    if (event.officialUrl) urls.add(normalize(event.officialUrl));
    for (const m of String(event.notes ?? '').matchAll(/https?:\/\/[^\s）)」、。]+/g)) urls.add(normalize(m[0]));
  }
  return urls;
}

/**
 * @param {any} report 当日の official-source-watch.json
 * @param {any} previous 前回までの digest（無ければ null）
 * @param {{registry?: any, sources?: any[], today: string, keepDays?: number}} options
 */
export function buildSourceWatchDigest(report, previous, { registry = null, sources = [], today, keepDays = DIGEST_KEEP_DAYS }) {
  const muni = new Map(sources.map((s) => [s.id, s.municipality ?? null]));
  const scopes = new Map(sources.map((s) => [s.id, s.scope ?? 'ibaraki']));
  const known = registeredUrls(registry);
  const since = shift(today, -(keepDays - 1));
  const items = new Map();
  for (const item of previous?.items ?? []) {
    if (item.firstSeenAt >= since) items.set(normalize(item.url), item);
  }
  for (const row of report?.results ?? []) {
    for (const link of row.candidateLinks ?? []) {
      // 比較できない（前回結果なし・新しく追加した監視先）は null。新着扱いにしない
      if (link.firstSeenInCurrentReport !== true) continue;
      const key = normalize(link.url);
      if (!key || items.has(key)) continue;
      items.set(key, {
        firstSeenAt: today,
        sourceId: row.id,
        municipality: muni.get(row.id) ?? row.municipality ?? null,
        scope: scopes.get(row.id) ?? row.scope ?? 'ibaraki',
        title: String(link.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
        url: link.url,
      });
    }
  }
  const list = [...items.values()]
    .map((item) => ({ ...item, registered: known.has(normalize(item.url)) }))
    .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt) || a.sourceId.localeCompare(b.sourceId) || a.url.localeCompare(b.url));
  return {
    schemaVersion: 1,
    generatedAt: report?.generatedAt ?? null,
    asOf: today,
    keepDays,
    scan: report ? { scanned: report.scanned ?? null, fetched: report.fetched ?? null, failed: report.failed ?? null, previousReportAvailable: report.previousReportAvailable ?? null } : null,
    note: '公式サイトの新着リンク（キーワード一致の題名のみ）。未確認情報。記事化は一次情報で確認してから。',
    items: list,
  };
}

/** BtoB の公募（入札・プロポーザル）の監視先。イベントの新着とは分けて表示する */
export const PROCUREMENT_SCOPE = 'b2b-procurement';

/**
 * サマリー表示用：直近 days 日の未登録の新着
 * @param {{ scope?: 'events' | 'procurement' }} [options] events（既定）は公募を除く、procurement は公募だけ
 */
export function pendingNewLinks(digest, today, days = 7, { scope = 'events' } = {}) {
  if (!digest?.asOf) return { items: [], stale: true };
  const since = shift(today, -(days - 1));
  const wantProcurement = scope === 'procurement';
  return {
    items: (digest.items ?? []).filter((item) => !item.registered && item.firstSeenAt >= since
      && ((item.scope === PROCUREMENT_SCOPE) === wantProcurement)),
    stale: digest.asOf < shift(today, -2),
  };
}
