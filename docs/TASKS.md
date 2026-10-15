# Tasks

The work queue. Sessions take the **first** task that is `TODO`, has their owner, has all dependencies `DONE` and has no open PR (see CLAUDE.md §2). Zaid's own tasks (`Z-xx`) are explained step by step in `docs/ZAID.md`; they appear here only as dependencies.

**Status values:** `TODO` · `IN PROGRESS` (open PR exists) · `BLOCKED` (see BLOCKERS.md) · `DONE`
**Owners:** `CLOUD` (cloud session) · `LOCAL` (session on Zaid's PC) · `ZAID` (human)
**Sizes:** S ≈ under 1 hour of session work · M ≈ 1–3 h · L ≈ 3–6 h (split L tasks into a/b when possible)
**parallel-safe:** LOCAL may take it when no LOCAL task is open.

## Overview

**Priority order = this table, top to bottom.** Data collection is the critical path (charts need history), so data tasks come before UI polish, and the trust audit tool comes early so the checkout tests can start three weeks before launch.

| ID                                                              | Title                                                                        | Owner | Size          | Depends on                        | Status         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----- | ------------- | --------------------------------- | -------------- |
| **Phase 0: Setup** (week 42, target Sun 18 Oct)                 |                                                                              |       |               |                                   |
| C-001                                                           | Monorepo scaffold (Next.js + OpenNext + collector + core)                    | CLOUD | M             | Z-01                              | DONE           |
| C-002                                                           | CI pipeline (lint, typecheck, test, build, e2e smoke)                        | CLOUD | M             | C-001                             | DONE           |
| C-002b                                                          | CI: spend fewer GitHub Actions minutes                                       | CLOUD | S             | C-002                             | DONE           |
| C-002c                                                          | CI: no second full run on main, photos workflow manual (minutes)             | CLOUD | S             | C-002b                            | DONE           |
| C-003                                                           | Session tooling (SessionStart hook, permissions allowlist)                   | CLOUD | S             | C-001                             | DONE           |
| C-007                                                           | i18n setup (de default, en) and formatting helpers                           | CLOUD | S             | C-001                             | DONE           |
| C-004                                                           | Supabase schema v1, RLS, seed providers and cities                           | CLOUD | M             | C-001, Z-04                       | DONE           |
| C-005                                                           | Deploy pipeline to Cloudflare (web + collector), staging and prod            | CLOUD | M             | C-002, Z-03b, Z-04                | DONE           |
| **Phase 1: Data** (weeks 42–44, target Sun 1 Nov: data flowing) |                                                                              |       |               |                                   |
| C-010                                                           | DataForSEO spike: real response shape, cost, feasibility report              | CLOUD | M             | C-001, Z-04, Z-06                 | DONE           |
| C-012                                                           | Stay grid generator                                                          | CLOUD | S             | C-004                             | DONE           |
| C-014                                                           | Normalization and provider mapping                                           | CLOUD | M             | C-010                             | DONE           |
| C-015                                                           | Price stats engine (state, percentile, trend, advice)                        | CLOUD | M             | C-001                             | DONE           |
| C-011                                                           | Hotel catalog: resolve seed hotels, identifiers, images                      | CLOUD | M             | C-004, C-010                      | DONE           |
| C-013a                                                          | Collector: grid refresh, budget guard, task posting                          | CLOUD | M             | C-005, C-010, C-011, C-012, C-014 | DONE           |
| C-013b                                                          | Collector: collect results, store snapshots, daily prices, stats             | CLOUD | M             | C-013a, C-015                     | DONE           |
| C-013c                                                          | Collector: admin emails, daily check, raw-data prune                         | CLOUD | S             | C-013b                            | DONE           |
| C-013d                                                          | Collector: live check on staging, first production deploy, 2-day data check  | CLOUD | S             | C-013c, B-005, C-013g             | IN PROGRESS    |
| C-011b                                                          | Hotel photos: licensed Wikimedia Commons images with credits                 | CLOUD | S             | C-011                             | DONE           |
| C-019                                                           | Web data layer (public reads) and best price from reviewed providers         | CLOUD | S             | C-013b                            | DONE           |
| C-011c                                                          | Self-host hotel photos (no third-party requests from our pages)              | CLOUD | S             | C-011b                            | DONE           |
| **Phase 2: MVP website** (weeks 44–47, target Sun 22 Nov)       |                                                                              |       |               |                                   |
| C-006a                                                          | Design tokens, font, base components, /dev/ui                                | CLOUD | M             | C-001                             | DONE           |
| C-006b                                                          | Craft pass: CRAFT.md spec, refined tokens and components, logo, icons        | CLOUD | M             | C-006a                            | DONE           |
| C-020a                                                          | App shell: navbar, footer, locale switch, 404/500, robots                    | CLOUD | M             | C-006b, C-007                     | DONE           |
| C-006c                                                          | Price chart                                                                  | CLOUD | M             | C-006b                            | DONE           |
| C-006d                                                          | RangeBar, verdict block, Skeleton, EmptyState, Toast                         | CLOUD | M             | C-006c                            | DONE           |
| C-020b1                                                         | Homepage: hero, search card, live example                                    | CLOUD | M             | C-020a, C-006d, C-015, C-019      | DONE           |
| C-020b2                                                         | Homepage: how it works, Kassen-Check teaser, deals, final CTA                | CLOUD | M             | C-020b1                           | DONE           |
| C-006e                                                          | Visual regression screenshots of /dev/ui in CI                               | CLOUD | S             | C-006d                            | DONE           |
| C-020c                                                          | Admin auth: Supabase magic link, `/admin` guard                              | CLOUD | S             | C-020a                            | DONE           |
| C-016                                                           | Admin: data health and budget dashboard                                      | CLOUD | M             | C-013b, C-020c                    | DONE           |
| C-013e                                                          | Villa Kennedy (Frankfurt) gets no prices: check its DataForSEO hotel ID      | CLOUD | S             | C-013b                            | DONE           |
| C-013f                                                          | Re-check The Florentin (ex Villa Kennedy) in Google Hotels; re-add           | CLOUD | S             | C-013e                            | DONE           |
| C-013g                                                          | Collector: free price source Xotelo (DataForSEO as fallback)                 | CLOUD | M             | C-013b                            | DONE           |
| C-032a                                                          | Trust audit: form, recent tests, provider scores                             | CLOUD | S             | C-020c, C-004                     | DONE           |
| C-032b                                                          | Trust audit: screenshot upload, edit tests, CSV export                       | CLOUD | S             | C-032a                            | DONE           |
| C-032c                                                          | Trust audit: listed price from Tripadvisor (Xotelo source) not Google        | CLOUD | S             | C-032b, C-013g                    | DONE           |
| L-033                                                           | Checkout audit with Claude in Chrome (150 tests, recurring until launch)     | LOCAL | L (recurring) | C-032b, Z-07                      | TODO           |
| C-021a                                                          | Search: hotel and city autocomplete                                          | CLOUD | S             | C-020a, C-011                     | DONE           |
| C-021b                                                          | Search: date range picker (mobile bottom sheet)                              | CLOUD | M             | C-021a                            | DONE           |
| C-022a                                                          | Stay page: route, data, header, chart, stats, advice, states                 | CLOUD | M             | C-020a, C-015, C-013b             | DONE           |
| C-022b                                                          | Stay page: provider table, watch CTA                                         | CLOUD | M             | C-022a                            | DONE           |
| C-022c1                                                         | Requested stays: capped DB function + first prices within minutes            | CLOUD | M             | C-022b                            | DONE           |
| C-022c2                                                         | Stay page: request button (dropped: D-42 nights cover any dates)             | CLOUD | S             | C-022c1                           | DONE           |
| C-070a                                                          | Night grid: every night × 120 days per hotel, collected daily (D-42)         | CLOUD | M             | C-013g                            | DONE           |
| C-070b                                                          | Stay page: history for any dates from nights + real check of the viewed stay | CLOUD | M             | C-070a, C-022c1                   | DONE           |
| C-070c                                                          | Night-sum accuracy: daily comparison with real stays, admin + methodology    | CLOUD | S             | C-070a                            | DONE                |
| C-070d                                                          | Stay page: no night-sum history for hotels where single nights mislead       | CLOUD | S             | C-070c                            | DONE                |
| C-071a                                                          | Catalog: 25 cities, five-star discovery script, first batch (~50 hotels)     | CLOUD | M             | C-070a                            | DONE           |
| C-071b                                                          | Catalog: next batches up to ~150 hotels, watch the night run                 | CLOUD | M             | C-071a                            | TODO           |
| C-071c                                                          | Photos for the new hotels (licensed, self-hosted, C-011c pipeline)           | CLOUD | S             | C-071a                            | DONE           |
| C-072                                                           | Spike: LiteAPI room/board/occupancy rates (free supplier API)                | CLOUD | M             | B-010                             | DONE           |
| C-074                                                           | Room-type normalizer prototype (Standard/Deluxe/Suite per hotel)             | CLOUD | M             | C-072, B-012                      | BLOCKED        |
| C-075                                                           | Room grid: prices per guest count and board for watched stays                | CLOUD | L             | C-074, B-012                      | BLOCKED        |
| C-073                                                           | Research: German platforms (CHECK24, HolidayCheck, TUI) without scraping     | CLOUD | S             | –                                 | DONE                |
| C-076                                                           | Second source: DataForSEO for real stay checks (CHECK24 & co.)               | CLOUD | M             | B-013                             | BLOCKED             |
| C-060                                                           | Market test: five-star price drops in ~10 holiday destinations               | CLOUD | M             | C-013g                            | TODO           |
| C-023a                                                          | Hotel page: price calendar of every night, pick dates → stay                 | CLOUD | M             | C-022, C-070b                     | DONE           |
| C-023b                                                          | Hotel page: cheapest weekend/midweek, structured data, links in              | CLOUD | S             | C-023a                            | DONE           |
| C-026                                                           | Outbound link service `/go/*` with click logging                             | CLOUD | S             | C-022                             | DONE           |
| L-026                                                           | Check "Zum Angebot" links open the right hotel and dates                     | LOCAL | S             | C-026                             | TODO           |
| C-027                                                           | Legal and transparency pages                                                 | CLOUD | M             | C-020a                            | DONE           |
| C-024                                                           | City pages                                                                   | CLOUD | S             | C-023                             | DONE           |
| C-024b                                                          | Search card: a city option opens the city page                               | CLOUD | S             | C-024                             | DONE           |
| C-025                                                           | Deals page                                                                   | CLOUD | S             | C-022                             | DONE           |
| C-028a                                                          | SEO: canonical, hreflang, sitemap, site JSON-LD                              | CLOUD | S             | C-022                             | DONE           |
| C-028b                                                          | Share images: hotel photos and a default OG image                            | CLOUD | S             | C-028a                            | DONE           |
| C-028c                                                          | Dynamic OG images with today's price (Supabase Edge Function)                            | CLOUD | S             | C-028b, B-017 (not needed)                     | DONE        |
| C-028d | Preview cards for stay pages (today's price + 30-day line) via the same function | CLOUD | S | C-028c | TODO |
| C-080a | Preissturz-Radar: daily sudden price drops, /preissturz, home and city teasers | CLOUD | M | C-013g, C-024 | DONE |
| C-080b | Shareable drop page per hotel and night + in-browser story image (Web Share) | CLOUD | M | C-080a | DONE |
| C-080c | Creator kit in /admin: top drops, captions, story images for TikTok/Instagram | CLOUD | S | C-080b | DONE |
| C-080d | TikTok landing: hero drop above the fold, usual-price anchor, live proof, /tiktok | CLOUD | M | C-080a | DONE |
| C-080d2 | Radar hero: the biggest drop with real history (≥ 3 earlier checks) | CLOUD | S | C-080d | DONE |
| C-080e1 | Preissturz-Alarm sign-up: city or all, double opt-in, manage, privacy | CLOUD | M | C-080d, C-031a | DONE |
| C-080e2 | Preissturz-Alarm send: daily email with new drops (dry run until launch) | CLOUD | M | C-080e1 | DONE |
| C-080f | Weekend drops (2 nights, same site) on the radar | CLOUD | M | C-080a | DONE |
| C-080g | Drop page: "Zum Angebot bei …" straight to the site with the price | CLOUD | S | C-080b, C-026 | DONE |
| C-080h | Weekly recap /preissturz/woche + weekly set in the creator kit | CLOUD | M | C-080f | DONE |
| C-080i | Drops on hotel and stay pages (callout with both prices) | CLOUD | S | C-080f | DONE |
| C-080j | "Aus unseren Videos": posted drops first on the TikTok/Instagram landing | CLOUD | M | C-080d, C-080c | DONE |
| C-080k1 | Preissturz-Alarm for one hotel: sign-up on drop and hotel pages, manage page | CLOUD | M | C-080e1 | DONE |
| C-080k2 | Preissturz-Alarm for one hotel: include followed hotels in the daily send | CLOUD | S | C-080k1, C-080e2 | DONE |
| C-083 | Premium email design for every Tidaq email + Supabase login template | CLOUD | S | C-030a | DONE |
| C-082 | Cloudflare Web Analytics beacon (production only, B-015) | CLOUD | S | B-015 | DONE |
| C-029                                                           | Analytics events (cookieless)                                                | CLOUD | S             | C-020a                            | DONE           |
| **Phase 3: Alerts and trust** (week 48, target Sun 29 Nov)      |                                                                              |       |               |                                   |
| C-030a                                                          | Watch flow backend: double opt-in, confirm/manage pages, mail                | CLOUD | M             | C-022, Z-05                       | DONE           |
| C-030b                                                          | Watch form on the stay page (replaces "Bald verfügbar")                      | CLOUD | S             | C-030a                            | DONE           |
| C-030c                                                          | Bot protection for the watch form (Turnstile)                                | CLOUD | S             | C-030b, B-016                     | DONE           |
| C-031a                                                          | Alert engine: triggers, daily job, alert emails                              | CLOUD | M             | C-030a                            | DONE           |
| C-031b                                                          | Alert emails: best trusted provider with its link                            | CLOUD | S             | C-031a                            | DONE           |
| C-034                                                           | Provider pages and methodology page with live data                           | CLOUD | S             | C-032                             | DONE           |
| C-034b                                                          | Link the stay table's trust score to the provider page                       | CLOUD | S             | C-034                             | DONE           |
| **Phase 3b: Clean Premium overhaul** (weeks 42–48, spec `docs/design/PREMIUM.md`) | | | | | |
| C-100 | Clean Premium spec, D-44, overhaul task list (`docs/design/PREMIUM.md`) | CLOUD | S | C-083 | DONE ([#98](https://github.com/zaidg7/tidaq/pull/98)) |
| C-101 | Mockups v2 with Zaid's feedback + icon options (canvas) | CLOUD | S | C-100 | DONE |
| C-102 | Foundations: tokens, Instrument Sans, type, spacing, motion, focus | CLOUD | M | C-100 | DONE ([#99](https://github.com/zaidg7/tidaq/pull/99)) |
| C-103 | Primitives: Button, Chip, Badge, Field, Toast, Skeleton, Segmented, Accordion, Sheet | CLOUD | M | C-102 | DONE ([#100](https://github.com/zaidg7/tidaq/pull/100)) |
| C-104 | Photos A: Commons sweep for every hotel, picks, focal points, AVIF/WebP + blur-up | CLOUD | M | C-102 | DONE ([#101](https://github.com/zaidg7/tidaq/pull/101)) |
| C-105 | Photos B: city photos, fallback with "Stadtbild", every hotel shows a photo | CLOUD | S | C-104 | DONE ([#102](https://github.com/zaidg7/tidaq/pull/102)) |
| C-106 | Shell: navbar, docked search pill, mobile menu, footer, symbol + icons, /kassen-check links | CLOUD | M | C-103, B-020 | DONE ([#104](https://github.com/zaidg7/tidaq/pull/104)) |
| C-107 | Search 1: desktop search bar + destination panel + docked navbar search pill | CLOUD | M | C-103, C-105 | DONE ([#105](https://github.com/zaidg7/tidaq/pull/105)) |
| C-108 | Search 2: calendar engine with price tints, date + guests popovers | CLOUD | M | C-107 | DONE |
| C-109 | Search 3: phone full-screen search flow | CLOUD | M | C-108 | DONE |
| C-110 | Search 4: submit routing, loading states, loading.tsx skeletons | CLOUD | S | C-109 | DONE |
| C-111 | Charts 1: price history redesign | CLOUD | M | C-102 | DONE ([#103](https://github.com/zaidg7/tidaq/pull/103)) |
| C-112 | Charts 2: meter, story chart, site bars, calendar cells | CLOUD | M | C-111 | DONE (meter + story chart; cells → C-112b) |
| C-112b | Calendar cells: strong price scale in the hotel calendar and the search popover | CLOUD | S | C-112 | TODO |
| C-113 | Drop page redesign (TikTok landing) | CLOUD | M | C-105, C-112 | DONE |
| C-114 | Price Drops page + /price-drops routes + Deals as a view | CLOUD | M | C-113 | DONE (page; routes + Deals view → C-114b) |
| C-114b | /price-drops English routes, Deals as a view of the Price Drops page | CLOUD | S | C-114 | TODO |
| C-115 | Home redesign (+ navbar transparent over the photo hero, photo strip in the phone menu) | CLOUD | M | C-110, C-114 | DONE |
| C-116 | Stay page redesign (a/b) | CLOUD | L | C-110, C-112 | DONE (a: photo sheet, chips, cards; b → C-116b) |
| C-116b | Stay page b: verdict card like the drop card, story chart for the stay, site bars | CLOUD | M | C-116 | TODO |
| C-117 | Hotel page: gallery, lightbox, cheapest dates, calendar | CLOUD | M | C-112, C-104 | DONE (gallery + lightbox → C-117b) |
| C-117b | Hotel page gallery + lightbox (needs more than one photo per hotel, B-021) | CLOUD | S | C-117, B-021 | TODO |
| C-118 | City page + all hotels | CLOUD | M | C-105 | DONE |
| C-119 | Kassen-Check page (new), provider, method, ranking, legal pages | CLOUD | M | C-103 | TODO (provider, method, ranking, legal restyled; Kassen-Check page left) |
| C-120 | Alert confirm/manage, status pages, weekly recap | CLOUD | M | C-103 | TODO (status pages, weekly recap, manage header done; confirm page left) |
| C-121 | Emails, OG cards, default OG image re-skin | CLOUD | S | C-106 | TODO |
| C-122 | Copy pass: glossary, text budgets, Price Alert URLs | CLOUD | S | C-115 | TODO |
| C-123 | Polish + QA at 4 widths, Lighthouse, axe, WebKit, baselines, before/after sheet | CLOUD | M | C-102 … C-122 | TODO |
| C-124 | Regenerate the visual baselines after the redesign (CI image; Actions budget resets 1 Nov, D-45) | CLOUD | S | C-118 | TODO |
| C-125 | Trip drops (5/7 nights) instead of single nights, month + length filters, no live pills, hotel photos, desktop sweep (Zaid, 15 Oct) | CLOUD | M | C-118 | DONE |
| C-126 | City page: cheapest week per hotel instead of the cheapest weekend (like the hotel page since C-125) | CLOUD | S | C-125 | DONE (in the C-125 PR, SQL `city_best_trips`) |
| C-127 | Night window 120 → 270 days so June/July show up in the Price Drops month filter (D-42 change) | CLOUD | S | B-022 | DONE (NIGHT_WINDOW_DAYS 270, NIGHT_BATCH 40; first full July data the day after the production collector deploy) |
| C-128 | Deals page: city pills → the one-button Filter pattern of Price Drops (D-48), once deals exist (14 days of history, ~28 Oct) | CLOUD | S | C-125 | TODO |
| C-129 | Own photos for the last 17 hotels from LiteAPI images, if allowed (list in B-021) | CLOUD | S | B-021 | BLOCKED (B-021) |
| C-130 | Desktop review fixes (Zaid, 15 Oct): no public "Als Story teilen", hero hairline + readable text, search panels open upward, laptop hero fits the bar | CLOUD | S | – | DONE ([#112](https://github.com/zaidg7/tidaq/pull/112); panels pick their side in `usePanelSide`) |
| C-131 | Hotels page: per region a carousel of 3 cards with arrow buttons (one card per click); names as "Hotel, Stadt" unless the name has the city | CLOUD | S | – | TODO |
| C-132 | Hotel page: a price chart, a clear "pick dates → price history" flow, own dates that work at hotels with unreliable nights (Rosewood München) | CLOUD | M | – | TODO |
| C-133 | Partner links open the hotel with dates filled in on Agoda, Trip.com, Expedia & co. (Booking.com already does) | CLOUD | S | – | TODO |
| C-134 | Cities page: premium pass (bigger photos, more feel, same data) | CLOUD | S | – | TODO |
| C-135 | Children in the guest picker: needs prices per child age (LiteAPI occupancies, D-43); until then adults only | CLOUD | S | C-075 | TODO |
| **Phase 4: Launch** (week 49, launch Mon 30 Nov)                |                                                                              |       |               |                                   |
| L-040                                                           | Real-device QA on PC and iPhone, fix list                                    | LOCAL | M             | C-031, C-034, C-123               | TODO           |
| C-041a                                                          | Launch hardening: axe checks, security headers                               | CLOUD | S             | C-031a                            | DONE           |
| C-041b                                                          | Launch hardening: Lighthouse, backups, rate limits, robots                   | CLOUD | S             | C-041a                            | DONE           |
| C-041c                                                          | Launch hardening: daily email with the website's server errors               | CLOUD | S             | C-041b                            | DONE           |
| C-042                                                           | Trust report page "150 Checkouts getestet"                                   | CLOUD | S             | L-033, C-034                      | TODO           |
| C-043                                                           | Launch content pack for Zaid                                                 | CLOUD | S             | C-042                             | TODO           |
| C-044                                                           | Go live on tidaq.com                                                         | CLOUD | S             | C-041c, L-040, Z-12, C-123        | TODO           |
| **Phase 5: Growth** (Dec 2026 – Mar 2027)                       |                                                                              |       |               |                                   |
| C-050                                                           | Affiliate wiring per approved program                                        | CLOUD | S             | Z-11                              | TODO           |
| C-051                                                           | Weekly content pack routine                                                  | CLOUD | S             | C-044                             | TODO           |
| C-052                                                           | "Beste Buchungszeit" and event SEO pages                                     | CLOUD | M             | C-044 (30+ days data)             | TODO           |
| C-053                                                           | Coverage expansion and "request a hotel"                                     | CLOUD | M             | C-044                             | TODO           |
| C-054a                                                          | Weekly deals newsletter: opt-in sign-up, manage, privacy text                | CLOUD | S             | C-031a                            | DONE           |
| C-054b                                                          | Weekly deals newsletter: Monday send (dry run until launch)                  | CLOUD | S             | C-054a                            | DONE           |
| C-055                                                           | Breakfast/room filters (if the spike allows)                                 | CLOUD | M             | C-010 result                      | DROPPED (D-40) |
| C-056                                                           | Research: "watch my booking" rebooking alerts (v2)                           | CLOUD | S             | C-044                             | TODO           |

### Zaid tasks (sessions update this table when they see a Z-task is done)

| ID    | What                                                                                           | Status             |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------ |
| Z-01  | GitHub repo + Claude app access                                                                | DONE               |
| Z-02  | Trademark check                                                                                | DONE (clean)       |
| Z-03  | Buy tidaq.com                                                                                  | DONE (Namecheap)   |
| Z-03b | Point tidaq.com nameservers to Cloudflare                                                      | DONE (zone active) |
| Z-04  | Cloudflare, Supabase, DataForSEO accounts + GitHub secrets (DataForSEO top-up waits for C-010) | DONE               |
| Z-05  | Resend + `RESEND_API_KEY` secret                                                               | DONE               |
| Z-06  | Claude cloud environment: full network access, DataForSEO network secret                       | DONE               |
| Z-07  | PC setup for LOCAL session + Claude in Chrome                                                  | DONE               |
| Z-09  | Google Search Console                                                                          | TODO               |
| Z-10  | Social handles                                                                                 | TODO               |
| Z-11  | Affiliate program applications (after launch)                                                  | TODO               |
| Z-12  | Read legal pages before launch                                                                 | DONE (B-014)       |
| Z-13  | 10-min phone review of the new design on staging after C-115                                    | TODO               |
| Z-14  | 10-min phone review after C-123 (before launch)                                                | TODO               |

Tasks marked **parallel-safe** for LOCAL (no shared files with typical CLOUD work): C-003, C-007, C-015, C-027, C-029.

---

## Phase 0: Setup

### C-001 · Monorepo scaffold

Owner: CLOUD · Size: M · Depends on: Z-01 · Status: DONE · PR: [#4](https://github.com/zaidg7/tidaq/pull/4)
Notes: Next.js pinned to 15.5.x as specified (16 exists; OpenNext 1.20 supports both). TypeScript 5.9 (not 7) and ESLint 9 for tooling compatibility. Zod 4. `@playwright/test` pinned to 1.56.1 because it matches the Chromium preinstalled in cloud sessions. `apps/web` `build` = `next build`; the Worker bundle is `build:worker` (OpenNext calls `build` itself, so it can't be the same script). `@tidaq/core` is consumed as TS source (no build step).

**Goal:** a working pnpm monorepo with the target structure from CLAUDE.md §4.

**Steps**

1. pnpm workspace with `apps/web`, `apps/collector`, `packages/core`. Node 22 (`.nvmrc`, `engines`).
2. `apps/web`: latest stable Next.js 15 (App Router, TypeScript strict, `src/`-less layout as in CLAUDE.md), Tailwind CSS, ESLint (next + typescript-eslint), Prettier. Add `@opennextjs/cloudflare` and `wrangler.jsonc` following the official OpenNext Cloudflare guide; `pnpm preview` must run the worker locally.
3. `apps/collector`: Cloudflare Worker (TypeScript) with `fetch` (health + postback) and `scheduled` handlers, its own `wrangler.jsonc` with two cron triggers (`0 5 * * *`, `0 17 * * *`).
4. `packages/core`: TypeScript library, Vitest configured, exports `formatPrice`, `nights` and the zod setup.
5. Root scripts: `lint`, `typecheck`, `test`, `build`, `e2e`, `format`.
6. `.gitignore` (node_modules, .next, .open-next, .wrangler, .env*, coverage), `.editorconfig`, `.nvmrc`.
7. Replace the placeholder README section "Development" with real commands.

**Done when**

- [x] `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass from a clean clone
- [x] `pnpm --filter web preview` serves a placeholder page that says "Tidaq kommt bald"
- [x] `pnpm --filter collector dev` runs and `/health` returns `{ ok: true }`

### C-002 · CI pipeline

Owner: CLOUD · Size: M · Depends on: C-001 · Status: DONE · PR: [#5](https://github.com/zaidg7/tidaq/pull/5)
Notes: one job "CI" (~3 min). Red proof: [run 38272430319](https://github.com/zaidg7/tidaq/actions/runs/38272430319) failed on an intentional test, reverted. Smoke covers `/` only; C-007 adds `/en`. The 90 % line threshold lives in `packages/core/vitest.config.ts`.

**Goal:** every PR is checked automatically in under ~6 minutes.

**C-002b notes (DONE):** the private repo gets 2,000 Actions minutes a month and hit 90 % on 13 Oct. CI now skips draft PRs (a draft only claims a task; CI runs when it's marked ready) and docs-only changes (`docs/**`, `*.md`), and builds the web app once (OpenNext's build runs `next build`, whose output also serves the e2e tests). Every ready PR and every push to main still runs the full suite. Session habit: run all checks locally, keep the PR a draft while working, mark it ready once and let CI run once.

**Steps**

1. `.github/workflows/ci.yml` on `pull_request` and `push` to `main`: checkout, pnpm with cache, install, lint, typecheck, unit tests with coverage, build web (OpenNext build) and collector, Playwright smoke (`apps/web/e2e/smoke.spec.ts`: home loads in de and en, has no console errors).
2. Use Playwright's Chromium. Upload the Playwright report as an artifact on failure.
3. `concurrency` group per branch to cancel outdated runs.
4. Add a coverage threshold for `packages/core` (90 % lines), failing CI below it.

**Done when**

- [x] A PR shows one required-looking check "CI" that runs all steps
- [x] An intentionally failing test makes CI red (prove it in the PR, then revert)
- [x] Typical run under 6 minutes

**C-002c notes (DONE):** the free 2,000 Actions minutes ran out on 14 Oct (B-011; Zaid: "don't spend much"). A push to main no longer reruns the full CI the PR already passed; it only deploys staging. `catalog-photos` runs by hand only. A merged change now costs ≈ 6 minutes instead of ≈ 10. Sessions: batch small changes, never re-run CI without a reason, keep draft PRs draft until the work is done.

### C-003 · Session tooling

Owner: CLOUD · Size: S · Depends on: C-001 · Status: DONE · PR: [#6](https://github.com/zaidg7/tidaq/pull/6)
Notes: hook runs only when `CLAUDE_CODE_REMOTE=true` (cloud); synchronous, ~11 s on a cold install, instant when up to date. LOCAL installs manually.

**Goal:** new sessions start fast and ask fewer permission questions.

**Steps**

1. `.claude/settings.json` with an allowlist for read-only and routine commands (pnpm scripts, git status/diff/log, playwright test).
2. A SessionStart hook that runs `pnpm install --frozen-lockfile` when `node_modules` is missing (use the `session-start-hook` skill if available).
3. Add a "Quick start for sessions" section to README.

**Done when**

- [x] A fresh cloud session can run `pnpm test` without manual install

### C-004 · Supabase schema v1

Owner: CLOUD · Size: M · Depends on: C-001, Z-04 · Status: DONE · PR: [#8](https://github.com/zaidg7/tidaq/pull/8)
Notes: applied to the hosted project with the Supabase MCP (`apply_migration`); files are named after the versions it recorded. Changes vs PLAN §6: identity columns instead of serial; check constraints on states, origins, outcomes, cents > 0, slugs; `providers.pending` (C-014 auto-created providers, hidden from the public); `providers.created_at`; `trust_tests.extras` is `text[]` (chips) plus a `notes` column (C-032); `tracked_stays` is publicly readable because the public views are `security_invoker` (no personal data in it). The idempotency key for snapshots (C-013 step 4) is left to C-013. RLS check: `supabase/tests/rls_check.sql` (all `true` on 12 Oct). Security advisor: only INFO "RLS enabled, no policy" on the service-role-only tables, which is intended.

**Goal:** the database from PLAN §6, as migrations.

**Steps**

1. `supabase/` folder with the CLI config. Migration `0001_init.sql` with all tables from PLAN §6, indexes, constraints.
2. RLS on every table. Public read only on `cities`, `hotels`, `providers`, `stay_daily`, `stay_stats`, `provider_scores` and on views `v_stay_public`, `v_hotel_calendar`. No public access to `watchers`, `watches`, `alerts_sent`, `trust_tests`, `collector_runs`, `events`.
3. Seed migration: the 12 cities (D-04) and core providers (Booking.com, Expedia, Hotels.com, Trip.com, Agoda, HRS, Hotel direkt / official site, Check24) with aliases.
4. Generate TypeScript types into `packages/core/src/db.types.ts`.
5. The project lives in Zaid's **Pro organization** (D-11). Apply to the Supabase project via the Supabase MCP tools (`apply_migration`) or the CLI in CI. Document which in README.
6. Daily cleanup (D-19): a SQL function `prune_raw_snapshots()` that sets `raw = null` where `captured_at < now() - interval '30 days'`; the collector calls it once a day. Test it.
7. Write SQL tests for RLS (pgTAP or a Vitest script that uses the anon key against a local Supabase) or at minimum a documented manual check in the PR.

**Done when**

- [x] Migrations apply cleanly on a fresh database
- [x] With the anon key, selecting from `watchers` returns nothing / is denied
- [x] Types are generated and used by `packages/core`

### C-005 · Deploy pipeline

Owner: CLOUD · Size: M · Depends on: C-002, Z-03b, Z-04 · Status: DONE (production live on tidaq.com since 12 Oct, after B-004) · PR: [#9](https://github.com/zaidg7/tidaq/pull/9), [#13](https://github.com/zaidg7/tidaq/pull/13)
Notes: staging works since 12 Oct: https://tidaq-web-staging.tidaq.workers.dev (collector: https://tidaq-collector-staging.tidaq.workers.dev/health). The first production run deployed both workers, but tidaq.com still answers 522: old parking DNS records for `tidaq.com`/`www` block the Worker custom domains. Zaid deletes them (B-004), then re-run Actions → Deploy → `production` and tick the second box. #13 also makes deploy steps fail properly (`shell: bash` = pipefail; before, `deploy | tee` hid errors).

**Goal:** merging to `main` deploys automatically. Two environments.

**Steps**

1. Staging: `tidaq-web-staging` and `tidaq-collector-staging` on workers.dev, deployed on every push to `main`. Production: `tidaq.com`, deployed when a GitHub release/tag `v*` is created (manual promote) **or** on every main push after launch (decide in the PR and update DECISIONS).
2. Wrangler deploy steps in a `deploy.yml` workflow using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Push Worker secrets from GitHub secrets with `wrangler secret put` (only if changed) or `wrangler secret bulk`.
3. Staging uses `ALERTS_DRY_RUN=true` and a lower `DAILY_TASK_CAP` (50).
4. Supabase: one project for now. Staging and prod share the database but staging writes to nothing user-facing. Collector staging runs only on manual trigger (`workflow_dispatch`).
5. Custom domain `tidaq.com` and `www` redirect on the prod web worker. The domain is registered at Namecheap; DNS is the Cloudflare zone (Z-03b). Check the zone is active before adding the custom domain.

**Done when**

- [x] Merge to main → staging URL updated within ~5 minutes
- [ ] Prod deploy procedure documented in README and tested once (placeholder page on tidaq.com)

### C-006 · Design tokens and base components

Owner: CLOUD · Size: L (split a/b/c) · Depends on: C-001 · Status: a DONE, b DONE, c DONE, d DONE, e DONE · PR: a = [#21](https://github.com/zaidg7/tidaq/pull/21), b = [#23](https://github.com/zaidg7/tidaq/pull/23), c = [#25](https://github.com/zaidg7/tidaq/pull/25), d = [#26](https://github.com/zaidg7/tidaq/pull/26), e = [#29](https://github.com/zaidg7/tidaq/pull/29) + baselines PR

**C-006a notes (DONE):** tokens in `apps/web/app/globals.css` (raw values on `:root`, dark set under `[data-theme='dark']`, Tailwind 4 `@theme inline` → `bg-surface`, `text-muted`, `rounded-card`, `shadow-float`, `ease-soft` …; type roles as `.text-display/.text-h2/.text-h3/.text-price-xl/.text-meta/.text-eyebrow`). **AA fix:** DESIGN.md's good/bad/warn as small text and muted-on-line miss 4.5:1, so small text uses new ink tokens (`text-good-ink` etc., documented in DESIGN.md §2). Plus Jakarta Sans 500/700/800 via `next/font` (`lib/fonts.ts`; buttons use 700 since 600 isn't loaded). Components in `components/ui/`: Logo, Button (+ `buttonClasses` for links), TextField, Chip, Card, Badge, StateChip, Price, PriceDelta, TrustScore; favicon `app/icon.svg`. Core: `trustLevel` (`trust.ts`, thresholds 85/60, < 5 tests → "Noch zu wenig Tests"), `relativeChange` (`stats.ts`). State labels now follow DESIGN.md ("Guter Preis", "Gerade teuer", "Daten werden gesammelt (3/7)"). `/dev/ui` (+ `/en/dev/ui`): every component and state, noindex, `notFound()` when `APP_ENV=production` (rendered per request via `connection()`). E2E: `e2e/dev-ui.spec.ts` (renders, font + background, focus ring, aria-describedby on field errors). Checked at 390 and 1280 px: no horizontal scroll.

**C-006b notes (DONE):** Zaid asked for a design level "like a team of the best graphic designers". Three expert reviews (art direction, benchmark of Linear/Stripe/Airbnb/Hopper/Google Flights, UX + German copy) are in `docs/design/research/2026-10-13-*.md`; their synthesis is **`docs/design/CRAFT.md`**, which now wins over DESIGN.md where they differ (DESIGN.md marks the changes). Delivered: new tokens (surface-2, line-strong, accent-hover/press, solid soft tints, disabled ink, two-layer violet shadows, radii scale, eases), variable Jakarta (any weight, latin-ext), type roles (display/h2/title/h3/lead/price-xl/meta/eyebrow), Lucide icons via `Icon` (stroke 1.75, 2 at ≤ 16 px), refined Button (sizes sm/md/lg, gradient primary, loading, leading icon, IconButton), TextField (leading icon, halo focus, error row), Chip (check icon, 44 px hit area), Badge, StateChip (progress ring), Price (typeset €, core `priceParts`), PriceDelta (icon + bold %, "seit …" variant), TrustScore ("Preistreue", bar, dashed box under 5 tests), Card (flat/float/interactive), logo `tidaq.` drawn from the font outlines (q curls into the accent "today" dot) and favicon `q.` on the violet gradient. Reviewed with screenshots at 390/1280 and a design-critic pass; applied: TrustScore one 28 px geometry and AA "/100", StateChip `sm` 22 px with short labels (`stateShort`), equal-width chips, gradient-keeping button hover, 44 px target for sm buttons, reduced-motion lifts, Card padding/focus/wrapping, "Nah am Tiefpunkt". Deliberately kept: the short q curl (a wave turned into a squiggle at 22 px) and the `q.` favicon (a white t looks like Tumblr). For the next UI tasks: build to CRAFT.md §3, and run the same screenshot + critic loop (CRAFT §6) before merging.

**C-006c notes (DONE):** core `chartGeometry` (`packages/core/src/chart.ts`, 21 tests): a slot per calendar day, x/y as fractions of the plot, guarded y-domain, outliers pinned to the edge, 3–4 round grid lines (`gridTicks`), gaps, low/last/avg, sparse window (≥ 14 days) with a "building" band, stale band after 2 days without data, flat-data handling. Web `components/chart/PriceChart.tsx` (server: left label gutter, stretched SVG for lines with non-scaling strokes, marks in percent, HTML labels, legend for Ø 30 Tage, table fallback) and `ChartScrub.tsx` (client: day-indexed slider, hover, touch scrub after 8 px, keys incl. PageUp/Down/Esc, readout chip clamped in the row above the plot, fires `tidaq:chartscrub` = `CHART_SCRUB_EVENT` for the verdict block). CRAFT.md §3 Price chart updated with every decision from the design-critic pass. Pass `to` = today (Europe/Berlin) on real pages, so stale data shows.

**C-006d notes (DONE):** `components/stay/VerdictBlock.tsx` (server; CRAFT.md §3 order: StateChip → XL price + "gesamt · … pro Nacht · n Nächte, n Erwachsene" → PriceDelta ("seit …" under 30 days) → RangeBar → one fact sentence → "Stand: heute, 07:12 Uhr · Quelle: Google Hotels" in German time), `VerdictPrice.tsx` (client: follows `tidaq:chartscrub` inside the nearest `[data-scrub-scope]`, snaps back), `components/ui/RangeBar.tsx`, `Skeleton.tsx` (Skeleton, VerdictSkeleton, ChartSkeleton with a dashed baseline only), `components/stay/CollectingState.tsx` (7-segment progressbar, "erste Einschätzung ab Sa, 17. Okt."), `components/ui/Toast.tsx` (role=status, 5 s, pauses on hover/focus). Core: `verdictFacts` (k of n days, first verdict day), `formatWeekdayDayMonth`, `updatedAtParts` (Europe/Berlin). Wrap verdict + chart in an element with `data-scrub-scope` so the price follows the chart.

**C-006e notes (DONE):** `apps/web/e2e/visual.spec.ts` screenshots every `/dev/ui` section (fixed dates, so deterministic) and the homepage hero at 390 and 1280 px; `toHaveScreenshot` with 1 % pixel tolerance, animations off. Runs only in CI and only once baselines exist. Baselines come from the **Visual baselines** workflow (`.github/workflows/visual-baselines.yml`, manual, input = branch ≠ main): it renders in CI's Linux image and commits `e2e/visual.spec.ts-snapshots/` to that branch. After an intended UI change: run it for the PR branch, review the new images in the PR diff. Step 1 (test + workflow) and step 2 (first baselines) are separate PRs, because a manual workflow must exist on main before it can be started. 28 baselines committed. The hero baseline assumes CI has no Supabase data (generic lead text); if CI ever gets data secrets, mask the lead or re-baseline.

**Goal:** the Soft Modern design system from `docs/DESIGN.md` as code.

**Steps**

1. Tokens as CSS variables + Tailwind theme (colors, radii, shadows, fonts, spacing scale). Plus Jakarta Sans via `next/font/google`.
2. Components in `apps/web/components/ui/`: Button (primary, ghost, sizes), Input, Field (label + hint + error), Chip/Toggle, Card, Badge, StateChip (collecting/near_low/good/normal/high), PriceDelta, TrustScore (score + sample text, "Noch zu wenig Tests"), Price (formatting via `formatPrice`), Sparkline, Skeleton, EmptyState, Logo (wordmark `tidaq`).
3. `/dev/ui` page (noindex, only outside production) showing every component in every state.
4. Visual regression: Playwright screenshot test of `/dev/ui` at 390 and 1280 px.

**Done when**

- [ ] `/dev/ui` matches DESIGN.md (colors, type, radius) side by side with the reference HTML
- [ ] Keyboard focus visible on all interactive components; contrast AA

### C-007 · i18n and formatting

Owner: CLOUD · Size: S · Depends on: C-001 · Status: DONE · PR: [#7](https://github.com/zaidg7/tidaq/pull/7)
Notes: next-intl 4 with `localePrefix: 'as-needed'`, `localeDetection: false` and `localeCookie: false` (German for everyone at `/`, no cookies; `/de` redirects to `/`). Pages live in `app/[locale]/` (that layout is the root layout). Message keys are type-checked against `messages/de.json` (`global.d.ts`). `Locale`, `locales`, `defaultLocale` come from `@tidaq/core`. `formatDateRange` uses its own month names, not Intl: ICU output differs between Node versions (CI) and workerd.

**Steps**

1. next-intl with locales `de` (default, no prefix) and `en` (`/en`). Middleware, `messages/de.json`, `messages/en.json`.
2. `packages/core/format.ts`: `formatPrice(cents, locale)` → `1.184 €` / `€1,184`; `formatDateRange` → `1.–3. Dez. 2026` / `1–3 Dec 2026`; `formatPercent`. Unit tests for both locales, including thousands, 0, negative deltas.
3. Locale switch component (keeps the current path).
4. Extend `apps/web/e2e/smoke.spec.ts` with the `/en` case (C-002 covers only `/`, because `/en` doesn't exist before this task).

**Done when**

- [x] `/` German, `/en` English; all strings from message files
- [x] Formatting tests pass

---

## Phase 1: Data

### C-010 · DataForSEO spike (critical)

Owner: CLOUD · Size: M · Depends on: C-001, Z-04, Z-06 · Status: DONE · PR: [#10](https://github.com/zaidg7/tidaq/pull/10)
Notes: report `docs/research/dataforseo.md`. Spike cost $0.0136. Per-night prices, lookups by `hotel_identifier` only, ~29 sites per stay incl. the official site, results in < 4 min, no breakfast data (D-39, D-40). Run the script with `NODE_USE_ENV_PROXY=1` in cloud sessions so Node's fetch uses the proxy that adds the auth header.

**Goal:** know exactly what the API gives us before building on it. **Write findings, not assumptions.**

**Steps**

1. Script `scripts/spike/dataforseo.ts` (runs in the cloud session, where the agent proxy attaches DataForSEO auth automatically, or via a `workflow_dispatch` GitHub Action with secrets) that:
   - calls Hotel Searches for "Luxushotel Berlin" (location Germany, language de, EUR) and records hotel identifiers,
   - calls Hotel Info for 3 hotels (Adlon, Ritz-Carlton Berlin, Waldorf Astoria Berlin) for 2 stays (next Fri–Sun, and 1–3 Dec 2026), adults 2, currency EUR,
   - tries `load_prices_by_dates` / `prices_start_date` / `prices_end_date` if available (a price calendar would save cost),
   - tests both task_post + tasks_ready + task_get and the postback mechanism (if postback is possible from the worker).
2. Save responses (they contain no personal data) to `tests/fixtures/dataforseo/`.
3. Write `docs/research/dataforseo.md` answering:
   - Which fields exist per offer: provider/source name, URL, price, nightly vs total, taxes, currency, room name, board/breakfast, free cancellation, official-site flag?
   - How many providers per hotel on average? Is "official site" included?
   - Real cost per call (account balance before/after), latency, failure rate.
   - Does the price calendar feature work, and what does it cost?
   - **Recommendation:** grid size, run times, whether breakfast/room filters are feasible (C-055), whether a second source is needed.
4. If anything contradicts PLAN §6–§8, propose changes in the same PR (update PLAN and add a DECISIONS entry).

**Done when**

- [x] Report merged with real numbers
- [x] Fixtures committed, zod schemas drafted in `packages/core/src/dataforseo.ts`
- [x] Cost of the spike under $1 (it must fit the free $1 sign-up credit; Zaid tops up only after this report)

### C-011 · Hotel catalog

Owner: CLOUD · Size: M · Depends on: C-004, C-010 · Status: DONE · PR: [#15](https://github.com/zaidg7/tidaq/pull/15)
Notes: 40 hotels with Google identifiers in all 12 cities; **36 active** (D-13 budget), 4 on standby (`hotel-de-rome-berlin`, `the-charles-hotel-muenchen`, `the-westin-hamburg`, `hotel-imperial-wien`). Not findable via the API and replaced by five-star hotels from the same city: Park Hyatt Hamburg → Hotel Atlantic Hamburg, Rosewood Vienna → Palais Coburg, Four Seasons Milano → Bulgari Hotel Milano, Hotel De L'Europe → InterContinental Amstel. The Conservatorium is now "Mandarin Oriental Conservatorium". Hotel Info for a Vienna hotel with location Germany works (33 sites), so prices for all cities come from the German market (D-39). Cost $0.061 (71 searches). Not done here: photos (→ C-011b; the Commons API rate-limits the cloud IP with 429) and `official_url`, which the collector can fill from Hotel Info `about.url` (C-013). `stars` stays 5 for all: Google returns 0 for some five-star hotels.

**Goal:** about 36–50 five-star hotels in the catalog with correct identifiers.

**Seed list (verify each on Google Hotels via the API; replace any that are closed, rebranded or not five-star):**

- Berlin: Hotel Adlon Kempinski · The Ritz-Carlton Berlin · Waldorf Astoria Berlin · Hotel de Rome
- München: Mandarin Oriental Munich · Hotel Bayerischer Hof · Rosewood Munich · The Charles Hotel
- Hamburg: The Fontenay · Fairmont Hotel Vier Jahreszeiten · Park Hyatt Hamburg · The Westin Hamburg (Elbphilharmonie)
- Frankfurt: Villa Kennedy · Steigenberger Icon Frankfurter Hof · Sofitel Frankfurt Opera
- Wien: Hotel Sacher Wien · Park Hyatt Vienna · Rosewood Vienna · Hotel Imperial
- Zürich: Baur au Lac · The Dolder Grand · Park Hyatt Zurich
- Paris: Le Bristol · Shangri-La Paris · Four Seasons Hotel George V
- London: The Savoy · Claridge's · The Ritz London
- Mailand: Four Seasons Hotel Milano · Park Hyatt Milano · Mandarin Oriental Milan
- Rom: Hotel Hassler Roma · Hotel de Russie · Hotel Eden
- Barcelona: Hotel Arts Barcelona · Mandarin Oriental Barcelona · Majestic Hotel & Spa
- Amsterdam: Waldorf Astoria Amsterdam · Conservatorium Hotel · Hotel De L'Europe

**Steps**

1. Script `scripts/catalog/resolve.ts`: for each seed hotel, search via the API, pick the match (name + city), store `dfs_hotel_identifier`, coordinates, official URL. Print uncertain matches for manual review in the PR description.
2. Images: only licensed. Use Wikimedia Commons images with license + attribution (store `image_credit`), else no photo and a designed gradient placeholder (DESIGN.md). Never Google/Booking photos.
3. Slugs: `hotel-adlon-kempinski-berlin` style, ASCII, stable.
4. Seed migration or idempotent upsert script; document how to add a hotel.

**Done when**

- [x] ≥ 36 hotels active with identifiers, all 12 cities covered
- [x] Uncertain matches listed in the PR and resolved

### C-011b · Hotel photos

Owner: CLOUD (or LOCAL, if the cloud IP stays rate-limited) · Size: S · Depends on: C-011 · Status: DONE · PR: [#19](https://github.com/zaidg7/tidaq/pull/19)
Notes: `scripts/catalog/photos.ts` matches each hotel to its Wikidata item (name + within 1 km of our coordinates) and takes its curated image (P18) if Commons lists CC BY, CC BY-SA, CC0 or public domain; credit "Foto: <author>, <license>, via Wikimedia Commons". It runs in GitHub Actions (workflow **Catalog photos**, also on PRs that change the script) because Wikimedia answers 429 to the cloud sessions' IP. Result: `scripts/catalog/photos.json` (26 of 40 hotels, 23 of the 36 active ones; Sofitel Frankfurt rejected by hand: pre-opening photo), applied with `photos-sql.ts` as migration `20261012211009_hotel_photos` (also adds `hotels.image_source_url`, the Commons file page). Hotels without a photo keep `image_url` null (gradient placeholder). Images are hotlinked from `thumb.wikimedia.org`/`upload.wikimedia.org` (1280 px): C-022/C-023 must allow that host for `next/image` (or plain `<img>`), show `image_credit` next to the photo and link it to `image_source_url`. Not checked visually from the cloud (Wikimedia blocked): Zaid or LOCAL should glance at the photos once on the hotel pages; reject one by adding it to `REJECTED` in photos.ts.
For each active hotel, find a freely licensed photo on Wikimedia Commons (CC BY / CC BY-SA / public domain), store `image_url` (Commons thumbnail URL) and `image_credit` ("Foto: <author>, <license>, via Wikimedia Commons"). No photo → leave null (gradient placeholder). Never Google, Booking or hotel press photos without permission. The Commons API answered 429 from the cloud session on 12 Oct; use a descriptive User-Agent without personal data and retry with backoff, or run from LOCAL.

### C-011c · Self-host hotel photos

Owner: CLOUD · Size: S · Depends on: C-011b · Status: DONE · PR: see `[C-011c]` PR

**C-011c notes (DONE):** photos are copied once by `scripts/photos/self-host.mjs` (input: JSON of `slug` + `image_url` from `hotels`) into `apps/web/public/hotels/<slug>-160.webp` and `-960.webp` (fitted inside 160/960 px, WebP, 3 MB for 26 hotels) and listed in the generated `apps/web/lib/hotelPhotos.generated.ts`. The web app uses `hotelPhoto(slug)` and never the Wikimedia URL, so pages load images only from tidaq.com (verified: the homepage requests only its own host). `image_url` stays in the database as the source of the copy; credit and source link still come from `image_credit` / `image_source_url`. New hotel photo → add it to the JSON, re-run the script, commit. Static assets instead of R2: no extra service, same domain, cached by Cloudflare.

Found in C-020b: hotlinked Wikimedia photos let a third party set cookies (Lighthouse "third-party cookies") and see visitors' IPs, which breaks "ohne Cookies" (D-15) and needs a Datenschutz mention. Copy each licensed photo once into Cloudflare R2 (or a Worker route on tidaq.com), resized to 2–3 widths as WebP/AVIF, store the new URL next to `image_source_url`, and serve only from our domain. Keep the credit and source link. Until then images load with `crossOrigin="anonymous"` and `referrerPolicy="no-referrer"`. Must be done before launch (C-044).

### C-019 · Web data layer and reviewed best price

Owner: CLOUD · Size: S · Depends on: C-013b · Status: DONE · PR: [#22](https://github.com/zaidg7/tidaq/pull/22)
Notes: **Best price = cheapest reviewed provider.** Pending providers (unreviewed resellers) are hidden from the public by RLS, but they were the cheapest in 18 of 18 staging stays, so a public "best price" could not be named. Migration `20261013073715_stay_daily_reviewed_best`: new SQL function `rebuild_stay_daily(stay_ids | null)` (used by `collector_ingest`; call `rebuild_stay_daily(null)` after approving providers in /admin, C-016). `per_provider` keeps every provider; a day with pending providers only keeps the raw minimum with `best_provider_id = null`, and the stats and the web skip such days (13 of 410 days on 13 Oct). Web: `apps/web/lib/data/supabase.ts` (PostgREST with the anon key, Zod per row, 4 s timeout, `hasSupabase()` false in CI so pages show fallbacks) and `lib/data/featured.ts` (`getFeaturedStay`: picks the homepage example with core `pickFeaturedStay`, recomputes the stats from the reviewed series because `stay_stats` can lag a day, offers from reviewed providers on the latest day).

### C-012 · Stay grid generator

Owner: CLOUD · Size: S · Depends on: C-004 · Status: DONE · PR: [#11](https://github.com/zaidg7/tidaq/pull/11)
Notes: `packages/core/src/grid.ts` + `specialDates.ts`. Weekends = the next N Fridays strictly after today. Midweek = Tuesdays of every `floor(6 / GRID_MIDWEEK)`-th week counted from a fixed epoch, so a chosen stay stays in the grid every day until check-in (unbroken history). Specials (Easter Fri→Mon, Oktoberfest opening + second weekend for `muenchen`, first two December weekends, NYE 30 Dec → 1 Jan) enter 90 days ahead. Each stay carries `reasons` (`weekend`/`midweek`/`special`). `isStayExpired` deactivates only after check-in has passed. Step 3 (upsert `tracked_stays`, deactivate past stays) moves into C-013's "refresh grid".

**Goal:** `packages/core/grid.ts` produces the stay list from PLAN §7.1 for a given date.

**Steps**

1. Pure function `buildGrid(today, hotels, specialDates)` → stays (hotel_id, check_in, check_out, adults=2).
2. Rules (lean start, D-13): next 6 Fri→Sun; 2 Tue→Thu in the next 6 weeks; sizes from config `GRID_WEEKENDS`/`GRID_MIDWEEK`; special dates from `packages/core/specialDates.ts` (New Year's Eve, first two December weekends, Easter, Oktoberfest weekends for Munich, etc.); no past dates; dedupe.
3. Collector uses it daily and upserts `tracked_stays` (origin `grid`). Stays whose check-in has passed get `active=false`.
4. Unit tests with fixed "today" values (e.g. a Friday, the last days of December, a leap year).

**Done when**

- [x] Tests cover weekday edge cases and year boundaries

### C-013 · Collector worker

Owner: CLOUD · Size: L (split: a = posting + guard, b = results + storage) · Depends on: C-005, C-010, C-011, C-012, C-014 · Status: a, b, c DONE · d BLOCKED (B-005) · PR: a = [#16](https://github.com/zaidg7/tidaq/pull/16), b = [#17](https://github.com/zaidg7/tidaq/pull/17), c = [#18](https://github.com/zaidg7/tidaq/pull/18)

**C-013a notes (DONE):** steps 1, 3, 6 and the posting half of 5. `packages/core/src/budget.ts` (`applyBudget`: watched stays first, then nearest check-in, then hotel/check-in order; daily cap counts tasks already posted today by _both_ environments, they share one database; monthly estimate at $0.0008/task; `monthlyAlert` at 80 %). Collector: `morning.ts` (`runPosting`), `dataforseo.ts` (batches of 100, `tag` = stay id, retries 5xx/network with backoff), `store.ts` + `supabaseStore.ts`, `POST /run` (token = HMAC-SHA256(service key, `tidaq-collector-run`), workflow **Actions → Collector run**). Migration `20261012200019_collector_tasks`: `collector_tasks` (one row per posted task, status `posted` → `done`/`no_results`/`failed`), `collector_runs.kind/env/tasks_skipped/budget_reason`, `price_snapshots.task_id` with a unique index on (task_id, provider_id) for idempotent inserts. Runs that never got to post are still recorded with their error.

**C-013b notes (DONE):** step 2, 4 and 7. Collect runs every 10 min 05:00–07:50 and 17:00–18:50 UTC (cron `*/10 5-7,17-18 * * *`, D-39 amended): the Workers free plan allows only 50 external subrequests per run, so each run fetches at most `COLLECT_BATCH` = 30 results (`tasks_ready` first, tasks missing from it after 45 min directly; tasks without a result after 3 days → `failed`). `ingest.ts` (pure): `task_get` → outcome → only **eligible** offers become `price_snapshots` (suspected totals and outliers are dropped; `raw` keeps items, URL, nightly price), unknown sources become pending providers with one alias, `hotels.official_url` from `about.url` without tracking parameters. One SQL function `collector_ingest` (migration `20261012204802`) writes snapshots, providers, task statuses and URLs and rebuilds `stay_daily` (cheapest per provider per UTC day, best = cheapest overall, **pending providers included**) in one transaction; re-collecting is a no-op. `stay_stats` via `computeStayStats` (`collect.ts` → `refreshStats`). Manual: **Actions → Collector run → action `collect`** (free) or `POST /collect`. Tested against the live schema in a rolled-back transaction and against the C-010 fixtures; **not yet live**: DataForSEO paused the account on the first real run (B-005).

**C-013c notes (DONE):** `notify.ts`: plain-text admin emails via Resend from `collector@tidaq.com` (domain verified) to `ADMIN_EMAILS` (collector var, both environments; admin emails are not user emails, so `ALERTS_DRY_RUN` doesn't apply). Sent when a posting run has errors or crashes, when a posting run moves the month past 80 % of `MONTHLY_BUDGET_USD` (once, at the crossing), and from the **daily check** (`report.ts`, cron `55 7 * * *`, production only): it calls `prune_raw_snapshots()` (D-19) and emails once if today had run errors, unfinished runs, tasks without results or failed tasks, or no morning run. Collect runs don't email (every 10 min would spam); the daily check covers them. A missing `RESEND_API_KEY` or `ADMIN_EMAILS` skips email (logged) and never breaks a run. Addresses are never logged.

**C-013d progress (12 Oct):** (1) staging done: 50 tasks posted, 2 collect runs → 34 done, 5 no results (Villa Kennedy Frankfurt both weekends, George V, Mandarin Oriental Barcelona, Park Hyatt Vienna 23 Oct; watch Villa Kennedy, replace it if it stays empty), 756 snapshots for 28 hotels, `stay_daily`/`stay_stats` filled, 16+ official URLs, 52 pending providers (long-tail resellers; the big sites all map). **Finding for C-022/C-016:** in 18 of 18 stays the cheapest price came from a pending reseller (Super.com, Traveluro, Luxury Escapes …), so the stay page should also show the best price from a known provider. (2) Production deployed 12 Oct 21:17 UTC (tidaq.com live, collector crons active from 13 Oct 05:00 UTC); redeploy after this PR so production gets cap 400. (4) B-006 applied (cap 400). Open: (3) 2-day check after the first production mornings; B-003 top-up.

**C-013d (original steps):** (1) Staging: Actions → Collector run → `staging`/`post`, wait 5 min, then `staging`/`collect` (repeat until no tasks are open). `price_snapshots` must have rows for ≥ 3 hotels; check `stay_daily`/`stay_stats` look sane. (2) Production: Actions → Deploy → `production` (also finishes C-005 once B-004 is done; the collector deploys even if the web domain still fails). (3) After 2 days: `stay_daily` has 2 rows per active stay, daily check quiet. (4) Apply B-006 if Zaid says yes. Also: `supabaseStore` selects are capped at 1000 rows by PostgREST (fine for ~400 active stays and the seed aliases today); page `stayJobs`, `watches` and `providerAliases` once they grow. C-022 must show pending providers by name without an affiliate link.

**Goal:** prices flow into the database every day, within budget. **The most important task of the project.**

**From C-011:** fill `hotels.official_url` from Hotel Info `about.url` when it's null. In December the grid adds NYE (and advent weekends overlap with normal weekends): 36 hotels × ~9 stays ≈ 324 > `DAILY_TASK_CAP` 300, so the budget guard must cut in priority order (watches, then nearest check-in) or the cap needs a short-term raise (propose in BLOCKERS).

**From C-010 (D-39):** post Hotel Info by `hotel_identifier` only; collect by polling `tasks_ready` with an extra cron at 05:30 UTC (and a retry at 06:30); add these crons to `apps/collector/wrangler.jsonc`. Fixtures in `tests/fixtures/dataforseo/`, schemas in `packages/core/src/dataforseo.ts`.

**Steps**

1. Morning run (05:00 UTC): refresh grid → build job list (all active stays; watches first) → budget guard (PLAN §7.2, unit-tested in core) → post DataForSEO Hotel Info tasks in batches (max 100 per request) with a `tag` = stay_id → record in `collector_runs`.
2. Results: postback endpoint `/postback?token=…` (secret), or a poll of `tasks_ready` every run plus a retry run (decide from C-010). Validate with zod → normalize (C-014) → insert `price_snapshots` → rebuild `stay_daily` for touched stays → recompute `stay_stats` (C-015) → trigger alert evaluation (C-031, once it exists).
3. Evening run (17:00 UTC): **disabled at the start** (feature flag `EVENING_RUN=false`). When enabled: only stays with check-in within 21 days, plus watches.
4. Idempotency: re-running the same day must not double-insert (unique key on stay, provider, day, or dedupe by task id).
5. Failure handling: retries with backoff for 5xx; log errors in `collector_runs.errors`; if a run fails or the cost estimate exceeds 80 % of the monthly budget, email Zaid via Resend (`ADMIN_EMAILS`).
6. Manual trigger: `workflow_dispatch` action or an authenticated `/run` endpoint for staging.
7. Integration test: run the full pipeline against fixtures with a mocked fetch and an in-memory/local database.

**Done when**

- [ ] On staging, one manual run fills `price_snapshots` for ≥ 3 hotels
- [ ] Production cron enabled; after 2 days `stay_daily` has 2 rows per active stay
- [ ] Budget guard proven by a test where the cap cuts the job list in the right priority order
- [ ] Zaid gets an email when a run fails (tested by forcing an error on staging)

### C-014 · Normalization and provider mapping

Owner: CLOUD · Size: M · Depends on: C-010 · Status: DONE · PR: [#12](https://github.com/zaidg7/tidaq/pull/12)
Notes: `packages/core/src/normalize.ts`. Pure: `normalizeHotelInfo(result, nights, aliases)` → one offer per provider (ads merged into organic entries; outbound URL only from organic entries, never `google.de/aclk`), `totalCents = nightly × nights`, flags `suspectedTotal` (±25 % of nights × median) and `outlier` (< 30 % / > 400 % of median), `eligible` = neither. `bestOffer`, `unknownSources` (→ pending providers, done by the collector in C-013). Provider lookup: official site → `hotel-direct`; else alias by full domain, domain without `www.`, registrable domain, then site name; the seed aliases already cover the big sites. The API returns integer EUR, so no German number-string parsing is needed (C-010). A 3.6× price (Clicktrip, Ritz-Carlton Dec) passes the 400 % rule; it's never best, but C-022 may want to hide offers far above the median in the provider table.

**From C-010:** prices are per night → multiply by nights; detect suspected totals (≈ nights × median); dedupe ads (`is_paid`) against organic entries; map by domain (add domain aliases like `www.booking.com`, `de.hotels.com`, `hotel.check24.de`, `de.trip.com`, `www.agoda.com`, `www.expedia.de`). See PLAN §7.3 and `docs/research/dataforseo.md`.

**Steps**

1. `packages/core/normalize.ts`: raw offer → `{providerKey, totalCents, roomName?, board?, freeCancellation?, raw}` per PLAN §7.3.
2. Alias table handling; unknown providers create a pending provider and log once.
3. Detect nightly vs total price; detect and drop obvious outliers (price < 30 % or > 400 % of the stay's median that day, logged, not stored as best).
4. Unit tests from fixtures, including German number strings if the API returns them ("1.184,00 €").

**Done when**

- [x] All fixture offers normalize without errors; outlier rule tested

### C-015 · Price stats engine

Owner: CLOUD · Size: M · Depends on: C-001 · Status: DONE · PR: [#14](https://github.com/zaidg7/tidaq/pull/14)
Notes: `computeStayStats(series, today, checkIn)` in `packages/core/src/stats.ts` (pure). Window 60 days up to `today`; duplicate days keep the lowest price; percentile = mid-rank (ties count half), null below 2 points; trend = least squares over the last 7 days in % per week (±1.5 % → falling/rising). Advice keys: `collecting`, `near_low`, `good_falling`, `good`, `normal_falling`, `normal`, `high`, plus the `soon` note (check-in in 0–7 days). Also returns `stale` (latest point > 2 days old). Copy in `messages/*.json` under `advice`, `state`, `trend`; `apps/web/lib/messages-check.ts` fails typecheck if a key is missing or `en.json` drifts from `de.json`.

**Steps**

1. `packages/core/stats.ts`: from a series of daily best prices → low, high, avg30, percentile, trend_7d (least squares), state, advice key (PLAN §8.1). Pure functions.
2. Advice copy keys in next-intl (`advice.near_low`, …) with DE and EN text; the 7-days-before-check-in note.
3. Tests: flat series, falling, rising, single point, 6 points (collecting), spike outlier, near-low boundary.

**Done when**

- [x] ≥ 95 % coverage on stats.ts; outputs match PLAN §8.1 examples

### C-016 · Admin: data health and budget

Owner: CLOUD · Size: M · Depends on: C-013, C-020c · Status: DONE · PR: [#32](https://github.com/zaidg7/tidaq/pull/32)

**C-016 notes (DONE):** SQL `admin_health(p_days)` (migration `20261013140140`, service role only, checked in `supabase/tests/rls_check.sql`) returns everything in one call: production runs per German day, month cost, coverage today/yesterday, hotels without prices for 3 days, inactive hotels, pending providers (top 25 by offers in 14 days). Core `healthVerdict` (`health.ts`) turns it into ok / warn / bad plus reasons (no run for 26 h, coverage < 50 % bad / < 90 % warn, judged on today's prices from 09:00 Berlin and yesterday's before, errors, budget-guard skips, ≥ 80 % / 100 % of `MONTHLY_BUDGET_USD`, stale hotels). `/admin` renders `components/admin/Dashboard.tsx` with data from `lib/admin/db.ts` (service role, Zod). Buttons are server actions (`app/admin/actions.ts`, `requireAdmin()` first): approve provider (+ `rebuild_stay_daily(null)`), deactivate / activate hotel, start a staging collector run (`COLLECTOR_STAGING_URL` + run token from core `runToken`, moved there from the collector). Preview with made-up data: `/dev/admin` (never on production). Web vars `MONTHLY_BUDGET_USD`, `COLLECTOR_STAGING_URL` in `apps/web/wrangler.jsonc`. Usable once B-007 is done.

**Steps**

1. `/admin` (auth from C-020c): last 14 collector runs (tasks, cost, errors), month-to-date cost vs budget, coverage (active hotels, stays, % stays with today's data), unknown providers to map, hotels with no data in 3 days.
2. Buttons: "Run collector now (staging)", "Deactivate hotel".
3. Approving a pending provider (unknown provider list) must call SQL `rebuild_stay_daily(null)` afterwards, so best prices include it (C-019).

**Done when**

- [x] Zaid can see on his phone in 10 seconds whether data is healthy

### C-013e · Villa Kennedy gets no prices

Owner: CLOUD · Size: S · Depends on: C-013b · Status: DONE · PR: [#36](https://github.com/zaidg7/tidaq/pull/36)

**C-013e notes (DONE):** root cause: Villa Kennedy closed in 2022 and reopened in December 2025 as **The Florentin** (Althoff Collection); our identifier is the closed Google listing, so all 13 Hotel Info tasks returned `no_results`. Two Hotel Searches for the new name ("The Florentin", "The Florentin Frankfurt Althoff"; $0.0016 total, catalog guard) returned nothing: DataForSEO's Google Hotels data doesn't list it yet. The hotel is deactivated (migration `20261013201119`), which saves 11 empty tasks a day. `scripts/catalog/seed.json` now names The Florentin (with `replaces` and a `query` field, new in `resolve.ts`). Follow-up: C-013f.

### C-013g · Collector: free price source Xotelo

Owner: CLOUD · Size: M · Depends on: C-013b · Status: DONE · PR: [#41](https://github.com/zaidg7/tidaq/pull/41)

Why: the DataForSEO balance is empty and Zaid wants to run the market test for free (D-41, spike in `docs/research/xotelo.md`). Migration `20261013234015_xotelo_source.sql` (applied 13 Oct): `hotels.xotelo_key` for all 39 active hotels, `price_snapshots.source`, brand-site aliases → `hotel-direct`, `rebuild_stay_daily` builds a stay's days from the source of its newest snapshot only (old DataForSEO snapshots stay), `collector_ingest` stores `source`. Code: core `xotelo.ts` (schema, URL, rates → price items for `normalizeHotelInfo`), budget guard accepts cost 0 (daily cap only), collector `PRICE_SOURCE` (morning queues `xo-<run>-<stay>` jobs, collect calls Xotelo per job, 400 ms apart, busy answers stay queued), `deploy.yml` option **collector_only** (production collector without touching tidaq.com) and a collector `/health` check.

**C-013g notes (DONE, 14 Oct 00:20 UTC):** staging run from Cloudflare: 50 jobs queued ($0), one collect run made 30 Xotelo calls in 38 s → 28 stays priced, 2 without rates, 0 errors; 112 snapshots (Agoda 28, Booking 27, Trip.com 25, Vio 21 pending, hotel direct 10); those stays now show 1 Xotelo day (their 2 DataForSEO days left `stay_daily`, the 8,739 DataForSEO snapshots are kept). Production collector deployed with **collector_only** (web steps skipped, tidaq.com unchanged). Follow-ups done: (1) `bvlgari` alias in C-022b; (2) **first production Xotelo morning, 14 Oct:** 350 jobs queued at 05:00 UTC (35 skipped by the cap: the staging run had used 50), 13 collect runs finished by 07:02 UTC → 329 stays priced, 21 without rates, 0 errors, $0; 1,427 snapshots (≈ 4.3 sites per stay), `stay_daily` rows for 35 hotels. Empty: The Ritz London 7 of 10 stays, Mandarin Oriental Barcelona 5 of 10 (also empty on DataForSEO on 12 Oct, so likely sold out), 9 single stays elsewhere. Watch both in the 2-day check (C-013d); swap a hotel if it stays mostly empty.

**Done when:** CI green; staging: Actions → Collector run → `staging`/`post`, then `staging`/`collect` → Xotelo snapshots for ≥ 20 stays (proves Cloudflare can reach Xotelo); then Actions → Deploy → `production` with **collector_only** ticked; next morning (05:00 UTC) the production run queues ~370 jobs and the collect runs work them off by ~07:20 UTC.

### C-013f · Re-check The Florentin

Owner: CLOUD · Size: S · Depends on: C-013e · Status: TODO · PR: –

With Xotelo (D-41) first check TripAdvisor's Frankfurt list (`/api/list`, free) for The Florentin and set its `xotelo_key`. Otherwise not before 10 Nov 2026: post one Hotel Searches task for The Florentin (`node scripts/catalog/resolve.ts post` after changing the seed's `tag`), and if it resolves: data migration that sets the new `dfs_hotel_identifier`, name "The Florentin", keeps slug or renames it (also rename the photo files and the manifest), then `active = true`. If still missing, try again in December or replace it with another Frankfurt five-star hotel.

**C-013f notes (DONE, 14 Oct):** Tripadvisor's Frankfurt list (Xotelo `/api/list`, free) has "The Florentin by Althoff Collection" as `g187337-d33302530` (45 reviews, 411–641 € a night) with Booking.com, Agoda and Trip.com rates. Migration `20261014214738` renames hotel 16 to "The Florentin", slug `the-florentin-frankfurt`, sets the key and reactivates it; the night grid picks it up on the next run. No photo yet (none existed for Villa Kennedy); add one in the next photo batch. Frankfurt is back to 3 hotels.

Found by the C-016 dashboard on 13 Oct: Villa Kennedy (Frankfurt, hotel id 16) has active stays but no price on any day, while the other 35 active hotels have prices. Check its `dfs_hotel_identifier` with one DataForSEO hotel search call (through the budget guard), compare with the stored ID, fix the ID with a data migration, or deactivate it in `/admin` if DataForSEO doesn't list it.

---

## Phase 2: MVP website

### C-020a · App shell

Owner: CLOUD · Size: M · Depends on: C-006b, C-007 · Status: DONE · PR: [#24](https://github.com/zaidg7/tidaq/pull/24)

**Notes (DONE):** `components/shell/` = Navbar (server; sticky, frosted after 64 px via a CSS scroll-driven animation, no JS; skip link; desktop links with current-page dot, DE/EN, search icon, CTA; mobile: logo, search, menu), MobileMenu (modal `<dialog>` top sheet: native focus trap and Esc), NavLinks + LocaleLinks (tiny client parts, labels from the server, no i18n runtime in the browser), Footer (3 columns), StatusPage. All routes in `lib/routes.ts`; core `localizedPath`/`splitLocale` (tested). Branded 404 (`[locale]/not-found.tsx` + `[...rest]` catch-all, real 404 status) and error boundary (reads only the `error` messages the layout passes to the client provider). `app/robots.ts`: staging disallows all; production allows (pages stay `noindex` until C-041/C-044). `/` first-load JS 216 → 104 kB. The search icon and CTA point to `/#suche` (the hero search card in C-020b must have `id="suche"`). Nav/footer link to pages that don't exist yet (404 until built): `/hotels` (C-024), `/kassen-check` (C-042), `/methodik` (C-034), `/ranking`, `/impressum`, `/datenschutz`, `/affiliate-hinweis` (C-027). Note `lib/cn.ts` doesn't merge conflicting classes: wrap instead of overriding `hidden`/`absolute`.

**Steps**

1. Root layout per CRAFT.md §3: navbar (logo, links Hotels · Deals · Kassen-Check · So funktioniert's, CTA "Preise ansehen", scroll state, mobile top sheet), footer (columns, legal links, affiliate note, locale switch, © 2026 Tidaq).
2. 404 and error pages in brand style.
3. `robots` noindex on staging.
4. Locale switch as plain server-rendered links: the current client `LocaleSwitch` puts ~100 kB of JS on `/` (build output), which would hurt Lighthouse.

### C-020c · Admin auth

Owner: CLOUD · Size: S · Depends on: C-020a · Status: DONE · PR: see `[C-020c]` PR

**C-020c notes (DONE):** `app/admin/` is its own root layout outside `[locale]` (German only, noindex, `force-dynamic`; the middleware skips next-intl for `/admin`). Login = Supabase magic link with PKCE over plain REST (`lib/admin/gotrue.ts`, Zod-validated, no supabase-js): `POST /admin/auth/login` (same-origin check, only `ADMIN_EMAILS` get a link, same answer for every address) → email link → `GET /admin/auth/callback?code=` (exchanges with the verifier cookie, checks `ADMIN_EMAILS` again) → cookies `tidaq_admin_at/_rt` (HttpOnly, SameSite=Lax, **Path=/admin**, so public pages never see a cookie). `requireAdmin(path)` (`lib/admin/session.ts`) guards each page itself (no middleware-only protection) and verifies the token with Supabase on every request; expired tokens go through `GET /admin/auth/refresh?next=` (`safeAdminPath` blocks open redirects). `POST /admin/auth/logout`. Core: `parseAdminEmails`, `isAdminEmail`, `safeAdminPath`, `randomVerifier`, `pkceChallenge`. `ADMIN_EMAILS` is a var in `apps/web/wrangler.jsonc`. **Security rule for C-016/C-032:** anyone can create a Supabase Auth user with the public anon key, so never grant the `authenticated` role extra rights in RLS. Admin reads and writes go through server code after `requireAdmin()`, using the service role. **Login only works after B-007** (Supabase redirect URLs + Resend SMTP); until then the page shows the link error. Lighthouse mobile `/admin/login`: a11y 100, best practices 100, performance 96.

Split from C-020a so the public site ships first. Supabase magic link to an email in `ADMIN_EMAILS`; middleware protects `/admin/*`; no cookies on public pages.

**Done when**

- [ ] Shell works at 390 px and 1280 px; Lighthouse a11y ≥ 95

### C-020b · Homepage

Owner: CLOUD · Size: L (split b1/b2) · Depends on: C-020a, C-006d, C-015, C-019 · Status: b1 DONE, b2 DONE · PR: b1 = [#27](https://github.com/zaidg7/tidaq/pull/27), b2 = [#28](https://github.com/zaidg7/tidaq/pull/28)

**C-020b1 notes (DONE):** `components/home/Hero.tsx` (eyebrow, H1 with the accent word "tief" and the falling hairline, lead and proof row with real counts from `lib/data/catalog.ts`, numbers dropped without data), `SearchCard.tsx` (client island: segmented group, hotel select grouped by city, native dates, guests, inline errors; submits to `/hotel/{slug}/{in}--{out}?adults=n`, the stay page from C-022, so **don't deploy the homepage to production before C-022**), `LiveExample.tsx` (featured stay from `getFeaturedStay` with verdict, chart and today's prices by site; without data a sample labelled "Beispieldaten" from `lib/sampleStay.ts`). `@tidaq/core` is now `"sideEffects": false`: client imports from the barrel no longer ship Zod (home first-load JS 207 → 112 kB). Lighthouse mobile (local, live data): performance 98, accessibility 100, best practices 100 once photos load without cookies (C-011c). `lib/today.ts` = Berlin date.

**C-020b2 notes (DONE):** `components/home/HowItWorks.tsx` (3 steps), `CheckoutTeaser.tsx` (the method + a "Kassenbon" with a zig-zag mask, clearly labelled "Beispiel"; real per-site results come with L-033/C-034), `Deals.tsx` + `lib/data/deals.ts` + core `pickDeals` (≥ 14 days, ≥ 8 % under the 30-day average, one per hotel, top 3; the section renders nothing until such deals exist, expected from about 26 Oct), `FinalCta.tsx` (marked `data-hides-nav-cta`, so the navbar CTA hides there too). **Copy to update in C-030:** step 3 says "Bald auch per E-Mail, wenn der Preis fällt"; drop "Bald" when alerts ship.

**Steps**

1. Build the homepage section by section like `docs/design/reference-homepage.html` (Soft Modern variant): hero + search card, live example panel, how it works (3 steps), trust teaser with figures, deals of the week, final CTA, footer.
2. The live example uses a real featured stay: `getFeaturedStay()` (C-019, `apps/web/lib/data/featured.ts`); falls back to a static example labeled "Beispiel" if data is missing.
3. Copy from the reference, refined; DE and EN.

**Perf baseline (measured in C-020a, Lighthouse 12 mobile on a local `next start`, placeholder home with the shell):** performance 88, accessibility 100, best practices 100, SEO 63 (only the intended pre-launch `noindex`). TBT 430 ms is mostly the React/Next runtime (~119 KiB unused JS); LCP 2.4 s is the hero text. To reach ≥ 90 with real content: keep client components tiny (chart scrub can be one small island), no client-side data fetching, let the live example render on the server, check the font and CSS on the critical path.

**Done when**

- [ ] Side-by-side with the reference: same structure and feel; real data visible
- [ ] Mobile LCP < 2.5 s (Lighthouse mobile ≥ 90)

### C-021 · Search

Owner: CLOUD · Size: M (split a/b) · Depends on: C-020a, C-011 · Status: DONE · PR: a = [#37](https://github.com/zaidg7/tidaq/pull/37), b = [#38](https://github.com/zaidg7/tidaq/pull/38)

**C-021a notes (DONE):** `components/home/HotelCombobox.tsx` (ARIA 1.2 combobox: input keeps focus, `aria-activedescendant`, ↓/↑/Enter/Esc, click picks without blur, polite result count, exact name + Tab picks) replaces the hotel select in `SearchCard`. Matching in core `matchHotels` / `foldText` (accent-, case- and ß-insensitive, "zuerich" = "zürich", word prefixes in any order, ranked name start → name word → city → substring). The list hangs below the hotel segment across the whole group (the group lost `overflow-hidden`; corner segments round themselves). Search strings come from `lib/searchCardProps.ts` (shared by the homepage and the new "Suche" section on `/dev/ui`, which has a sample catalog so CI can test it: `e2e/search.spec.ts`). Cities are matched but don't link anywhere yet: when C-024 builds city pages, add a "Alle Hotels in {Stadt}" option that opens the city page.

**C-021b notes (DONE):** `components/home/DateRangePicker.tsx` replaces the two native date inputs. The Anreise/Abreise segments are buttons (`aria-haspopup="dialog"`, named by label + value) that open a modal `<dialog>`: bottom sheet below 768 px (one month), centred card with two months from 768 px (`.date-sheet` in globals.css). Monday-first ARIA grid with roving tabindex (arrows, Home/End, PageUp/PageDown, Shift+Page = year, Enter/Space picks); past days and check-outs over 30 nights are `aria-disabled` (still focusable); check-out at most 365 days ahead. Every click updates the card live; Esc, backdrop, ✕ and "Fertig" all keep the choice; focus returns to the segment. Opening from "Abreise" edits the check-out; moving the check-in keeps a check-out that still fits. Pure logic in core `calendar.ts` (`STAY_LIMITS`, `pickDay`, `isSelectable`, `dayRole`, `moveFocus`, `monthWeeks`; 100 % covered); C-022 should reuse `STAY_LIMITS` to validate stay URLs. Guests stay a native select (1–4). Dark styles come with the dark theme (phase 2).

**Steps**

1. Autocomplete for hotels and cities (accessible combobox pattern, diacritics-insensitive: "zurich" finds "Zürich").
2. Date range picker: German locale, Monday first, nights count, max 30 nights, no past dates, mobile bottom sheet.
3. Guests: adults 1–4 (children later). No breakfast/refundable toggles in v1 (D-40).
4. Submit → stay page URL; city → city page.

**Done when**

- [ ] Works with keyboard only and on iPhone width; e2e test covers a full search

### C-022 · Stay page

Owner: CLOUD · Size: L (split: a = route + data + header + chart + stats + advice + collecting/no-data/past/inactive states; b = provider table + watch CTA; c = untracked stays tracked on request) · Depends on: C-020a, C-015, C-013 · Status: a DONE, b DONE, c TODO · PR: a = [#40](https://github.com/zaidg7/tidaq/pull/40), b = [#43](https://github.com/zaidg7/tidaq/pull/43)

**C-022a notes (DONE):** route `app/[locale]/hotel/[slug]/[range]/page.tsx`, params validated by core `parseStayParams` (bad dates, check-out ≤ check-in, > 30 nights, bad slug → 404; invalid `adults` → redirect to `adults=2`; missing `adults` = 2) and linked with core `stayPath`. Data: `lib/data/stay.ts` `getStay` (hotel incl. inactive, the exact tracked stay, 60 days of reviewed best prices with the best provider's name per day, up to 6 other upcoming tracked stays from `v_hotel_calendar`); no Supabase or a read error → "Preise gerade nicht erreichbar" with reload. View: `components/stay/StayView.tsx` with `stayStatus()`: tracked (verdict + chart + Tief/Ø 30 Tage/Hoch + advice incl. "Kurz vor Anreise"), collecting (price + chart so far + 7-day progress), no_data, untracked, past, inactive. "Ändern" (`EditStay`) opens the search card prefilled (`SearchCard` got `initial` and `formId`). Sample-data previews of every state at `/dev/stay/<tracked|soon|collecting|no-data|untracked|past|inactive>` (not on production) feed `e2e/stay.spec.ts`. Checked against live data (Waldorf Astoria, collecting). For C-022b: the untracked copy says "Bald kannst du auch eigene Daten beobachten lassen" — change it when on-demand tracking ships; the provider table and watch CTA go between the panel and "Weitere Termine"; no visual-regression baseline for the stay page yet (add one when the layout settles, it costs a baseline run).

**C-022b notes (DONE):** "Preise heute" (or "Preise vom 12. Okt." when the latest collected day isn't today) lists the latest `stay_daily.per_provider` entry of every reviewed provider (RLS hides pending ones; their count shows as "2 weitere Anbieter … noch nicht von uns geprüft"), sorted by core `rankOffers`: trusted price = listed × (1 + avg markup) when a provider has ≥ 5 checkout tests and a markup above the pass threshold, else the listed price; ties → lower listed, hotel site, name. Each row: monogram (hotel icon for the hotel's own site), name, "Günstigster" on the single cheapest trusted price, price with "an der Kasse ≈ …" in red when the tests show a markup, Preistreue (`TrustScore`; box and note side by side on phones). No outbound buttons yet (C-026 adds `/go/*` links with `rel="sponsored nofollow"`; Xotelo gives no deep links, so C-026 must build search links per provider or use the hotel's own site). "Preis beobachten" card next to the table (disabled "Bald verfügbar" until C-030; C-030 also adds the sticky mobile bar from DESIGN §4, pointless while disabled). Public source lines no longer say "Google Hotels" (Xotelo since D-41): footer "Preise jeden Morgen von den Buchungsseiten", verdict "Quelle: Preise der Buchungsseiten"; visual baselines regenerated. Aliases `bvlgari` and `preferred hotels & resorts` → hotel-direct (migration `20261014072730`). Follow-up: C-032c (checkout tests still reference Google Hotels).

**C-022c (split: c1 DONE, c2 dropped by D-42) · Track untracked dates on request.** C-022c2 is dropped: with the night grid (C-070) every date inside the window has history; C-070b calls `request_stay` automatically for the stay a visitor opens. Original text: Owner CLOUD, size M, depends on C-022b. On an untracked stay, show "Diese Daten beobachten" (a button, never on page view, so crawlers can't create stays). It calls a security-definer RPC `request_stay(hotel_slug, check_in, check_out, adults)` (anon may execute) that validates the stay (core `STAY_LIMITS`, active hotel, check-in ≥ today Berlin), returns an existing stay, or inserts `tracked_stays` with origin `watch` only while fewer than `DAILY_REQUEST_CAP` (start 30) were requested today and the total active stays stay within the collector cap; else a clear "Heute sind alle Plätze vergeben, versuch es morgen" state. Then the page says "Erste Preise morgen früh" (the collector runs at 05:00 and 17:00 UTC; with Xotelo the evening run can pick it up the same day if it's within the evening window). Also: rate limit per IP in memory/KV (IP not stored), e2e on the dev page, RLS check for the RPC, and change the untracked copy ("Bald kannst du auch eigene Daten …"). Unused requested stays expire like other stays (grid `isStayExpired`).

**C-022c1 notes (DONE, [#46](https://github.com/zaidg7/tidaq/pull/46)):** migration `20261014075910_request_stay` (applied): `request_stay(p_hotel_slug, p_check_in, p_check_out, p_adults)` → `tracked | created | full | invalid`, security definer with empty search_path, anon may execute (anon still can't insert into `tracked_stays`; `supabase/tests/rls_check.sql` checks both). Validation mirrors core `STAY_LIMITS`/`ADULTS` (check-in ≥ Berlin today, ≤ 30 nights, check-out ≤ today + 365, 1–4 adults, active hotel with a source id). Capacity: active upcoming stays < the cap the last production posting run recorded (new `collector_runs.daily_cap`, default 400 until the next morning run writes it) and < 30 requests per German day; an advisory lock serialises requests. Tested against production in a transaction that always rolled back (all 4 results, the cap edge and the 30/day limit). Collector: the collect cron now runs every 10 min all day (still 4 crons: the free plan allows 5 per account) and first runs `runRequests` (kind `request`): requested stays (origin `watch`) without any task get one through the same budget guard (`postWithinBudget`, shared with the morning run), then the collect run prices them — first prices within ~10 min. Idle cost: two queries per run, no run row. `/collect` (manual, staging) does the same. Requested stays are not prioritised over the grid (`watched` stays false); with B-009 (cap 500) there is room for ~100. **For C-022c2:** the server action calls `rpc/request_stay` with the anon key (add a `rpc()` helper next to `rest()` in `lib/data/supabase.ts`), maps `created` → reload (the page then shows the no-data state: say "Erste Preise in etwa 10 Minuten" when the stay is origin `watch` and younger than ~1 h), `tracked` → reload, `full` → "Heute sind alle Plätze vergeben. Versuch es morgen wieder.", `invalid`/error → generic error; rate-limit per IP in memory; change the untracked copy.

**Steps**

1. Route `/hotel/[slug]/[checkin]--[checkout]?adults=2` (validate params; redirect invalid).
2. Header: hotel, dates, guests, state chip, price now (big), delta vs avg30, nights and total.
3. Chart component (SVG): best price per day, avg30 dashed line, low marker, today marker, hover/tap tooltip with date and price, y-axis in €, accessible data table toggle.
4. Stats row: Tief / Schnitt / Hoch. Advice box.
5. Provider table: per provider the latest price, trust score (or "Noch zu wenig Tests"), "erwartet an der Kasse ≈ …" if markup is known, outbound button via `/go/*`, sorted by trusted price (PLAN §8.3). Affiliate note under the table.
6. States: collecting (< 7 days), no data yet (untracked stay → create `tracked_stays` origin `watch` if within cap → "Erste Preise in ca. 1 Stunde"), hotel inactive, stay in the past.
7. "Preis beobachten" CTA (opens the C-030 flow; until then it's disabled with "Bald verfügbar").

**Done when**

- [x] Every state has a designed screen; e2e tests for tracked, collecting and untracked stays (C-022a/b; the on-request flow gets its own in C-022c)

### C-070 · Night grid: history for any dates (D-42)

Zaid's product (14 Oct): open Tidaq for any dates, e.g. Four Seasons 1.–4.12., and see the price history for exactly those dates on every platform. No source sells past prices of a future stay, so we collect every single night ahead of time and build any stay from its nights (PLAN §7.0). **Every day without the night grid is a day of history lost, so C-070a goes first.**

**C-070a · Night grid collection** (Owner CLOUD · M · depends on C-013g · TODO)

1. Migration: `night_daily (hotel_id, night date, adults smallint default 2, day date, per_provider jsonb, best_cents int null, best_provider_id int null, collected_at timestamptz)`, primary key `(hotel_id, adults, night, day)`, RLS public read like `stay_daily`. SQL `night_jobs(p_today, p_window, p_limit)`: (hotel, night) pairs of active hotels with a `xotelo_key` for the next `p_window` nights that have no row for `p_today` yet, nearest night first. SQL `night_ingest(payload)`: upsert rows, create pending providers for unknown sources (same alias rules as `collector_ingest`).
2. Collector: in the collect cron (every 10 min), after requested stays and stay results, a nights batch when no stay task is open: take `night_jobs` (≤ 36 per run so the run stays under the free plan's 50 subrequests), call Xotelo `rates` for each night (8 in parallel), map platforms with the existing aliases (`xoteloPriceItems` + `normalizeHotelInfo` with nights = 1), store per-provider cents and the reviewed best. Nights without rates get an empty row (done for today). Only with `PRICE_SOURCE=xotelo`. Config `NIGHT_WINDOW_DAYS` (120), `NIGHT_BATCH` (36).
3. Pace check: 39 hotels × 120 = 4,680 calls; at 36 per run and 144 runs a day the window completes in ~22 h, which spreads the collection across the day. If that hurts comparability (prices moving during the day), switch the collect cron to every minute between 00:00 and 04:00 UTC or use the Workers paid plan (10,000 subrequests per run). Decide after two days of data; log the finish time per day.
4. Tests with recorded fixtures: jobs, mapping, empty nights, pending providers, cap, source guard.
5. Deploy collector only; watch the first full day (admin health + SQL counts).

**C-070a notes (DONE, [#48](https://github.com/zaidg7/tidaq/pull/48)):** migration `20261014102158_night_grid` (applied): `night_daily` (public read), `night_jobs`, `night_ingest` (service role only), run kind `nights`. Tested against production in a rolled-back transaction (4,200 jobs = 35 hotels with a Xotelo key × 120; best = cheapest reviewed; unknown platform → pending; empty night stored). Collector: `nights.ts` `runNights` (batch 36, 8 parallel, free source only, `NIGHT_WINDOW_DAYS` 120 / `NIGHT_BATCH` 36 in wrangler); the collect cron is now every 2 min and one shared `collectCycle` (also `/collect`) runs requested stays → stay results → nights only when no stay result is open (50-request limit). Daily check emails if a day has no night run. **For C-070b:** `night_daily.day` is the UTC collection day like `stay_daily.day`; `per_provider` keys are provider ids (pending ones included, filter by `providers.pending`). **For C-070c:** `admin_health` counts a nights run's rows in "collected"; split nights out (own section: nights priced today / expected, empty share, finish time).

**C-070b · Stay page from nights** (Owner CLOUD · M · depends on C-070a, C-022c1 · TODO)

1. SQL `stay_history_from_nights(p_hotel_id, p_check_in, p_check_out, p_adults, p_from_day)`: per day, per reviewed provider that priced every night that day, the sum; returns day, best_cents, best_provider_id, per_provider. Anon may execute (reads public data only).
2. `getStay`: for any stay with check-out ≤ today + `NIGHT_WINDOW_DAYS`, the chart, verdict and low/avg/high use the night series (the stay is "tracked" as soon as nights exist); today's provider table uses the real stay check when it ran today, else today's night sums. The untracked state remains only for dates beyond the window.
3. Opening a stay page calls `request_stay` once (server side, not for bots: skip known crawler user agents) so the stay gets a real price within ~10 minutes and from then on every morning.
4. Copy: "Verlauf aus den Preisen der einzelnen Nächte" next to the chart, linking to the methodology. Remove the untracked "bald" copy.
5. e2e on the dev page variants (nights-only stay, nights + real check); screenshots 390/1280.

**C-070b notes (DONE, [#49](https://github.com/zaidg7/tidaq/pull/49)):** SQL `stay_history_from_nights(hotel, in, out, from_day)` (migration `20261014121738`, anon may execute, security definer): per collection day the stay total on every platform that priced all nights, best = cheapest reviewed. `getStay` (web) loads it for any stay inside the night grid (core `inNightGrid`: 2 adults, check-in ≥ today, check-out ≤ today + 120) next to the real stay checks; the longer history wins (`history: nights | stay`), the provider table uses today's real check when there is one, and `realVsNights` (core `nightSumGap`, > 3 %) feeds a note under the chart. "Stand" for nights = latest `night_daily.collected_at` of the stay's nights (read from the table; a function change with a new return column needs DROP, which the Supabase MCP holds for manual confirmation, so avoid DROP in migrations or expect the prompt). Opening a page without a real check calls `request_stay` after the response (`after()`, bots skipped by user agent), so viewed dates get real prices too (30 per day, capacity-capped). Untracked now means beyond 120 days or not 2 adults (own copy). Live check: Adlon 14–16 Oct (not a grid stay) shows 1.237 € from nights with the provider table. Admin and alerts still use `stay_daily` only.

**C-070c · Night-sum accuracy** (Owner CLOUD · S · depends on C-070a · DONE, [#50](https://github.com/zaidg7/tidaq/pull/50))

1. Daily (in the 07:55 check): for every grid stay priced today, compare its real per-provider totals with the night sums of the same day; store counts within 0.5 %, 3 %, 10 % and the median gap in a small `night_accuracy` table.
2. Show the last 7 days in /admin; the methodology page (C-034) shows the 30-day share within 3 %.
3. If the share within 3 % drops below 75 % for 3 days, email Zaid and add a TASKS entry to investigate (e.g. per-hotel minimum stays).

**C-070c notes (DONE, [#50](https://github.com/zaidg7/tidaq/pull/50)):** `night_accuracy` (one row per UTC day, public read) and `night_accuracy_record(day)` (service role): for every 2-adult tracked stay with a real price that day, each reviewed platform's real total vs the sum of its nights collected the same day; counts within 0.5/3/10 %, median gap, best-price stays, 5 weakest hotels. The 07:55 daily check records **yesterday** (complete by then) and emails when the share within 3 % is under 75 % on 3 days in a row (core `nightAccuracyAlarm`, ≥ 20 pairs each); a failing check is a problem line, not a crash. `admin_health` no longer counts night runs in the run table and has `nights` (today's rows/priced/runs/errors, expected = hotels × 120) and `accuracy` (7 days); /admin shows an "Einzelnächte" card. **First measurement (14 Oct, partial):** 524 pairs, 61 % within 3 %, median gap 1.4 %. Most hotels match exactly (median 0 %), but Rosewood Munich, Hotel de Russie, Mandarin Oriental Munich (single nights about +25 %) and Shangri-La Paris (−15 %) differ systematically, likely minimum stays or multi-night rates. Today's stays were checked at 05:00 and the nights at 12–13:00 UTC, so part of the gap is intraday change; from 15 Oct both run in the morning. C-034: show the 30-day share from `night_accuracy`.

**C-070d · No night-sum history for hotels where single nights mislead** (Owner CLOUD · S · depends on C-070c · DONE, [#51](https://github.com/zaidg7/tidaq/pull/51))

Found in C-070c: for a few hotels the sum of single nights is 15–25 % off the real price of the same stay on the same platform, every day. Showing that history would be wrong by hundreds of euros. Steps: (1) store per-hotel accuracy daily (`night_accuracy_hotel`: day, hotel, pairs, within 3 %, median signed gap) in `night_accuracy_record`; (2) a hotel whose last 7 days have ≥ 10 pairs and < 60 % within 3 % (or |median signed gap| > 5 %) is "nights unreliable"; (3) `getStay` then ignores night history for that hotel and uses real checks of the exact stay only (`request_stay` on view already starts them), with its own short note ("Für dieses Hotel vergleichen wir nur ganze Aufenthalte, weil einzelne Nächte dort anders kosten."); (4) list such hotels in /admin; (5) the daily accuracy alarm (C-070c) then counts only hotels whose night history is shown, otherwise it emails every day about hotels already handled. Later option: a 2-night grid for those hotels (same number of calls).

**C-070d notes (DONE, [#51](https://github.com/zaidg7/tidaq/pull/51)):**
- SQL:
  - `night_accuracy_pairs(day)` holds the shared comparison.
  - `night_accuracy_hotel` (day × hotel: pairs, within 3 %, median signed gap) is written by `night_accuracy_record`, which also fills `night_accuracy.pairs_shown`/`within_3_shown`.
  - `night_reliability(day, hotel?)` (anon may execute) applies the rule over the 7 days up to `day`. A hotel is unreliable with ≥ 10 pairs and either |median signed gap| > 5 % or < 40 % within 3 %. A hotel without data counts as reliable.
  - The first rule (< 60 %) hid 11 of 35 hotels on a day with 7 h between the stay and night collection, so it was loosened in migration `20261014134535`.
- Web: `getStay` asks `night_reliability` for grid dates. If the hotel is unreliable:
  - `nightsUnreliable`, no night history; status untracked unless a real stay exists.
  - Own copy (`realOnlyTitle`/`Text`, `historyRealOnly`); `request_stay` still runs on view.
  - If the call fails, the page shows nights as before.
- Collector alarm uses the shown share.
- `/admin` lists the hidden hotels (`admin_health.night_hidden`) and shows "Gezeigt ± 3 %" next to "Alle".
- On 14 Oct (partial day) 7 hotels were hidden: Rosewood Munich, Hotel de Russie, Mandarin Oriental Munich, Shangri-La Paris, Steigenberger Frankfurter Hof, Claridge's, Le Bristol. The share for shown hotels was 77 %. Expect fewer hidden hotels once morning-aligned data replaces 14 Oct.

### C-071 · Catalog: all five-star hotels in the 25 most popular cities (Owner CLOUD · L · depends on C-070a · split into C-071a/b/c)

D-43 (Zaid, 14 Oct). Steps: pick the 25 most popular cities for luxury travel worldwide (e.g. Paris, London, New York, Dubai, Tokyo, Rome, Barcelona, Istanbul, Singapore, Bangkok, Hong Kong, Abu Dhabi, Milan, Vienna, Munich, Berlin, Zurich, Amsterdam, Madrid, Lisbon, Los Angeles, Miami, Sydney, Shanghai, Maldives) and list their five-star hotels with TripAdvisor keys via Xotelo `/api/list` (no star filter: use price level and rating; check against a second list), photos via the C-011c pipeline, cities and copy in DE/EN. Add in batches of ~50 hotels and watch the daily night run (finish time, errors, empty share). **Capacity limit:** each hotel costs 120 Xotelo calls a day; the free Workers plan fits ~25,000 calls/day in the current 2-minute cycle, and Xotelo is unofficial. Beyond ~150 hotels: Workers paid plan ($5, 10,000 requests per run) and a tiered grid (next 60 nights daily, later nights every 3 days) or a paid/partner source (`docs/research/rate-data.md`).

**C-071a notes (DONE, [#52](https://github.com/zaidg7/tidaq/pull/52)):** `scripts/catalog/discover.ts` finds every city's five-star hotels: LiteAPI's catalog (stars; free, the cloud proxy adds the key) matched to Xotelo's city list (Tripadvisor key) within 250 m and by name, plus Tripadvisor hotels of known luxury brands that LiteAPI files elsewhere (Four Seasons Abu Dhabi, Emirates Palace, Aman Tokyo). Output `scripts/catalog/candidates.json` (1,735 hotels in 27 cities, one per line). `scripts/catalog/batch.ts <n> [city[:n] …]` ranks by Tripadvisor's typical minimum price (≥ 200 reviews), cleans names, and prints an idempotent migration. Batch 1 (migration `20261014141349_catalog_batch1`, applied): 15 new cities (Madrid, Lisbon, Istanbul, Dubai, Abu Dhabi, Maldives, New York, Miami, Los Angeles, Singapore, Bangkok, Hong Kong, Tokyo, Shanghai, Sydney) with their top 3 hotels (Abu Dhabi top 5, incl. Zaid's example Four Seasons Abu Dhabi) → 27 cities, 82 active hotels; new column `hotels.liteapi_id` (null for brand-only matches). Stay grid per hotel 8 → 4 real checks (`GRID_WEEKENDS` 3, `GRID_MIDWEEK` 1; DECISIONS changelog 10) so ~82 hotels fit the cap of 400. Night grid: 82 × 120 = 9,840 calls a day ≈ 9 h of the 2-minute cycle. Xotelo prices for new hotels checked by hand (Four Seasons Abu Dhabi: 5 sites). New hotels have no photo yet (C-071c).

### C-071b · Catalog: next batches up to ~150 hotels (Owner CLOUD · M · depends on C-071a · TODO)

1. Watch C-071a's batch for 2 days in /admin: does the night run finish in the day, how many nights come back empty, and are new hotels' night sums reliable (C-070d)? Are real stay checks skipped (cap)?
2. Capacity: each hotel = 120 night calls + ~5 real stay checks a day. The 2-minute cycle does about 1,080 night calls an hour (≈ 25,000 a day). Beyond ~150 hotels, or when stay checks hit the cap of 400: run the collect cron every minute, propose a cap change in BLOCKERS (free source, D-13), or use a tiered night window (next 60 nights daily, later nights every 3 days).
3. Add batches with `node scripts/catalog/batch.ts <n> [city …]` (top n per city by luxury rank). Existing launch cities get their missing top hotels (e.g. Ritz Paris, The Dorchester, Hotel Vier Jahreszeiten Kempinski).
4. Find the Tripadvisor ids for Santa Monica and West Hollywood (Los Angeles luxury hotels) and re-run discovery for Los Angeles.

### C-071c · Photos for the new hotels (Owner CLOUD · S · depends on C-071a · DONE, [#53](https://github.com/zaidg7/tidaq/pull/53))

New hotels have no photo; the UI shows the placeholder. Run the C-011b/C-011c pipeline (licensed Wikimedia Commons images, credit, self-hosted thumbnails) for them. Hotels without a usable free image keep the placeholder.

**C-071c notes (DONE, [#53](https://github.com/zaidg7/tidaq/pull/53)):** 11 of the 47 new hotels have a licensed photo (migration `20261014180748_hotel_photos_batch1`, self-hosted webp files, `scripts/catalog/photos-batch1.json` with every lookup). Rejected by hand: Bairro Alto Hotel (shows the square) and Cheval Blanc Randheli (an atoll map). 14 lookups failed on Wikimedia's rate limit for the cloud session's IP: re-run them from GitHub Actions (`Catalog photos`, by hand) once minutes are available, with `node scripts/catalog/photos.ts <list>`. `self-host.mjs` now adds to the photo manifest instead of replacing it; `photos.ts` and `photos-sql.ts` take an input file.

### C-072 · Spike: LiteAPI room/board/occupancy rates (Owner CLOUD · M · depends on B-010 · DONE)

D-43 needs room types, board (breakfast, half board, all-inclusive) and occupancies (1 adult, 2+child, 3). LiteAPI (Nuitee) is the only self-serve, free source found with that data (`docs/research/rate-data.md`). Steps: with the sandbox key (B-010), map 10 of our hotels to LiteAPI ids; for 20 stays and occupancies 1, 2, 2+1, 3 record rooms, board types, prices, cancellation and response time; compare totals with our platform prices; ask Nuitee in writing what look-to-book is acceptable and whether storing and showing price history is allowed. Output: `docs/research/liteapi.md` with a go/no-go and a design for a room-level grid (2 adults daily for 60 nights, other occupancies for watched hotels). No booking, no payment data (hard rule 3).

**C-072 notes (DONE):** `docs/research/liteapi.md`. 80 sandbox searches (10 hotels × 2 stays × 1, 2, 2+1, 3 guests): prices for 17–19 of 20 stays per guest mix, up to 200 room types per answer, boards Room Only / Breakfast / Half Board, cheapest 2-adult rate a median +4.7 % from the cheapest Tripadvisor site (15 of 18 within ±10 %), 3.2 s median. Go for a small build only after Nuitee's written OK (B-012). Room names need normalizing (C-074).

### C-074 · Room-type normalizer prototype (Owner CLOUD · M · depends on C-072, B-012 · BLOCKED)

Map the many supplier room names per hotel ("Superior Room (Plus)", "Habitación superior (Plus)", "Double room - Accommodation Only - Superior Courtyard View") to a few classes per hotel (Standard, Deluxe, Junior Suite, Suite, Villa) with board (room only, breakfast, half board, full board, all-inclusive). Rules first (keywords in EN/DE/ES/FR/IT, bed types, view), unit tests in `packages/core`, measured on stored answers of 20 hotels. Output: share of rates classified, examples of misses.

### C-075 · Room grid for watched stays (Owner CLOUD · L · depends on C-074, B-012 · BLOCKED)

Design in `docs/research/liteapi.md`: daily LiteAPI search per (watched or most-viewed stay, guest mix), stored per board and room class (`room_daily`), within a daily search cap Nuitee agrees to. Stay page: guest/board/room filter with history; live search for guest mixes we don't track yet.

### C-073 · Research: German platforms without scraping (Owner CLOUD · S · DONE)

Zaid (14 Oct): our audience is German, so CHECK24, HolidayCheck, TUI (and HRS, trivago) matter. Fact: until 13 Oct we had CHECK24, HolidayCheck, TUI and trivago prices only through DataForSEO (Google Hotels, German locale). Xotelo (Tripadvisor) doesn't list them, so since the switch to the free source (D-41) they're missing. Steps: (1) measure what DataForSEO Google Hotels would cost for the real-check stays only (about 350 per day; at ~$0.0008 per call that is ~$8/month, inside the $12 cap; verify against the account's real billing) and whether it can run beside Xotelo just for the platforms Xotelo lacks; (2) check official partner routes: the CHECK24 partner program, HRS affiliate/API, HolidayCheck partner program, trivago (no public API); what data each allows us to store and show; (3) check whether LiteAPI (C-072) or other supplier APIs carry them (likely not; they're resellers). Output: `docs/research/german-platforms.md` with a recommendation, and a BLOCKERS entry if it needs Zaid's money or sign-up. Never scrape (hard rule 2).

**C-073 notes (DONE):** `docs/research/german-platforms.md`. No German platform (CHECK24, HRS/hotel.de, HolidayCheck, TUI, trivago) offers small sites price data per hotel and date; their partner programs give links, widgets and "from" feeds only. The only legal per-stay source with CHECK24/HolidayCheck/TUI is Google Hotels via DataForSEO: ~$9.60/month for ~400 real stay checks a day. Decision for Zaid in B-013; if yes, C-076 runs DataForSEO for stay checks next to Xotelo for the night grid. Awin affiliate links (hotel.de, HolidayCheck, TUI, trivago) come later with C-026.

### C-076 · Second source: DataForSEO for real stay checks next to Xotelo (Owner CLOUD · M · depends on B-013 · BLOCKED)

Let the collector use two sources at once: the night grid stays on Xotelo (free); the real stay checks (grid + watched + requested) go to DataForSEO Google Hotels (German locale) so CHECK24, HolidayCheck and TUI appear in the provider table and the stay history. Budget guard unchanged (`DAILY_TASK_CAP`, `MONTHLY_BUDGET_USD`, hard rule 4). A stay's history keeps one source (C-013g rule); mark the switch day. Night sums and real checks then come from different meta-searches: re-check C-070c accuracy and C-070d reliability for a week after the switch.

### C-060 · Market test: five-star price drops

Owner: CLOUD · Size: M · Depends on: C-013g · Status: TODO · PR: –

**Update 14 Oct (C-072 session):** since D-42 the night grid stores every night of every hotel daily, and C-071a added Dubai and the Maldives. Measure drops on `night_daily` instead of extra stays: a night is a drop when today's best price is ≥ 20 % below its own 14-day average. Data starts 14 Oct, so the 3-week report is possible from about 4 Nov; add 3 hotels each in 3–4 more holiday places (e.g. Mallorca, Amalfi, Phuket) in C-071b if capacity allows. Original idea: Zaid's growth idea (13 Oct): "Skyscanner for hotel price drops": show users the biggest current drops at five-star hotels for their dates and destination. Test whether it's doable and interesting before building features: pick ~10 holiday destinations (e.g. Mallorca, Algarve, Costa del Sol, Côte d'Azur, Amalfi, Santorini, Dubai, Bali, Maldives, Phuket), find their five-star hotels with Xotelo `/api/list` (no star filter: use price range and rating), track 2–4 fixed stays per hotel daily for 3 weeks within the daily cap, and report how often a stay is ≥ 20 % below its own 14-day average, how long drops last, and 3 real examples. Also try `/api/heatmap` (cheap/expensive days per hotel) as a cheaper signal. Output: `docs/research/price-drops.md` with a go/no-go for a deals feature. Never exceed the daily cap; never scrape.

### C-023 · Hotel page with price calendar

Owner: CLOUD · Size: M · Depends on: C-022 · Status: split into C-023a (page, calendar of every night from the night grid, pick dates → stay page) and C-023b (cheapest weekend/midweek, hotel structured data, links from stay page, search and home) · PR: –

**Steps**

1. `/hotel/[slug]`: photo/placeholder, name, city, short facts, price calendar: for each tracked check-in date in the next 60 days, a cell colored by price level (relative to this hotel's range), tap → stay page. Legend. Month navigation on mobile.
2. Cheapest upcoming weekend and midweek stays highlighted.
3. Hotel structured data.

**Done when**

- [ ] Calendar readable at 390 px; color is not the only signal (price text in cells)

**C-023a notes (DONE, [#56](https://github.com/zaidg7/tidaq/pull/56)):** `/hotel/[slug]` (`components/hotel/HotelView.tsx`, `PriceCalendar.tsx`, `lib/data/hotel.ts`): photo hero, then a calendar of every night of the next 120 days with today's cheapest reviewed price (night grid, newest of the last two collection days per night), tinted in 5 levels (core `priceLevels`, CSS `.price-lvl-*`, dark tints 16 % for AA) and the price printed in each cell. Picking check-in/check-out (same keyboard grid as the search picker) shows the total on one site (core `stayFromNights`, same rule as SQL `stay_history_from_nights`) and links to the stay page; hotels with unreliable nights (C-070d) show a note and no total. States: empty (no nights yet), inactive, unavailable, 404. Dev page `/dev/hotel/{calendar,unreliable,empty,inactive}`, e2e `e2e/hotel.spec.ts`. Nothing links to the hotel page yet: C-023b.

**C-023b notes (DONE):** "Günstigste Termine" above the calendar: the cheapest upcoming Fri→Sun and Tue→Thu stay (core `cheapestStays`, check-in after today, one reviewed site for all nights like `stayFromNights`), each card with dates (→ stay page), nights, site, total and per-night price. Hidden at unreliable hotels (C-070d) and when no stay has a total. `/hotel/[slug]` emits schema.org `Hotel` JSON-LD (core `hotelJsonLd`: name, URL, description, stars, city, country, photo; no prices, they change daily; `jsonLdString` escapes `<`). Links in: the stay page header ("Preise jeder Nacht in diesem Hotel"), the home live example's hotel name (live data only), and the search card: a hotel without dates opens its hotel page instead of the "Wähl Anreise und Abreise." error (one date only still errors). `SITE_ORIGIN` (`https://tidaq.com`) lives in core `structuredData.ts`; C-041 (sitemap/canonical) should reuse it.

### C-024 · City pages

Owner: CLOUD · Size: S · Depends on: C-023 · Status: TODO · PR: –
`/stadt/[city]`: hotel cards with photo, cheapest upcoming stay, state chip. SEO title and intro text (DE/EN). Links from footer and home. Also `/hotels` (navbar "Hotels", footer "Alle Hotels", added in C-020a): all hotels grouped by city. Since C-071a there are 27 "cities", among them the Maldives (a country: "auf den Malediven", not "in Malediven") and places spanning several Tripadvisor locations (Miami + Miami Beach, Los Angeles + Beverly Hills); group `/hotels` by country or region, and make every city name read naturally in DE and EN.

**C-024 notes (DONE):** `/stadt/[city]` (`components/city/CityView.tsx`, `lib/data/city.ts`): hotel cards A–Z with the 960 px photo, name (→ hotel page) and the cheapest upcoming weekend (Fri → Sun, both nights on one reviewed site, check-in after today, from the night grid; SQL `city_best_weekends`, migration `20261014213011`, one round trip per city) as a link to its stay page, with total, site and "2 Nächte, 2 Erwachsene". Hotels whose single nights mislead (C-070d), or when reliability can't be read, show "Noch kein Wochenendpreis" instead of a total. No state chip: a weekend picked from the night grid has no verdict of its own yet (the stay page computes it). `/hotels` (`HotelDirectory.tsx`): regions (core `groupByRegion`: Deutschland, Europa, Naher Osten, Asien und Pazifik, Amerika) → cities A–Z by locale → hotels; city phrases from core `cityIn` ("auf den Malediven", "in the Maldives"). Links in: footer and navbar "Hotels" (already), the hero's "N Fünf-Sterne-Hotels in M Städten" (live data only), the city eyebrow on hotel and stay pages. Dev pages `/dev/city`, `/dev/hotels`; e2e `e2e/city.spec.ts`. Left for C-024b: a city option in the search combobox.

### C-024b · Search card: city option

Owner: CLOUD · Size: S · Depends on: C-024 · Status: TODO · PR: –
In the hotel combobox, typing a city shows an option "Alle Hotels in {Stadt}" (`cityIn` phrase) at the top of that city's group; picking it opens the city page. Keep the ARIA 1.2 combobox behavior and the e2e tests of C-021a.

**C-024b notes (DONE):** When the typed text names a city (core `matchesCity`: every query word starts a city word, umlauts optional), that city's group starts with an accent-coloured option "Alle Hotels in Berlin" / "auf den Malediven" with an arrow; Enter or click opens the city page. Hotel names alone ("adlon") and the empty field show hotels only; the result count still counts hotels. The options come from `searchHotels()` in `lib/searchCardProps.ts` (hero, stay page "Ändern", /dev/ui), which adds `cityHref` and `cityAll` to each hotel.

### C-025 · Deals page

Owner: CLOUD · Size: S · Depends on: C-022 · Status: TODO · PR: –
`/deals`: stays with ≥ 14 days of data whose best price is ≥ 8 % below avg30, sorted by % drop; city filter chips; each card links to the stay page. Empty state if no deals.

**C-025 notes (DONE):** `/deals` (`components/deals/DealsView.tsx`): same rule as the homepage section (core `pickDeals`, one stay per hotel, up to 60), city chips as links (`?stadt=berlin`, new `ChipLink` in `ui/Chip.tsx`, `aria-current`, no JS), cards shared with the homepage (`components/deals/DealCard.tsx`, now linking with `?adults=`). One canonical URL for all filters. Honest empty state with a link to `/hotels`; since stays are only tracked since 12 Oct, the first deals can appear around 26 Oct. Deals still come from real stay checks (4 per hotel since C-071a); whether drops of single nights become deals is C-060's call (report ~4 Nov). Dev page `/dev/deals` (`?empty`, `?stadt=`), e2e `e2e/deals.spec.ts`.

### C-026 · Outbound link service

Owner: CLOUD · Size: S · Depends on: C-022 · Status: TODO · PR: –
`/go/[offerId]`: look up the latest offer URL, apply `providers.affiliate_template` if set, log `outbound_click` (provider, hotel, stay; no IP, no user agent stored), 302 redirect. Links carry `rel="sponsored nofollow noopener"`, open in a new tab. Unit tests for template filling and unknown ids.

**C-026 notes (DONE):** Xotelo has no deep links or offer ids, so the route is `/go/<provider>/<hotel>?in&out&adults&lang` instead of `/go/[offerId]`. SQL `outbound_click` (anon, security definer, migration `20261014185156`) checks the stay (future check-in, ≤ 30 nights, 1–4 adults), reviewed provider and hotel, logs one `events` row `outbound_click` (provider, hotel, dates, adults; nothing about the visitor; max 5,000 logged a day) and returns provider + hotel facts. Core `outboundUrl` builds the provider's own search (Booking.com, Agoda, Trip.com, Hotels.com, Expedia) for "hotel name + English city" with dates and guests, or the hotel's official https website for "Hotel direkt", then applies `providers.affiliate_template` (`{url}` → encoded target; broken or non-https templates are ignored). 302 with `no-store` and `noindex`; nothing to link (past stay, provider without a search, hotel without a website) → back to the stay page; no database → 503 text. Provider table: ghost "Zum Angebot ↗" (`target=_blank`, `rel="sponsored nofollow noopener"`, icon-only at 1024–1279 px), on phones the whole row is the link; rows with an affiliate template say "Partnerlink". CHECK24 and HRS have no search link yet (Awin, C-073). 47 of 82 hotels have no `official_url`, so "Hotel direkt" has no button there. L-026 checks the links by hand in a browser.

### L-026 · Check outbound links by hand

Owner: LOCAL · Size: S · Depends on: C-026 · Status: TODO · PR: –
On the staging site, open 3 stay pages (a German city, a holiday place, an Asian city) and click every "Zum Angebot". For each provider: does the right hotel come first, with the right dates and 2 adults? Note wrong ones as a fix task (the URL formats live in core `outbound.ts`). Never book, never enter personal data (hard rule 3).

### C-027 · Legal and transparency pages

Owner: CLOUD · Size: M · Depends on: C-020a · Status: TODO · PR: –

**Steps**

1. `/impressum`: Zaid Ghazal, Prinz-Heinrich-Straße 17, 24106 Kiel, Deutschland; E-Mail zaidghazal216@gmail.com (until a @tidaq.com address exists); "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung)"; Steuernummer line as placeholder `[STEUERNUMMER]` and a BLOCKERS entry for Zaid. Heading "Angaben gemäß § 5 DDG".
2. `/datenschutz`: per PLAN §11 (Cloudflare, Supabase EU, Resend, cookieless analytics, alert emails with double opt-in, rights, contact). Plain German, structured headings.
3. `/affiliate-hinweis`, `/ranking` (§ 5b UWG), `/methodik` (static version; C-034 adds live numbers).
4. English versions (`/en/imprint`, `/en/privacy`, …) noting that the German version is binding.
5. BLOCKERS entry for Zaid to read all legal texts once before launch (Z-12).

**Done when**

- [ ] All pages linked in the footer; no TMG references anywhere

**C-027 notes (DONE):** `/impressum`, `/datenschutz`, `/affiliate-hinweis`, `/ranking`, `/methodik`, each also under `/en/…` (same German slugs as every other page; the English pages say the German text is binding). Texts live in `messages/*.json` under `legal.<key>` as sections (`title`, `text[]`, `list[]`); `[label](href)` marks links (core `inlineLinks`: only `https:`, `mailto:` and site paths); `components/legal/legalRoute.tsx` turns a key into a prerendered page with canonical + hreflang. No Steuernummer line: § 5 DDG asks for a USt-IdNr. only if one exists (B-014 asks Zaid), and an empty placeholder would look broken. The ODR-platform link is gone on purpose (the EU platform closed on 20 Jul 2025). Facts in the privacy text that later tasks must keep true: no cookies or browser storage, no IPs in our code, server logs ≤ 7 days, Supabase in Frankfurt, anonymous `outbound_click` and requested stays only. **C-029** must add a section before enabling Cloudflare Web Analytics; **C-030** must match section 6 (double opt-in, consent text + time stored, delete the address on unsubscribe); **C-024** must sort overview pages by city and name as `/ranking` says. Zaid's read + Supabase DPA: B-014.

### C-028 · SEO foundation and OG images

Owner: CLOUD · Size: M · Depends on: C-022 · Status: split into C-028a (DONE) and C-028b (OG images, TODO) · PR: –
Metadata per page (DE/EN), hreflang, canonical, sitemap index per locale, robots (staging noindex), JSON-LD (Organization, Hotel), dynamic OG images for stay and hotel pages (price, sparkline, state chip, brand) via `next/og` (check Workers compatibility; fall back to a pre-rendered image route). Google Search Console verification via DNS (Z-09).

**C-028a notes (DONE):** Core `alternatesFor(path, locale)` gives every page its canonical plus `de`, `en` and `x-default` (German) alternates; used by home, hotel, stay, city, `/hotels`, `/deals` and the legal pages. The locale layout sets `metadataBase` = `https://tidaq.com` (core `SITE_ORIGIN`), so all of these are absolute, plus Open Graph defaults (site name, `de_DE`/`en_GB`) and `summary_large_image`. The homepage has Organization + WebSite JSON-LD (core `siteJsonLd`). `/sitemap.xml` (`app/sitemap.ts`): static pages, every city and hotel page, each in DE and EN with hreflang; no stay pages (endless dates). `robots.txt` names the sitemap in production. Pages stay `noindex` until C-041. Search Console verification is Z-09.

### C-028b · Dynamic OG images

Owner: CLOUD · Size: S · Depends on: C-028a · Status: TODO · PR: –
`next/og` images (1200×630) for stay, hotel and city pages: brand, hotel/city name, today's price or cheapest weekend, a small sparkline for stays. Check the Workers bundle size and CPU (fall back to a pre-rendered route if `next/og` doesn't run on Workers). Default image for all other pages.

**C-028b notes (DONE):** `next/og` was not added: the web Worker is already 1.26 MB gzip (`wrangler deploy --dry-run`, 14 Oct) and resvg/satori would add ~1.4 MB, close to the free plan's 3 MB limit. Instead `lib/og.ts` `openGraphFor()` (Next replaces `openGraph` per page, so every page goes through it): hotel and stay pages share the hotel's licensed 960 px photo, city pages the first hotel photo of the city, everything else `public/og/default.png` (1200×630, rendered once by `scripts/og/render.mjs` with Playwright from an HTML template; run it from `apps/web` after design changes). Prices in share images: C-028c.

### C-028c · Dynamic OG images with today's price

Owner: CLOUD · Size: S · Depends on: C-028b, B-017 · Status: BLOCKED (14 Oct: rendering a PNG with satori + resvg needs ~100–500 ms CPU; the Workers free plan allows 10 ms per request, and social sites and email clients don't take SVG. Needs Workers Paid, decision B-017) · PR: –
1200×630 images with hotel name, dates, today's price and a sparkline, for stay pages and alert emails (C-031b). Run satori + resvg in a separate small Worker (`apps/og`, own 3 MB budget, cached at the edge for a day) so the web Worker stays small; or, if Zaid moves to the Workers paid plan, use `next/og` in the web app. Measure the bundle before choosing.

### C-029 · Analytics events

Owner: CLOUD · Size: S · Depends on: C-020a · Status: TODO · PR: –
Cloudflare Web Analytics snippet (cookieless) + server-side `events` inserts for search, stay_view, watch_created, watch_confirmed, outbound_click. No cookies, no IPs, no user ids. A small weekly stats query for the summary.

**C-029 notes (DONE):** Server-side view counts: SQL `log_event(name, props)` (migration `20261014220354`, anon, security definer) accepts only `stay_view` (hotel, nights, adults, days ahead), `hotel_view` (hotel) and `city_view` (city), object props ≤ 400 chars, at most 20,000 a German day; `lib/data/events.ts` `logView()` runs in `after()` on the stay, hotel and city pages, skips bots (same rule as requested stays) and never throws. `outbound_click` is logged by C-026; `watch_created`/`watch_confirmed` come with C-030 (add the names to `log_event` or log them in the watch functions). No separate "search" event: the search card leads to a stay, hotel or city page, which is counted there. Weekly numbers: `select * from event_stats(7)` (service role, e.g. the Supabase connector) for the summary. Cloudflare Web Analytics needs one switch in Zaid's Cloudflare account (B-015); the privacy page (section 3 and 4) already describes it and the view counts. `rpc()` now accepts empty 204 bodies (void functions).

---

## Phase 3: Alerts and trust

### C-032c · Checkout tests after the Xotelo switch

Owner: CLOUD · Size: S · Depends on: C-032b, C-013g · Status: TODO · PR: –

Since D-41 our prices come from Xotelo (Tripadvisor's meta search), but the checkout-test method (L-033 steps, PLAN §8, `/admin/audit` labels "Preis bei Google", CSV header, `trust_tests.listed_cents` comment) still says Google Hotels. The markup we apply in "an der Kasse ≈ …" is measured against that listed price, so the reference should be the listing our data comes from: the provider's price on Tripadvisor for the same stay (or the price on our own stay page if it was collected the same morning). Update the L-033 steps, PLAN §8.2, the admin labels/help text and the export header; keep old tests (note the change date in the methodology page, C-034). Propose it in BLOCKERS first if it changes a locked decision.

**C-032c notes (DONE):** Reference for checkout tests from 15 Oct 2026: the provider's price on our stay page ("Preise heute", same morning), else on Tripadvisor for the same stay. PLAN §8.2, L-033 steps, `/admin/audit` label "Angezeigter Preis" and intro, CSV header, `trust_tests.listed_cents` comment (migration `20261014214926`), the pending-providers hint on `/admin`. Older tests keep counting; C-034 must mention the change date on the methodology page. No locked decision changed (D-12 is superseded by D-41 for the data, the test method was never a decision).

### C-030 · Watch flow

Owner: CLOUD · Size: M · Depends on: C-022, Z-05 · Status: TODO · PR: –

**Steps**

1. Form on the stay page: email, optional target price, consent checkbox (not pre-ticked, text stored), Cloudflare Turnstile against bots.
2. Server route creates/updates `watchers` + `watches`; sends a confirmation email (Resend, React Email template DE/EN) with a signed token link.
3. `/watch/confirm?token=` activates; `/watch/manage/[token]` lists watches, delete one, unsubscribe all (one click, no login).
4. Rate limit per email and IP (in memory/KV, IP not stored).
5. Dev and staging use `ALERTS_DRY_RUN=true` (emails logged, not sent).

**Done when**

- [ ] e2e test of the whole flow with the dry-run mailer
- [ ] Unconfirmed watches never receive alerts; unconfirmed watchers are deleted after 7 days

**C-030a notes (DONE):** SQL (migration `20261014220754_watch_flow`, service role only): `watch_request` validates the address and stay, makes sure a `tracked_stays` row exists (tracked via `request_stay` when there's capacity, otherwise an inactive row the watch can point at), creates or updates the watcher (consent text + time) and the watch (max 10 active, one request per address per minute), deletes unconfirmed addresses older than 7 days, and returns which email to send; `watch_confirm`, `watch_manage`, `watch_remove`, `watch_unsubscribe` (deletes the address and its watches, as the privacy page now says). Random UUID tokens in the links (`watchers.confirm_token`, `manage_token`). Web: `lib/watch/watch.ts` (calls + emails), `lib/mail.ts` (Resend EU, `alarm@tidaq.com`; really sends only when `APP_ENV=production`, `ALERTS_DRY_RUN=false` and `RESEND_API_KEY` is set, else logs the kind without the address; `List-Unsubscribe` one-click header), core `renderMail` (escaped HTML + text, tested). Pages: `/alarm/bestaetigen?token=` (a button confirms, a GET never does), `/alarm/verwalten/[token]` (list, stop one, unsubscribe; noindex, no referrer), `POST /api/watch/unsubscribe?token=` (RFC 8058). Deploy: `RESEND_API_KEY` now also goes to the web Worker; `ALERTS_DRY_RUN` is `false` in production, `true` on staging. e2e `watch.spec.ts` covers the pages; the full flow needs a database, so it is checked by hand on staging (dry run) in C-030b.

### C-030b · Watch form on the stay page

Owner: CLOUD · Size: S · Depends on: C-030a · Status: TODO · PR: –
Replace the "Bald verfügbar" watch card with the form: email, optional target price, consent checkbox (not pre-ticked; the exact sentence is sent as `consentText`), server action → `requestWatch` with the request's origin; result messages for sent / added / too_soon / too_many / invalid / error; simple in-memory rate limit per IP (not stored) and a honeypot field until C-030c. Sticky mobile bar from DESIGN §4. On staging (dry run) show the confirmation link in the success message so the flow can be tested end to end without email.

**C-030b notes (DONE):** "Preis beobachten" card on the stay page (`components/stay/WatchForm.tsx`, client, `useActionState`; server action `app/[locale]/alarm/watchAction.ts`): email, optional target (core `parseEuroCents`, "1.100" or "1100"), consent checkbox never pre-ticked (its exact sentence `stay.watchConsent` is stored), link to the privacy page. Messages for sent / added / invalid / too_soon / too_many / rate_limited / bad_price / error; a failed attempt keeps what was typed. Honeypot field + 5 requests per 10 minutes per IP per Worker isolate (IP only as an in-memory key). On staging and locally (dry run) the success message links the email's confirm or manage link ("Testmodus"), so the flow can be tested without email. Not done: the sticky mobile bar from DESIGN §4 (add when there's a reason; the card sits right under the price table). Manual staging check of the full flow: after the next staging deploy, request an alert on any stay page, follow the Testmodus link, confirm, stop, unsubscribe.

### C-030c · Turnstile

Owner: CLOUD · Size: S · Depends on: C-030b, B-016 · Status: TODO · PR: –
Cloudflare Turnstile on the watch form (site key as a public var, secret as a Worker secret), verified in the server action before `requestWatch`. Privacy page: add Turnstile (Cloudflare) to section 6.

### C-031 · Alert engine and emails

Owner: CLOUD · Size: M · Depends on: C-030, C-013 · Status: TODO · PR: –
After each collector run: evaluate active, confirmed watches against triggers (PLAN §9), throttle to 1 email/watch/day, send via Resend with the price, state, mini chart (OG image URL), best trusted provider and the manage/unsubscribe link (List-Unsubscribe header). Record in `alerts_sent`. Unit tests for every trigger and the throttle.

**C-031a notes (DONE):** Core `alerts.ts`: `alertKind` (PLAN §9: target ≤ price, again only 2 % lower; new low under every earlier day and 2 % under the last alert; drop ≥ 5 % since the last alert; state turns `near_low`; one email per watch and Berlin day, strongest reason wins), `alertInputFromSeries` (today's price must be from today; states for today and yesterday via `computeStayStats`), `alertMail` (DE/EN subject and content for `renderMail`). SQL (migration `20261014222316`, service role): `alert_inputs(today)` gives each active watch of a confirmed, subscribed address with check-in after today plus its last 60 days (stay checks, else night sums for 2 adults at reliable hotels), `alert_record` writes `alerts_sent` and the watch's last alert. Collector `alerts.ts` `runAlerts` runs in the daily cron after the daily check (its own try; a crash emails the admins), sends via Resend from `alarm@tidaq.com` with `List-Unsubscribe` one-click, records each sent alert, never logs addresses. **Live only when** `APP_ENV=production`, `ALERTS_DRY_RUN=false` and the key is set: the production collector still has `ALERTS_DRY_RUN=true`, so nothing goes to users until **C-044 switches it to `false`** (dry runs log `alert dry run` with the kind). Tests: core (10) and collector (5, memory store + fake Resend).

### C-031b · Alert emails: best trusted provider

Owner: CLOUD · Size: S · Depends on: C-031a · Status: DONE · PR: see `[C-031b]`
Add the best trusted provider with its "an der Kasse ≈" note (core `rankOffers` on the latest `per_provider`), linking through `/go/…`. The chart image in alert emails moved to C-028c: it needs the dynamic share images (C-028b only uses the hotel photo).

**C-031b notes (DONE):** SQL `alert_offers(watch, today)` (migrations `20261014225949` + `20261014230030`, service role): today's per-provider totals of the watched stay, from the real stay check, else the night sums (2 adults), reviewed providers only, with each one's checkout-test record. The collector calls it only for watches with an alert due, ranks with core `rankOffers` and adds "Am günstigsten heute: Booking.com, 1.120 €." (with "An der Kasse erwarten wir nach unseren Tests etwa …" when tests show a markup) and a text link "Zu Booking.com" to `https://tidaq.com/go/…` ("(Partnerlink)" when an affiliate template applies). `MailContent.link` renders it. If the lookup fails, the email goes out without that line. Dry runs log the chosen provider slug, so the production dry run shows it before launch.

### C-032 · Trust audit tool

Owner: CLOUD · Size: M (split a/b) · Depends on: C-020c, C-004 (scheduled early in Phase 2) · Status: a DONE, b DONE · PR: a = [#33](https://github.com/zaidg7/tidaq/pull/33), b = [#34](https://github.com/zaidg7/tidaq/pull/34)

**C-032a notes (DONE):** `/admin/audit` (link "Kassen-Check eintragen" on `/admin`): form in `components/admin/AuditForm.tsx` (hotel, provider, dates, guests, "Preis bei Google", "Preis an der Kasse" with the number keypad, extras as chips, notes; works without JS), the latest 20 tests with delete in `AuditList.tsx`. Server actions `saveAuditTestAction` / `deleteAuditTestAction` (`requireAdmin()` first). Prices typed as "1.184" or "1.184,50" are parsed by core `parseEuroCents`; the outcome comes from the prices (core `trustOutcome`, ±1 % = match); "Nicht buchbar" stores no checkout price. After every save or delete `recomputeScore()` (`lib/admin/audit.ts`) rebuilds that provider's row in `provider_scores` with core `providerScore` (PLAN §8.2: pass ≤ +1 %, penalty ×200 capped at 40, shrinkage to 70 with weight 5; `avg_markup_pct` = mean markup of bookable tests). Preview with made-up data on `/dev/admin#kassen-check`.

**C-032b notes (DONE):** screenshot field in the form (PNG/JPG/WebP, ≤ 5 MB) → private bucket `audit-screenshots` (migration `20261013191634`, no storage policies: anon can't list or upload; only the service role). "Screenshot" in the list opens `/admin/audit/screenshot/[id]`, which redirects to a 5-minute signed URL. "Bearbeiten" opens `/admin/audit?edit=ID` with the form prefilled; saving recomputes the old and new provider's score and replaces the screenshot only if a new one was chosen; deleting a test also deletes its screenshot. "Alle als CSV" → `/admin/audit/export` (core `toCsv`: semicolons + BOM for German Excel, formula cells defused). **For L-033:** the LOCAL session enters tests at `/admin/audit` in Zaid's Chrome, logged in with his magic link (needs B-007).

**Steps**

1. `/admin/audit`: a fast mobile-friendly form: pick hotel + stay (prefilled from tracked stays), provider, listed price (as shown on Google Hotels), checkout total, outcome, extras (chips: Citytax extra, Frühstück fehlt, anderes Zimmer, Gebühren, nicht buchbar), screenshot upload (private Storage bucket), notes.
2. List of recent tests with edit/delete.
3. Score computation (PLAN §8.2) in `packages/core/trust.ts`, unit-tested, written to `provider_scores` after each change.
4. CSV export.

**Done when**

- [x] Entering one test takes under 60 seconds on a phone (8 fields, prices with the number keypad, extras as chips; to be confirmed by Zaid with the first real tests)

### L-033 · Checkout audit with Claude in Chrome (recurring)

Owner: LOCAL · Size: L, recurring (10–15 tests per session) · Depends on: C-032, Z-07 · Status: TODO · PR: –

**Goal:** 150+ real checkout tests by launch, across ≥ 8 providers and ≥ 30 hotels. This is the trust score's data and the launch story.

**Protocol per test (with Zaid at the PC, or Zaid approving each site in Claude in Chrome):**

1. Pick a stay within the next 120 days (rotate cities, providers, dates; prefer hotels with 3+ providers in "Preise heute").
2. Open its Tidaq stay page (staging) and note the provider's price under **"Preise heute"**. If the table says "Preise vom …" (an earlier day), use the provider's price on Tripadvisor for the same hotel, dates and 2 adults instead (C-032c). This is the "Angezeigter Preis" in `/admin/audit`.
3. Open the provider's own site directly (not through "Zum Angebot", so audit visits don't count as visitor clicks), search the same hotel and dates, select the cheapest room, and continue to the **last page before payment**. **Never enter personal or payment data, never submit.** If a page asks for personal data before showing the total, record the total shown at that step and mark extras.
4. Record the final total and extras in `/admin/audit`, attach a screenshot.
5. Close tabs. Next provider.

- Spread tests over time (not 50 at once), log the date. Aim for 10–15 per session, 2–3 sessions a week.
- Write a short note in the PR/issue each session: tests done, surprising findings (these become content).

**Done when**

- [ ] ≥ 150 tests recorded; each core provider has ≥ 10 tests

### C-034 · Provider pages and methodology with live data

Owner: CLOUD · Size: S · Depends on: C-032 · Status: DONE · PR: see `[C-034]`
`/anbieter/[slug]`: score, tests, match share, average markup, common extras, last test date. `/methodik` gets live numbers, including the 30-day share of night sums within 3 % of the real price (`night_accuracy`, C-070c). Neutral, factual wording (CLAUDE.md rule 8).

**C-034 notes (DONE):** SQL `provider_facts()` (migration `20261014224448`, security definer, anon may call): one JSON with, per reviewed provider, today's night grid (hotels and nights priced, share of nights where it was cheapest or tied among nights with another offer, median gap above the cheapest otherwise) and the aggregates of `trust_tests` (counts per outcome, extras counts, first/last test date in Berlin time) plus `provider_scores`; catalog size; the 30-day `night_accuracy` sums; test totals. No single test, note, screenshot or tester leaves the database. Core `providerFacts.ts` (Zod schema, `providerPath`, `percentOf`, `hasProviderPage`, `extrasByCount`, `TEST_EXTRAS` = the admin form's keys) and `formatDayMonthYear`. `/anbieter/[slug]` (`components/provider/ProviderView.tsx`): trust card (TrustScore, counts, average difference, test period, extras) and grid card; a provider without grid prices and without tests was a 404 (C-034b changed that to `noindex`; today: Expedia, Hotels.com, HRS, CHECK24, since Xotelo doesn't list them). `/methodik` is now rendered per request with `MethodLive` above the text (hotels, nights, night-sum accuracy, tests, provider list with anchor `#anbieter`). Previews: `/dev/provider?p=booking-com|trip-com|agoda|expedia|hotel-direct|method|method-empty`. e2e `provider.spec.ts`.

### C-034b · Trust score links to the provider page

Owner: CLOUD · Size: S · Depends on: C-034 · Status: DONE · PR: see `[C-034b]`
In the stay page's provider table, make the trust score (or the provider name in the trust column) link to `/anbieter/[slug]` when that provider has a page, without breaking the phone row link (the whole row is the outbound link there: put the provider link above it like the city card's weekend link).

**C-034b notes (DONE):** The Preistreue score in each provider row links to `/anbieter/[slug]` (core `StayOffer.slug`; link sits above the phone row link with `z-[2]`, screen readers hear "…, Preistreue von Booking.com im Detail"). So these links never 404, every reviewed provider now has a page; the ones without grid prices and tests are `noindex`, not in the sitemap and not listed on /methodik (core `isProviderIndexable`, renamed from `hasProviderPage`).

---

## Phase 3b: Clean Premium overhaul

The full spec, frame by frame, is `docs/design/PREMIUM.md` (§10 pages, §11 components, §14 order). Every task below is built and reviewed against it and its quality bar (§13). Production keeps the old build until launch (D-38); each PR ships to staging.

### C-100 · Spec and plan (Owner CLOUD · S · DONE, [#98](https://github.com/zaidg7/tidaq/pull/98))

Zaid picked direction B "Clean Premium" (canvas "Tidaq design directions", 15 Oct) and asked for a step-by-step plan where every frame, photo, animation and chart is thought through. `docs/design/PREMIUM.md`, decision D-44, this phase.

### C-101 · Mockups v2 (Owner CLOUD · S · DONE)

Canvas boards "B · Clean Premium" updated with Zaid's feedback: "Price Drops" wording, readable heavy hero type, "Beliebte Ziele" instead of the 25-numbers section and the how-it-works cards, dark Price Alert section with alert previews instead of the room photo, wordmark only. Board "Icon-Ideen v2": five symbols (t-Monogramm, Tür, Rezeptionsglocke, Schlüsselanhänger, Ort mit Stern) → B-020.

**C-102 notes (DONE, [#99](https://github.com/zaidg7/tidaq/pull/99)):** Instrument Sans (`lib/fonts.ts`), PREMIUM.md tokens in `globals.css`. Soft Modern token names are aliases of the new ones (`fg`→`ink`, `bad`→`high`, `shadow-float`→`shadow-2`, …) so unrebuilt pages work; new code uses the new names; C-123 removes the aliases. `font-extrabold` = 700. Calendar tints stay soft until C-112. Visual baselines re-rendered.

**C-103 notes (DONE, [#100](https://github.com/zaidg7/tidaq/pull/100)):** Button variants `secondary` (alias `ghost`), `subtle`, `onPhoto`, `dark`; sizes 44/52/60; `trailing` slot. `Chip` ink when selected; `Badge` tones `drop`, `onPhoto`; `TextField` label above; ink `Toast`; shimmer `Skeleton`. New `Segmented`, `Accordion`, `Sheet` (`components/ui`). The old `menu-sheet`/`date-sheet` dialogs move onto `Sheet` in C-106/C-108.

**C-104 notes (DONE, [#101](https://github.com/zaidg7/tidaq/pull/101)):** `scripts/photos/candidates.ts` (workflow **Catalog photos**, mode `candidates`) looked at each hotel's Wikidata image, Commons category, a name search and geotagged files: 67 of 83 hotels had candidates. 51 picked by eye from per-city contact sheets (`scripts/photos/picks.json`; sheets removed before merge, re-run the mode to see them), fetched by `fetch.ts` (mode `fetch`) as 160/480/960/1600 px WebP + 24 px blur placeholder in `lib/hotelPhotos.generated.ts`; credits in migration `20261015142921_hotel_photos_c104`. 4 older photos kept (Beverly Hills Hotel, Peninsula Beverly Hills, Hotel Eden, Rosewood Hong Kong). **27 hotels still have no own photo** (no usable free image: e.g. Shanghai EDITION, all three Dubai and Maldives resorts, Aman Tokyo): they get the labelled city photo in C-105; LiteAPI images (B-021) would close the gap. Weaker picks to replace when better ones exist: Four Seasons Ritz Lisbon, The Lowell, Peninsula Shanghai. Component `components/ui/Photo.tsx` (srcset, blur-up, focal point, tag) is used by the page tasks; existing pages already show the new files because the 160/960 names are unchanged. WebP only (AVIF not needed: every target browser reads WebP, and it halves the file count).

**C-105 notes (DONE):** 26 city photos + the home hero (`scripts/photos/cities.json` → `cities.mjs`, Unsplash License, 480/960/1600 px WebP + blur placeholder, `lib/cityPhotos.ts`). **Hamburg has none yet** (no reliable Unsplash pick; take a Commons photo of the Elbphilharmonie or Alster when the city tiles are built, C-115). `lib/photos.ts` `hotelImage(hotel, city, width)` returns the hotel's photo or the city's (`city: true`); `CityPhotoTag` shows "Stadtbild". Wired into Price Drop cards, the drop of the day, drop pages (story images use only the hotel's own photo) and city-page hotel cards. Hotel and stay page headers keep their own photo or the placeholder until their rebuild (C-116, C-117) uses `Photo` with the tag; thumbnails (week recap, "Aus unseren Videos") stay without a fallback, because a tag can't be read at 64 px.

**C-111 notes (DONE, [#103](https://github.com/zaidg7/tidaq/pull/103)):** `PriceChart`: ink line drawn in (`.chart-line`, `pathLength=1`), soft accent area, the usual range (core `chartGeometry().usual`, 25th–75th percentile of regular prices, ≥ 7 points) as a grey band labelled "üblich" with a legend instead of the dashed average, low marker kept, today's dot in the verdict colour (`todayTone`) with a pop, dark scrub pill. `ChartRanges` (14 T · 30 T · Alles) on the stay page renders one chart per range on the server and shows one. The stay page's layout itself is C-116.

**C-106 notes (DONE, [#104](https://github.com/zaidg7/tidaq/pull/104)):** Symbol = t-Monogramm (option 1, the B-020 default; swap only `TidaqSymbol` in `components/ui/Logo.tsx` + `app/icon.svg` and re-run the icon PNGs if Zaid picks another). Favicon, apple icon, 192/512/maskable PNGs and `app/manifest.ts`. Navbar: Price Drops · Hotels · Kassen-Check · So messen wir, DE/EN, search, Price Alert (secondary, desktop only) → `/preissturz#preissturz-alarm`. Full-screen phone menu (native `<dialog>`, `.menu-sheet`). Footer on `--bg`, 2-column links on phones. "Kassen-Check" links to `/methodik#anbieter` until C-119 builds the page (fixes the 404). **Moved on:** the docked search pill goes into C-107 (needs the search panel); the transparent-over-photo navbar and the 3-photo strip in the menu go into C-115 (no photo hero exists yet).

**C-107 notes (DONE, [#105](https://github.com/zaidg7/tidaq/pull/105)):** `components/search/`: `SearchBar` (from 768 px; phones keep `SearchCard` until C-109), `DestinationField` (combobox = the destination panel: popular cities as photo chips, "Gerade günstig" = today's 3 biggest drops, live filter with core `matchCities`/`highlightRange`), `NavSearch` (pill from 1280 px, icon below; opens the bar in a top dialog; on the homepage hidden while `#suche` is visible; phones still jump to `/#suche`). Index built by `lib/searchIndex.ts`: inline on the homepage, `/api/search-index` for the navbar (bar code loads on first open via `next/dynamic`). Without a database outside production the API serves the `/dev/search` sample (`lib/searchSample.ts`). Hotel thumbnails only from the hotel's own photo (a 48 px city photo can't carry its "Stadtbild" tag). City photos now also have a 160 px size. City submit ignores dates until C-110.

**C-108 notes (DONE):** One calendar engine, `components/calendar/RangeCalendar.tsx` (WAI-ARIA grid, ink ends, `surface-2` nights between, hover preview, optional price per night with level tint + `PriceLegend`). Used by the desktop `DatePopover` (two months, "Genaue Daten · Flexibel"; Flexibel = month chips + the 3 cheapest Fri → Sun stays from core `weekendStays`/`cheapestInMonth`) and by the phone `DateRangePicker` sheet. `GuestsPopover`: adults 1–4. Prices come from `/api/hotel-nights` (nights + levels + weekend totals on one reviewed site; no totals for unreliable nights; sample data without a database outside production). **Still separate:** the hotel page's `PriceCalendar` moves onto `RangeCalendar` in C-117; the phone flow gets prices in C-109.

**C-109 notes (DONE):** `components/search/PhoneSearch.tsx`: full-screen `<dialog>` with Wohin? (inline `DestinationField`, popular cities as a 64 px photo row) → Wann? (`RangeCalendar stacked`: every month to the last bookable day, sticky month names, nightly prices) → Wer? (`GuestsStepper`). Sticky bottom bar: "Alles löschen" + "Preise ansehen" (step 2: "Überspringen" + "Weiter"). Each step is a history entry (`tidaqSearch` in `history.state`), so the back gesture steps back and ✕ unwinds them; selections stay when closed. State and submit rules shared with the desktop bar in `useSearch`. Homepage phones show the "Wohin?" pill (the old `SearchCard` stays only on the stay page's "Ändern" until C-116 and on `/dev/ui`); the navbar icon on phones opens the sheet (loaded on first tap).

**C-110 notes (DONE):** Submit routing per PREMIUM.md §9.3: a city with dates goes to `/stadt/<slug>?daten=<in>--<out>&adults=n` (core `cityStayPath`); the city page then loads each hotel's total for those nights from the night grid (one reviewed site, `cityStays` in `lib/data/city.ts`, none for unreliable hotels) and sorts cheapest first, with "Ohne Daten ansehen". Loading skeletons (`components/shell/PageSkeleton`, kinds list/stay/hotel/drop/text): `loading.tsx` only on leaf routes without URL checks (`/hotels`, `/deals`, `/preissturz/woche`); routes with params validate first and then stream the skeleton through `<Suspense>` in the page, because a `loading.tsx` above them makes a 404 impossible (status already sent). Known trade-off: a well-formed but unknown slug (hotel, city, drop) now answers 200 with the not-found page and `noindex` for browsers; crawlers get blocking metadata and still see the 404. Buttons show a spinner while navigating (bar, phone sheet).

**C-112 … C-118 notes (DONE, one batched PR, D-45):** The whole site now speaks mockup B. Shared pieces: `PhotoHero` (city, landing), `PhotoSheet` (photo + sheet: drop, hotel, stay), `PageHead` (pages without a photo), `AlertBand` (dark Price Alert band, `#preissturz-alarm`, real drops as previews), `HotelAlertBox` (alert for one hotel), `HotelPhotoCard`, `DropTile`/`DropCard`/`DropBadge`, `SectionHead`/`PillLink`, `CityTile`. Navbar: white on any page with `data-photo-hero`, frosted ink after 24 px of scroll (`HeaderState`), links Price Drops · Hotels · Städte, the search button leaves the bar while the page's own search (`data-hero-search`) is on screen. Drop badges by size (core `dropTier`, D-46). Meter: three equal zones, knob mapped piecewise onto thirds (core `meter().knob`). Drop page story chart: core `storyChart`. City stand-in photos get a different crop per hotel (`standInFocus`); Hamburg's tile uses a hotel photo; no grey placeholders left on public pages. The home result card shows a labelled example until a stay has a 7-day verdict (`getFeaturedStay(…, 'cheap')` then takes over). New page `/staedte`. `.env.local` is never used for e2e: live-data checks run a dev server with env from outside the repo.

**C-125 / C-126 notes (DONE, [#110](https://github.com/zaidg7/tidaq/pull/110)):** Zaid (15 Oct): a cheaper single night is useless, nobody travels for it; drops must be 4–5+ nights, searchable by month; every hotel needs a photo; no "Live" pills. **Trips:** SQL `compute_trip_drops(p_today, p_nights)` (radar_drops rules on 5/7 consecutive nights booked on one site; two-phase for speed: the last two check days, then 14-day history for candidates only, ~0.5 s per length) → pg_cron job `refresh-trip-drops` every 15 min (`refresh_trip_drops()`, Berlin day, keeps 15 days) → table `trip_drops` → `radar_trip_drops(p_today, p_nights)` (~2 ms, newest set of today or yesterday). `getDrops` (radar, home, city, drop pages, search index), `radar_week` and the collector's drop alerts read trips only; `radar_drops`/`radar_weekend_drops` stay in the DB unused by the site. Core: `DROPS.tripLengths`, `dropMonth(s)`, `distinctTrips` (cards and drop pages offer different dates, not the same trip a day later), `filterDrops({city, month, nights})`, `parseDropKey` up to 14 nights, `formatMonth`, `cheapestStays` → `trip` (5) + `week` (7) on the hotel page; `WEEKEND_STAY` keeps the search's "Flexibel" tab. Radar URL params `?monat=2026-12&dauer=7`. City page: `city_best_trips(p_city, p_today, 7)` ("Günstigste Woche"). June/July need the night window extended: B-022 → C-127. **Live dots/pills** removed site-wide (PREMIUM.md updated). **Photos:** `scripts/photos/from-urls.mjs` self-hosts picks from direct URLs (the Wikimedia API rate-limits cloud sessions; Commons HTML pages and upload.wikimedia.org thumbnails at standard widths 1280/1920 work). Credits via migrations `hotel_photos_c125*`. 66 of 83 hotels have an own photo; the 17 without any free licensed photo are listed in B-021 (→ C-129). Hotels in towers show the tower (Aman Tokyo, Four Seasons Otemachi); Park Hyatt Zürich only has a 945 px lounge photo. **Later the same day (D-46, D-48):** drops are red, stronger for bigger drops (`--sale-1…4`, `dropTextClass`); no "Preissturz"/"Sturz" anywhere (Price Drop / Price Alert); the radar moved to `/price-drops` (permanent redirects from `/preissturz…` in `next.config.ts`; alert anchor `#price-alert`); the radar's pill rows became one Filter button (`DropFilterSheet`: Sheet with city select, month chips, length and sort segmented, live hotel count; chosen filters as removable tags).

### C-102 … C-123

Scope, order and dependencies: PREMIUM.md §14. Acceptance for each: the page/component matches its §10/§11 entry, all its states exist on a `/dev/*` page, §13 passes, before/after screenshots in the PR. Notes go here when a task is done.

## Phase 4: Launch

### L-040 · Real-device QA

Owner: LOCAL · Size: M · Depends on: C-031, C-034 · Status: TODO · PR: –
Run through the full journey on Zaid's PC (Chrome, Edge) and his iPhone 15 (Safari, via the staging URL): search, stay page, watch signup, confirmation email, alert email (forced on staging), unsubscribe, legal pages, EN version. Write a fix list as new tasks; fix the small ones directly.

### C-041 · Launch hardening

Split into **C-041a** (axe checks, security headers) and **C-041b** (the rest), see below.
Owner: CLOUD · Size: M · Depends on: C-031 · Status: see C-041a/b · PR: –
Lighthouse ≥ 90 (mobile) on home, stay, hotel; axe accessibility checks in Playwright; error monitoring (Workers Logs + a daily error digest email to Zaid, or Sentry free if the connector is set up); Supabase backups confirmed (daily on free plan; document restore); remove the pre-launch `robots: noindex` from `app/[locale]/layout.tsx` metadata (404/500 pages exist since C-020a); security headers (CSP, HSTS, Referrer-Policy); rate limits on API routes.

**C-041a notes (DONE):** `e2e/a11y.spec.ts`: axe-core (WCAG 2.1 A/AA, incl. contrast) on 21 pages at 390 px (home, stay, hotel, city, deals, provider and legal pages, watch, admin, the UI gallery, 404) plus home, stay and hotel at 1280 px; serious or critical findings fail CI. It found one: the admin tables that scroll sideways weren't keyboard-reachable (now focusable regions). Security headers on every response from `next.config.ts` `headers()`: CSP (own origin only plus Cloudflare Web Analytics; `'unsafe-inline'` scripts because the App Router streams inline payloads and nonces would make every page dynamic; no framing, no plugins, forms only to us), HSTS 1 year with subdomains (no preload), `Referrer-Policy: strict-origin-when-cross-origin`, `nosniff`, `X-Frame-Options: DENY`, a restrictive `Permissions-Policy`, no `X-Powered-By`. `e2e/security.spec.ts` checks the headers and that pages and client components run without CSP violations. **Turnstile (C-030c) must add `https://challenges.cloudflare.com` to `script-src` and `frame-src`.** After the merge, check the headers on staging (`curl -sI`), since OpenNext applies them in its routing layer.

### C-041b · Launch hardening: Lighthouse, backups, rate limits, robots

Owner: CLOUD · Size: S · Depends on: C-041a · Status: DONE · PR: see `[C-041b]`
Lighthouse ≥ 90 (mobile) on home, stay, hotel (measure on staging, fix what's below); Supabase backups confirmed (Pro: daily) and restore steps in the README; remove the pre-launch `robots: noindex` from `app/[locale]/layout.tsx` (production isn't deployed before C-044, staging stays `Disallow: /`); rate limits on API routes (`/api/watch/unsubscribe`, `/go/…`).

**C-041b notes (DONE):** Lighthouse (mobile, staging, 14 Oct): performance 95 home, 95 hotel, 97 stay; accessibility 100/100/99, best practices 100. SEO is low on staging only because of `noindex` and the canonical pointing to tidaq.com, both intended. Fixed the one finding: the "Wir sammeln noch Daten" heading on stay pages was an h3 straight after the h1 (now h2); axe now also fails on `heading-order`. Robots: the layout no longer sends `noindex`; instead the middleware sends `X-Robots-Tag: noindex, nofollow` on every page outside production (APP_ENV is a runtime var, legal pages are prerendered, so metadata couldn't depend on it). **So the next production web deploy makes tidaq.com indexable: that deploy is the launch (C-044).** Rate limits per IP and Worker isolate (core `createRateLimiter`, `clientIp`): `/go/…` 30 a minute (429 with a German/English note), one-click unsubscribe 10 a minute, the watch form keeps 5 per 10 minutes. Backups: Pro plan, daily, 7 days; restore steps and when not to restore in the README (Database). Error digest split off as C-041c.

### C-041c · Daily email with the website's server errors

Owner: CLOUD · Size: S · Depends on: C-041b · Status: DONE · PR: see `[C-041c]`
Error monitoring: the website's server errors (handled fallbacks and unhandled ones) are stored without personal data and listed in the admins' daily check email, so Zaid hears about problems without opening Cloudflare.

**C-041c notes (DONE):** Table `web_errors` (migration `20261014233908`, service role only): a ring buffer of 5,000 rows (oldest slot overwritten, so no deletes are ever needed), at most 1,000 entries per environment and day; SQL `log_web_error` and `web_error_digest`. Web `lib/errors.ts`: `reportError(source, error, ctx)` logs to Workers Logs and, after the response (`after()`), stores the error; every handled fallback in `lib/data/*`, the watch flow, mail and `/go` uses it. `instrumentation.ts` `onRequestError` stores unhandled errors with the route pattern only (404s and redirects are skipped). Core `scrubErrorText` masks addresses and UUID tokens and drops query strings before anything is stored. The collector's daily check (07:55 UTC) adds "Website: N server error(s) in the last 24 hours" with the top lines to its email.

### C-042 · Trust report page

Owner: CLOUD · Size: S · Depends on: L-033, C-034 · Status: TODO · PR: –
`/report/checkout-test-2026`, plus `/kassen-check` (navbar link since C-020a) as the stable entry that shows or links the latest report: "Wir haben {n} Checkouts getestet": charts of match rate per provider, average markup, most common extras, methodology link, dated. Shareable OG image. This is the launch story.

### C-043 · Launch content pack

Owner: CLOUD · Size: S · Depends on: C-042 · Status: TODO · PR: –
`docs/content/launch/`: 5 TikTok/Reels scripts (hook in the first 2 seconds, 20–40 s, on-screen text, which screen recording to make), a mydealz post draft, 2 Reddit post drafts (r/de, r/reisen; follow the subreddit rules, no spam), images exported from the site. In German.

### C-044 · Go live

Owner: CLOUD · Size: S · Depends on: C-041, L-040, Z-12 · Status: TODO · PR: –
Final launch checklist (below), production deploy to tidaq.com, collector prod caps set, Search Console sitemap submitted, smoke test in production, announce in the weekly summary issue. **Alerts:** set the production collector's `ALERTS_DRY_RUN` to `"false"` (`apps/collector/wrangler.jsonc`) in the launch PR; until then no alert email reaches users (C-031a). **Indexing:** the production web deploy is what makes tidaq.com indexable (C-041b); after it, `curl -sI https://tidaq.com/` must show **no** `X-Robots-Tag` and `/robots.txt` must allow crawling, then submit the sitemap in Search Console (Z-09).

---

## Phase 5: Growth (summaries; expand into full specs when started)

- **C-050 Affiliate wiring:** per approved program, fill `providers.affiliate_template`, test the redirect, add the program to `/affiliate-hinweis`.
- **C-051 Weekly content pack:** a Claude routine (or the first session each Sunday) writes 3 short-video scripts and 1 post from the week's data into `docs/content/YYYY-Www/`.
- **C-052 SEO pages:** "Beste Zeit, [Hotel] zu buchen" (needs 30+ days of data), "Silvester in [Stadt]".
- **C-053 Coverage expansion:** more hotels as budget allows; a "Hotel vorschlagen" form; track user-requested hotels.
- **C-054 Newsletter:** weekly deals email for opt-in subscribers. Split into C-054a (sign-up) and C-054b (sending), see below.

### C-054a · Newsletter sign-up

Owner: CLOUD · Size: S · Depends on: C-031a · Status: DONE · PR: see `[C-054a]`

**C-054a notes (DONE):** The newsletter shares the price-alert address (`watchers`): new columns `newsletter`, `newsletter_consent_text`, `newsletter_at` (migration `20261015000528`); SQL `newsletter_request` (same 1-minute resend guard and 7-day cleanup as `watch_request`; `email_kind` confirm / added / already) and `newsletter_off`; `watch_manage` returns `newsletter`. Double opt-in through the same `watch_confirm` link; the manage page shows "Deals per E-Mail" with "Deals abbestellen" (alerts stay); the one-click unsubscribe still deletes everything. Web: `lib/watch/newsletter.ts`, server action `app/[locale]/deals/newsletterAction.ts` (honeypot, 5 per 10 min per IP), `components/deals/NewsletterForm.tsx` below the deals on `/deals`; emails `newsletterMail` (DE/EN); privacy §6 now covers the deals emails and states that we don't track opens or clicks (Resend open and click tracking are off for tidaq.com, checked 15 Oct). Nothing is sent to subscribers yet (C-054b).

### C-054b · Newsletter: Monday send

Owner: CLOUD · Size: S · Depends on: C-054a · Status: DONE · PR: see `[C-054b]`
Collector: every Monday in the daily cron (after the alerts), load confirmed subscribers (SQL, service role) and the current deals (same rule as `/deals`: ≥ 8 % under the stay's 30-day average, 14+ days of history, one per hotel, top 8), render one email per locale with core `renderMail` (list of hotel, dates, price, drop, link to the stay page), send through Resend in batches with `List-Unsubscribe` per recipient, record the send (no per-recipient tracking). Skip the week when there are fewer than 3 deals. Dry run (log counts only) unless `APP_ENV=production`, `ALERTS_DRY_RUN=false` and a key are set, like the alerts.
- **C-055 Breakfast and room filters:** dropped for v1 (D-40): the source has no breakfast data.
- **C-056 Watch my booking (v2):** forward a booking confirmation → we watch the same stay → alert when it's cheaper to rebook (refundable bookings). Research and spec only.

**C-054b notes (DONE):** Collector `newsletter.ts` `runNewsletter` runs in the daily cron after the alerts (own try; a crash emails the admins) and only on Mondays (UTC day of the 07:55 check). It reads deal candidates from `v_stay_public` and confirmed subscribers from `watchers` with the service role (no new SQL), picks the top 8 with core `pickDeals` (same rule as /deals), skips the week below 3 deals, renders one email per recipient with core `newsletterMail` + `renderMail` (new `MailContent.items`: linked list entries) and sends through Resend's batch API (100 per request) from `deals@tidaq.com` with `List-Unsubscribe` one-click. Live only with the alerts' conditions (`APP_ENV=production`, `ALERTS_DRY_RUN=false`, key); before C-044 it logs `newsletter dry run` with counts. Nothing per recipient is stored or tracked. Watch the Workers free plan's 50 subrequests per cron run: the daily run now does the daily check, ~3 calls per due alert, 2 reads + 1 call per 100 subscribers; split the newsletter into its own cron if alerts grow.


---

### C-080 · Sudden price drops (Preissturz-Radar)

The social-media lever: "Das Adlon kostet heute Nacht 31 % weniger als gestern." Every number is a real check with date, site and both prices (CLAUDE.md rule 8); no countdowns, no "nur heute" (rule 9).

**C-080a notes (DONE):** SQL `price_drops(p_today)` (migration `20261015002000`, granted to anon): for every upcoming night, the newest check (today or yesterday, Berlin) against the check the day before; a drop counts at ≥ 15 % and ≥ 50 € less **and** below every price seen for that night in the 14 days before (new low). Falls of more than 60 % need a second reviewed site within 10 % (`confirmed`), otherwise they are hidden as likely data errors. Core `drops.ts`: `groupDrops` (one card per hotel, biggest drop on top, other nights below), `filterDrops` (city, "Wann": 7 / 30 days / later), `sortDrops` (pct, €, soonest night), `dropStats`. Web: `/preissturz` (force-dynamic; filters are URL params `stadt`, `wann`, `sort`, so every view is a shareable link), top 3 on the homepage right under the hero, a city section on `/stadt/[city]`, nav item "Preisstürze" (replaces "Deals" in the main nav; Deals stay in the footer and are linked from the radar). Sample data on `/dev/drops` (`?empty`, `?teaser`). The drop badge uses the fixed token `--color-drop` (white text AA in both themes). Drops only appear once a night has been checked on two consecutive days, so the radar fills during the first days of the night grid.

### C-080b · Shareable drop page + story image

Owner: CLOUD · Size: M · Depends on: C-080a · Status: DONE · PR: see `[C-080b]`
`/preissturz/[hotel]/[night]`: one drop with photo, both prices, the night's price history (chart), the site and "Zum Angebot" (labelled affiliate link where one exists). Open Graph title and description carry the drop ("Hotel Adlon: −26 % für Sa, 18. Okt."); the static photo is the OG image until C-028c. "Als Story teilen": draws a 1080×1920 image in the browser (canvas: photo, hotel, night, −26 %, old/new price, "tidaq.com/preissturz"), shares it with the Web Share API (`navigator.share({ files })`) and falls back to a download. "Link kopieren" with a toast. No server CPU, so it works on the Workers free plan. Old drops (night in the past or price back up) stay reachable with an honest "Dieser Preissturz ist vorbei" state and a link to the radar.

**C-080b notes (DONE):** `/preissturz/[hotel]/[night]` (force-dynamic; core `dropPath`, `findDrop`; `getDropPage` in `lib/data/drops.ts`): photo with the drop, both prices, saved, new low, "Gesehen heute, 08:12 bei …", CTA "Alle Anbieter und Preisverlauf" → the 1-night stay page, the night's 30-day history (existing SQL `stay_history_from_nights`, no migration; the chart is skipped if that read fails), the hotel's other dropped nights, today's other drops. Radar cards now open the drop page. A link whose drop is gone renders `DropOver` ("Dieser Preissturz ist vorbei", noindex) with the current price; unknown hotel or invalid date → 404. Metadata: title "Hotel: −31 % für Di, 27. Okt.", description with both prices, OG image = the hotel photo. Sharing (`DropShare`, client, labels passed from the server): "Als Story teilen" draws a 1080×1920 PNG on a canvas in the browser (`storyImage.ts`; layout keeps the facts out of the platforms' top/bottom UI zones; core `wrapLines` for long names) and opens the share sheet with the file (Web Share Level 2: iOS/Android → Instagram, TikTok, WhatsApp); desktops without file sharing download it. "Link teilen" uses the share sheet or the clipboard. Zero server CPU, so it works on the Workers free plan (B-017 stays "not now": dynamic OG images would only change link previews). Sample: `/dev/drops?share[=slug]`, `/dev/drops?over`.

### C-080c · Creator kit in /admin

Owner: CLOUD · Size: S · Depends on: C-080b · Status: DONE · PR: see `[C-080c]`
`/admin/preisstuerze`: today's top 10 drops with one-click story image download, a ready German caption per drop (facts only: hotel, city, night, both prices, site, "Stand: heute 08:12") and hashtags, plus a "Top 5 des Tages" carousel set (5 story images + caption). Lets Zaid post daily in 5 minutes.

**C-080c notes (DONE):** `/admin/preisstuerze` (linked from the admin overview as "Preisstürze für Social Media"; preview `/dev/admin/drops`): today's top 10 drops (one per hotel) with thumbnail, prices, a ready German caption (core `dropCaption`: both prices, site, night, new low, "Stand", the check-before-booking line, `tidaq.com/preissturz`, city hashtag first) and buttons "Story-Bild" (same 1080×1920 image as the drop page), "Text kopieren", "Seite öffnen". "Top 5 des Tages": a cover slide (`drawCover`: ranked list) plus the five story images in one share (phone share sheet takes all files at once; desktop downloads them) and the list caption (core `topCaption`). Shared helper `components/drops/shareFiles.ts`. Captions have no urgency words (tested).

### C-080d · TikTok landing

Owner: CLOUD · Size: M · Depends on: C-080a · Status: DONE · PR: see `[C-080d]`
The radar's job is turning a TikTok viewer into a user, not producing posts (Zaid, 15 Oct). Someone who taps the bio link must see the drop from the video, believe it and find a reason to stay, on a phone, in the first screen.

**C-080d notes (DONE):** `/tiktok` and `/instagram` (and `/en/…`) redirect (307, `next.config.ts`) to `/preissturz?ref=…`: a one-line greeting replaces the intro, everything else is the normal radar. The biggest drop is now a hero card right under the title (`DropHero`; only on the unfiltered default sort; it leaves the grid): photo with the drop, both prices, saved, the **usual price** ("Sonst um 1.029 €": average of the earlier checks, only with ≥ 3 of them and above today's price, core `usualCents`) and "Preisverlauf ansehen". At 390 × 844 the whole hero including its button is in the first screen. Below it a proof line from SQL `radar_stats` ("5.722 Nächte in 82 Hotels auf 4 Buchungsseiten geprüft") plus "Sortiert nur nach dem Preissturz" and "Kostenlos, ohne Anmeldung". Cards, drop pages and creator-kit captions show the usual price too. Radar views are counted anonymously as `drops_view` with `ref` (`tiktok`, `instagram`, `none`): `event_stats` in the weekly summary shows what TikTok brings. SQL: new `radar_drops` = `price_drops` + `prior_avg_cents` (migration `20261015080856`; a new name because changing `price_drops`' return type needs a DROP, which the Supabase connector holds for a human confirmation). `price_drops` is unused now; remove it in a later migration when someone can confirm the DROP. `radar_stats` and the `log_event` change: migration `20261015080651`.

### C-080d2 · Hero with real history

Owner: CLOUD · Size: S · Depends on: C-080d · Status: DONE · PR: see `[C-080d2]`
**Notes (DONE):** On day 2 of the night grid the radar's biggest drop was "−70 % at The Shanghai EDITION", measured against a single earlier price. The hero (core `heroDrop`) is now the biggest drop with at least 3 earlier checks (`DROPS.usualMinDays`), so it also shows the usual price; without one, simply the biggest. Its label is "Preissturz des Tages" (it isn't always the biggest). The grid still lists every drop, biggest first.

### C-080e · Preissturz-Alarm

Owner: CLOUD · Size: M · Depends on: C-080d, C-031a · Status: DONE (e1, e2)
The conversion step for TikTok visitors: "Schick mir Preisstürze in Paris" (or all cities) on the radar (under the hero), drop pages and city pages. Double opt-in through `watchers` like the newsletter (one address, manage page, one-click unsubscribe). The collector sends at most one email per day per subscriber, only with drops not sent before (the hotel and night), biggest first, with photo-less list rows (hotel, night, both prices, usual price, link to the drop page). Dry run until launch like the alerts. Mind the Workers 50 subrequests per cron run (batch API). Privacy §6 gets one sentence.

**C-080e1 notes (DONE):** Migration `20261015082112_drop_alerts`: `watchers` gets `drop_alerts`, `drop_city` (city slug, null = all), `drop_consent_text`, `drop_at`, `drop_sent_on` (for e2's one-a-day rule); SQL `drop_alert_request(email, locale, consent, city)` (same 1-minute resend guard and 7-day cleanup as the newsletter; `email_kind` confirm / added / already, "already" = same city) and `drop_alert_off`; `watch_manage` returns `drop_alerts` and `drop_city` (with names). Web: `lib/watch/dropAlerts.ts`, server action `app/[locale]/preissturz/alertAction.ts` (honeypot, 5 per 10 min per IP), `DropAlertForm` (city select with "Alle Städte" first, email, consent never pre-ticked; works without JS) inside `DropAlertSection` (cities from the catalog; the preselected city is always offered). Placed on the radar (after the drops, with a "Preissturz-Alarm einrichten" jump link under the hero; preselects the city filter), drop pages (the drop's city), the "Preissturz vorbei" page and city pages. Manage page: "Preissturz-Alarm" section with "Preissturz-Alarm beenden" (other alerts stay); confirmation notice for alarm-only addresses. Confirm and "added" mails: `dropAlertMail` messages. Privacy §6: one paragraph (heading and anchor unchanged). Nothing is sent to subscribers yet (e2).

**C-080e2 notes (DONE):** Collector `dropAlerts.ts` `runDropAlerts` runs in the daily cron after the newsletter (own try; a crash emails the admins). It reads the drops seen in the 24 hours before the send (`radar_drops`, by `seen_at`: the night grid runs from about 00:00 to 08:30 UTC, so drops found after a send go out with the next one, and none twice) and the confirmed subscribers whose `drop_sent_on` is before today, picks per subscriber the drops in their city or all (core `dropsFor`: one entry per hotel, biggest first, top 5), skips people with none, renders core `dropAlertMail` (subject "Preissturz: −31 % im Baur au Lac und 2 weitere"; rows with both prices, the usual price and the drop page link; button to the radar filtered to their city) and sends through Resend's batch API from `alarm@tidaq.com` with one-click `List-Unsubscribe`. Each sent batch sets `drop_sent_on = today` (one PATCH per batch); a failed batch stays unmarked. Live only with the alerts' conditions; until C-044 it logs `drop alerts dry run` with counts. Subrequests: 2 reads + 2 per 100 subscribers.


### C-080f · Weekend drops

Owner: CLOUD · Size: M · Depends on: C-080a · Status: DONE · PR: see `[C-080f]`
Fri–Sun stays whose 2-night total on one site fell the same way (sum of both nights from the same site and check day), as their own entries on the radar and drop pages (`/preissturz/[hotel]/[checkIn]--[checkOut]`).

**C-080f notes (DONE):** SQL `radar_weekend_drops(p_today)` (migration `20261015085240`, anon-readable): Friday-to-Sunday totals per booking site (only sites that priced both nights on the same check day), then the same rules as `radar_drops`; same columns plus `check_out`. Core: `PriceDrop.checkOut` and `nights` (single nights default to the next day), `dropKey`/`parseDropKey` (`2026-10-23--2026-10-25`), `dropPath(slug, stay)`, `findDrop(groups, slug, stay)`, `dropDates` ("Fr, 23. Okt. – So, 25. Okt."); `dropStats.nights` counts a weekend as 2. The web reads both functions (`getDrops`, 2 parallel calls), and so does the collector for the Preissturz-Alarm. Weekend drops are their own entries: a "Wochenende" badge on the photo, both dates and "2 Nächte" in the meta line, the drop page at `/preissturz/[hotel]/[checkIn]--[checkOut]` with "Preisverlauf dieses Wochenendes" (2-night history from `stay_history_from_nights`) and the 2-night stay page; captions, alert emails, story images and the creator kit say "Wochenende". "So erkennen wir einen Preissturz" explains weekends. Sample: Fairmont Hamburg weekend in `lib/dropsSample.ts`.

### C-080g · Straight to the offer

Owner: CLOUD · Size: S · Depends on: C-080b, C-026 · Status: DONE · PR: see `[C-080g]`
**Notes (DONE):** A TikTok visitor who wants the deal shouldn't need two more pages. The drop page's main button is now "Zum Angebot bei Booking.com" (`/go/…` with the drop's dates and 2 adults, new tab, `rel="sponsored nofollow noopener"`); "Alle Anbieter und Preisverlauf" stays as the second button. When the site's link carries our affiliate parameters (`providers.affiliate_template`, same check as the stay page), a note under the buttons says so and links to the Affiliate-Hinweis. No button for the hotel's own site (the drop rows don't carry its URL) or sites without a search link: then the stay page stays the main button.

### C-080h · Weekly recap

Owner: CLOUD · Size: M · Depends on: C-080f · Status: DONE · PR: see `[C-080h]`
**Notes (DONE):** The radar only shows today; on a quiet day it looks thin, and there was no evergreen content. SQL `radar_week(p_today, p_days = 7)` (migration `20261015091403`, anon-readable, max 14 days, about 150 ms) calls `radar_drops` and `radar_weekend_drops` for each day and keeps each drop event once (a drop seen on one day is also on the next day's radar). Nothing new is stored. Core `weekSummary` (drops, hotels, weekends, average, biggest, cities ranked). `/preissturz/woche` (`routes.dropsWeek`, in the sitemap and the footer, linked from the radar): headline numbers, the top 10 hotels (each one's biggest drop of the week with "gesehen Do, 15. Okt." and a link to the stay's price history, because the price may have moved since), "Wo es diese Woche am meisten fiel" (cities → radar filtered), link to today's radar, the Preissturz-Alarm. Creator kit: "Heute" / "Diese Woche" tabs (`?zeitraum=woche`): the weekly cover ("Preisstürze der Woche"), stories and `topCaption(…, 'week')`, for a weekly TikTok carousel. Sample: `/dev/drops?week`, `/dev/admin/drops?zeitraum=woche`.

### C-080i · Drops where people already are

Owner: CLOUD · Size: S · Depends on: C-080f · Status: DONE · PR: see `[C-080i]`
**Notes (DONE):** People who come through search or a hotel link land on hotel and stay pages, not on the radar. `DropCallout` (green, `aside`): on a hotel page with drops today, "Preissturz bei diesem Hotel" with its biggest drop ("Di, 27. Okt. (1 Nacht): 684 € statt 989 € am Vortag, −31 % bei Booking.com."), "Zum Preissturz" and up to 4 chips for its other nights/weekends; on a stay page whose exact stay (night or weekend, 2 adults) is on today's radar, "Preissturz seit gestern: Dieser Aufenthalt kostet heute …". Both pages read the radar with the request-cached `getDrops` (two extra Supabase calls per page view, in parallel with the page's own reads). Dev: `?drop` on `/dev/hotel/[variant]` and `/dev/stay/[variant]`.

### C-080j · "Aus unseren Videos"

Owner: CLOUD · Size: M · Depends on: C-080d, C-080c · Status: DONE · PR: see `[C-080j]`
**Notes (DONE):** A TikTok viewer saw one hotel in the video, taps the bio link and must find that hotel at once, even if the drop left the radar since. Creator kit: every drop has "Gepostet auf [TikTok] [Instagram]" toggles (plain form posts to `markPostedAction`; the server looks the drop up again in today's radar or the week and saves a snapshot). Migration `20261015094502_posted_drops`: table `posted_drops` (RLS on, no policies, service role only; one row per stay and platform) and `posted_drops_recent(p_today, p_days = 7)` (anon-readable: posts of the last week whose check-in is ahead, newest first, one row per stay with its platforms, max 12). Core `postedDrops.ts`: `postedDropRowSchema`, `postedDrops` (max 6), `postedStatus` (still on today's radar → the current drop), `postedDropInsert`; `PriceDrop` gained `priorLowCents` and `confirmed` for the snapshot. Landing: on `/preissturz?ref=tiktok|instagram` (`/tiktok`, `/instagram`) the section "Aus unseren Videos" sits between the title and the hero: a swipe row on phones, 3 columns on desktop. Each card: photo, hotel, city and dates, "Im Video vom Mi, 14. Okt.: −21 %", then "Läuft noch" with today's prices or "Vorbei · Preis von heute ansehen"; it links to the drop page (which shows "Dieser Preissturz ist vorbei" with today's price when it's gone). Only one extra Supabase call, and only for bio-link visitors. **For Zaid:** after posting, tap the platform under the drop in /admin/preisstuerze. Sample: `/dev/drops?ref=tiktok`.

### C-080k · Preissturz-Alarm for one hotel

Owner: CLOUD · Size: M + S · Depends on: C-080e1, C-080e2 · Status: DONE (k1, k2)
**Why:** a TikTok viewer often falls for one hotel, not a city. "Sag mir, wenn das Adlon plötzlich günstiger wird" turns that impulse into an email address, for any date.
**C-080k1 notes (DONE):** Migration `20261015103849_drop_hotel_alerts`: table `drop_hotel_alerts` (watcher × hotel, cascade on delete, RLS on, service role only; max 20 hotels per address), SQL `drop_hotel_alert_request(email, locale, consent, hotel_slug)` (same answer and rules as `drop_alert_request`: double opt-in, 1-minute guard, 7-day cleanup; leaves the city alarm alone), `drop_hotel_alert_off(token, hotel_slug)`, `watch_manage` returns `drop_hotels`. Web: the alarm's select offers "Nur {Hotel}" first (value `hotel:<slug>`, `HOTEL_PREFIX`) and preselects it on drop pages, the "vorbei" page and hotel pages (new `alert` slot after the calendar); the label becomes "Alarm für". The action takes the hotel's name for the email from the catalog, never from the form. Mails: `confirmTextHotel`, `addedTextHotel`. Manage page: "Hotels mit Preissturz-Alarm" with one "Beenden" each. Privacy §6 mentions followed hotels. Nothing is sent for hotels until k2.
**C-080k2 notes (DONE):** SQL `drop_alert_recipients(p_today)` (migration `20261015105220`, service role only): confirmed addresses not mailed today with the city alarm and/or followed hotels, one row each with `hotel_ids`; the collector reads it instead of the `watchers` query (same one read per run). Core `dropsFor(groups, { cityAlarm, city, hotels }, since)`: city drops when the city alarm is on, plus the followed hotels' drops anywhere; `dropAlertMail` `hotels: 'only' | 'also'` → "Neue Preisstürze in deinen Hotels" / "in Paris und deinen Hotels". The radar button is filtered to a city only with a city alarm. Needs a collector deploy after merge.

### C-083 · Premium emails

Owner: CLOUD · Size: S · Depends on: C-030a · Status: DONE · PR: see `[C-083]`
**Notes (DONE):** Zaid (B-007 test): the confirmation email looked plain. `renderMail` (core `mailTemplate.ts`) is redesigned in the site's look: logo, a card with a violet top bar, an eyebrow pill (`eyebrow`: "Preissturz-Alarm", "Preisalarm", "Deals der Woche", "Admin-Login"), a 26 px heading, entries as bordered cards with a green badge (`items[].badge`, the drop's "−31 %"; the percent left the meta line), a bulletproof table button with an arrow, the link written out small, a quiet footer. Table layout and inline styles only; `color-scheme: light only` so dark-mode clients don't invert it; Plus Jakarta Sans where the client loads web fonts, system fonts otherwise. Every email uses it: confirm/added mails (web), price alerts, drop alerts and the newsletter (collector). The Supabase login email has its own copy in `docs/email/supabase-login.html` (made with `renderMail`; `{{ .ConfirmationURL }}` is Supabase's link variable) for Zaid to paste (B-018). Regenerate it if the template changes.
### C-030c notes (DONE, 15 Oct)
Cloudflare Turnstile (keys from B-016) on every form that sends an email: watch (stay page), Preissturz-Alarm, newsletter. `components/ui/Turnstile.tsx` renders the widget explicitly (Managed, `appearance: interaction-only`: invisible for almost everyone, a checkbox only for suspicious visitors) right above the submit button; it adds `cf-turnstile-response` to the form. The three server actions call `lib/turnstile.ts` → core `verifyTurnstileToken` after the honeypot and rate limit; a failed check answers "Die Sicherheitsprüfung hat nicht geklappt …" (`results.bot`). The check is off unless both `TURNSTILE_SECRET_KEY` (web Worker secret) and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (built into the pages from the GitHub secret `TURNSTILE_SITE_KEY`) are set, so local, CI and a half-configured deploy never block sign-ups; it fails open when Cloudflare can't be reached. CSP: `challenges.cloudflare.com` in script-src and frame-src. Privacy §3 has a Turnstile paragraph (no cookies without pre-clearance, form content not seen). Widget hostnames: tidaq.com and the staging workers.dev host (B-016).
### C-082 · Cloudflare Web Analytics
Owner: CLOUD · Size: S · Depends on: B-015 · Status: DONE · PR: see `[C-082]`
**Notes (DONE):** Automatic setup wasn't offered, so Cloudflare gave Zaid a snippet. `components/shell/WebAnalytics.tsx` in the public layout (not /admin) adds the beacon in the browser **only on tidaq.com / www.tidaq.com**: pages are prerendered for every environment, so staging, previews and CI never send data. The token is public by design. The CSP already allowed `static.cloudflareinsights.com` and `cloudflareinsights.com` (C-041a). Numbers: Cloudflare dashboard → Analytics & Logs → Web Analytics; the weekly summary quotes them.

### C-028c notes (DONE, 15 Oct)

Drop pages (`/preissturz/[hotel]/[night]`) share a 1200×630 **"−31 %" card** instead of the bare hotel photo: Supabase Edge Function `og-drop` (`supabase/functions/og-drop/index.tsx`, deployed with the Supabase connector, `verify_jwt: false` because crawlers fetch it) on the Pro plan we already pay for (B-017: no Workers Paid plan needed). It reads the drop itself from today's `radar_drops` / `radar_weekend_drops` (anon), so nobody can render made-up numbers; unknown or finished drops get a plain Tidaq card. Layout: hotel photo full-bleed with a dark gradient, logo, green "−54 %" pill, "PREISSTURZ", hotel name, city · dates · 2 Erwachsene, the price big, "statt … am Vortag bei …", photo credit (CC licence). Photo: the Wikimedia JPEG from `hotels.image_url` fetched by the function (our self-hosted copies are WebP, which satori/resvg can't read), embedded as a data URI. Output re-encoded PNG → JPEG (upng-js + jpeg-js, quality 82): ~145 KB in ~1.6 s, small enough for WhatsApp. Cache-Control 1 h / 6 h CDN. Web: core `dropOgImageUrl(SUPABASE_URL, slug, stay, locale)` + `OG_IMAGE`; `openGraphFor` takes `image`. Without `SUPABASE_URL` (local, CI) the photo stays. **Redeploy the function after editing the file** (Supabase connector `deploy_edge_function`, or `supabase functions deploy og-drop --no-verify-jwt`). Follow-up C-028d: stay pages.

## Checklists

### Definition of done (every task)

- [ ] Acceptance criteria of the task all true
- [ ] Tests added/updated; `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green locally and in CI
- [ ] UI tasks: checked at 390 px and 1280 px, DE and EN, keyboard, empty and error states
- [ ] No secrets, no personal data in logs, no new cookies
- [ ] Docs updated (TASKS status, README/PLAN if behavior changed)
- [ ] Self-review of the full diff done (CLAUDE.md §5)

### Launch checklist (C-044)

- [ ] Collector ran successfully 7 days in a row; cost on track
- [ ] ≥ 36 hotels with ≥ 14 days of data
- [ ] ≥ 150 checkout tests; provider pages show scores
- [ ] Watch + alert + unsubscribe tested in production with Zaid's email
- [ ] Legal pages final, Zaid read them (Z-12), Steuernummer filled or line removed
- [ ] Lighthouse mobile ≥ 90 on home, stay, hotel; no console errors
- [ ] Sitemap submitted; staging noindex; prod indexable
- [ ] Error alerts reach Zaid's email
- [ ] Launch content pack ready

### Weekly review (Zaid, 15 min, Sundays)

- [ ] Read the "Weekly summary" issue
- [ ] Do the Zaid steps listed there (or reply "later" with a date)
- [ ] Check BLOCKERS.md is empty or answered
- [ ] Glance at /admin: data healthy, cost on track
