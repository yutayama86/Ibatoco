/**
 * Popular article recommendation from the same Google-official GA4 snapshot
 * that daily Analytics already syncs. Pure function: no API calls, secrets,
 * hidden date coercions, ranking guesses or changes to measured counts.
 *
 * Callers provide only indexable, non-ended public article paths.
 */
import { parseDateOnly } from './date-only.js';

const EMPTY = Object.freeze({ pages: [], start: null, end: null });
const DAY_MS = 86_400_000;
const PUBLIC_ARTICLE = /^\/(?:events|news)\/[a-z0-9-]+\/$/;

export function selectConfirmedPopular(snapshot, eligiblePaths, today, limit = 8) {
  const period = snapshot?.source?.pageLevel?.periods?.recent7;
  const ga7 = snapshot?.windows?.ga4?.recent7;
  if (!period?.start || !period?.end || !ga7 || !Array.isArray(snapshot?.ga4TopPages?.recent7)) return EMPTY;
  if (snapshot?.source?.pageLevel?.ga4TopPagesUpdated !== true) return EMPTY;
  if (snapshot?.source?.pageLevel?.truncated?.ga4Pages !== false) return EMPTY;
  if (period.end !== snapshot.asOf || period.start !== ga7.start || period.end !== ga7.end) return EMPTY;
  if (!/^(?:20\d\d)-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(today)) return EMPTY;
  if (!/^(?:20\d\d)-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(period.end)) return EMPTY;
  let age;
  try {
    age = (parseDateOnly(today).valueOf() - parseDateOnly(period.end).valueOf()) / DAY_MS;
  } catch {
    return EMPTY;
  }
  if (!Number.isInteger(age) || age < 0 || age > 14) return EMPTY;
  const pages = [];
  const seen = new Set();
  for (const row of snapshot.ga4TopPages.recent7) {
    if (pages.length >= limit) break;
    const path = row?.path;
    if (!PUBLIC_ARTICLE.test(path ?? '') || !eligiblePaths.has(path) || seen.has(path)) continue;
    // An invalid first GA4 row must not be silently replaced by a later duplicate
    // for the same URL; that could turn a corrupt response into a valid-looking rank.
    seen.add(path);
    if (!Number.isInteger(row.views) || row.views < 0) continue;
    pages.push({ path, views: row.views });
  }
  return { pages, start: period.start, end: period.end };
}
