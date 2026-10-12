# Decisions

Locked decisions for Tidaq. Sessions follow these without asking. To change one, add a new entry at the bottom with date, the change and the reason. Never edit an old entry silently.

Last updated: 11 Oct 2026 (kickoff with Zaid).

## Product

| # | Decision | Why |
|---|---|---|
| D-01 | **Name: Tidaq** (tide + Nasdaq: "the stock exchange for hotel prices"). Domain **tidaq.com**. Wordmark lowercase `tidaq`. | Short, free .com, matches the price-chart idea and Zaid's investing background. |
| D-02 | **Product:** price history, low/high signal and checkout-trust score for a specific luxury hotel stay (hotel + dates + guests + options). | The gap: Google Hotels shows little history, no breakfast/room filters, and its cheapest providers often cost more at checkout. |
| D-03 | **Segment: five-star and luxury hotels only** in v1. | A 5–10 % move is €100+ per stay. Buyers care, and our commission per booking is high. |
| D-04 | **Coverage at launch: DACH + top EU cities:** Berlin, München, Hamburg, Frankfurt, Wien, Zürich, Paris, London, Mailand, Rom, Barcelona, Amsterdam. | Where German-speaking luxury travellers actually go. |
| D-05 | **Language: German first, English second.** German at `/`, English at `/en`. Informal "du". | The German market is the focus; English adds reach at almost no extra cost when built in from day one. |
| D-06 | **Monetization v1: free for users + affiliate commission** on outbound booking links. No paywall, no subscription in v1. | Lowest barrier while we validate demand. Pro tier or "watch my booking" success fee may come later. |
| D-07 | **Target user:** "aspirational luxury traveller", 25–45, books a five-star hotel 1–3× a year, price-aware, research-heavy, DACH. | Not the ultra-rich (they book through agents and loyalty programs). |
| D-08 | **Alerts: email** (double opt-in). Telegram and web push later. | Email is universal and legally clear. |

## Tech

| # | Decision | Why |
|---|---|---|
| D-10 | **Hosting: Cloudflare.** Web app = Next.js (App Router) on Cloudflare Workers via `@opennextjs/cloudflare`. Data collector = separate Cloudflare Worker with Cron Triggers. **No Vercel.** | Zaid's choice. Cheap, fast, EU-friendly, cron built in. |
| D-11 | **Database: Supabase Postgres, new project `tidaq` in Zaid's existing Supabase Pro organization**, Micro compute (about +$10/month), region Frankfurt (eu-central-1). Supabase Auth for magic-link emails if needed. | Postgres fits time series and stats; EU data residency. Pro instead of free: 8 GB instead of 500 MB (price snapshots would fill 500 MB within weeks), no auto-pause, daily backups. |
| D-12 | **Price data: DataForSEO Google Hotels API** (Hotel Info + Hotel Searches, standard queue). About $0.0008 per hotel entity per task (Oct 2026 pricing page). SerpApi is the fallback. | Licensed data access instead of scraping provider sites ourselves. Cheap enough to track ~50 hotels daily. |
| D-13 | **Budget: under €50/month** for data + hosting in the first 3 months. Hard daily cap in code (`DAILY_TASK_CAP`). **Lean start (12 Oct):** 36 hotels × 8 stays × 1 run/day ≈ 290 tasks/day ≈ **$7/month** for data; `DAILY_TASK_CAP=300`. Scale up (evening run, more stays/hotels) only after launch, with data showing it's worth it. Expected total: data ~$7 + Supabase ~$10 + Cloudflare $0–5 = **~$17–22/month**. DataForSEO's $1 sign-up credit pays for the C-010 spike; Zaid tops up the $50 minimum only after the spike proves the data works. | Zaid wants to spend as little as possible. |
| D-14 | **Email: Resend** (free tier, 3,000 emails/month), domain `tidaq.com`. Templates with React Email. | Simple API, good deliverability, works from Workers. |
| D-15 | **Analytics: Cloudflare Web Analytics (cookieless)** + our own event table. **No tracking cookies, so no cookie banner.** | DSGVO-simple and good UX. |
| D-16 | **Language/tooling:** TypeScript strict, pnpm, Tailwind CSS, next-intl, Vitest, Playwright, ESLint + Prettier, Zod for all external data. | Mainstream, AI-friendly, well-tested. |
| D-17 | **Charts: own SVG components** (d3-scale/d3-shape only for math). No heavy chart library. | Full design control, tiny bundle, matches the reference design. |
| D-19 | **Raw API offers are kept 30 days**, then `price_snapshots.raw` is set to null by a daily cleanup. Normalized prices, `stay_daily`, stats and scores are kept forever. | Keeps the database small (about 1 GB per year instead of several GB) while still allowing re-processing of recent data. |
| D-18 | **Repo: `zaidg7/tidaq`, private.** Default branch `main`. | Keeps data pipeline and trust method private. |

## Design

| # | Decision | Why |
|---|---|---|
| D-20 | **Design direction: Soft Modern.** Rounded, friendly, app-like (lavender/violet accent, Plus Jakarta Sans). Zaid also liked Riviera Editorial; borrow its photo-forward deal cards and sky gradient as accents only. Spec in `docs/DESIGN.md`, reference in `docs/design/reference-homepage.html`. | Zaid's pick from six full-page mockups. |
| D-21 | **Prices in German format:** `1.184 €` (amount, space, €; no cents for totals). English: `€1,184`. Always use `Intl.NumberFormat`. | Correct German typography. The mockup showed `€1.184`, which is wrong for DE. |
| D-22 | **Falling prices are green, rising are red.** | Falling is good for the user. |

## Operating model

| # | Decision | Why |
|---|---|---|
| D-30 | **Two AI sessions do the work:** CLOUD (claude.ai cloud session, main builder) and LOCAL (Claude Code on Zaid's Windows 11 PC, for tasks needing his browser, accounts or a real machine). Zaid does only ZAID tasks. | Zaid has ~5–7 h/week (school until mid-2027, other businesses, gym). |
| D-31 | **Auto-merge: sessions squash-merge their own PRs when CI is green** and the PR checklist is done. Zaid does not review code. | Zaid's choice. Free private repos have no branch protection, so the session merges itself after verifying green CI. |
| D-32 | **Claude plan: Pro** (may upgrade to Max 5x). On Pro, run **one session at a time**; CLOUD is the default. LOCAL only for LOCAL tasks. | Pro usage limits. |
| D-33 | **Progress updates: weekly summary** every Sunday as a GitHub issue assigned to `zaidg7` plus `docs/progress/YYYY-Www.md`. Blockers go to `docs/BLOCKERS.md` immediately. | Zaid gets a phone notification once a week. |
| D-34 | **Baseline hotels: Claude picks** (seed list in `docs/TASKS.md`, C-011). | Zaid's choice. |
| D-35 | **Impressum/Datenschutz: reuse AheadSignal details** (Zaid Ghazal, Kleinunternehmer § 19 UStG), cite **§ 5 DDG** (not TMG; TMG was replaced on 14 May 2024). | Same business owner. |
| D-36 | **Domain `tidaq.com` registered at Namecheap**, DNS managed by **Cloudflare** (Namecheap nameservers point to Cloudflare). `.com` only. | Bought by Zaid on 12 Oct 2026. Cloudflare DNS is needed for Workers custom domains, Resend records and Search Console. |
| D-37 | **Trademark check for "Tidaq" is clean** (EUIPO, DPMA, WIPO, checked by Zaid on 12 Oct 2026). | Name is safe to use. |
| D-38 | **Deploys: staging on every green `main` push; production (tidaq.com) only on a `v*` tag or a manual "Deploy → production" run** until launch. Revisit at C-044 (likely: production on every green `main` push after launch). | C-005 had to choose. Before launch the public domain should only change on purpose; staging gives every merge a live URL. |
| D-39 | **Collector uses DataForSEO Hotel Info by `hotel_identifier` only, normalizes per-night prices to stay totals, and collects by polling** (post 05:00 UTC, collect 05:30, retry 06:30; `tasks_ready`/`task_get` are free). Postback optional later. | C-010: name lookups failed 7/7 and were billed; prices are per night; results were ready in < 4 min. |
| D-40 | **No breakfast/room filters in v1 (C-055 dropped).** | C-010: 0 of 198 room offers mention breakfast; room names only on ad entries. Revisit only with another data source. |

## Changelog

- **12 Oct 2026:** D-11 Supabase moved to Zaid's Pro organization (+$10/month, storage and reliability); D-13 cost estimate updated; D-19 added (raw data retention); D-36 domain bought at Namecheap with Cloudflare DNS; D-37 trademark clean.
- **12 Oct 2026 (2):** D-13 lean start: 36 hotels × 8 stays, one daily run, cap 300 tasks/day; $50 top-up only after the spike.
- **12 Oct 2026 (3):** D-38 added (deploy flow, C-005).
- **12 Oct 2026 (4):** D-39, D-40 added after the DataForSEO spike (C-010).
