import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractText, analyzePage, runWatch, annotateWatch, extractCandidateLinks, municipalityCoverage, scoreReviewCandidate } from './official-source-watch.mjs';

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

test('www aliases on the same official host are not missed or treated as external hosts', () => {
  const html = '<a href="https://www.ibaraki-shokusai.net/info/detail/18485">茨城をたべよう収穫祭2026</a>' +
    '<a href="https://ibaraki-shokusai.net.evil.example/info/99">茨城イベント</a>';
  const links = extractCandidateLinks(html, 'https://ibaraki-shokusai.net/info', ['茨城', '収穫祭']);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://www.ibaraki-shokusai.net/info/detail/18485');
  const report = annotateWatch({ results: [{ id: 'food', status: 'fetched', url: 'https://ibaraki-shokusai.net/info', candidateLinks: links }] }, null, {
    events: [{ id: 'harvest', name: '茨城収穫祭', officialUrl: 'https://ibaraki-shokusai.net/info/detail/18485/', articleUrl: null }],
  });
  assert.equal(report.unregisteredCandidateCount, 0);
  assert.equal(report.results[0].candidateLinks[0].registryMatchesByExactOfficialUrl[0].id, 'harvest');
});


test('44 municipalities are registered, but fallback-only and live scan coverage remain distinct', () => {
  const config = JSON.parse(readFileSync(new URL('../data/editorial/official-source-watch.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL('../src/data/areas.ts', import.meta.url), 'utf8');
  const inventory = municipalityCoverage(source, config.sources);
  assert.equal(inventory.totalMunicipalities, 44);
  assert.equal(inventory.citiesWithDirectSource, 44);
  assert.equal(inventory.citiesWithBroadSource, 43);
  assert.equal(inventory.citiesWithFallbackOnly, 1);
  assert.deepEqual(inventory.fallbackOnly.map((m) => m.name).sort(), ['河内町']);
  assert.equal(inventory.scanEvaluated, false);
  assert.equal(inventory.citiesWithFetchedBroadSource, null);
  assert.equal(inventory.citiesWithCandidateLinks, null);
  assert.ok(config.sources.some((s) => s.id === 'hitachinaka-city-event-index'));
  assert.ok(config.sources.some((s) => s.area === '東京'));
  assert.equal(new Set(config.sources.map((s) => s.id)).size, config.sources.length);
});

test('unresponsive calendar stays unverified, even if a source was configured', () => {
  const areaSource = [
    "{ slug: 'itako', name: '潮来市', region: 'rokko' }",
    "{ slug: 'hitachi', name: '日立市', region: 'kenpoku' }",
  ].join('\n');
  const sources = [
    { municipality: '潮来市', watchType: 'news-index' },
    { municipality: '日立市', watchType: 'calendar' },
  ];
  const actual = municipalityCoverage(areaSource, sources, [
    { municipality: '潮来市', watchType: 'news-index', status: 'fetched', candidateLinks: [{ title: 'イベント候補' }] },
    { municipality: '日立市', watchType: 'calendar', status: 'http-error', candidateLinks: [] },
  ]);
  assert.equal(actual.citiesWithDirectSource, 2);
  assert.equal(actual.citiesWithBroadSource, 2);
  assert.equal(actual.citiesWithFetchedBroadSource, 1);
  assert.equal(actual.citiesWithCandidateLinks, 1);
  assert.equal(actual.status, 'incomplete-inventory'); // Fixture intentionally contains only two municipalities.
});


test('live diagnosis fallbacks use official URLs without pretending Kawachi municipality feed works', () => {
  const config = JSON.parse(readFileSync(new URL('../data/editorial/official-source-watch.json', import.meta.url), 'utf8'));
  const find = (id) => config.sources.find((x) => x.id === id);
  assert.ok(find('omitama-city-calendar').url.startsWith('https://www.city.omitama.lg.jp/'));
  assert.equal(find('sakai-town-home').watchType, 'news-index');
  assert.ok(find('sakai-town-home').url.includes('/news.php?type=0'));
  assert.equal(find('kawachi-town-home').watchType, 'fallback-home');
  assert.equal(find('kawachi-illumination-2026-official').watchType, 'single-event');
  assert.equal(find('tokyo-daigo-talk-2026-direct').scope, 'tokyo-ibaraki');
  assert.equal(config.sources.length, 59);
});

test('unverified-specific-event candidates outrank generic menus but all remain available', () => {
  const menu = {title:'イベント',url:'https://city.example.jp/event.php'};
  const upcoming = {title:'2026年11月29日 潮来水辺イルミネーションを開催',url:'https://city.example.jp/page/2026'};
  assert.ok(scoreReviewCandidate(upcoming).score > scoreReviewCandidate(menu).score);
  const links = [
    { ...menu, verification:'unverified-link-title' },
    { ...upcoming, verification:'unverified-link-title' },
  ];
  const report = annotateWatch({results:[{id:'official',status:'fetched',url:'https://city.example.jp/',candidateLinks:links}]});
  assert.equal(report.unregisteredCandidateCount, 2);
  assert.equal(report.reviewCandidatesTruncated, false);
  assert.equal(report.unregisteredCandidateLinks[0].url, upcoming.url);
  assert.equal(report.unregisteredCandidateLinks[1].url, menu.url);
  assert.equal(report.prioritizedCandidateCount, 1);
  assert.equal(report.candidatesVerified, undefined);
});

test('unregistered individual official page becomes unverified direct-source candidate, not an automatically verified event', async () => {
  const source = {id:'town-event',url:'https://town.example.jp/page/2026',watchType:'single-event',watchTerms:['まつり'],municipality:'河内町'};
  const fetched = await runWatch([source], async () => ({
    ok:true,url:source.url,headers:new Headers({'content-type':'text/html'}),
    text:async()=>'<html><body>2026年11月29日 まつりを開催します。来場前に最新の案内をご確認ください。</body></html>'.repeat(4),
  }));
  const pending = annotateWatch(fetched, null, {events:[]});
  assert.equal(pending.unregisteredCandidateCount, 1);
  assert.equal(pending.directSourceCandidateCount, 1);
  assert.equal(pending.unregisteredCandidateLinks[0].verification,'unverified-single-source');
  assert.equal(pending.unregisteredCandidateLinks[0].firstSeenInCurrentReport,null);
  const alreadyKnown = annotateWatch(fetched, null, {events:[{id:'known',officialUrl:source.url,name:'まつり',status:'published'}]});
  assert.equal(alreadyKnown.directSourceCandidateCount,0);
});

test('keep every unmatched source link in artifact rather than losing candidates after position 100', () => {
  const candidateLinks = Array.from({length:105},(_,i)=>({
    title:`2026年12月 地域フェス${String(i).padStart(3,'0')}`,
    url:`https://city.example.jp/announcements/${i}`,
    verification:'unverified-link-title',
  }));
  const result = annotateWatch({results:[{id:'official',status:'fetched',url:'https://city.example.jp/news',candidateLinks}]});
  assert.equal(result.unregisteredCandidateCount,105);
  assert.equal(result.unregisteredCandidateLinks.length,105);
  assert.equal(result.reviewCandidatesTruncated,false);
});


test('past or already ended event notices never outrank upcoming event hints', () => {
  const now = new Date('2026-11-17T06:00:00Z');
  const upcoming = scoreReviewCandidate({title:'2026年12月12日 第2回さかさマルシェを開催します',url:'https://city.example.jp/event/12'}, now);
  const past = scoreReviewCandidate({title:'2026年1月24日 ほこたおいもフェス2026を開催します',url:'https://city.example.jp/event/1'}, now);
  const finished = scoreReviewCandidate({title:'2026年11月2日 祭りを開催しました',url:'https://city.example.jp/event/2'}, now);
  assert.ok(upcoming.score > past.score);
  assert.ok(upcoming.score > finished.score);
  assert.ok(past.reasons.includes('explicit-past-date'));
  assert.ok(finished.reasons.includes('finished-or-closed'));
});

test('extract every same-host candidate beyond the previous 40-link cutoff', () => {
  const html = Array.from({ length: 75 }, (_, i) => `<a href="/event/${i}">地域フェス${i}</a>`).join('');
  const links = extractCandidateLinks(html, 'https://city.example.jp/news', ['フェス']);
  assert.equal(links.length, 75);
  assert.equal(links.at(-1).url, 'https://city.example.jp/event/74');
  assert.equal(extractCandidateLinks(html, 'https://city.example.jp/news', ['フェス'], 0).length, 0);
});

test('recovery after failed source fetch cannot establish first appearance', () => {
  const row = { id: 'town', status: 'fetched', url: 'https://town.example.jp/news', candidateLinks: [
    { title: '地域フェス2026', url: 'https://town.example.jp/event/1' },
  ] };
  const previous = { results: [{ id: 'town', status: 'http-error', candidateLinks: [] }] };
  const result = annotateWatch({ results: [row] }, previous);
  assert.equal(result.unregisteredCandidateLinks[0].firstSeenInCurrentReport, null);
});

test('short dates are review hints, and an ongoing range is not treated as ended', () => {
  const now = new Date('2026-11-18T00:00:00Z');
  for (const title of ['1/24(土)・1/25(日)ほこたおいもフェス2026を開催します', '10月10日さかさマルシェを開催します']) {
    assert.ok(scoreReviewCandidate({ title }, now).reasons.includes('explicit-past-date'));
  }
  assert.ok(!scoreReviewCandidate({ title: '2026年11月1日〜30日 菊まつりを開催' }, now).reasons.includes('explicit-past-date'));
});
