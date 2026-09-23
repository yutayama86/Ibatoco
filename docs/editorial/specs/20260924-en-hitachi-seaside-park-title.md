# 2026-09-24 English Hitachi Seaside Park CTR test

## Purpose

Improve organic CTR for the existing English guide without changing its URL, H1, body, structured data, or verified travel facts.

## Evidence

- GSC period: 2026-08-25 to 2026-09-21
- Query: `hitachi seaside park from tokyo`
- Page: `/en/hitachi-seaside-park-from-tokyo/`
- 81 impressions, 0 clicks, average position 8.7654
- Related query `how far is hitachi seaside park from tokyo`: 11 impressions, 0 clicks, average position 8.0909
- Source: Windsor.ai Search Console direct connector `sc-domain:ibatoco.jp`, checked 2026-09-24 JST

## Change

- Current SEO title: `How to Get to Hitachi Seaside Park from Tokyo: Train & Bus Guide | IBATOCO`
- New SEO title: `Hitachi Seaside Park from Tokyo (2026): Train, Bus & Travel Time | IBATOCO`
- Keep the existing H1: `How to Get to Hitachi Seaside Park from Tokyo`
- Keep the existing description and all body copy.

## Do not change

- URL, canonical, hreflang, H1, description, body, prices, dates, access facts, FAQ, structured data, Japanese/Traditional Chinese/Korean pages, or TOP design.

## Acceptance

- `npm run verify` succeeds.
- Canonical remains `https://ibatoco.jp/en/hitachi-seaside-park-from-tokyo/`.
- Page returns 200 in production.
- Rendered `<title>` matches the new title.

## KPI

- 7-day: observe impressions, clicks, CTR, and average position; do not judge if impressions are under 50.
- 28-day: continue if CTR improves with stable impressions/position; revert or retest if there are at least 100 impressions and CTR remains 0 while position stays within 4–12.

