/**
 * src/data/seo-changes.ts（変更履歴）を読む。TypeScript を実行せず、文字列から1エントリずつ取り出す。
 * editorial-os.mjs と同じ項目に加え、experimentType（観測の種類。書かれていれば優先）も拾う。
 * CI の観測窓ガード（scripts/observation-guard.mjs）は、PR の差分ではなく main 側の履歴をこの関数に渡す。
 */
export function parseSeoChanges(source) {
  const out = [];
  for (const block of source.split(/\n\s{2}\{\n/).slice(1)) {
    const field = (key) => block.match(new RegExp(`\\n?\\s*${key}:\\s*'([^']*)'`))?.[1] ?? null;
    const id = field('id');
    const date = field('date');
    const url = field('url');
    if (!id || !date || !url) continue;
    out.push({ id, date, url, kind: field('kind'), change: field('change'), experimentType: field('experimentType') });
  }
  return out;
}
