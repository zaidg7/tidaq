# Tasks

The work queue. Sessions take the **first** task that is `TODO`, has their owner, has all dependencies `DONE` and has no open PR (see CLAUDE.md §2). Zaid's own tasks (`Z-xx`) are explained step by step in `docs/ZAID.md`; they appear here only as dependencies.

**Status values:** `TODO` · `IN PROGRESS` (open PR exists) · `BLOCKED` (see BLOCKERS.md) · `DONE`
**Owners:** `CLOUD` (cloud session) · `LOCAL` (session on Zaid's PC) · `ZAID` (human)
**Sizes:** S ≈ under 1 hour of session work · M ≈ 1–3 h · L ≈ 3–6 h (split L tasks into a/b when possible)
**parallel-safe:** LOCAL may take it when no LOCAL task is open.

## Overview

**Priority order = this table, top to bottom.** Data collection is the critical path (charts need history), so data tasks come before UI polish, and the trust audit tool comes early so the checkout tests can start three weeks before launch.

| ID | Title | Owner | Size | Depends on | Status |
|---|---|---|---|---|---|
| **Phase 0: Setup** (week 42, target Sun 18 Oct) |||||
| C-001 | Monorepo scaffold (Next.js + OpenNext + collector + core) | CLOUD | M | Z-01 | DONE |
| C-002 | CI pipeline (lint, typecheck, test, build, e2e smoke) | CLOUD | M | C-001 | DONE |
| C-003 | Session tooling (SessionStart hook, permissions allowlist) | CLOUD | S | C-001 | DONE |
| C-007 | i18n setup (de default, en) and formatting helpers | CLOUD | S | C-001 | DONE |
| C-004 | Supabase schema v1, RLS, seed providers and cities | CLOUD | M | C-001, Z-04 | DONE |
| C-005 | Deploy pipeline to Cloudflare (web + collector), staging and prod | CLOUD | M | C-002, Z-03b, Z-04 | DONE |
| **Phase 1: Data** (weeks 42–44, target Sun 1 Nov: data flowing) |||||
| C-010 | DataForSEO spike: real response shape, cost, feasibility report | CLOUD | M | C-001, Z-04, Z-06 | DONE |
| C-012 | Stay grid generator | CLOUD | S | C-004 | DONE |
| C-014 | Normalization and provider mapping | CLOUD | M | C-010 | DONE |
| C-015 | Price stats engine (state, percentile, trend, advice) | CLOUD | M | C-001 | DONE |
| C-011 | Hotel catalog: resolve seed hotels, identifiers, images | CLOUD | M | C-004, C-010 | DONE |
| C-013a | Collector: grid refresh, budget guard, task posting | CLOUD | M | C-005, C-010, C-011, C-012, C-014 | DONE |
| C-013b | Collector: collect results, store snapshots, daily prices, stats | CLOUD | M | C-013a, C-015 | DONE |
| C-013c | Collector: admin emails, daily check, raw-data prune | CLOUD | S | C-013b | DONE |
| C-013d | Collector: live check on staging, first production deploy, 2-day data check | CLOUD | S | C-013c, B-005, B-003 | IN PROGRESS |
| C-011b | Hotel photos: licensed Wikimedia Commons images with credits | CLOUD | S | C-011 | DONE |
| C-019 | Web data layer (public reads) and best price from reviewed providers | CLOUD | S | C-013b | DONE |
| **Phase 2: MVP website** (weeks 44–47, target Sun 22 Nov) |||||
| C-006a | Design tokens, font, base components, /dev/ui | CLOUD | M | C-001 | DONE |
| C-006b | Craft pass: CRAFT.md spec, refined tokens and components, logo, icons | CLOUD | M | C-006a | DONE |
| C-020a | App shell: navbar, footer, locale switch, 404/500, robots | CLOUD | M | C-006b, C-007 | TODO |
| C-006c | Price chart, RangeBar, Skeleton, EmptyState, Toast, visual regression | CLOUD | M | C-006b | TODO |
| C-020b | Homepage (reference design, real live example) | CLOUD | L | C-020a, C-006c, C-015, C-019 | TODO |
| C-020c | Admin auth: Supabase magic link, `/admin` guard | CLOUD | S | C-020a | TODO |
| C-016 | Admin: data health and budget dashboard | CLOUD | M | C-013b, C-020c | TODO |
| C-032 | Trust audit tool and provider scores (early, so the audit starts in week 45) | CLOUD | M | C-020c, C-004 | TODO |
| L-033 | Checkout audit with Claude in Chrome (150 tests, recurring until launch) | LOCAL | L (recurring) | C-032, Z-07 | TODO |
| C-021 | Search: autocomplete, date range picker, guests | CLOUD | M | C-020a, C-011 | TODO |
| C-022 | Stay page with chart, stats, advice, provider table | CLOUD | L | C-020a, C-015, C-013b | TODO |
| C-023 | Hotel page with price calendar | CLOUD | M | C-022 | TODO |
| C-026 | Outbound link service `/go/*` with click logging | CLOUD | S | C-022 | TODO |
| C-027 | Legal and transparency pages | CLOUD | M | C-020a | TODO |
| C-024 | City pages | CLOUD | S | C-023 | TODO |
| C-025 | Deals page | CLOUD | S | C-022 | TODO |
| C-028 | SEO foundation and dynamic OG images | CLOUD | M | C-022 | TODO |
| C-029 | Analytics events (cookieless) | CLOUD | S | C-020a | TODO |
| **Phase 3: Alerts and trust** (week 48, target Sun 29 Nov) |||||
| C-030 | Watch flow with double opt-in and manage/unsubscribe | CLOUD | M | C-022, Z-05 | TODO |
| C-031 | Alert engine and emails | CLOUD | M | C-030, C-013b | TODO |
| C-034 | Provider pages and methodology page with live data | CLOUD | S | C-032 | TODO |
| **Phase 4: Launch** (week 49, launch Mon 30 Nov) |||||
| L-040 | Real-device QA on PC and iPhone, fix list | LOCAL | M | C-031, C-034 | TODO |
| C-041 | Launch hardening: perf, a11y, error monitoring, backups | CLOUD | M | C-031 | TODO |
| C-042 | Trust report page "150 Checkouts getestet" | CLOUD | S | L-033, C-034 | TODO |
| C-043 | Launch content pack for Zaid | CLOUD | S | C-042 | TODO |
| C-044 | Go live on tidaq.com | CLOUD | S | C-041, L-040, Z-12 | TODO |
| **Phase 5: Growth** (Dec 2026 – Mar 2027) |||||
| C-050 | Affiliate wiring per approved program | CLOUD | S | Z-11 | TODO |
| C-051 | Weekly content pack routine | CLOUD | S | C-044 | TODO |
| C-052 | "Beste Buchungszeit" and event SEO pages | CLOUD | M | C-044 (30+ days data) | TODO |
| C-053 | Coverage expansion and "request a hotel" | CLOUD | M | C-044 | TODO |
| C-054 | Weekly deals newsletter (opt-in) | CLOUD | M | C-031 | TODO |
| C-055 | Breakfast/room filters (if the spike allows) | CLOUD | M | C-010 result | DROPPED (D-40) |
| C-056 | Research: "watch my booking" rebooking alerts (v2) | CLOUD | S | C-044 | TODO |

### Zaid tasks (sessions update this table when they see a Z-task is done)

| ID | What | Status |
|---|---|---|
| Z-01 | GitHub repo + Claude app access | DONE |
| Z-02 | Trademark check | DONE (clean) |
| Z-03 | Buy tidaq.com | DONE (Namecheap) |
| Z-03b | Point tidaq.com nameservers to Cloudflare | DONE (zone active) |
| Z-04 | Cloudflare, Supabase, DataForSEO accounts + GitHub secrets (DataForSEO top-up waits for C-010) | DONE |
| Z-05 | Resend + `RESEND_API_KEY` secret | DONE |
| Z-06 | Claude cloud environment: full network access, DataForSEO network secret | DONE |
| Z-07 | PC setup for LOCAL session + Claude in Chrome | DONE |
| Z-09 | Google Search Console | TODO |
| Z-10 | Social handles | TODO |
| Z-11 | Affiliate program applications (after launch) | TODO |
| Z-12 | Read legal pages before launch | TODO |

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

**Steps**
1. `.github/workflows/ci.yml` on `pull_request` and `push` to `main`: checkout, pnpm with cache, install, lint, typecheck, unit tests with coverage, build web (OpenNext build) and collector, Playwright smoke (`apps/web/e2e/smoke.spec.ts`: home loads in de and en, has no console errors).
2. Use Playwright's Chromium. Upload the Playwright report as an artifact on failure.
3. `concurrency` group per branch to cancel outdated runs.
4. Add a coverage threshold for `packages/core` (90 % lines), failing CI below it.

**Done when**
- [x] A PR shows one required-looking check "CI" that runs all steps
- [x] An intentionally failing test makes CI red (prove it in the PR, then revert)
- [x] Typical run under 6 minutes

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
Owner: CLOUD · Size: L (split a/b/c) · Depends on: C-001 · Status: a DONE, b DONE, c TODO · PR: a = [#21](https://github.com/zaidg7/tidaq/pull/21), b = [#23](https://github.com/zaidg7/tidaq/pull/23)

**C-006a notes (DONE):** tokens in `apps/web/app/globals.css` (raw values on `:root`, dark set under `[data-theme='dark']`, Tailwind 4 `@theme inline` → `bg-surface`, `text-muted`, `rounded-card`, `shadow-float`, `ease-soft` …; type roles as `.text-display/.text-h2/.text-h3/.text-price-xl/.text-meta/.text-eyebrow`). **AA fix:** DESIGN.md's good/bad/warn as small text and muted-on-line miss 4.5:1, so small text uses new ink tokens (`text-good-ink` etc., documented in DESIGN.md §2). Plus Jakarta Sans 500/700/800 via `next/font` (`lib/fonts.ts`; buttons use 700 since 600 isn't loaded). Components in `components/ui/`: Logo, Button (+ `buttonClasses` for links), TextField, Chip, Card, Badge, StateChip, Price, PriceDelta, TrustScore; favicon `app/icon.svg`. Core: `trustLevel` (`trust.ts`, thresholds 85/60, < 5 tests → "Noch zu wenig Tests"), `relativeChange` (`stats.ts`). State labels now follow DESIGN.md ("Guter Preis", "Gerade teuer", "Daten werden gesammelt (3/7)"). `/dev/ui` (+ `/en/dev/ui`): every component and state, noindex, `notFound()` when `APP_ENV=production` (rendered per request via `connection()`). E2E: `e2e/dev-ui.spec.ts` (renders, font + background, focus ring, aria-describedby on field errors). Checked at 390 and 1280 px: no horizontal scroll.

**C-006b notes (DONE):** Zaid asked for a design level "like a team of the best graphic designers". Three expert reviews (art direction, benchmark of Linear/Stripe/Airbnb/Hopper/Google Flights, UX + German copy) are in `docs/design/research/2026-10-13-*.md`; their synthesis is **`docs/design/CRAFT.md`**, which now wins over DESIGN.md where they differ (DESIGN.md marks the changes). Delivered: new tokens (surface-2, line-strong, accent-hover/press, solid soft tints, disabled ink, two-layer violet shadows, radii scale, eases), variable Jakarta (any weight, latin-ext), type roles (display/h2/title/h3/lead/price-xl/meta/eyebrow), Lucide icons via `Icon` (stroke 1.75, 2 at ≤ 16 px), refined Button (sizes sm/md/lg, gradient primary, loading, leading icon, IconButton), TextField (leading icon, halo focus, error row), Chip (check icon, 44 px hit area), Badge, StateChip (progress ring), Price (typeset €, core `priceParts`), PriceDelta (icon + bold %, "seit …" variant), TrustScore ("Preistreue", bar, dashed box under 5 tests), Card (flat/float/interactive), logo `tidaq.` drawn from the font outlines (q curls into the accent "today" dot) and favicon `q.` on the violet gradient. Reviewed with screenshots at 390/1280 and a design-critic pass; applied: TrustScore one 28 px geometry and AA "/100", StateChip `sm` 22 px with short labels (`stateShort`), equal-width chips, gradient-keeping button hover, 44 px target for sm buttons, reduced-motion lifts, Card padding/focus/wrapping, "Nah am Tiefpunkt". Deliberately kept: the short q curl (a wave turned into a squiggle at 22 px) and the `q.` favicon (a white t looks like Tumblr). For the next UI tasks: build to CRAFT.md §3, and run the same screenshot + critic loop (CRAFT §6) before merging.

**C-006c (TODO):** PriceChart (CRAFT.md §3: accent line, guarded y-domain, low/today markers, dark tooltip, scrub + keyboard, table fallback), RangeBar, Skeleton, EmptyState (collecting 7-segment bar), Toast; Playwright screenshot test of `/dev/ui` at 390 and 1280 px (generate baselines in CI's Linux image, e.g. a `--update-snapshots` workflow run, because font rendering differs between machines).

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

**C-013a notes (DONE):** steps 1, 3, 6 and the posting half of 5. `packages/core/src/budget.ts` (`applyBudget`: watched stays first, then nearest check-in, then hotel/check-in order; daily cap counts tasks already posted today by *both* environments, they share one database; monthly estimate at $0.0008/task; `monthlyAlert` at 80 %). Collector: `morning.ts` (`runPosting`), `dataforseo.ts` (batches of 100, `tag` = stay id, retries 5xx/network with backoff), `store.ts` + `supabaseStore.ts`, `POST /run` (token = HMAC-SHA256(service key, `tidaq-collector-run`), workflow **Actions → Collector run**). Migration `20261012200019_collector_tasks`: `collector_tasks` (one row per posted task, status `posted` → `done`/`no_results`/`failed`), `collector_runs.kind/env/tasks_skipped/budget_reason`, `price_snapshots.task_id` with a unique index on (task_id, provider_id) for idempotent inserts. Runs that never got to post are still recorded with their error.

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
Owner: CLOUD · Size: M · Depends on: C-013, C-020c · Status: TODO · PR: –

**Steps**
1. `/admin` (auth from C-020c): last 14 collector runs (tasks, cost, errors), month-to-date cost vs budget, coverage (active hotels, stays, % stays with today's data), unknown providers to map, hotels with no data in 3 days.
2. Buttons: "Run collector now (staging)", "Deactivate hotel".
3. Approving a pending provider (unknown provider list) must call SQL `rebuild_stay_daily(null)` afterwards, so best prices include it (C-019).

**Done when**
- [ ] Zaid can see on his phone in 10 seconds whether data is healthy

---

## Phase 2: MVP website

### C-020a · App shell
Owner: CLOUD · Size: M · Depends on: C-006b, C-007 · Status: TODO · PR: –

**Steps**
1. Root layout per CRAFT.md §3: navbar (logo, links Hotels · Deals · Kassen-Check · So funktioniert's, CTA "Preise ansehen", scroll state, mobile top sheet), footer (columns, legal links, affiliate note, locale switch, © 2026 Tidaq).
2. 404 and error pages in brand style.
3. `robots` noindex on staging.
4. Locale switch as plain server-rendered links: the current client `LocaleSwitch` puts ~100 kB of JS on `/` (build output), which would hurt Lighthouse.

### C-020c · Admin auth
Owner: CLOUD · Size: S · Depends on: C-020a · Status: TODO · PR: –

Split from C-020a so the public site ships first. Supabase magic link to an email in `ADMIN_EMAILS`; middleware protects `/admin/*`; no cookies on public pages.

**Done when**
- [ ] Shell works at 390 px and 1280 px; Lighthouse a11y ≥ 95

### C-020b · Homepage
Owner: CLOUD · Size: L · Depends on: C-020a, C-006c, C-015, C-019 · Status: TODO · PR: –

**Steps**
1. Build the homepage section by section like `docs/design/reference-homepage.html` (Soft Modern variant): hero + search card, live example panel, how it works (3 steps), trust teaser with figures, deals of the week, final CTA, footer.
2. The live example uses a real featured stay: `getFeaturedStay()` (C-019, `apps/web/lib/data/featured.ts`); falls back to a static example labeled "Beispiel" if data is missing.
3. Copy from the reference, refined; DE and EN.

**Done when**
- [ ] Side-by-side with the reference: same structure and feel; real data visible
- [ ] Mobile LCP < 2.5 s (Lighthouse mobile ≥ 90)

### C-021 · Search
Owner: CLOUD · Size: M · Depends on: C-020a, C-011 · Status: TODO · PR: –

**Steps**
1. Autocomplete for hotels and cities (accessible combobox pattern, diacritics-insensitive: "zurich" finds "Zürich").
2. Date range picker: German locale, Monday first, nights count, max 30 nights, no past dates, mobile bottom sheet.
3. Guests: adults 1–4 (children later). No breakfast/refundable toggles in v1 (D-40).
4. Submit → stay page URL; city → city page.

**Done when**
- [ ] Works with keyboard only and on iPhone width; e2e test covers a full search

### C-022 · Stay page
Owner: CLOUD · Size: L (split: a = data + layout + chart, b = provider table + watch CTA + states) · Depends on: C-020a, C-015, C-013 · Status: TODO · PR: –

**Steps**
1. Route `/hotel/[slug]/[checkin]--[checkout]?adults=2` (validate params; redirect invalid).
2. Header: hotel, dates, guests, state chip, price now (big), delta vs avg30, nights and total.
3. Chart component (SVG): best price per day, avg30 dashed line, low marker, today marker, hover/tap tooltip with date and price, y-axis in €, accessible data table toggle.
4. Stats row: Tief / Schnitt / Hoch. Advice box.
5. Provider table: per provider the latest price, trust score (or "Noch zu wenig Tests"), "erwartet an der Kasse ≈ …" if markup is known, outbound button via `/go/*`, sorted by trusted price (PLAN §8.3). Affiliate note under the table.
6. States: collecting (< 7 days), no data yet (untracked stay → create `tracked_stays` origin `watch` if within cap → "Erste Preise in ca. 1 Stunde"), hotel inactive, stay in the past.
7. "Preis beobachten" CTA (opens the C-030 flow; until then it's disabled with "Bald verfügbar").

**Done when**
- [ ] Every state has a designed screen; e2e tests for tracked, collecting and untracked stays

### C-023 · Hotel page with price calendar
Owner: CLOUD · Size: M · Depends on: C-022 · Status: TODO · PR: –

**Steps**
1. `/hotel/[slug]`: photo/placeholder, name, city, short facts, price calendar: for each tracked check-in date in the next 60 days, a cell colored by price level (relative to this hotel's range), tap → stay page. Legend. Month navigation on mobile.
2. Cheapest upcoming weekend and midweek stays highlighted.
3. Hotel structured data.

**Done when**
- [ ] Calendar readable at 390 px; color is not the only signal (price text in cells)

### C-024 · City pages
Owner: CLOUD · Size: S · Depends on: C-023 · Status: TODO · PR: –
`/stadt/[city]`: hotel cards with photo, cheapest upcoming stay, state chip. SEO title and intro text (DE/EN). Links from footer and home.

### C-025 · Deals page
Owner: CLOUD · Size: S · Depends on: C-022 · Status: TODO · PR: –
`/deals`: stays with ≥ 14 days of data whose best price is ≥ 8 % below avg30, sorted by % drop; city filter chips; each card links to the stay page. Empty state if no deals.

### C-026 · Outbound link service
Owner: CLOUD · Size: S · Depends on: C-022 · Status: TODO · PR: –
`/go/[offerId]`: look up the latest offer URL, apply `providers.affiliate_template` if set, log `outbound_click` (provider, hotel, stay; no IP, no user agent stored), 302 redirect. Links carry `rel="sponsored nofollow noopener"`, open in a new tab. Unit tests for template filling and unknown ids.

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

### C-028 · SEO foundation and OG images
Owner: CLOUD · Size: M · Depends on: C-022 · Status: TODO · PR: –
Metadata per page (DE/EN), hreflang, canonical, sitemap index per locale, robots (staging noindex), JSON-LD (Organization, Hotel), dynamic OG images for stay and hotel pages (price, sparkline, state chip, brand) via `next/og` (check Workers compatibility; fall back to a pre-rendered image route). Google Search Console verification via DNS (Z-09).

### C-029 · Analytics events
Owner: CLOUD · Size: S · Depends on: C-020a · Status: TODO · PR: –
Cloudflare Web Analytics snippet (cookieless) + server-side `events` inserts for search, stay_view, watch_created, watch_confirmed, outbound_click. No cookies, no IPs, no user ids. A small weekly stats query for the summary.

---

## Phase 3: Alerts and trust

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

### C-031 · Alert engine and emails
Owner: CLOUD · Size: M · Depends on: C-030, C-013 · Status: TODO · PR: –
After each collector run: evaluate active, confirmed watches against triggers (PLAN §9), throttle to 1 email/watch/day, send via Resend with the price, state, mini chart (OG image URL), best trusted provider and the manage/unsubscribe link (List-Unsubscribe header). Record in `alerts_sent`. Unit tests for every trigger and the throttle.

### C-032 · Trust audit tool
Owner: CLOUD · Size: M · Depends on: C-020c, C-004 (scheduled early in Phase 2) · Status: TODO · PR: –

**Steps**
1. `/admin/audit`: a fast mobile-friendly form: pick hotel + stay (prefilled from tracked stays), provider, listed price (as shown on Google Hotels), checkout total, outcome, extras (chips: Citytax extra, Frühstück fehlt, anderes Zimmer, Gebühren, nicht buchbar), screenshot upload (private Storage bucket), notes.
2. List of recent tests with edit/delete.
3. Score computation (PLAN §8.2) in `packages/core/trust.ts`, unit-tested, written to `provider_scores` after each change.
4. CSV export.

**Done when**
- [ ] Entering one test takes under 60 seconds on a phone

### L-033 · Checkout audit with Claude in Chrome (recurring)
Owner: LOCAL · Size: L, recurring (10–15 tests per session) · Depends on: C-032, Z-07 · Status: TODO · PR: –

**Goal:** 150+ real checkout tests by launch, across ≥ 8 providers and ≥ 30 hotels. This is the trust score's data and the launch story.

**Protocol per test (with Zaid at the PC, or Zaid approving each site in Claude in Chrome):**
1. Pick a tracked stay (rotate cities, providers, dates; prefer the stays shown on Google Hotels with 4+ providers).
2. Open Google Hotels for that hotel and dates, 2 adults. Note each provider's listed price.
3. For one provider: click through to the provider site, select the same room type as the cheapest listed, continue to the **last page before payment**. **Never enter personal or payment data, never submit.** If a page asks for personal data before showing the total, record the total shown at that step and mark extras.
4. Record the final total and extras in `/admin/audit`, attach a screenshot.
5. Close tabs. Next provider.
- Spread tests over time (not 50 at once), log the date. Aim for 10–15 per session, 2–3 sessions a week.
- Write a short note in the PR/issue each session: tests done, surprising findings (these become content).

**Done when**
- [ ] ≥ 150 tests recorded; each core provider has ≥ 10 tests

### C-034 · Provider pages and methodology with live data
Owner: CLOUD · Size: S · Depends on: C-032 · Status: TODO · PR: –
`/anbieter/[slug]`: score, tests, match share, average markup, common extras, last test date. `/methodik` gets live numbers. Neutral, factual wording (CLAUDE.md rule 8).

---

## Phase 4: Launch

### L-040 · Real-device QA
Owner: LOCAL · Size: M · Depends on: C-031, C-034 · Status: TODO · PR: –
Run through the full journey on Zaid's PC (Chrome, Edge) and his iPhone 15 (Safari, via the staging URL): search, stay page, watch signup, confirmation email, alert email (forced on staging), unsubscribe, legal pages, EN version. Write a fix list as new tasks; fix the small ones directly.

### C-041 · Launch hardening
Owner: CLOUD · Size: M · Depends on: C-031 · Status: TODO · PR: –
Lighthouse ≥ 90 (mobile) on home, stay, hotel; axe accessibility checks in Playwright; error monitoring (Workers Logs + a daily error digest email to Zaid, or Sentry free if the connector is set up); Supabase backups confirmed (daily on free plan; document restore); 404/500 pages; security headers (CSP, HSTS, Referrer-Policy); rate limits on API routes.

### C-042 · Trust report page
Owner: CLOUD · Size: S · Depends on: L-033, C-034 · Status: TODO · PR: –
`/report/checkout-test-2026`: "Wir haben {n} Checkouts getestet": charts of match rate per provider, average markup, most common extras, methodology link, dated. Shareable OG image. This is the launch story.

### C-043 · Launch content pack
Owner: CLOUD · Size: S · Depends on: C-042 · Status: TODO · PR: –
`docs/content/launch/`: 5 TikTok/Reels scripts (hook in the first 2 seconds, 20–40 s, on-screen text, which screen recording to make), a mydealz post draft, 2 Reddit post drafts (r/de, r/reisen; follow the subreddit rules, no spam), images exported from the site. In German.

### C-044 · Go live
Owner: CLOUD · Size: S · Depends on: C-041, L-040, Z-12 · Status: TODO · PR: –
Final launch checklist (below), production deploy to tidaq.com, collector prod caps set, Search Console sitemap submitted, smoke test in production, announce in the weekly summary issue.

---

## Phase 5: Growth (summaries; expand into full specs when started)

- **C-050 Affiliate wiring:** per approved program, fill `providers.affiliate_template`, test the redirect, add the program to `/affiliate-hinweis`.
- **C-051 Weekly content pack:** a Claude routine (or the first session each Sunday) writes 3 short-video scripts and 1 post from the week's data into `docs/content/YYYY-Www/`.
- **C-052 SEO pages:** "Beste Zeit, [Hotel] zu buchen" (needs 30+ days of data), "Silvester in [Stadt]".
- **C-053 Coverage expansion:** more hotels as budget allows; a "Hotel vorschlagen" form; track user-requested hotels.
- **C-054 Newsletter:** weekly deals email for opt-in subscribers.
- **C-055 Breakfast and room filters:** dropped for v1 (D-40): the source has no breakfast data.
- **C-056 Watch my booking (v2):** forward a booking confirmation → we watch the same stay → alert when it's cheaper to rebook (refundable bookings). Research and spec only.

---

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
