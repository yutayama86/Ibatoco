import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rakutenTextLink } from './rakuten-link.mjs';

test('既存の楽天トラベルの手作りリンクと完全一致する', () => {
  const src = readFileSync(new URL('../src/data/affiliates.ts', import.meta.url), 'utf8');
  const pairs = [...src.matchAll(/'(https:\/\/travel\.rakuten\.co\.jp\/[^']+)':\s*'(https:\/\/hb\.afl\.rakuten\.co\.jp\/[^']+)'/g)];
  assert.ok(pairs.length >= 3);
  for (const [, original, made] of pairs) assert.equal(rakutenTextLink(original), made);
});

test('楽天以外のURLは拒否する', () => {
  assert.throws(() => rakutenTextLink('https://example.com/'));
  assert.throws(() => rakutenTextLink('http://travel.rakuten.co.jp/'));
  assert.throws(() => rakutenTextLink('https://rakuten.co.jp.example.com/'));
});
