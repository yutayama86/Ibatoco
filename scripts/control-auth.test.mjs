/**
 * Control Center の認証（worker/index.js）の振る舞いテスト（node --test）。npm run verify で実行する。
 * パスワードのみ（2026-10-07 オーナー判断）。本物の秘密情報は使わず、テストの中で仮の値を作る。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import worker from '../worker/index.js';

const PASSWORD = randomBytes(18).toString('base64url'); // 24文字
const env = (extra = {}) => ({
  CONTROL_PASSWORD: PASSWORD,
  CONTROL_SESSION_SECRET: randomBytes(32).toString('base64url'),
  ASSETS: { fetch: async () => new Response('<html><h1>control</h1></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }) },
  ...extra,
});
const get = (path, headers = {}) => new Request(`https://ibatoco.jp${path}`, { headers });
const login = (password, headers = {}) => new Request('https://ibatoco.jp/control/login', {
  method: 'POST',
  headers: { Origin: 'https://ibatoco.jp', 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
  body: new URLSearchParams({ password }).toString(),
});
const cookieFrom = (res) => (res.headers.get('Set-Cookie') ?? '').split(';')[0];

test('未ログインの /control/ はログイン画面へ。ログイン画面はパスワード欄だけで、検索除外', async () => {
  const e = env();
  const res = await worker.fetch(get('/control/'), e);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), '/control/login');
  const page = await worker.fetch(get('/control/login'), e);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /name="password"/);
  assert.doesNotMatch(html, /name="totp"|認証コード/);
  assert.match(page.headers.get('X-Robots-Tag') ?? '', /noindex/);
  assert.match(page.headers.get('Cache-Control') ?? '', /no-store/);
});

test('パスワードが違えば 401、正しければセッションを発行して /control/ を表示', async () => {
  const e = env();
  const bad = await worker.fetch(login(`${PASSWORD}x`), e);
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get('Set-Cookie'), null);

  const ok = await worker.fetch(login(PASSWORD), e);
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('Location'), '/control/');
  const setCookie = ok.headers.get('Set-Cookie') ?? '';
  assert.match(setCookie, /^__Host-ibatoco_control=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);

  const page = await worker.fetch(get('/control/', { Cookie: cookieFrom(ok) }), e);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /control/);
  assert.match(page.headers.get('X-Robots-Tag') ?? '', /noindex/);
});

test('改ざんしたセッション・別の秘密で作ったセッションは通さない', async () => {
  const e = env();
  const ok = await worker.fetch(login(PASSWORD), e);
  const [name, value] = cookieFrom(ok).split('=');
  const tampered = `${name}=${value.slice(0, -2)}xx`;
  assert.equal((await worker.fetch(get('/control/', { Cookie: tampered }), e)).status, 303);
  assert.equal((await worker.fetch(get('/control/', { Cookie: cookieFrom(ok) }), env())).status, 303);
});

test('他サイトからのログインは 403。秘密情報が無い・弱いときは 503（公開に戻らない）', async () => {
  assert.equal((await worker.fetch(login(PASSWORD, { Origin: 'https://example.com' }), env())).status, 403);
  assert.equal((await worker.fetch(get('/control/'), env({ CONTROL_PASSWORD: 'short' }))).status, 503);
  assert.equal((await worker.fetch(get('/control/'), env({ CONTROL_SESSION_SECRET: undefined }))).status, 503);
});

test('一般のページは認証なしでそのまま返す', async () => {
  const res = await worker.fetch(get('/events/'), env());
  assert.equal(res.status, 200);
});
