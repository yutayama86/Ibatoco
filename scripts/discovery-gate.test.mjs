/**
 * Discovery Gate（scripts/lib/discovery-gate.mjs）の単体テスト（node --test）。npm run verify で実行する。
 * 判定を変えたら docs/EDITORIAL_OS.md の「Discovery Gate」と一緒に直す。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { discoveryGate, discoveryMarkdown, findDuplicates, normalizeEventName, parseRegions, recheckDue, validateDiscovery } from './lib/discovery-gate.mjs';

const TODAY = '2026-10-17'; // 土曜
const ev = (over) => ({ id: 'x', name: 'イベント', municipality: 'kasama', startDate: '2026-11-01', endDate: null, officialUrl: 'https://example.jp/', discoveredAt: '2026-10-01', verifiedAt: '2026-10-01', articleUrl: null, status: 'verified', importance: 'normal', signals: {}, notes: '', ...over });

test('重複：年・回数・記号・全角半角の違いを除いた名前＋開始日が同じなら error', () => {
  assert.equal(normalizeEventName('第11回 水戸黄門漫遊マラソン'), normalizeEventName('水戸黄門漫遊マラソン2026'));
  const dups = findDuplicates([
    ev({ id: 'a', name: '第11回水戸黄門漫遊マラソン', startDate: '2026-10-25' }),
    ev({ id: 'b', name: '水戸黄門漫遊マラソン 2026', startDate: '2026-10-25', officialUrl: 'https://other.jp/' }),
  ]);
  assert.deepEqual(dups.map((d) => [d.level, d.ids]), [['error', ['a', 'b']]]);
});

test('重複：一次情報URLは、クエリで催しを分けるポータルを別物として扱う', () => {
  const dups = findDuplicates([
    ev({ id: 'a', name: 'A', startDate: '2026-09-19', officialUrl: 'https://www.ibarakiguide.jp/event.php?code=1412&mode=detail' }),
    ev({ id: 'b', name: 'B', startDate: '2026-09-19', officialUrl: 'https://www.ibarakiguide.jp/event.php?code=1387&mode=detail' }),
    ev({ id: 'c', name: 'C', startDate: '2026-09-19', officialUrl: 'https://ibarakiguide.jp/event.php?mode=detail&code=1412' }),
  ]);
  assert.deepEqual(dups.map((d) => [d.level, d.ids]), [['warning', ['a', 'c']]]);
});

test('検証：見送りには理由、importance は3値、関連記事は実在するものだけ', () => {
  const { errors } = validateDiscovery([
    ev({ id: 'skip', status: 'rejected' }),
    ev({ id: 'skip-ok', name: '別の催し', status: 'rejected', skipReason: '来場規模・検索需要とも小さく、11月まとめへの追記で足りる' }),
    ev({ id: 'imp', name: '重要度', importance: 'huge' }),
    ev({ id: 'rel', name: '関連', relatedArticleUrls: ['/events/nai/'] }),
  ], new Set(['/events/aru/']));
  assert.equal(errors.length, 3);
  assert.match(errors.join('\n'), /skipReason が必要: skip$/m);
  assert.match(errors.join('\n'), /不正なimportance: imp/);
  assert.match(errors.join('\n'), /relatedArticleUrlsの記事がありません: rel/);
});

test('確認期限：30日前・14日前・7日前・前日の節目より前の確認しかなければ期限', () => {
  // 開催5日前 → 7日前の節目（10/15）。10/14確認なら期限、10/16確認なら済み
  assert.equal(recheckDue(ev({ startDate: '2026-10-22', verifiedAt: '2026-10-14' }), TODAY).milestone, '7日前');
  assert.equal(recheckDue(ev({ startDate: '2026-10-22', verifiedAt: '2026-10-16' }), TODAY), null);
  // 記事の更新日も確認として数える
  assert.equal(recheckDue(ev({ startDate: '2026-10-22', verifiedAt: '2026-10-01', articleUpdatedAt: '2026-10-16' }), TODAY), null);
  assert.equal(recheckDue(ev({ startDate: '2026-10-18', verifiedAt: '2026-10-10' }), TODAY).milestone, '前日');
  assert.equal(recheckDue(ev({ startDate: '2026-11-10', verifiedAt: '2026-10-01' }), TODAY).milestone, '30日前');
  assert.equal(recheckDue(ev({ startDate: '2026-12-01' }), TODAY), null); // 30日より先
  assert.equal(recheckDue(ev({ startDate: '2026-10-10' }), TODAY), null); // 終わったもの
  assert.equal(recheckDue(ev({ startDate: '2026-10-20', status: 'rejected', skipReason: 'x' }), TODAY), null);
});

test('日次ゲート：単独記事かまとめ記事への掲載があれば掲載済み。7日以内の未掲載は緊急', () => {
  const registry = { events: [
    ev({ id: 'listed', name: '単独記事あり', startDate: '2026-10-20', articleUrl: '/events/a/' }),
    ev({ id: 'roundup', name: 'まとめに掲載', startDate: '2026-10-20', relatedArticleUrls: ['/events/b/'] }),
    ev({ id: 'gap', name: '未掲載', startDate: '2026-10-20', discoveredAt: '2026-10-17' }),
    ev({ id: 'big', name: '大型の先の催し', startDate: '2026-12-20', importance: 'large', status: 'discovered' }),
    ev({ id: 'past', name: '終わった催し', startDate: '2026-10-01' }),
  ] };
  const gate = discoveryGate(registry, { today: TODAY, regions: new Map([['kasama', 'keno']]) });
  assert.deepEqual(gate.urgent7.map((e) => e.id), ['gap']);
  assert.deepEqual(gate.importantUnlisted.map((e) => e.id), ['big']);
  assert.deepEqual(gate.newlyDiscovered.map((e) => e.id), ['gap']);
  assert.deepEqual(gate.unverified.map((e) => e.id), ['big']);
  assert.deepEqual(gate.scan30to90.map((e) => e.id), ['big']);
  assert.equal(gate.urgent7[0].region, '県央');
  assert.equal(gate.weeklyInventory, null); // 土曜は週次なし
  assert.match(discoveryMarkdown(gate), /開催7日以内の未掲載（緊急）: 1件/);
});

test('週次棚卸し：月曜か --weekly のとき、今後90日を地域別・週別に出す', () => {
  const registry = { events: [ev({ id: 'gap', startDate: '2026-10-20' }), ev({ id: 'far', name: '先', startDate: '2027-02-01' })] };
  const monday = discoveryGate(registry, { today: '2026-10-19', regions: new Map([['kasama', 'keno']]) });
  assert.equal(monday.weeklyInventory.byRegion['県央'].total, 1);
  assert.equal(monday.weeklyInventory.byRegion['県央'].unlisted.length, 1);
  assert.ok(discoveryGate(registry, { today: TODAY, weekly: true }).weeklyInventory);
});

test('地域：src/data/areas.ts の44市町村をすべて5地域に割り当てる', () => {
  const regions = parseRegions(readFileSync('src/data/areas.ts', 'utf8'));
  assert.equal(regions.size, 44);
  assert.deepEqual([...new Set(regions.values())].sort(), ['kennan', 'keno', 'kenpoku', 'kensei', 'rokko']);
});

test('実データ：現行の台帳に重複・検証エラーがない', () => {
  const registry = JSON.parse(readFileSync('data/editorial/event-registry.json', 'utf8'));
  assert.deepEqual(findDuplicates(registry.events).filter((d) => d.level === 'error'), []);
});
