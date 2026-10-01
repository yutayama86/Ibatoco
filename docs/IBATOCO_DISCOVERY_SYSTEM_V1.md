# IBATOCO Discovery System v1

Status: Approved / implementation baseline
Effective: 2026-10-01

## Product definition
IBATOCO is a Local Discovery Platform that makes time spent in Ibaraki better.

User promise: **イバトコを開けば、次に行きたい茨城が見つかる。**

Primary wedge: **「今度の休み、どこ行こう？」**

## Design principles
Every user-facing change must maximize these together, not trade one away casually.

1. Cute — 大人も使える、柔らかく触りたくなるローカル感
2. Clear — 数秒で重要情報と次の行動が分かる
3. Branded — 一部分だけでもIBATOCOと分かる
4. Discoverable — 常に自然な「次の発見」がある
5. Fast — Core Web Vitals / Astroの軽さを守る
6. Decisive — 行く/行かないを判断できる
7. Fresh — 情報の確認日・確度が分かる
8. Personal — WHEN / WHO / MOOD / CONSTRAINT / WHEREで探せる
9. Retentive — また来る理由を作る
10. Trustworthy — 公式情報と編集情報を区別する
11. Monetizable — 行動文脈を壊さず収益へ接続する

## Information model
Do not organize the public UX only around CMS types.

- WHEN: 今日 / 今週末 / 今月 / 季節
- WHO: ひとり / カップル / 子連れ / 友達 / 親 / ペット
- MOOD: 癒し / 食 / 遊び / 絶景 / のんびり / アクティブ
- CONSTRAINT: 雨 / 無料 / 所要時間 / 車なし / 夜 / 混雑回避
- WHERE: 5地域 / 市町村 / nearby

Tags are Discovery Queries, not decorative labels. Index only combinations with independent demand and sufficient content.

## Page contract
Every indexable entry page is also a discovery landing page.

1. Hero: title, place/area, visual, freshness
2. Quick Facts: decision-critical facts only
3. Reason-to-Go: why this is worth considering now
4. Primary content: verified useful detail
5. IBATOCO POINT: first-party/editorial information gain
6. Next Discovery: context-specific next actions before the end of the article
7. Nearby / Together / Same mood / On the way home
8. Area + Tags
9. Conversion where intent naturally exists
10. Sources / freshness / verification state

Do not wait until the footer to offer the next useful page.

## Navigation language
Avoid generic "関連記事" as the primary reader-facing label. Prefer:
- このあと、どこ行く？
- 一緒に行きたい
- 近くなら、ここも
- 同じ気分なら
- 地元の人なら、ここも
- 帰りに寄るなら

## TOCO CARD
The common discovery card should support:
- experience-led image
- title + municipality
- 1–3 Reason-to-Go signals
- useful time/status signal when verified
- compact discovery tags
- one clear next action

Cards must remain scannable on mobile. Do not turn them into mini articles.

## Freshness model
Support a machine-readable verification state:
- official_verified
- editorial_verified
- community_reported (future)
- stale

Public UI should show a human-readable checked/updated date where it increases trust. Never imply official verification when only editorial inference exists.

## Discovery Graph
Long-term entities:
Spot / Event / Restaurant / Experience / Route / Tag / Area / Season / Person.

Relationships are product data, not only inline links. Examples:
- near
- good_after
- same_mood
- same_season
- eat_nearby
- bathe_nearby
- route_member
- area_member

Prefer experience affinity over pure geographic distance when choosing recommendations.

## Measurement
Short-term business target remains November 100,000 GA4 Views.

Acquisition:
- Organic Sessions
- GSC clicks / CTR / position
- SNS / Referral / AI traffic

Discovery:
- Views / Session
- second-page rate
- internal navigation CTR
- tag CTR
- area CTR
- next-discovery CTR

Intent:
- map click
- official-site click
- parking click
- booking click
- save / want-to-go (Phase 2)

Retention:
- 7d / 28d return
- Direct traffic
- owned-audience opt-in

Revenue:
- outbound booking
- affiliate conversion
- business CTA / lead
- revenue per 1,000 sessions

Do not inflate PV through artificial pagination, auto reload, or irrelevant internal links.

## North Stars
- Short term: November 100,000 Views
- Mid term: Useful Discoveries / Session
- Long term: Decisions Created

## Phase 1
Implement now:
1. Design tokens / component rules
2. TOCO CARD
3. Entry/article template discovery modules
4. analytics for discovery clicks
5. event/guide template rollout
6. homepage Discovery Feed refinement
7. AREA navigation refinement
8. TAG system + only justified landing pages

## Deferred
Do not build yet:
- login/account system
- native app
- full AI chatbot
- large-scale reviews
- heavy personalization
- full community product

Design data structures so these can be added later.

## SEO / performance guardrails
- Preserve successful URLs and canonicals.
- Do not rewrite verified body content merely for visual consistency.
- Preserve structured data semantics.
- No client-side-only discovery required for crawlable core navigation.
- Avoid thin combinatorial tag pages.
- Preserve or improve CWV.
- Production verification is required after merge.

## Implementation order
Design System -> TOCO CARD -> one high-traffic guide template -> analytics -> measured validation -> event template -> homepage -> AREA -> TAGS.

## Acceptance rule
A feature is approved only if it passes, in order:
1. creates useful discovery
2. improves decision quality
3. provides a natural next step
4. feels unmistakably IBATOCO
5. remains readable
6. remains fast
7. exposes trustworthy freshness where needed
8. protects search assets
9. is measurable
10. compounds first-party data
11. can connect naturally to revenue

## Validation
Initial circulation targets are directional, not guarantees:
- move Views/Session from ~1.2 toward 1.5, then 1.8, then 2.0+
- increase second-page rate and Next Discovery CTR without harming engagement, search traffic, or CWV

Change design based on measured behavior, not aesthetic preference alone.
