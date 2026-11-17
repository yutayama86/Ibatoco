#!/usr/bin/env node
/**
 * Read-only watch of a small set of verified public official pages.
 * This does NOT scrape social sites, verify event claims, or publish content.
 * Keep it distinct from editorial-os (which checks already discovered events).
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = resolve(ROOT, 'data/editorial/official-source-watch.json');
const OUTPUT = resolve(ROOT, 'reports/editorial/official-source-watch.json');
const REGISTRY = resolve(ROOT, 'data/editorial/event-registry.json');
const MUNICIPALITIES = resolve(ROOT, 'src/data/areas.ts');

export function extractText(html) {
  // Tiny conservative text extractor for public watch pages, not an HTML sanitizer.
  // Parse tag boundaries rather than trying to strip script/style blocks with regex.
  const out = [];
  let ignore = null;
  let index = 0;
  while (index < html.length) {
    if (html.startsWith('<!--', index)) {
      const commentEnd = html.indexOf('-->', index + 4);
      index = commentEnd < 0 ? html.length : commentEnd + 3;
      continue;
    }
    if (html[index] !== '<') {
      if (!ignore) out.push(html[index]);
      index += 1;
      continue;
    }
    let cursor = index + 1;
    let quote = null;
    while (cursor < html.length) {
      const char = html[cursor];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
      cursor += 1;
    }
    if (cursor >= html.length) break;
    const tag = html.slice(index + 1, cursor).trim().toLowerCase();
    const closing = tag.startsWith('/');
    let pos = closing ? 1 : 0;
    while (tag[pos] === ' ') pos += 1;
    const start = pos;
    while (pos < tag.length) {
      const char = tag[pos];
      if (!((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9'))) break;
      pos += 1;
    }
    const name = tag.slice(start, pos);
    const remainder = tag.slice(pos).trim();
    if (name === 'script' || name === 'style') {
      if (!closing && !ignore) ignore = name;
      if (closing && remainder === '' && ignore === name) ignore = null;
    }
    if (!ignore) out.push(' ');
    index = cursor + 1;
  }
  const entities = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
  // Decode each original entity once; avoid cascading &amp;lt; into '<'.
  return out.join('').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entity) =>
    entities[entity.slice(1, -1)] ?? entity).replace(/\s+/g, ' ').trim();
}

export function analyzePage(text, terms) {
  const hits = terms.filter((term) => text.toLocaleLowerCase('ja').includes(term.toLocaleLowerCase('ja')));
  const dates = [...new Set([
    ...text.matchAll(/20\d{2}年\s*\d{1,2}月\s*\d{1,2}日/g),
    ...text.matchAll(/20\d{2}[-/]\d{1,2}[-/]\d{1,2}/g),
  ].map((m) => m[0]))].slice(0, 30);
  return { matchedTerms: hits, dateMentions: dates, hash: createHash('sha256').update(text).digest('hex') };
}


/**
 * Link titles are discovery hints, never verified facts.
 * No subpage requests; only links already present in the official page HTML.
 */
export function extractCandidateLinks(html, pageUrl, terms, limit = 40) {
  const out = [], seen = new Set();
  for (const match of html.matchAll(new RegExp('<a\\b([^>]*)>([\\s\\S]*?)<\\/a>', 'gi'))) {
    const attrs = match[1];
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let url;
    try { url = new URL(href.replaceAll('&amp;', '&'), pageUrl); } catch { continue; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
    if (url.username || url.password) continue;
    if (!['http:', 'https:'].includes(url.protocol)) continue;
    // Accept only the same official host, allowing the common www/non-www alias.
    const page = new URL(pageUrl);
    const hostKey = (host) => host.replace(/^www\./, '');
    if (url.protocol !== page.protocol || hostKey(url.hostname) !== hostKey(page.hostname) || url.port !== page.port) continue;
    url.hash = '';
    const title = extractText(match[2]).slice(0, 180);
    if (title.length < 4) continue;
    const hits = terms.filter((term) => title.toLocaleLowerCase('ja').includes(term.toLocaleLowerCase('ja')));
    if (!hits.length) continue;
    const key = url.href;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url: key, matchedTerms: hits, verification: 'unverified-link-title' });
    if (out.length >= limit) break;
  }
  return out;
}

export async function watchSource(source, fetchFn = fetch) {
  const checkedAt = new Date().toISOString();
  if (!source.id || !Array.isArray(source.watchTerms) || !source.url?.startsWith('https://')) {
    return { id: source.id ?? null, status: 'invalid-source', checkedAt };
  }
  try {
    const response = await fetchFn(source.url, {
      headers: { 'user-agent': 'IbatocoOfficialSourceWatch/1.0 (+https://ibatoco.jp/)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return { id: source.id, url: source.url, status: 'http-error', httpStatus: response.status, checkedAt };
    if (!response.url?.startsWith('https://')) return { id: source.id, url: source.url, status: 'unsafe-redirect', checkedAt };
    const type = response.headers.get('content-type') ?? '';
    if (!/text\/html|text\/plain/i.test(type)) return { id: source.id, url: source.url, status: 'unsupported-content-type', contentType: type, checkedAt };
    const size = Number(response.headers.get('content-length') || 0);
    if (size > 2_000_000) return { id: source.id, url: source.url, status: 'too-large', checkedAt };
    const html = await response.text();
    if (html.length > 2_000_000) return { id: source.id, url: source.url, status: 'too-large', checkedAt };
    const content = extractText(html);
    if (content.length < 80) return { id: source.id, url: source.url, status: 'empty-or-script-rendered', checkedAt };
    if (source.expectedText && !content.includes(source.expectedText)) return { id: source.id, url: source.url, status: 'expected-text-missing', expectedText: source.expectedText, checkedAt };
    return { id: source.id, url: source.url, category: source.category, area: source.area, municipality: source.municipality, scope: source.scope ?? 'ibaraki', status: 'fetched', checkedAt, ...analyzePage(content, source.watchTerms), candidateLinks: type.toLowerCase().includes('text/html') ? extractCandidateLinks(html, response.url, source.watchTerms) : [] };
  } catch (error) {
    return { id: source.id, url: source.url, status: 'fetch-failed', checkedAt, error: error?.name === 'TimeoutError' ? 'timeout' : 'network-or-access-error' };
  }
}

function officialUrlKey(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hostname = url.hostname.replace(/^www\./, '');
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.href;
  } catch { return null; }
}

/**
 * A review-only queue priority heuristic, not event verification or demand estimation.
 * Keep all low-score candidates in the artifact; menus, old lists and category links
 * must not displace time-sensitive local items in the first 20 links in the summary.
 */
export function scoreReviewCandidate(candidate, referenceDate = new Date()) {
  const title = String(candidate.title ?? '').trim();
  const url = String(candidate.url ?? '');
  let score = 0;
  const reasons = [];
  if (/(?:20(?:2[6-9]|3[0-9])|令和[89]|(?:1[0-2]|[1-9])月(?:[1-3]?\d日)?)/.test(title)) {
    score += 4;
    reasons.push('date-or-season');
  }
  if (/(?:フェス|イルミネーション|花火|マルシェ|収穫祭|お祭り|まつり|コンサート|ライブ|交流会|見学|展示会|産業祭|グルメ|体験|物産展|マーケット)/.test(title)) {
    score += 3;
    reasons.push('specific-event-theme');
  }
  if (/(?:開催|出店|開幕|参加募集|限定|申し込み|募集開始|点灯)/.test(title)) {
    score += 2;
    reasons.push('action-or-status');
  }
  if (title.length >= 12 && title.length <= 110) score += 1;
  if (/^(?:#?イベント|イベント情報|観光|お知らせ|新着情報|詳細|一覧|カレンダー|イベント一覧)$/.test(title)) {
    score -= 10;
    reasons.push('generic-navigation');
  }
  if (/(?:\/search\.|[?&](?:keyword|q)=|\/tags?\/|\/category\/)/i.test(url)) {
    score -= 3;
    reasons.push('navigation-url');
  }
  if (candidate.verification === 'unverified-single-source') {
    score += 1;
    reasons.push('direct-official-page');
  }
  // Do not let a 2025 notice, or an event that ended months ago, outrank
  // current dates merely because its title contains "2026" and "フェス".
  if (/(?:終了しました|開催しました|募集終了|受付終了|開催終了)/.test(title)) {
    score -= 8;
    reasons.push('finished-or-closed');
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(referenceDate);
  const part = (key) => Number(parts.find((x) => x.type === key)?.value);
  const thisYear = part('year'), thisMonth = part('month'), thisDay = part('day');
  const western = title.match(/(20\d{2})年\s*(\d{1,2})月(?:\s*(\d{1,2})日)?/);
  const era = title.match(/令和(\d{1,2})年\s*(\d{1,2})月(?:\s*(\d{1,2})日)?/);
  const dated = western
    ? [Number(western[1]), Number(western[2]), western[3] ? Number(western[3]) : null]
    : era ? [2018 + Number(era[1]), Number(era[2]), era[3] ? Number(era[3]) : null] : null;
  const oldYear = title.match(/20\d{2}/)?.[0];
  if ((dated && (dated[0] < thisYear || (dated[0] === thisYear && dated[1] < thisMonth)
    || (dated[0] === thisYear && dated[1] === thisMonth && dated[2] !== null && dated[2] < thisDay)))
    || (!dated && oldYear && Number(oldYear) < thisYear)) {
    score -= 7;
    reasons.push('explicit-past-date');
  }
  return { score, reasons };
}

export function annotateWatch(watch, previous = null, registry = { events: [] }) {
  const past = new Map((previous?.results ?? []).map((row) => [row.id, row]));
  const knownUrls = new Map();
  for (const event of registry.events ?? []) {
    // Multiple official references may describe the same event.
    for (const url of [event.officialUrl, ...(event.relatedOfficialUrls ?? [])].filter(Boolean)) {
      const key = officialUrlKey(url);
      if (!key) continue;
      const entries = knownUrls.get(key) ?? [];
      entries.push({ id: event.id, name: event.name, articleUrl: event.articleUrl ?? null, status: event.status });
      knownUrls.set(key, entries);
    }
  }
  const results = watch.results.map((row) => ({
    ...row,
    change: row.status !== 'fetched' ? 'not-comparable'
      : past.get(row.id)?.status !== 'fetched' ? 'no-previous-fetch'
      : past.get(row.id).hash === row.hash ? 'unchanged' : 'changed',
    registryMatchesByExactOfficialUrl: knownUrls.get(officialUrlKey(row.url)) ?? [],
    candidateLinks: (row.candidateLinks ?? []).map((link) => ({
      ...link,
      // Exact URL match is a hint only. No match is NOT evidence of an unpublished event.
      registryMatchesByExactOfficialUrl: knownUrls.get(officialUrlKey(link.url)) ?? [],
      // Scheduled GitHub jobs start from a clean checkout: absence of history is unknown.
      firstSeenInCurrentReport: !past.has(row.id) || !Array.isArray(past.get(row.id).candidateLinks)
        ? null
        : !past.get(row.id).candidateLinks.some((old) => old.url === link.url),
    })),
  }));
  const linkCandidates = results.flatMap((row) => (row.candidateLinks ?? [])
    .filter((link) => link.registryMatchesByExactOfficialUrl.length === 0)
    .map((link) => ({
      sourceId: row.id,
      area: row.area ?? null,
      title: link.title,
      url: link.url,
      verification: 'unverified-link-title',
      firstSeenInCurrentReport: link.firstSeenInCurrentReport,
    })));
  // The source URL itself may be a single official event announcement, not a
  // listing with links. This matters for organizer blogs that render lists in JS.
  // Its text is a signal only; it is NOT a verified event.
  const directSourceCandidates = results
    .filter((row) => row.status === 'fetched' && row.watchType === 'single-event'
      && row.registryMatchesByExactOfficialUrl.length === 0
      && (row.matchedTerms?.length ?? 0) > 0)
    .map((row) => ({
      sourceId: row.id,
      area: row.area ?? null,
      title: `公式個別告知（${row.id}、キーワード一致のみ）`,
      url: row.url,
      verification: 'unverified-single-source',
      firstSeenInCurrentReport: null,
    }));
  const combined = [...linkCandidates, ...directSourceCandidates];
  const deduped = [...new Map(combined.map((link) => [officialUrlKey(link.url) ?? link.url, link])).values()];
  const reviewCandidates = deduped
    .map((link) => ({ ...link, priority: scoreReviewCandidate(link) }))
    .sort((a, b) => b.priority.score - a.priority.score
      || a.sourceId.localeCompare(b.sourceId)
      || a.url.localeCompare(b.url));
  return {
    ...watch,
    previousReportAvailable: !!previous,
    candidateLinksFound: results.reduce((count, row) => count + (row.candidateLinks?.length ?? 0), 0),
    // Unmatched links require editorial review. They are not confirmed events or known omissions.
    unregisteredCandidateCount: reviewCandidates.length,
    // Preserve the full sorted queue, including low-priority items. The summary
    // displays only the first 20, but an editor can inspect every URL in the artifact.
    unregisteredCandidateLinks: reviewCandidates,
    prioritizedCandidateCount: reviewCandidates.filter((link) => link.priority.score >= 5).length,
    directSourceCandidateCount: directSourceCandidates.length,
    reviewCandidatesTruncated: false,
    tokyoIbarakiSourceCount: results.filter((row) => row.area === '東京').length,
    results,
  };
}

/**
 * Measure direct city-specific source coverage only.
 * Prefecture-wide sources do not count as direct coverage of all municipalities.
 */
export function municipalityCoverage(areaSource, sources, results = []) {
  const municipalities = [...areaSource.matchAll(/\{ slug: '([^']+)', name: '([^']+)', region: '([^']+)'/g)]
    .map((m) => ({ slug: m[1], name: m[2], region: m[3] }));
  const broadTypes = new Set(['event-index', 'news-index', 'calendar']);
  const isBroad = (source) => broadTypes.has(source.watchType);
  const configured = new Set(sources.map((source) => source.municipality).filter(Boolean));
  const broadConfigured = new Set(sources.filter(isBroad).map((source) => source.municipality).filter(Boolean));
  const liveBroad = new Set(results.filter((row) => row.status === 'fetched'
    && broadTypes.has(row.watchType)).map((row) => row.municipality).filter(Boolean));
  const signaled = new Set(results.filter((row) => row.status === 'fetched'
    && (row.candidateLinks?.length ?? 0) > 0).map((row) => row.municipality).filter(Boolean));
  const fallbackOnly = municipalities.filter((municipality) => configured.has(municipality.name)
    && !broadConfigured.has(municipality.name));
  return {
    totalMunicipalities: municipalities.length,
    citiesWithDirectSource: municipalities.filter((municipality) => configured.has(municipality.name)).length,
    citiesWithBroadSource: municipalities.filter((municipality) => broadConfigured.has(municipality.name)).length,
    citiesWithFallbackOnly: fallbackOnly.length,
    fallbackOnly,
    citiesWithFetchedBroadSource: results.length
      ? municipalities.filter((municipality) => liveBroad.has(municipality.name)).length : null,
    citiesWithCandidateLinks: results.length
      ? municipalities.filter((municipality) => signaled.has(municipality.name)).length : null,
    scanEvaluated: results.length > 0,
    missing: municipalities.filter((municipality) => !configured.has(municipality.name)),
    missingBroadSource: municipalities.filter((municipality) => !broadConfigured.has(municipality.name)),
    status: municipalities.length === 44 ? 'complete-inventory' : 'incomplete-inventory',
    note: 'Direct configuration is NOT event recall or successful fetching. Broad sources are a configured category only; calendar pages can be JavaScript-rendered. Candidate links are unverified.',
  };
}

export async function runWatch(sources, fetchFn = fetch) {
  // Bounded concurrency keeps 44-municipality expansion feasible without a burst of requests.
  const results = [];
  for (let i = 0; i < sources.length; i += 4) {
    const batch = await Promise.all(sources.slice(i, i + 4).map(async (source) => ({
      area: source.area ?? null,
      municipality: source.municipality ?? null,
      scope: source.scope ?? 'ibaraki',
      watchType: source.watchType ?? 'unclassified',
      ...await watchSource(source, fetchFn),
    })));
    results.push(...batch);
  }
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), scanned: results.length,
    fetched: results.filter((row) => row.status === 'fetched').length,
    failed: results.filter((row) => row.status !== 'fetched').length,
    coverageNote: 'Only the configured URLs were attempted. This is NOT a measure of 44-municipality coverage or event recall.',
    candidatesVerified: 0, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(readFileSync(SOURCES, 'utf8'));
  const result = annotateWatch(
    await runWatch(config.sources),
    existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : null,
    existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')) : { events: [] },
  );
  result.municipalityCoverage = municipalityCoverage(readFileSync(MUNICIPALITIES, 'utf8'), config.sources, result.results);
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exitCode = 2;
}
