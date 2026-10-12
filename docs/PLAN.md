# Tidaq build plan

Version 1.2 · 12 Oct 2026 · Owner: Zaid Ghazal · Builders: Claude CLOUD + LOCAL sessions

This is the master plan. `docs/TASKS.md` is the work queue, `docs/DECISIONS.md` the locked decisions, `docs/DESIGN.md` the design system, `docs/ZAID.md` Zaid's own to-do list.

---

## 1. What Tidaq is

**One sentence:** Tidaq shows you how the price of *your* luxury hotel stay is moving, whether right now is a low or a high, and which booking site actually charges at checkout what it shows.

**Example:** You want the Hotel Adlon in Berlin, 1–3 Dec 2026, 2 adults, with breakfast. Tidaq shows:
- today's best price per provider (Booking.com, Expedia, the hotel's own website …)
- a chart of how that price moved since we started tracking it, with the 30-day average and the lowest point
- a clear signal: **Nahe Tiefpunkt / Günstig / Normal / Teuer**, plus the trend (falling, flat, rising)
- a **trust score per provider**: how often its shown price matched the real checkout total in our tests
- a button: **Preis beobachten**. You get an email when the price drops or hits a low.

**Why now / the gap:**
- Google Hotels shows a little price info but no clear history, no breakfast or room filters, and its cheapest offers often come from providers that charge more at checkout.
- Google penalizes partners whose checkout price doesn't match (its Price Accuracy Policy), which proves mismatches are common. Nobody shows users *which* providers are reliable.
- In Germany hotels may sell cheaper on their own website (the BGH struck down Booking.com's best-price clause), so real price gaps between channels exist.
- On a €1,500 stay, a 10 % move is €150. Luxury guests notice that, and our commission per booking is high.

## 2. Users

**Primary: the aspirational luxury traveller.** 25–45, DACH, books a five-star hotel 1–3× a year for a city break, anniversary or New Year's Eve. Price-aware, researches for weeks, hates overpaying, doesn't use luxury travel agents.

Jobs to be done:
1. "Tell me if I should book now or wait."
2. "Show me the real price, not a teaser that grows at checkout."
3. "Watch it for me and tell me when it drops."
4. "Show me luxury deals in cities I like."

**Not our user (v1):** business travel managers, budget travellers, the ultra-rich who book through Virtuoso agents or Amex FHR.

## 3. Scope

### v1 (launch target Mon 30 Nov 2026)
- ~50 five-star hotels in 12 cities (D-04), tracked daily on a rolling grid of stay dates
- Stay page with chart, stats, signal, advice, provider table with trust score
- Hotel page with a **price calendar** (cheapest upcoming dates)
- City pages and a deals page
- Email price alerts with double opt-in
- Trust score from manual checkout tests (≥ 150 tests by launch)
- Methodology, ranking transparency, affiliate disclosure, Impressum, Datenschutz
- German + English, mobile-first, Soft Modern design

### Not in v1 (on purpose)
- User accounts with passwords (email-only watches instead)
- Any hotel in the world (only our catalog; "request a hotel" form instead)
- Room-type and breakfast filters, **unless** the C-010 spike shows the API returns that data reliably
- Paid plans, "watch my booking" rebooking, B2B reports
- Native apps

## 4. Goals and milestones

| When | Milestone | Measure |
|---|---|---|
| Sun 18 Oct 2026 | Setup done | Repo, CI, domain, accounts, spike report merged |
| Sun 1 Nov 2026 | **Data flowing** | Collector runs daily for ≥ 36 hotels, cost within cap |
| Sun 22 Nov 2026 | MVP feature-complete | Home, stay, hotel, city, deals, legal pages live on staging |
| Mon 30 Nov 2026 | **Soft launch** | tidaq.com live, alerts working, ≥ 150 checkout tests published |
| Dec 2026 | First content wave | Trust report + TikTok series; 500 visitors |
| Mar 2027 | First money | Affiliate programs approved; **first €100 in commission** |
| Jun 2027 | Traction | 5,000 visitors/month, 1,000 active watches |

The earlier the collector runs, the better the charts at launch. **Data collection is the critical path.** Everything else can be polished later.

## 5. Architecture

```
                 ┌──────────────────────────────┐
  Cron 05:00 UTC │  apps/collector (CF Worker)  │
  + 17:00 UTC ──►│  1. build today's job list   │
                 │  2. budget guard             │──► DataForSEO API (Hotel Info, standard queue)
                 │  3. post tasks / fetch ready │◄── results (JSON)
                 │  4. validate (zod), normalize│
                 │  5. write snapshots          │──► Supabase Postgres (Frankfurt)
                 │  6. compute stats            │        ▲
                 │  7. evaluate alerts ─────────┼──► Resend (email)
                 └──────────────────────────────┘        │
                                                         │ read (anon key + RLS, server-side)
  Browser ──► apps/web (Next.js on CF Workers, OpenNext) ┘
              SSR/ISR pages, /go/* outbound redirects, /api/watch, /admin (Zaid only)
```

- **apps/web:** Next.js App Router, React Server Components, ISR for hotel/city pages (revalidate after each collector run via on-demand revalidation or a short revalidate time). All data reads are server-side.
- **apps/collector:** a plain Cloudflare Worker with `scheduled()` handler and Cron Triggers. Posts DataForSEO tasks, then fetches results with `tasks_ready` polling in a second cron run or a postback URL (`/postback` endpoint on the worker, protected by a secret token in the URL). Prefer postback if the spike confirms it works; otherwise poll.
- **packages/core:** pure TypeScript logic shared by both: zod schemas, normalization, price stats, trust score, budget guard. 100 % unit-testable without network.
- **Supabase:** Postgres + Storage (audit screenshots) + Auth (only for the admin and, optionally, magic links). Row Level Security on every table; the web app reads public views with the anon key; writes go through server routes with the service role.
- **CI/CD:** GitHub Actions. PR: lint, typecheck, unit, build, Playwright smoke. Main: same + deploy web and collector with Wrangler + apply Supabase migrations.

## 6. Data model (v1)

Source of truth: `supabase/migrations/`. This is the starting design; C-004 implements it.

```sql
-- catalog
create table cities (
  id smallserial primary key,
  slug text unique not null,            -- 'berlin'
  name_de text not null, name_en text not null,
  country_code char(2) not null
);

create table hotels (
  id serial primary key,
  slug text unique not null,            -- 'hotel-adlon-kempinski-berlin'
  name text not null,
  city_id smallint not null references cities(id),
  stars smallint not null default 5,
  dfs_hotel_identifier text unique,     -- DataForSEO / Google hotel id
  lat double precision, lng double precision,
  official_url text,
  image_url text, image_credit text,    -- licensed images only (see PLAN §11)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table providers (
  id serial primary key,
  slug text unique not null,            -- 'booking-com', 'hotel-direct'
  name text not null,
  domain text,
  is_direct boolean not null default false,
  affiliate_template text               -- URL template with {url}, filled when approved
);
create table provider_aliases (         -- maps raw API source names to providers
  alias text primary key,
  provider_id int not null references providers(id)
);

-- what we track
create table tracked_stays (
  id bigserial primary key,
  hotel_id int not null references hotels(id),
  check_in date not null,
  check_out date not null,
  adults smallint not null default 2,
  origin text not null check (origin in ('grid','watch','manual')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hotel_id, check_in, check_out, adults),
  check (check_out > check_in and check_out - check_in <= 30)
);

-- raw observations (append-only)
create table price_snapshots (
  id bigserial primary key,
  stay_id bigint not null references tracked_stays(id),
  provider_id int not null references providers(id),
  captured_at timestamptz not null,
  total_cents int not null,             -- total for the whole stay, EUR, incl. taxes as shown
  currency char(3) not null default 'EUR',
  room_name text, board text,           -- if the API returns them
  free_cancellation boolean,
  raw jsonb                             -- the original offer item; pruned to null after 30 days (D-19)
);
create index on price_snapshots (stay_id, captured_at desc);

-- one row per stay per day: the best price and per-provider best (derived, rebuilt by the collector)
create table stay_daily (
  stay_id bigint not null references tracked_stays(id),
  day date not null,
  best_cents int not null,
  best_provider_id int references providers(id),
  per_provider jsonb not null,          -- {provider_id: cents}
  primary key (stay_id, day)
);

-- computed signal per stay (latest)
create table stay_stats (
  stay_id bigint primary key references tracked_stays(id),
  updated_at timestamptz not null,
  days_tracked int not null,
  now_cents int, low_cents int, high_cents int, avg30_cents int,
  percentile numeric,                   -- 0..1, position of today's price in the window
  trend_7d numeric,                     -- % change per week from regression
  state text check (state in ('collecting','near_low','good','normal','high'))
);

-- trust: manual checkout tests
create table trust_tests (
  id bigserial primary key,
  provider_id int not null references providers(id),
  hotel_id int not null references hotels(id),
  check_in date not null, check_out date not null, adults smallint not null,
  listed_cents int not null,            -- price shown on Google Hotels for this provider
  checkout_cents int,                   -- final total on the last page before payment (null = could not book)
  outcome text not null check (outcome in ('match','higher','lower','unavailable')),
  extras text,                          -- e.g. 'city tax added', 'breakfast not included'
  screenshot_path text,                 -- Supabase Storage, private bucket
  tested_at timestamptz not null default now(),
  tested_by text not null default 'zaid'
);
create table provider_scores (           -- derived
  provider_id int primary key references providers(id),
  updated_at timestamptz not null,
  tests int not null, matches int not null,
  avg_markup_pct numeric, score smallint not null
);

-- users and alerts (no accounts, email-only)
create table watchers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  locale text not null default 'de',
  confirmed_at timestamptz,             -- double opt-in
  consent_text text not null, consent_at timestamptz not null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create table watches (
  id uuid primary key default gen_random_uuid(),
  watcher_id uuid not null references watchers(id) on delete cascade,
  stay_id bigint not null references tracked_stays(id),
  target_cents int,                     -- optional "tell me below X"
  last_alert_cents int, last_alert_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (watcher_id, stay_id)
);
create table alerts_sent (
  id bigserial primary key,
  watch_id uuid not null references watches(id) on delete cascade,
  kind text not null,                   -- 'target','new_low','drop','near_low'
  price_cents int not null,
  sent_at timestamptz not null default now(),
  resend_id text
);

-- ops
create table collector_runs (
  id bigserial primary key,
  started_at timestamptz not null, finished_at timestamptz,
  tasks_posted int not null default 0, tasks_done int not null default 0,
  est_cost_usd numeric not null default 0,
  errors jsonb not null default '[]'
);
create table events (                    -- privacy-friendly product analytics, no IP, no user id
  id bigserial primary key,
  name text not null,                   -- 'search','stay_view','watch_created','outbound_click'
  props jsonb not null default '{}',
  at timestamptz not null default now()
);
```

RLS: public `select` only on catalog tables, `stay_daily`, `stay_stats`, `provider_scores` and on public views. Everything with emails (`watchers`, `watches`, `alerts_sent`) has **no** public access. Server routes use the service role.

## 7. Data collection

### 7.1 The stay grid
Charts only exist for stays we track *before* someone asks. Each day the collector makes sure every active hotel has these stays tracked:
- **Weekends:** the next 6 Fri→Sun stays (2 nights)
- **Midweek:** 2 Tue→Thu stays in the next 6 weeks
- **Events:** New Year's Eve (30 Dec→1 Jan) and a few city specials (Oktoberfest, Christmas markets) in a `special_dates` config, only while they are within 90 days
- **Plus** every stay a user watches (origin `watch`)

All for 2 adults (the most common luxury booking). About 8 grid stays per hotel (lean start, D-13). The grid size is config (`GRID_WEEKENDS`, `GRID_MIDWEEK`), so scaling up later is a one-line change.

### 7.2 Budget math (verify in C-010)
- Hotel Info, standard queue: ~$0.0008 per task (one hotel entity per task).
- **Lean start (D-13):** 36 hotels × 8 stays = ~290 tasks/day, one run per day: about $0.23/day ≈ **$7/month**.
- Later options, only when worth it: a second evening run for stays checking in within 21 days (~+$2/month), more stays per hotel, more hotels (50 hotels × 14 stays ≈ $17/month).
- User watches: inside `DAILY_TASK_CAP` (300 at the start).
- **Total ≈ $17–22/month:** data ~$7 + Supabase project in the Pro organization $10 + Cloudflare $0–5 (try the free Workers plan first). Domain is a yearly cost.
- DataForSEO: $1 free credit on sign-up (≈ 1,250 tasks) covers the C-010 spike; minimum deposit afterwards is $50, which lasts about 7 months at the lean rate. Balance doesn't expire.
- **Storage:** ~2,300 snapshot rows a day at the lean start (~11,000 at full scale). With raw JSON that is ~10 MB/day, so raw JSON is pruned after 30 days (D-19). Without raw, the database grows about 1 GB a year, well inside the Pro plan's 8 GB.
- DataForSEO needs a prepaid balance. The first top-up lasts 2+ months.

**Budget guard (C-013):** before posting, count today's tasks in `collector_runs`. If adding the batch would exceed `DAILY_TASK_CAP` or the month-to-date estimate would exceed `MONTHLY_BUDGET_USD`, post only the highest-priority tasks (watches first, then stays closest to check-in, then the rest) and log the skip. Unit-tested.

### 7.3 Normalization
- Request `currency=EUR`, `language_code=de`, location Germany.
- Store the **total for the stay** as shown by the provider, in cents. If the API returns a nightly price, multiply by nights and mark it in `raw`.
- Map raw source names to `providers` via `provider_aliases`. Unknown sources are auto-created as providers with `slug` from the domain and logged for review.
- Drop offers with price ≤ 0, wrong currency or missing source. Keep everything else in `raw` for re-processing.

## 8. Methods

### 8.1 Price signal (per stay)
Input: `stay_daily.best_cents` for the last N days (N = days tracked, max 60).
- **Collecting:** fewer than 7 days of data. Show "Wir sammeln noch Daten (x/7 Tage)" and the chart so far.
- **Percentile:** where today's best price sits in the window (0 = lowest ever seen, 1 = highest).
- **State:** `near_low` if today ≤ low × 1.02 or percentile ≤ 0.10; `good` if percentile ≤ 0.35; `high` if percentile ≥ 0.75; else `normal`.
- **Trend:** slope of a least-squares fit over the last 7 days, as % per week. Falling < −1.5 %, rising > +1.5 %, else flat.
- **Advice text (DE examples):**
  - near_low: "Jetzt buchen ist sinnvoll. Der Preis liegt nahe am Tiefpunkt der letzten {n} Tage."
  - good + falling: "Guter Preis, und er fällt noch. Beobachten lohnt sich."
  - high: "Gerade teuer. Wir sagen dir Bescheid, wenn er fällt."
  - Within 7 days of check-in, add: "Kurz vor Anreise steigen Preise oft. Warte nicht zu lange."
- Never promise the future. Wording: "lohnt sich wahrscheinlich", never "wird fallen".

### 8.2 Trust score (per provider)
From `trust_tests` (manual checkout tests, PLAN §9 and task L-033):
1. For each test: markup = (checkout − listed) / listed. A test **passes** if markup ≤ +1 % (same price or cheaper). `unavailable` (the price could not be booked) fails.
2. accuracy = passed tests / all tests (n).
3. penalty = mean of the positive markups of the failed tests × 200, capped at 40 points (e.g. an average +14 % markup gives 28 points).
4. raw_score = clamp(100 × accuracy − penalty × (1 − accuracy), 0, 100).
5. **Bayesian shrinkage** for small samples: score = round((n × raw_score + 5 × 70) / (n + 5)), so a provider with 2 perfect tests shows 79, not 100.
6. Recompute after every new test. Unit-test with fixed examples.
- Show the score **with the sample**: "96 · 24 von 25 Tests stimmten". Under 5 tests: show "Noch zu wenig Tests" instead of a number.
- Methodology page explains all of this in plain German.

### 8.3 Ranking in the provider table
Sort by **trusted price**: listed price adjusted by the provider's average markup (if score is known), so a teaser price from an unreliable provider doesn't sit on top. Show the listed price and, when relevant, "erwartet an der Kasse ≈ 1.212 €". **Commission never affects ranking.** This is stated on the ranking transparency page (§ 5b UWG requires disclosing the main ranking parameters).

## 9. Pages and features (v1)

All pages in DE (`/…`) and EN (`/en/…`). Mobile-first. Soft Modern design.

| Route (DE) | What it does | Key acceptance criteria |
|---|---|---|
| `/` | Hero with search, live example stay, how it works, trust teaser, deals, CTA | Matches reference design; live example uses real data; LCP < 2.5 s on 4G |
| `/hotel/[slug]` | Hotel overview: photo, city, **price calendar** (heatmap of best price per tracked stay, next 60 days), best current deals, providers | Calendar works on mobile (horizontal scroll by month), tap → stay page |
| `/hotel/[slug]/[checkin]--[checkout]?adults=2` | **Stay page**: price now, state chip, delta vs avg30, 60-day chart, low/avg/high, advice, provider table with trust score + "erwartet an der Kasse", Preis beobachten | Chart accessible (table fallback), empty/collecting states, untracked stay → create on demand within cap and show "Erste Preise in ca. 1 Stunde" |
| `/stadt/[city]` | Luxury hotels in a city with current state per hotel | SEO title "Luxushotels in Berlin: Preisverlauf & Deals" |
| `/deals` | Biggest drops vs 30-day average in the last 7 days, filter by city | Only stays with ≥ 14 days of data |
| `/anbieter/[slug]` | Provider trust page: score, tests, typical extras | Facts only, with test dates |
| `/methodik` | How price signal and trust score work | Plain language, examples |
| `/ranking` | Ranking transparency (§ 5b UWG) | States that commission doesn't affect ranking |
| `/watch/confirm`, `/watch/manage/[token]` | Double opt-in confirmation; manage or unsubscribe all watches | One-click unsubscribe works without login |
| `/go/[offerId]` | Outbound redirect to the provider with affiliate params if available; logs an `outbound_click` event | `rel="sponsored nofollow"` on links; 302; no personal data logged |
| `/impressum`, `/datenschutz`, `/affiliate-hinweis` | Legal | See §11 |
| `/admin/*` | Zaid only: data health, audit entry, hotel catalog, budget | Supabase Auth magic link, email must be in `ADMIN_EMAILS` |

**Search (header and hero):** autocomplete over our hotels and cities (client-side list, under 100 items). Date range picker with German locale, nights shown, max 30 nights, no past dates. Adults 1–4. Toggles (breakfast, refundable) shown only if C-010 proves the data exists.

**Watch flow:** stay page → "Preis beobachten" → email field + optional target price + consent checkbox (not pre-ticked) → confirmation email → click → active. Each alert email has the price, the chart image (OG image endpoint), the best provider, and one-click unsubscribe. Max one email per watch per day.

**Alert triggers:** price ≤ target; new low (lower than every previous best price, and at least 2 % below the last alert); drop ≥ 5 % since the last alert; state changes to `near_low`.

**OG images:** dynamic per stay and hotel (price, chart sparkline, state chip). Great for sharing and TikTok screenshots.

## 10. SEO and content

- Programmatic but useful pages: hotel pages, city pages, "Beste Zeit, das [Hotel] zu buchen" (after 30+ days of data), "Silvester in [Stadt]: Luxushotel-Preise".
- Structured data: `Hotel` with `address`, `starRating`, `priceRange`. Don't mark up offers we don't sell.
- hreflang de/en, sitemap per locale, canonical URLs, fast pages.
- Content for Zaid (TikTok/Instagram/Reddit/mydealz), drafted weekly by a session from fresh data: "Dieses Hotel ist gerade 14 % günstiger", "Wir haben 150 Checkouts getestet", "Booking vs. Hotel direkt".

## 11. Legal and compliance (Germany)

Not legal advice. Before launch, Zaid reads the final texts once (task Z-12).

- **Impressum (§ 5 DDG):** Zaid Ghazal, address and email as on AheadSignal, Kleinunternehmer § 19 UStG, Steuernummer when available. Cite DDG, not TMG.
- **Datenschutzerklärung (DSGVO):** processors Cloudflare (hosting, cookieless analytics), Supabase (EU, database), Resend (email); purposes; legal bases (Art. 6(1)(a) consent for alerts, (f) legitimate interest for logs); retention; rights; no tracking cookies. Sign DPAs/AVVs (Supabase, Resend and Cloudflare offer them online).
- **Email alerts:** double opt-in (§ 7 UWG); store consent text + timestamp; unsubscribe link in every email; send only what was asked for.
- **Affiliate disclosure:** visible note near outbound links ("Wir erhalten ggf. eine Provision. Für dich ändert sich der Preis nicht.") and a full `/affiliate-hinweis` page. Links `rel="sponsored nofollow"`.
- **Ranking transparency (§ 5b UWG, Omnibus directive):** page describing main ranking parameters and that commissions don't influence ranking.
- **Prices (PAngV):** show totals including taxes as the provider shows them; label the stay length; say when city tax may be extra.
- **Comparisons and provider claims (UWG §§ 4, 6):** factual, verifiable, dated. Keep screenshots of every test. Neutral wording.
- **Images:** only licensed images (hotel press kits with permission, Wikimedia Commons with attribution, or our own illustrations). No Google or Booking photos.
- **Trademarks:** check "Tidaq" in EUIPO/DPMA before buying ads (Z-02). Hotel and provider names are used descriptively only, no logos without permission.
- **Data source terms:** DataForSEO provides the data under its terms; we don't scrape providers ourselves.

## 12. Monetization

- v1: affiliate links. Programs to join once the site is live with content (Z-11): Booking.com (via Awin or CJ, around 4 % per completed stay reported by third parties), Expedia Group affiliate program (Expedia, Hotels.com), Trip.com, Agoda. Commission is paid after the stay, so the first money arrives weeks after the first bookings.
- Until approved, outbound links are plain links. That's fine; we collect click data to show the networks.
- Later: Pro tier (longer history, unlimited watches, rebooking alerts), "watch my booking" success fee, B2B rate-parity reports for hotels (2027+).

## 13. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| DataForSEO data lacks per-provider detail or breakfast/room info | Weaker product | C-010 spike first; fall back to "best price per provider" only; SerpApi as backup source |
| Costs higher than estimated | Budget | Budget guard, daily cap, cost dashboard, weekly cost in summary |
| Few visitors at launch | No revenue | Content-led launch from the checkout audit; SEO pages from real data; mydealz/Reddit |
| Affiliate programs reject a young site | No revenue | Apply after launch with content; several networks; direct links still give value |
| Legal complaint from a provider | Stress, cost | Facts only, screenshots, neutral wording, quick correction process |
| Pro plan usage limits slow the build | Delays | Small tasks, one session at a time, upgrade to Max 5x if milestones slip > 1 week |
| Zaid has little time | Blocked tasks | All Zaid tasks batched, with exact steps, in `docs/ZAID.md` |
| Supabase cost or limits | Budget | Project in the Pro organization (no pause, 8 GB); raw-data pruning keeps growth around 1 GB/year |
| Next.js on Workers limits (bundle size, CPU) | Deploy problems | Workers paid plan; keep pages server-light; ISR |

## 14. Operating model

- **CLOUD session:** main builder. Works the backlog top-down, one PR per task, merges on green CI.
- **LOCAL session:** on Zaid's PC. Takes LOCAL tasks (checkout audit with Claude in Chrome, Windows setup, real-device QA, account dashboards with Zaid present).
- **Zaid:** ZAID tasks only (accounts, payments, identity, trademark, content, final legal read), ~1–3 h/week. A 15-minute review every Sunday: read the weekly summary issue, clear blockers.
- **On Pro:** one session at a time, CLOUD by default. On Max 5x: CLOUD and LOCAL in parallel, in different areas (LOCAL never edits the same files as an open CLOUD PR).

### Start prompts (copy-paste)

**CLOUD session** (claude.ai → Code → new session with repo `zaidg7/tidaq`):
> You are the Tidaq CLOUD build session. Read CLAUDE.md and follow its session protocol exactly. Work through docs/TASKS.md top-down: take the next TODO task owned by CLOUD whose dependencies are DONE and that has no open PR. One PR per task, tests included, merge yourself when CI is green. Continue with the next task until you run low on usage or only blocked tasks remain. Log anything you need from me in docs/BLOCKERS.md with exact steps. Don't ask me questions in chat unless something is truly impossible without me.

**LOCAL session** (Claude Code on the PC, in the cloned `tidaq` folder):
> You are the Tidaq LOCAL session on my Windows 11 PC. Read CLAUDE.md and follow its session protocol. Take the next TODO task owned by LOCAL. If none is open, take a CLOUD task marked parallel-safe that has no open PR. Never make bookings or enter payment or personal data on any website. Log anything you need from me in docs/BLOCKERS.md.

**Weekly check (Zaid, Sundays):** open the newest "Weekly summary" issue on GitHub, do the listed Zaid steps, close the issue.
