# Ibatoco Control Center

Owner-only dashboard at `/control/`.

## Security contract

- Public navigation must not link to `/control/`.
- Control Center requires **password + TOTP (authenticator app)**.
- Required Cloudflare secrets:
  - `CONTROL_PASSWORD` (20+ chars)
  - `CONTROL_TOTP_SECRET` (Base32)
  - `CONTROL_SESSION_SECRET` (32+ chars)
- If any secret is missing or weak, the Worker returns **503**. It never falls back to public access.
- Successful login creates a **4-hour** signed session cookie with `Secure; HttpOnly; SameSite=Strict`.
- Login POST requires the exact `https://ibatoco.jp` Origin and rejects oversized requests.
- Logout explicitly destroys the session cookie.
- Authorized responses include:
  - `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
  - `Cache-Control: private, no-store`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Content-Security-Policy: frame-ancestors 'none'`
- The HTML also contains `noindex,nofollow,noarchive,nosnippet`.
- `robots.txt` disallows `/control/`.
- The Control layout does **not** load GA4.

## One-time security setup

Never commit any of these values.

From a machine authenticated to the production Cloudflare account:

~~~bash
npx wrangler secret put CONTROL_PASSWORD
npx wrangler secret put CONTROL_TOTP_SECRET
npx wrangler secret put CONTROL_SESSION_SECRET
~~~

Use a unique 20+ character password. `CONTROL_TOTP_SECRET` is the Base32 secret registered in the owner's authenticator app. `CONTROL_SESSION_SECRET` should be a separate random value of at least 32 characters.

Then deploy:

~~~bash
npm run deploy
~~~

Until **all three** secrets are valid, `/control/` intentionally returns **503**.

## Data shown

The dashboard is built from repository-owned aggregate data such as:

- `data/editorial/performance-snapshot.json`
- `data/editorial/revenue-ledger.json`

It does not expose ASP raw CSVs, customer data, passwords, or Cloudflare secrets.

## CI guard

`scripts/tech-audit.mjs` fails when any of these regress:

- Control page missing
- noindex/nofollow missing
- GA code present
- Worker password protection missing
- robots.txt does not disallow `/control/`
- sitemap includes `/control/`


## Additional hardening

- Weekly Dependabot updates for npm and GitHub Actions.
- CodeQL scans JavaScript/TypeScript on PR, main pushes, and weekly schedule.
- `npm run audit:security` scans for private keys, common token formats, literal Control secrets, and auth/security regressions.
- Control login failures use the same response regardless of whether password or TOTP was wrong.
- Control pages cannot be framed and cannot request camera, microphone, geolocation, payment, or USB APIs.


## Unified Growth OS との関係

Control Center は表示専用の管理画面ではなく、統合Growth OSの**可視化レイヤー**です。

- このChatGPTスレッド: オーナー司令塔
- `/control/`: 判断・可視化
- 毎朝7時の統合Growth OS: 自動実行
- `data/editorial/action-queue.json`: 実行状態の正本
- `docs/IBATOCO_UNIFIED_GROWTH_OS.md`: 運用ルールの正本

Control CenterのP1/P2は判断候補です。毎朝7時OSが、実測・一次情報・観測窓・リスクを再評価し、自動実行可能なものだけ action queue の `ready` / `in-progress` に移して実装します。

Control Centerには「朝7時OSの実行キュー」を表示し、現在の待機案件、直近完了、次回実行時刻を確認できるようにします。
