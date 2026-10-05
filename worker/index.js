/**
 * イバトコ Cloudflare Worker
 *
 * - SITE_PASSWORD: 設定時のみサイト全体をBasic認証
 * - CONTROL_PASSWORD: /control/ 専用。未設定ならControl Centerは503で閉鎖
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // HSTSだけに頼らず、検索評価を https://ibatoco.jp に集約する。
    if (url.protocol !== 'https:' || url.hostname !== 'ibatoco.jp') {
      url.protocol = 'https:';
      url.hostname = 'ibatoco.jp';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }

    const isControl = url.pathname === '/control' || url.pathname.startsWith('/control/');

    function authorizedWith(password) {
      if (!password) return false;
      const header = request.headers.get('Authorization') || '';
      const [scheme, encoded] = header.split(' ');
      if (scheme !== 'Basic' || !encoded) return false;
      try {
        const decoded = atob(encoded);
        const colon = decoded.indexOf(':');
        const supplied = colon >= 0 ? decoded.slice(colon + 1) : '';
        return supplied === password;
      } catch {
        return false;
      }
    }

    function protectedHeaders(extra = {}) {
      return {
        'Cache-Control': 'private, no-store, max-age=0',
        'Pragma': 'no-cache',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "frame-ancestors 'none'",
        ...extra,
      };
    }

    // Control Centerは専用Secret必須。Secret未設定を「公開」にフォールバックしない。
    if (isControl) {
      const password = env.CONTROL_PASSWORD;
      if (!password) {
        return new Response('Control Center is locked because CONTROL_PASSWORD is not configured.', {
          status: 503,
          headers: protectedHeaders({
            'Content-Type': 'text/plain; charset=utf-8',
          }),
        });
      }

      if (!authorizedWith(password)) {
        return new Response('認証が必要です。', {
          status: 401,
          headers: protectedHeaders({
            'WWW-Authenticate': 'Basic realm="Ibatoco Control Center", charset="UTF-8"',
            'Content-Type': 'text/plain; charset=utf-8',
          }),
        });
      }

      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(protectedHeaders())) headers.set(key, value);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    const sitePassword = env.SITE_PASSWORD;

    // 公開サイトはSITE_PASSWORDが設定されている時だけ認証をかける
    if (sitePassword && !authorizedWith(sitePassword)) {
      return new Response('イバトコは現在準備中です。関係者の方はパスワードを入力してください。', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Ibatoco (準備中)", charset="UTF-8"',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
