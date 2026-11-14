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
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ').trim();
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
    if (url.origin !== new URL(pageUrl).origin) continue;
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
    return { id: source.id, url: source.url, category: source.category, area: source.area, municipality: source.municipality, status: 'fetched', checkedAt, ...analyzePage(content, source.watchTerms), candidateLinks: type.toLowerCase().includes('text/html') ? extractCandidateLinks(html, response.url, source.watchTerms) : [] };
  } catch (error) {
    return { id: source.id, url: source.url, status: 'fetch-failed', checkedAt, error: error?.name === 'TimeoutError' ? 'timeout' : 'network-or-access-error' };
  }
}

export function annotateWatch(watch, previous = null, registry = { events: [] }) {
  const past = new Map((previous?.results ?? []).map((row) => [row.id, row]));
  const knownUrls = new Map();
  for (const event of registry.events ?? []) {
    if (event.officialUrl) {
      const entries = knownUrls.get(event.officialUrl) ?? [];
      entries.push({ id: event.id, name: event.name, articleUrl: event.articleUrl ?? null, status: event.status });
      knownUrls.set(event.officialUrl, entries);
    }
  }
  return {
    ...watch,
    previousReportAvailable: !!previous,
    candidateLinksFound: watch.results.reduce((count, row) => count + (row.candidateLinks?.length ?? 0), 0),
    results: watch.results.map((row) => ({
      ...row,
      change: row.status !== 'fetched' ? 'not-comparable'
        : past.get(row.id)?.status !== 'fetched' ? 'no-previous-fetch'
        : past.get(row.id).hash === row.hash ? 'unchanged' : 'changed',
      registryMatchesByExactOfficialUrl: knownUrls.get(row.url) ?? [],
      candidateLinks: (row.candidateLinks ?? []).map((link) => ({
        ...link,
        // Exact URL match only: a nonmatch does not prove unpublished or new.
        registryMatchesByExactOfficialUrl: knownUrls.get(link.url) ?? [],
        firstSeenInCurrentReport: !(past.get(row.id)?.candidateLinks ?? []).some((old) => old.url === link.url),
      })),
    })),
  };
}


/**
 * Measure direct city-specific source coverage only.
 * Prefecture-wide sources do not count as direct coverage of all municipalities.
 */
export function municipalityCoverage(areaSource, sources) {
  const municipalities = [...areaSource.matchAll(/\{ slug: '([^']+)', name: '([^']+)', region: '([^']+)'/g)]
    .map((m) => ({ slug: m[1], name: m[2], region: m[3] }));
  const directlyCovered = new Set(sources.map((s) => s.municipality).filter(Boolean));
  return {
    totalMunicipalities: municipalities.length,
    citiesWithDirectSource: municipalities.filter((m) => directlyCovered.has(m.name)).length,
    missing: municipalities.filter((m) => !directlyCovered.has(m.name)),
    status: municipalities.length === 44 ? 'complete-inventory' : 'incomplete-inventory',
    note: 'Measures configured direct municipality references, not successful crawling or event coverage.',
  };
}

export async function runWatch(sources, fetchFn = fetch) {
  const results = [];
  for (const source of sources) results.push(await watchSource(source, fetchFn));
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
  result.municipalityCoverage = municipalityCoverage(readFileSync(MUNICIPALITIES, 'utf8'), config.sources);
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exitCode = 2;
}
