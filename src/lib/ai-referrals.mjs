/**
 * AI 検索・AI アシスタント経由の流入（GA4 の既定チャネル「AI Assistant」）を、
 * どの AI から（sessionSource）・どのページに（landingPage）来たかで集計する。
 * 取得は scripts/google-api-daily.mjs（読み取りのみ）、表示は Control Center。
 * 取れない値は 0 で埋めず null（AGENTS.md）。
 */

/** sessionSource を AI ごとの表示名にまとめる。知らない参照元はそのまま出す（推測で寄せない） */
export function aiSourceLabel(source) {
  const s = String(source ?? '').toLowerCase();
  if (/chatgpt|openai/.test(s)) return 'ChatGPT';
  if (/perplexity/.test(s)) return 'Perplexity';
  if (/gemini|bard/.test(s)) return 'Gemini';
  if (/copilot|bing\.com\/chat/.test(s)) return 'Copilot';
  if (/claude/.test(s)) return 'Claude';
  if (/deepseek/.test(s)) return 'DeepSeek';
  if (/grok|x\.ai/.test(s)) return 'Grok';
  return source || '(不明)';
}

/**
 * GA4 runReport の行（dimensions: sessionSource, landingPage／metrics: sessions, screenPageViews）を集計する。
 * @param {Array<{dimensionValues: {value: string}[], metricValues: {value: string}[]}>} rows
 */
export function aggregateAiReferrals(rows, { topPages = 20 } = {}) {
  const bySource = new Map();
  const byPage = new Map();
  let sessions = 0;
  let views = 0;
  for (const row of rows ?? []) {
    const source = row.dimensionValues?.[0]?.value ?? '';
    const page = row.dimensionValues?.[1]?.value ?? '';
    const s = Number(row.metricValues?.[0]?.value);
    const v = Number(row.metricValues?.[1]?.value);
    if (!Number.isFinite(s) || !Number.isFinite(v) || s < 0 || v < 0) throw new Error('Invalid AI referral metrics');
    sessions += s;
    views += v;
    const label = aiSourceLabel(source);
    const a = bySource.get(label) ?? { source: label, sessions: 0, views: 0 };
    a.sessions += s; a.views += v; bySource.set(label, a);
    const p = byPage.get(page) ?? { path: page, sessions: 0, views: 0, sources: {} };
    p.sessions += s; p.views += v; p.sources[label] = (p.sources[label] ?? 0) + s; byPage.set(page, p);
  }
  return {
    sessions,
    views,
    bySource: [...bySource.values()].sort((a, b) => b.sessions - a.sessions),
    topPages: [...byPage.values()].sort((a, b) => b.sessions - a.sessions).slice(0, topPages),
    pageCount: byPage.size,
  };
}
