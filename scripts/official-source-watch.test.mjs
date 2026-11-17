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

test('strip closing script and style tags with whitespace before closing bracket', () => {
  const html = '<p>2026年11月15日 イベント</p><script>hidden 2024年11月15日</script ><style>secret</style >';
  const text = extractText(html);
  assert.ok(text.includes('2026年11月15日'));
  assert.ok(!text.includes('2024年11月15日'));
  assert.ok(!text.includes('secret'));
});

test('do not treat malformed script closing tag as a valid end tag', () => {
  const html = '<p>公開イベント</p><script>SECRET</script bar>SECRET2</script><p>駐車場</p>';
  const text = extractText(html);
  assert.ok(text.includes('公開イベント'));
  assert.ok(text.includes('駐車場'));
  assert.ok(!text.includes('SECRET'));
});

test('decode HTML entities once without cascading escapes', () => {
  assert.equal(extractText('<p>&amp;lt; &lt; &amp;amp; &nbsp;</p>'), '&lt; < &amp;');
});


test('do not claim a candidate is new without a persisted prior scan', () => {
  const eventUrl = 'https://www.city.itako.lg.jp/kankou/kankou-info/page007950.html';
  const row = { id: 'itako', area: '鹿行', url: 'https://www.city.itako.lg.jp/kankou/kankou-info/', status: 'fetched', hash: 'abc', candidateLinks: [
    { title: '水の郷 水辺イルミネーション Riverside Illumination', url: eventUrl, verification: 'unverified-link-title' }
  ] };
  const result = annotateWatch({ results: [row] }, null, { events: [] });
  assert.equal(result.previousReportAvailable, false);
  assert.equal(result.candidateLinksFound, 1);
  assert.equal(result.unregisteredCandidateCount, 1);
  assert.equal(result.results[0].candidateLinks[0].firstSeenInCurrentReport, null);
  assert.equal(result.unregisteredCandidateLinks[0].url, eventUrl);
});

test('known missed Ibaraki events are matched against a registry, including related official URLs', () => {
  const imo = 'https://tokai-kanko.com/events/p-01142';
  const itako = 'https://www.city.itako.lg.jp/kankou/kankou-info/page007950.html';
  const html = '<a href="/events/p-01142">IMOフェス2026</a>';
  const links = extractCandidateLinks(html, 'https://tokai-kanko.com/events', ['IMOフェス']);
  const registry = { events: [
    { id: 'tokai-imo-fes-2026', name: 'IMOフェス2026', officialUrl: imo, articleUrl: null },
    { id: 'itako-riverside-illumination-2026', name: 'Riverside Illumination', officialUrl: 'https://example.org/itako', relatedOfficialUrls: [itako], articleUrl: null },
  ] };
  const watch = { results: [
    { id: 'tokai', status: 'fetched', hash: 'a', url: 'https://tokai-kanko.com/events', candidateLinks: links },
    { id: 'itako', status: 'fetched', hash: 'b', url: 'https://www.city.itako.lg.jp/kankou/', candidateLinks: [{ title: 'Riverside Illumination', url: itako }] },
  ] };
  const result = annotateWatch(watch, null, registry);
  assert.equal(result.unregisteredCandidateCount, 0);
  assert.equal(result.results[0].candidateLinks[0].registryMatchesByExactOfficialUrl[0].id, 'tokai-imo-fes-2026');
  assert.equal(result.results[1].candidateLinks[0].registryMatchesByExactOfficialUrl[0].id, 'itako-riverside-illumination-2026');
});

test('Tokyo Ibaraki sources are separate from 44-city coverage', async () => {
  const sources = [
    { id: 'food', url: 'https://ibaraki-shokusai.net/info', watchTerms: ['収穫祭'], area: '東京', scope: 'tokyo-ibaraki' },
    { id: 'itako', url: 'https://www.city.itako.lg.jp/kankou/', watchTerms: ['イルミ'], area: '鹿行', municipality: '潮来市' },
  ];
  const html = '<html><body><a href="/info/detail/18485">茨城をたべよう収穫祭2026</a><p>イベントのお知らせ。公式の情報を確認してください。</p>'.repeat(5) + '</body></html>';
  const report = annotateWatch(await runWatch(sources, async (url) => ({
    ok: true, url, headers: new Headers({ 'content-type': 'text/html' }), text: async () => html,
  })));
  assert.equal(report.tokyoIbarakiSourceCount, 1);
  assert.equal(report.scanned, 2);
  assert.equal(report.results[0].scope, 'tokyo-ibaraki');
  assert.equal(report.results[0].candidateLinks[0].title, '茨城をたべよう収穫祭2026');
  const areas = "{ slug: 'itako', name: '潮来市', region: 'rokko' }";
  assert.equal(municipalityCoverage(areas, sources).citiesWithDirectSource, 1);
});

test('failed Tokyo official source still counts as attempted and is not misreported as no events', async () => {
  const report = annotateWatch(await runWatch([
    { id: 'tokyo-site', url: 'https://tokyo.example.org/news', area: '東京', scope: 'tokyo-ibaraki', watchTerms: ['茨城'] },
  ], async () => ({ ok: false, status: 503 })));
  assert.equal(report.scanned, 1);
  assert.equal(report.failed, 1);
  assert.equal(report.tokyoIbarakiSourceCount, 1);
  assert.equal(report.results[0].status, 'http-error');
  assert.equal(report.candidatesVerified, 0);
});
