import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSourceWatchDigest, pendingNewLinks } from '../src/lib/source-watch-digest.mjs';

const report = (links) => ({ generatedAt: '2026-11-23T01:51:00Z', scanned: 2, fetched: 2, failed: 0, previousReportAvailable: true,
  results: [{ id: 'oarai-tourism-news', municipality: '大洗町', candidateLinks: links }] });
const sources = [{ id: 'oarai-tourism-news', municipality: '大洗町' }];

test('前日になかったリンクだけを新着にし、比較できないものは入れない', () => {
  const d = buildSourceWatchDigest(report([
    { title: '大洗のクリスマスマーケット', url: 'https://oarai.example/x1', firstSeenInCurrentReport: true },
    { title: '既存', url: 'https://oarai.example/x2', firstSeenInCurrentReport: false },
    { title: '比較不能', url: 'https://oarai.example/x3', firstSeenInCurrentReport: null },
  ]), null, { sources, today: '2026-11-23' });
  assert.deepEqual(d.items.map((x) => x.url), ['https://oarai.example/x1']);
  assert.equal(d.items[0].municipality, '大洗町');
  assert.equal(d.items[0].firstSeenAt, '2026-11-23');
});

test('積み上げは保持期間で切れ、初出日を上書きしない。台帳にあれば登録済み', () => {
  const prev = { items: [
    { firstSeenAt: '2026-11-01', sourceId: 's', title: '古い', url: 'https://a.example/old' },
    { firstSeenAt: '2026-11-20', sourceId: 's', title: '既出', url: 'https://a.example/kept' },
  ] };
  const registry = { events: [{ officialUrl: null, notes: '告知（https://a.example/kept）で確認' }] };
  const d = buildSourceWatchDigest(report([{ title: '再掲', url: 'https://a.example/kept/', firstSeenInCurrentReport: true }]), prev,
    { registry, sources, today: '2026-11-23' });
  assert.deepEqual(d.items.map((x) => [x.url, x.firstSeenAt, x.registered]), [['https://a.example/kept', '2026-11-20', true]]);
});

test('サマリーは未登録の直近分だけ、古い digest は stale', () => {
  const digest = { asOf: '2026-11-23', items: [
    { firstSeenAt: '2026-11-23', url: 'u1', registered: false },
    { firstSeenAt: '2026-11-23', url: 'u2', registered: true },
    { firstSeenAt: '2026-11-10', url: 'u3', registered: false },
  ] };
  assert.deepEqual(pendingNewLinks(digest, '2026-11-23').items.map((x) => x.url), ['u1']);
  assert.equal(pendingNewLinks(digest, '2026-11-23').stale, false);
  assert.equal(pendingNewLinks(digest, '2026-11-27').stale, true);
  assert.equal(pendingNewLinks({ asOf: null, items: [] }, '2026-11-23').stale, true);
});

test('公募（BtoB）はイベントの新着と分け、scope を引き継ぐ', () => {
  const rep = { generatedAt: 'x', results: [
    { id: 'oarai-tourism-news', candidateLinks: [{ title: 'イベント', url: 'https://e.example/1', firstSeenInCurrentReport: true }] },
    { id: 'tenders', candidateLinks: [{ title: '情報発信業務の公募型プロポーザル', url: 'https://t.example/1', firstSeenInCurrentReport: true }] },
  ] };
  const d = buildSourceWatchDigest(rep, null, { sources: [{ id: 'oarai-tourism-news', municipality: '大洗町' }, { id: 'tenders', scope: 'b2b-procurement' }], today: '2026-11-24' });
  assert.deepEqual(pendingNewLinks(d, '2026-11-24').items.map((x) => x.url), ['https://e.example/1']);
  assert.deepEqual(pendingNewLinks(d, '2026-11-24', 7, { scope: 'procurement' }).items.map((x) => x.url), ['https://t.example/1']);
});
