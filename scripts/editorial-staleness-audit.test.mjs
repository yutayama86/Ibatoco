import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDateOnly, toDateOnlyString } from '../src/lib/date-only.js';
import { PRIORITY_SCORE, auditFile, extractDates, inferYear, scoreSentence } from './editorial-staleness-audit.mjs';

const d = parseDateOnly;
const today = d('2026-11-01');
const score = (sentence, extra = {}) => scoreSentence(sentence, { today, ref: d('2026-10-20'), ...extra }).score;

const article = (frontmatter) => `---\n${frontmatter.trim()}\ndraft: false\nreviewed: true\n---\n本文はfrontmatterの構造化フィールドへ移送済みです。\n`;

test('年のない月日は、記事の日付に最も近い年として読む', () => {
  assert.equal(toDateOnlyString(inferYear(10, 28, d('2026-11-01'))), '2026-10-28');
  assert.equal(toDateOnlyString(inferYear(2, 16, d('2026-09-14'))), '2027-02-16');
  assert.equal(toDateOnlyString(inferYear(1, 5, d('2026-12-20'))), '2027-01-05');
  assert.equal(toDateOnlyString(inferYear(12, 28, d('2027-01-10'))), '2026-12-28');
  assert.equal(inferYear(2, 30, d('2026-11-01')), undefined);
});

test('日付の書き方を読み分ける（西暦・令和・年なし・曜日つきの M/D）', () => {
  const dates = (text) => extractDates(text, d('2026-10-20')).map((x) => x.date);
  assert.deepEqual(dates('2026年10月19日現在'), ['2026-10-19']);
  assert.deepEqual(dates('2026-10-19 と 2026/9/2'), ['2026-10-19', '2026-09-02']);
  assert.deepEqual(dates('令和8年7月20日'), ['2026-07-20']);
  assert.deepEqual(dates('10月12日時点'), ['2026-10-12']);
  assert.deepEqual(dates('10/28(水)まで'), ['2026-10-28']);
  // 分数や点数は日付にしない
  assert.deepEqual(dates('定員の1/2が埋まりました'), []);
});

test('過ぎた日付と、予定・時点・未来形の組み合わせを優先する', () => {
  assert.ok(score('ひたち海浜公園のコキアは10月10日頃に紅葉見頃の予想です（公園公式・9月30日時点）。', { field: 'description' }) >= PRIORITY_SCORE);
  assert.ok(score('2026年の紅葉の見頃予想は、10月12日時点で公式発表を確認できていません。') >= PRIORITY_SCORE);
  assert.ok(score('9月19日（土）18:00、等々力で川崎フロンターレ対鹿島アントラーズが行われます。', { eventEnded: true }) >= PRIORITY_SCORE);
  assert.ok(score('現在は第2弾が8月31日まで実施中です。') >= PRIORITY_SCORE);
  assert.ok(score('10月20日まで運転休止となります。') > 0);
});

test('正常な記述を優先にしない', () => {
  // これからの日付を含む期間の説明
  assert.ok(score('ライトアップは2026年11月7日（土）〜2027年1月31日（日）に毎日開かれます。') < PRIORITY_SCORE);
  // 過去形で書かれた事実
  assert.ok(score('9月16日に川崎フロンターレが全席種の完売を発表しました。') <= 0);
  // 終了済みと明記
  assert.ok(score('ふるさとチョイスの申込期限は10月28日で終了しました。') <= 0);
  // 当時の記録だと明記
  assert.ok(score('10月19日時点で、B駐車券の販売と空席表示があったことを確認した記録です。') < PRIORITY_SCORE);
  // 統計・資格の基準日
  assert.ok(score('茨城県の2026年9月1日現在の推計人口は277万4,624人。') < PRIORITY_SCORE);
  assert.ok(score('対象は9月1日時点で筑西市に住民登録がある世帯主です。') < PRIORITY_SCORE);
  // 過ぎた日付が無い
  assert.equal(score('11月25日（水）19:00にカシマサッカースタジアムで開催予定です。'), 0);
});

test('数日前の「現在」は、古い「現在」より低い', () => {
  const recent = scoreSentence('紅葉色づき速報（2026年10月28日現在）では「青葉」です。', { today, ref: d('2026-11-01') });
  const old = scoreSentence('紅葉色づき速報（2026年10月19日現在）では「青葉」です。', { today, ref: d('2026-11-01') });
  assert.ok(recent.score < old.score);
  assert.ok(recent.score < PRIORITY_SCORE);
});

test('出典・関連URL・日付のフィールドは見ない', () => {
  const result = auditFile(article(`
title: "テスト"
pubDate: 2026-09-14
updatedDate: 2026-10-20
sourceUrls:
  - label: "主催者｜お知らせ（10月16日掲載、10月20日更新、受付中）"
    url: "https://example.com/"
    accessedAt: 2026-10-20
eventInfo:
  startDate: 2026-10-01
`), { path: 'src/content/events/test.md', today });
  assert.equal(result, undefined);
});

test('同じ記事の候補は1件にまとめ、点数の高い文を先に出す', () => {
  const result = auditFile(article(`
title: "テスト"
pubDate: 2026-09-14
summary: "10月3日は開催予定です。10月12日時点で見頃予想は未発表です。9月1日に発表しました。"
eventInfo:
  startDate: 2026-10-03
`), { path: 'src/content/events/test.md', today });
  assert.equal(result.url, '/events/test/');
  assert.equal(result.eventEnded, true);
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates[0].score >= result.candidates[1].score);
  assert.ok(result.priority);
});

test('開催前の案内の記録だと明記した記事は、優先の対象から外す', () => {
  const result = auditFile(article(`
title: "テスト"
pubDate: 2026-10-19
updatedDate: 2026-10-29
conclusion: "この記事は10月28日の試合に向け、開催前に確認した観戦案内を保存したものです。"
accessGuide:
  returnTrip: "直行バスは10月19日時点で募集中で、運行はまだ決まっていません。"
sportsMatch:
  date: 2026-10-28
`), { path: 'src/content/news/test.md', today });
  assert.equal(result.archived, true);
  assert.equal(result.priority, false);
});

test('下書きと未確認の記事は対象外', () => {
  const draft = `---\ntitle: "テスト"\npubDate: 2026-09-14\nsummary: "10月3日は開催予定です。"\ndraft: true\nreviewed: false\n---\n`;
  assert.equal(auditFile(draft, { path: 'src/content/events/test.md', today }), undefined);
});
