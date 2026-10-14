# Tidaq

**Tidaq shows how the price of your luxury hotel stay is moving, whether now is a low or a high, and which booking site really charges at checkout what it shows.**

Five-star hotels in DACH and top European cities · German first, English second · tidaq.com

## Where to start

| You are | Read |
|---|---|
| A Claude session (CLOUD or LOCAL) | [`CLAUDE.md`](CLAUDE.md), then [`docs/TASKS.md`](docs/TASKS.md) |
| Zaid | [`docs/ZAID.md`](docs/ZAID.md) (your to-do list) and the PDF [`docs/Tidaq-Build-Plan.pdf`](docs/Tidaq-Build-Plan.pdf) |

## Docs

- [`docs/PLAN.md`](docs/PLAN.md): product, architecture, data model, methods, legal, risks
- [`docs/TASKS.md`](docs/TASKS.md): backlog with acceptance criteria (the work queue)
- [`docs/DECISIONS.md`](docs/DECISIONS.md): locked decisions
- [`docs/DESIGN.md`](docs/DESIGN.md) + [`docs/design/reference-homepage.html`](docs/design/reference-homepage.html): Soft Modern design system
- [`docs/BLOCKERS.md`](docs/BLOCKERS.md): what the sessions need from Zaid
- [`docs/progress/`](docs/progress/): weekly summaries
- [`docs/research/`](docs/research/): spike reports (DataForSEO etc.)

## Stack

Next.js (App Router) on Cloudflare Workers via OpenNext · Cloudflare Worker + Cron for data collection · Supabase Postgres (Frankfurt) · DataForSEO Google Hotels API · Resend · TypeScript, pnpm, Tailwind, next-intl, Vitest, Playwright.

## Quick start for sessions

- Cloud sessions run `.claude/hooks/session-start.sh` on start: it installs dependencies with `pnpm install --frozen-lockfile` when `node_modules` is missing or the lockfile changed. `pnpm test` works right away.
- LOCAL (Windows) skips the hook; run `pnpm install` once after cloning or pulling.
- `.claude/settings.json` pre-approves routine commands (pnpm scripts, read-only git, Playwright/Vitest) so sessions ask fewer permission questions.
- Then follow `CLAUDE.md` §2 (session protocol).

## Development

Requirements: Node 22 (`.nvmrc`) and pnpm 10 (`corepack enable` picks the version from `package.json`).

```
pnpm install            # install all workspaces
pnpm lint               # ESLint in every package + Prettier check
pnpm typecheck          # tsc --noEmit in every package
pnpm test               # Vitest (packages/core with coverage, collector)
pnpm build              # next build (web) + wrangler dry-run bundle (collector)
pnpm e2e                # Playwright smoke tests against `next start` (run `pnpm build` first)
pnpm format             # Prettier write
```

Run the apps:

```
pnpm --filter web dev           # Next.js dev server on http://localhost:3000
pnpm --filter web preview       # OpenNext build + local Cloudflare Worker (the real runtime)
pnpm --filter collector dev     # collector worker on http://localhost:8787 (GET /health)
```

Layout: `apps/web` (Next.js on Cloudflare Workers via OpenNext), `apps/collector` (Cloudflare Worker with cron triggers), `packages/core` (shared TypeScript: formatting, dates, zod schemas, later stats and trust score). `@tidaq/core` is consumed as TypeScript source; no separate build step.

### Hotel catalog

The tracked hotels live in `public.hotels` (source: `scripts/catalog/`). To add or replace a hotel:

1. Add `{ "city": "<city slug>", "name": "<official name>" }` to `scripts/catalog/seed.json`.
2. `NODE_USE_ENV_PROXY=1 node scripts/catalog/resolve.ts post`, then `… resolve.ts get` after 1–5 minutes. Each search costs $0.0008; the script caps paid tasks.
   - Searches use the hotel's own country as location. With location Germany, DataForSEO appends "Germany" to the keyword and finds nothing for hotels abroad.
   - If an exact-name search returns nothing, `post-cities` searches "5-star hotels in <city>" and matches against that list.
3. Check `scripts/catalog/resolved.json` (match score, distance to the city centre, Google's title).
4. `node scripts/catalog/to-sql.ts` prints an idempotent upsert. Apply it as a migration (see Database) and save it under the recorded version.
5. New hotels start active unless listed in `INACTIVE` in `to-sql.ts`. Budget: 36 active hotels × 8 stays ≈ 290 tasks/day (D-13).
6. Photos: push a change to `scripts/catalog/photos.ts` (or run Actions → **Catalog photos**). It looks up licensed Wikimedia Commons images on a GitHub runner (Wikimedia blocks the cloud sessions' IP) and prints `photos.json` in the job log. Save it to `scripts/catalog/photos.json`, run `node scripts/catalog/photos-sql.ts` and apply the output as a migration. Reject a bad photo by adding the hotel to `REJECTED` in `photos.ts`.

### Collector (prices)

- **Price source** (`PRICE_SOURCE`, D-41): `xotelo` (free, current) or `dataforseo` (paid fallback, needs balance). With Xotelo the morning run only queues jobs (`collector_tasks` with ids `xo-<run>-<stay>`, cost 0, still limited by `DAILY_TASK_CAP`), and each collect run calls Xotelo for up to `COLLECT_BATCH` of them, 400 ms apart. Rates go through the same normalization, aliases and pending providers as DataForSEO results. `price_snapshots.source` records the API; `stay_daily` for a stay is built from the source of its newest snapshot only, so a switch never mixes the two. Hotels need `hotels.xotelo_key`. The DataForSEO notes below apply when `PRICE_SOURCE=dataforseo`.
- **Morning run** (05:00 UTC cron in production): refresh the stay grid for active hotels → deactivate past stays → budget guard → post one DataForSEO Hotel Info task per stay (by `hotel_identifier`, `tag` = stay id) → log the run in `collector_runs` and each task in `collector_tasks`.
- **Budget guard** (`packages/core/src/budget.ts`): at most `DAILY_TASK_CAP` tasks per UTC day and `MONTHLY_BUDGET_USD` per month at $0.0008 per task. Staging and production share the database, so both count against the same cap. When the cap cuts, watched stays go first, then the nearest check-in. The reason is stored in `collector_runs.budget_reason`.
- **Manual run:** Actions → **Collector run** → Run workflow → target `staging` (cap 50) or `production`, action `post`. It calls `POST /run` with a token derived from `SUPABASE_SERVICE_ROLE_KEY`; the job summary shows the run summary. Every manual run spends real money (up to the cap × $0.0008).
- **Requested stays** (C-022c1): the public site creates stays only through the SQL function `request_stay(hotel_slug, check_in, check_out, adults)` (anon may execute it; returns `tracked`, `created`, `full` or `invalid`). It validates the dates (check-in from today, ≤ 30 nights, check-out ≤ 365 days ahead, 1–4 adults, active hotel with a price-source id) and only adds a stay (origin `watch`) while the active stays are below the cap the last production posting run recorded (`collector_runs.daily_cap`, so it follows `DAILY_TASK_CAP`) and fewer than 30 were requested that German day. Each collect run first queues requested stays that never had a task (run kind `request`, same budget guard), so they have prices within ~10 minutes.
- **Collect runs** (every 10 min, all day, in production): ask `tasks_ready` which results are done, fetch up to `COLLECT_BATCH` (30) with `task_get` (both free), keep eligible offers, then write everything with one SQL call (`collector_ingest`): `price_snapshots`, new pending providers, task statuses, `stay_daily` for the touched days. Then `stay_stats` is recomputed for those stays. A run with nothing to do writes no `collector_runs` row (idle cost: two queries).
- **Manual collect:** Actions → **Collector run** → action `collect` (free; also queues waiting requested stays first). On staging there are no crons, so after a manual `post` run wait ~5 minutes and run `collect` (repeat while tasks are open; each call fetches 30).
- **Admin emails** (Resend, from `collector@tidaq.com` to `ADMIN_EMAILS`): a posting run with errors or a crash, the month passing 80 % of `MONTHLY_BUDGET_USD`, and the **daily check** at 07:55 UTC (production), which also prunes raw JSON older than 30 days (D-19) and reports today's errors, unfinished runs and tasks without results. No email on a good day.

### Deploys (Cloudflare Workers)

| Environment | Web | Collector | When |
|---|---|---|---|
| Staging | `tidaq-web-staging` on workers.dev (URL in the job summary) | `tidaq-collector-staging`, **no crons** (manual runs only) | Automatically after CI is green on every push to `main` (job "Deploy staging" in `ci.yml`) |
| Production | `tidaq-web` on **tidaq.com** (+ `www.tidaq.com` → 308 to `tidaq.com`) | `tidaq-collector` with the 05:00/17:00 UTC posting crons, collect every 10 min, 07:55 daily check | Push a tag `v*`, or Actions → Deploy → Run workflow → target `production` |

- Everything runs in `.github/workflows/deploy.yml`: deploy collector, push its secrets, collector `/health` check, OpenNext build, deploy web, push its secrets, smoke test (`/` and `/en` must answer).
- **Collector only:** Actions → Deploy → Run workflow → tick **collector_only**. Updates the collector (e.g. a new price source) and leaves the website untouched, so tidaq.com keeps its "kommt bald" page until launch.
- Worker secrets come from GitHub secrets through `wrangler secret bulk` (`scripts/deploy/secrets-json.mjs` skips unset ones). Never deploy from a laptop: there is no `deploy` script on purpose.
- Config per environment lives in each app's `wrangler.jsonc` (top level = production, `env.staging` = staging). Staging uses `DAILY_TASK_CAP=50` and `ALERTS_DRY_RUN=true`; production keeps `ALERTS_DRY_RUN=true` until C-031.

### Database (Supabase)

- Hosted project `tidaq` (ref `kaxcnrfpgpktzrfibpzg`, Frankfurt) in Zaid's Pro organization. The schema lives in `supabase/migrations/` and nowhere else.
- **How migrations are applied:** with the Supabase MCP tool `apply_migration` from a Claude session (no database password or access token is needed). The tool records its own version timestamp, so after applying, the file in `supabase/migrations/` is named `<recorded version>_<name>.sql` (check with `list_migrations`). That keeps the files compatible with `supabase db push` if CI applies migrations later.
- **New migration:** write the SQL, apply it with `apply_migration`, save it under the recorded version, regenerate types (below), run `supabase/tests/rls_check.sql` with `execute_sql` (every column must be `true`) and check `get_advisors` (security).
- **Types:** `packages/core/src/db.types.ts` is generated by the Supabase MCP tool `generate_typescript_types`. Don't edit it by hand. Friendly row types are in `packages/core/src/db.ts`.
- **Public access:** RLS is on for every table. The anon key can read the catalog (`cities`, `hotels`, `providers`), price data (`tracked_stays`, `stay_daily`, `stay_stats`, `provider_scores`) and the views `v_stay_public`, `v_hotel_calendar`. Everything with emails, tests, runs or events is service-role only.
