import test from 'node:test';
import assert from 'node:assert/strict';
import { extractText, analyzePage, runWatch } from './official-source-watch.mjs';

test('strip scripts and distinguish date mentions from verified event dates', () => {
  const text = extractText('<p>2026年11月14日 COFFEE FESTIVAL</p><script>fake date 2026年12月1日</script>');
  const result = analyzePage(text, ['COFFEE FESTIVAL','芸能人']);
  assert.deepEqual(result.matchedTerms, ['COFFEE FESTIVAL']);
  assert.deepEqual(result.dateMentions, ['2026年11月14日']);
  assert.equal(result.hash.length, 64);
});

test('report HTTP errors instead of claiming a successful scan', async () => {
  const sources = [{id:'blocked',url:'https://example.org/x',watchTerms:['イベント']}];
  const result = await runWatch(sources, async () => ({ok:false,status:403}));
  assert.equal(result.fetched, 0);
  assert.equal(result.failed, 1);
  assert.equal(result.results[0].status, 'http-error');
});

test('matching keywords does not create a verified event', async () => {
  const sources = [{id:'official',url:'https://example.org/x',watchTerms:['まつり'],category:'government'}];
  const result = await runWatch(sources, async () => ({
    ok:true,url:'https://example.org/x',headers:new Headers({'content-type':'text/html'}),
    text:async()=>'<html><body>'+'イベント案内 まつり 2026年11月14日 '.repeat(9)+'</body></html>',
  }));
  assert.equal(result.fetched, 1);
  assert.equal(result.candidatesVerified, 0);
  assert.deepEqual(result.results[0].matchedTerms,['まつり']);
});
