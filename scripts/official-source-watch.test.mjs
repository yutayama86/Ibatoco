import test from 'node:test';
import assert from 'node:assert/strict';
import { extractText, analyzePage, runWatch, annotateWatch, extractCandidateLinks, municipalityCoverage } from './official-source-watch.mjs';

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

test('report page changes and existing event by exact official URL without claiming full coverage', () => {
  const watch = { results: [
    { id:'a', url:'https://example.org/event', status:'fetched', hash:'new' },
    { id:'b', url:'https://example.org/feed', status:'http-error' },
  ] };
  const previous = { results: [{ id:'a', status:'fetched', hash:'old' }] };
  const registry = { events: [{ id:'event-2026', name:'Festival', officialUrl:'https://example.org/event', articleUrl:null, status:'draft' }] };
  const result = annotateWatch(watch, previous, registry);
  assert.equal(result.previousReportAvailable, true);
  assert.equal(result.results[0].change, 'changed');
  assert.equal(result.results[0].registryMatchesByExactOfficialUrl[0].status, 'draft');
  assert.equal(result.results[1].change, 'not-comparable');
  assert.deepEqual(result.results[1].registryMatchesByExactOfficialUrl, []);
});

test('extract same-origin event links without treating them as verified events', () => {
  const html = '<a href="/event/2026">コーヒーフェス2026</a><a href="https://outside.example/event">コーヒーフェス外部</a><a href="javascript:alert(1)">コーヒーフェスJS</a><a href="/event/2026">コーヒーフェス2026</a><a href="/other">その他</a>';
  const rows = extractCandidateLinks(html, 'https://city.example.jp/calendar/', ['コーヒー']);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].url, 'https://city.example.jp/event/2026');
  assert.equal(rows[0].verification, 'unverified-link-title');
});

test('compare candidate link exact URLs with existing registry and prior report', () => {
  const link = {title:'出演イベント',url:'https://city.example.jp/event/1',matchedTerms:['出演'],verification:'unverified-link-title'};
  const report = annotateWatch(
    { results: [{ id:'source',url:'https://city.example.jp/calendar/',status:'fetched',hash:'abc',candidateLinks:[link] }] },
    { results: [{ id:'source',status:'fetched',hash:'abc',candidateLinks:[] }] },
    { events: [{id:'event-1',name:'出演イベント',officialUrl:link.url,articleUrl:'/events/event-1/',status:'published'}] }
  );
  assert.equal(report.candidateLinksFound, 1);
  assert.equal(report.results[0].candidateLinks[0].firstSeenInCurrentReport, true);
  assert.equal(report.results[0].candidateLinks[0].registryMatchesByExactOfficialUrl[0].articleUrl, '/events/event-1/');
});

test('show exactly which municipality needs a direct official source', () => {
  const areaSource = [
    "{ slug: 'mito', name: '水戸市', region: 'keno' }",
    "{ slug: 'koga', name: '古河市', region: 'kensei' }",
  ].join('\n');
  const coverage = municipalityCoverage(areaSource, [{municipality:'水戸市'}, {municipality:null}]);
  assert.equal(coverage.citiesWithDirectSource, 1);
  assert.equal(coverage.missing[0].name, '古河市');
  assert.equal(coverage.status, 'incomplete-inventory');
});

test('detect stale official edition even when page is fetched successfully', async () => {
  const source = { id:'festival-2026', url:'https://town.example.jp/event', watchTerms:['秋まつり'], expectedText:'2026八千代の秋まつり' };
  const result = await runWatch([source], async () => ({
    ok:true, url:'https://town.example.jp/event', headers:new Headers({'content-type':'text/html'}),
    text:async()=>'<html><body>'+'2024八千代の秋まつりイベント案内'.repeat(9)+'</body></html>',
  }));
  assert.equal(result.results[0].status,'expected-text-missing');
  assert.equal(result.failed,1);
  assert.equal(result.candidatesVerified,0);
});
