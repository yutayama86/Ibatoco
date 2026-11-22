/** Issue #683: stable event-page cohort and next-step selection. No cookies. */
export function experimentGroup(slug) {
  let hash = 2166136261;
  for (const char of slug) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2 === 0 ? 'A' : 'B';
}

/** Only already-published, indexable, active destinations can be selected. */
export function selectNextSteps(current, candidates, limit = 3) {
  const used = new Set([current.path]);
  const valid = candidates.filter((item) =>
    item.path && !item.noindex && (!item.pubDate || new Date(item.pubDate).getTime() <= Date.now()) && item.eventLifecycle !== 'ended' && item.eventLifecycle !== 'unconfirmed' &&
    item.eventLifecycle !== 'cancelled' && item.eventLifecycle !== 'postponed' &&
    item.path !== current.path
  );
  const result = [];
  for (const kind of ['access', 'nearby', 'next']) {
    const item = valid.find((candidate) => candidate.kind === kind && !used.has(candidate.path));
    if (!item) continue;
    used.add(item.path);
    result.push({ path: item.path, title: item.title, kind });
    if (result.length >= limit) break;
  }
  return result;
}
