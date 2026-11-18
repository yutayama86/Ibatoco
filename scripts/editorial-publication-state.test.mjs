import test from 'node:test';
import assert from 'node:assert/strict';
import { editorialPublicationErrors } from './lib/editorial-publication-state.mjs';

const article = (extra = {}) => ({ type: 'event', articleType: 'event', url: '/events/coffee/',
  draft: false, reviewed: true, pubDate: '2026-11-14', updatedDate: '2026-11-18', ...extra });
const row = (extra = {}) => ({ id: 'coffee', articleUrl: '/events/coffee/', status: 'published',
  articleUpdatedAt: '2026-11-18', ...extra });

test('公開済みコーヒー記事が台帳draftのままなら失敗する', () => {
  const errors = editorialPublicationErrors([row({ status: 'draft' })], [article()]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /公開状態が不一致/);
});

test('公開記事の古い・未設定・無効な更新日を検出し、初稿は公開日と比較する', () => {
  for (const date of ['2026-11-03', undefined, '2026-02-30']) {
    assert.match(editorialPublicationErrors([row({ articleUpdatedAt: date })], [article()])[0], /記事更新日が不一致/);
  }
  assert.deepEqual(editorialPublicationErrors([row({ articleUpdatedAt: '2026-11-14' })], [article({ updatedDate: null })]), []);
});

test('終了後も公開する記事と手入力候補を保持し、編集済み名称・出典を上書きしない', () => {
  const events = [row({ status: 'ended', name: '編集済みの名前', officialUrl: 'https://example.jp/detail' }),
    { id: 'candidate', status: 'verified', articleUrl: null }];
  const before = structuredClone(events);
  assert.deepEqual(editorialPublicationErrors(events, [article({ name: '本文名', officialUrl: 'https://example.jp/' })]), []);
  assert.deepEqual(events, before);
});

test('未公開・未レビューの記事を台帳だけ公開扱いにする状態も検出する', () => {
  for (const a of [article({ draft: true }), article({ reviewed: false })]) {
    assert.match(editorialPublicationErrors([row()], [a])[0], /本文未公開/);
    assert.deepEqual(editorialPublicationErrors([row({ status: 'draft' })], [a]), []);
  }
});
