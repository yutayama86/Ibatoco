/**
 * Ibatoco Cloudflare Worker
 *
 * Public site:
 * - SITE_PASSWORD: when set, protects the whole site with Basic Auth.
 *
 * Private Control Center:
 * - CONTROL_PASSWORD: required, 20+ chars
 * - CONTROL_TOTP_SECRET: required, Base32 TOTP secret
 * - CONTROL_SESSION_SECRET: required, 32+ chars, signs short-lived session cookies
 *
 * Missing/weak Control secrets never fall back to public access.
 */

const CONTROL_COOKIE = '__Host-ibatoco_control';
const CONTROL_SESSION_SECONDS = 60 * 60 * 4;
const encoder = new TextEncoder();

function secureCompare(a, b) {
  const aa = encoder.encode(String(a ?? ''));
  const bb = encoder.encode(String(b ?? ''));
  const len = Math.max(aa.length, bb.length);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < len; i += 1) diff |= (aa[i % Math.max(1, aa.length)] ?? 0) ^ (bb[i % Math.max(1, bb.length)] ?? 0);
  return diff === 0;
}

function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input ?? '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) {
    const value = alphabet.indexOf(ch);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}

function hotpCounterBytes(counter) {
  const out = new Uint8Array(8);
  let n = BigInt(counter);
  for (let i = 7; i >= 0; i -= 1) {
    out[i] = Number(n & 255n);
    n >>= 8n;
  }
  return out;
}

async function totp(secret, counter) {
  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, hotpCounterBytes(counter)));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
}

async function verifyTotp(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code ?? ''))) return false;
  const counter = Math.floor(now / 30000);
  for (const drift of [-1, 0, 1]) {
    if (secureCompare(await totp(secret, counter + drift), code)) return true;
  }
  return false;
}

function b64url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  for (const pair of cookie.split(';')) {
    const [k, ...rest] = pair.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return '';
}

async function makeSession(secret) {
  const expires = Math.floor(Date.now() / 1000) + CONTROL_SESSION_SECONDS;
  const nonce = crypto.randomUUID();
  const body = `${expires}.${nonce}`;
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

async function validSession(request, secret) {
  const value = cookieValue(request, CONTROL_COOKIE);
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [expiresRaw, nonce, signature] = parts;
  if (!/^\d+$/.test(expiresRaw) || !nonce || !signature) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secret, `${expiresRaw}.${nonce}`);
  return secureCompare(expected, signature);
}

function protectedHeaders(extra = {}) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Content-Security-Policy': "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...extra,
  };
}

function controlSecretsReady(env) {
  return typeof env.CONTROL_PASSWORD === 'string'
    && env.CONTROL_PASSWORD.length >= 20
    && typeof env.CONTROL_TOTP_SECRET === 'string'
    && base32Decode(env.CONTROL_TOTP_SECRET).length >= 10
    && typeof env.CONTROL_SESSION_SECRET === 'string'
    && env.CONTROL_SESSION_SECRET.length >= 32;
}

function loginHtml(error = false) {
  const message = error ? '<p class="error" role="alert">認証に失敗しました。</p>' : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<title>Ibatoco Control Login</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:1rem;background:#0b1220;color:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif}.box{width:min(100%,420px);padding:1.25rem;border:1px solid #263652;border-radius:16px;background:#111a2b}.eyebrow{margin:0;color:#7db5ff;font-size:.7rem;font-weight:800;letter-spacing:.14em}h1{margin:.5rem 0 1rem;font-size:1.6rem}label{display:grid;gap:.45rem;margin-top:1rem;font-size:.78rem;font-weight:700}input{width:100%;min-height:48px;padding:.8rem;border:1px solid #364a6e;border-radius:10px;background:#0b1220;color:#fff;font-size:1rem}button{width:100%;min-height:48px;margin-top:1.2rem;border:0;border-radius:10px;background:#7db5ff;color:#07101f;font-weight:800}.error{padding:.65rem .75rem;border-radius:8px;background:#3a1f27;color:#ffb4b4;font-size:.8rem}.note{margin:1rem 0 0;color:#97a6bd;font-size:.72rem;line-height:1.6}</style>
</head>
<body>
<form class="box" method="post" action="/control/login" autocomplete="off">
<p class="eyebrow">OWNER ONLY</p><h1>Ibatoco Control Center</h1>
${message}
<label>パスワード<input name="password" type="password" minlength="20" required autocomplete="current-password"></label>
<label>認証コード<input name="totp" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code"></label>
<button type="submit">ログイン</button>
<p class="note">パスワードと認証アプリの6桁コードが必要です。4時間で自動ログアウトします。</p>
</form>
</body></html>`;
}

function redirect(location, extraHeaders = {}) {
  return new Response(null, {
    status: 303,
    headers: protectedHeaders({ Location: location, ...extraHeaders }),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.protocol !== 'https:' || url.hostname !== 'ibatoco.jp') {
      url.protocol = 'https:';
      url.hostname = 'ibatoco.jp';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }

    const isControl = url.pathname === '/control' || url.pathname.startsWith('/control/');
    const isLogin = url.pathname === '/control/login';
    const isLogout = url.pathname === '/control/logout';

    if (isControl) {
      if (!controlSecretsReady(env)) {
        return new Response('Control Center is locked because security secrets are missing or weak.', {
          status: 503,
          headers: protectedHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
        });
      }

      if (isLogout) {
        return redirect('/control/login', {
          'Set-Cookie': `${CONTROL_COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`,
        });
      }

      if (isLogin) {
        if (request.method === 'GET' || request.method === 'HEAD') {
          if (await validSession(request, env.CONTROL_SESSION_SECRET)) return redirect('/control/');
          return new Response(loginHtml(false), {
            status: 200,
            headers: protectedHeaders({ 'Content-Type': 'text/html; charset=utf-8' }),
          });
        }

        if (request.method === 'POST') {
          const origin = request.headers.get('Origin');
          const referer = request.headers.get('Referer') || '';
          const fetchSite = (request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
          const originOk = origin === 'https://ibatoco.jp'
            || ((!origin || origin === 'null')
              && (fetchSite === 'same-origin' || fetchSite === 'same-site')
              && (!referer || referer.startsWith('https://ibatoco.jp/control/')));
          if (!originOk) {
            return new Response('Invalid origin.', {
              status: 403,
              headers: protectedHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
            });
          }

          const contentLength = Number(request.headers.get('Content-Length') || '0');
          if (Number.isFinite(contentLength) && contentLength > 8192) {
            return new Response('Request too large.', {
              status: 413,
              headers: protectedHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
            });
          }

          const contentType = request.headers.get('Content-Type') || '';
          if (!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')
              && !contentType.toLowerCase().startsWith('multipart/form-data')) {
            return new Response('Unsupported request.', {
              status: 415,
              headers: protectedHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
            });
          }

          const form = await request.formData();
          const password = String(form.get('password') ?? '');
          const code = String(form.get('totp') ?? '');
          const passwordOk = secureCompare(password, env.CONTROL_PASSWORD);
          const totpOk = await verifyTotp(env.CONTROL_TOTP_SECRET, code);

          if (!(passwordOk && totpOk)) {
            // Deliberately identical response for bad password and bad TOTP.
            return new Response(loginHtml(true), {
              status: 401,
              headers: protectedHeaders({ 'Content-Type': 'text/html; charset=utf-8' }),
            });
          }

          const session = await makeSession(env.CONTROL_SESSION_SECRET);
          return redirect('/control/', {
            'Set-Cookie': `${CONTROL_COOKIE}=${session}; Path=/; Max-Age=${CONTROL_SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict`,
          });
        }

        return new Response('Method not allowed.', {
          status: 405,
          headers: protectedHeaders({
            'Allow': 'GET, HEAD, POST',
            'Content-Type': 'text/plain; charset=utf-8',
          }),
        });
      }

      if (!(await validSession(request, env.CONTROL_SESSION_SECRET))) return redirect('/control/login');

      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(protectedHeaders())) headers.set(key, value);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Optional whole-site Basic Auth, kept for maintenance/staging use.
    const sitePassword = env.SITE_PASSWORD;
    if (sitePassword) {
      const header = request.headers.get('Authorization') || '';
      const [scheme, encoded] = header.split(' ');
      let ok = false;
      if (scheme === 'Basic' && encoded) {
        try {
          const decoded = atob(encoded);
          const supplied = decoded.slice(decoded.indexOf(':') + 1);
          ok = secureCompare(supplied, sitePassword);
        } catch {}
      }
      if (!ok) {
        return new Response('イバトコは現在準備中です。関係者の方はパスワードを入力してください。', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Ibatoco (準備中)", charset="UTF-8"',
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
