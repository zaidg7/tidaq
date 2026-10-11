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

## Development

_Filled in by task C-001._
