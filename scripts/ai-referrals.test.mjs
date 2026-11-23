import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateAiReferrals, aiSourceLabel } from '../src/lib/ai-referrals.mjs';

const row = (source, page, s, v) => ({ dimensionValues: [{ value: source }, { value: page }], metricValues: [{ value: String(s) }, { value: String(v) }] });

test('aiSourceLabel groups known assistants and keeps unknown sources as-is', () => {
  assert.equal(aiSourceLabel('chatgpt.com'), 'ChatGPT');
  assert.equal(aiSourceLabel('perplexity.ai'), 'Perplexity');
  assert.equal(aiSourceLabel('gemini.google.com'), 'Gemini');
  assert.equal(aiSourceLabel('copilot.microsoft.com'), 'Copilot');
  assert.equal(aiSourceLabel('claude.ai'), 'Claude');
  assert.equal(aiSourceLabel('example-ai.app'), 'example-ai.app');
});

test('aggregateAiReferrals sums by assistant and page', () => {
  const r = aggregateAiReferrals([
    row('chatgpt.com', '/a/', 10, 15), row('chatgpt.com', '/b/', 2, 2), row('perplexity.ai', '/a/', 3, 6),
  ]);
  assert.equal(r.sessions, 15);
  assert.equal(r.views, 23);
  assert.deepEqual(r.bySource.map((x) => [x.source, x.sessions]), [['ChatGPT', 12], ['Perplexity', 3]]);
  assert.equal(r.topPages[0].path, '/a/');
  assert.deepEqual(r.topPages[0].sources, { ChatGPT: 10, Perplexity: 3 });
});

test('aggregateAiReferrals rejects invalid metrics instead of zero-filling', () => {
  assert.throws(() => aggregateAiReferrals([row('chatgpt.com', '/a/', 'x', 1)]));
});

test('daily sync imports AI referrals and the A/B experiment (regression: they were only in ga4-daily.mjs)', async () => {
  const { readFileSync } = await import('node:fs');
  const sync = readFileSync('scripts/google-analytics-sync.mjs', 'utf8');
  assert.match(sync, /input\.aiReferrals/);
  assert.match(sync, /input\.nextStepExperiment/);
  const fetch = readFileSync('scripts/google-api-daily.mjs', 'utf8');
  assert.match(fetch, /aiReferrals/);
  assert.match(fetch, /baseline: \{ period: NEXT_STEP_BASELINE/);
});
