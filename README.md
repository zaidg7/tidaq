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
