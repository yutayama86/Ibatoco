# Ibatoco Control Center

Owner-only dashboard at `/control/`.

## Security contract

- Public navigation must not link to `/control/`.
- Cloudflare Worker requires `CONTROL_PASSWORD` for every `/control` and `/control/*` request.
- If `CONTROL_PASSWORD` is missing, the Worker returns **503**. It never falls back to public access.
- Unauthorized requests return **401 Basic Auth**.
- Authorized responses include:
  - `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
  - `Cache-Control: private, no-store`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Content-Security-Policy: frame-ancestors 'none'`
- The HTML also contains `noindex,nofollow,noarchive,nosnippet`.
- `robots.txt` disallows `/control/`.
- The Control layout does **not** load GA4.

## One-time password setup

Do not commit the password to the repository.

From a machine authenticated to the production Cloudflare account:

~~~bash
npx wrangler secret put CONTROL_PASSWORD
~~~

Enter a long unique password when prompted, then deploy:

~~~bash
npm run deploy
~~~

Until the secret exists, `/control/` intentionally returns **503**.

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
