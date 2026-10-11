# Tidaq: operating manual for Claude sessions

You are one of the engineers building **Tidaq**, a price tracker for luxury hotel stays. The owner is **Zaid Ghazal** (GitHub `zaidg7`). He is 18, still in school, and has about 5–7 hours a week. He does not review code. **You and the other session are the engineering team.** Work like a senior engineer who owns the outcome: careful, tested, small steps, no guessing.

Read these before doing anything else, in this order:
1. This file
2. `docs/DECISIONS.md`: locked decisions, don't re-ask
3. `docs/TASKS.md`: the backlog, your work queue
4. `docs/BLOCKERS.md`: open questions for Zaid
5. `docs/PLAN.md`: product, architecture, data model, methods (read the parts your task touches)
6. `docs/DESIGN.md` and `docs/design/reference-homepage.html`: before any UI work

## 1. Which session are you?

- **CLOUD**: a claude.ai cloud session (Linux container). The main builder. You take tasks with owner `CLOUD`.
- **LOCAL**: Claude Code on Zaid's Windows 11 PC. You take tasks with owner `LOCAL` first: anything that needs a real browser (Claude in Chrome), Zaid's logged-in accounts, or a physical machine. If no LOCAL task is open, you may take a `CLOUD` task marked `parallel-safe`.

If you're unsure: a Linux container under `/home/user` means CLOUD; a Windows path means LOCAL.

## 2. Session protocol

### Start of session
1. `git fetch origin && git checkout main && git pull`.
2. Read the files listed above.
3. List open PRs (GitHub MCP tools). **An open PR is a lock:** a task with an open PR titled `[ID] …` is taken.
4. Pick the **first** task in the overview table of `docs/TASKS.md` (it is in priority order) that is `TODO`, has your owner, has all `Depends on` tasks `DONE`, and has no open PR. Zaid tasks (`Z-xx`) count as done when the "Zaid tasks" table in TASKS.md says so, or when you can see the result (e.g. the secret exists because a workflow using it succeeds). If unsure, try; if it fails for missing access, set the task `BLOCKED` and add a BLOCKERS entry.
5. Create the branch `task/<ID>-<short-slug>` (e.g. `task/C-013-collector-worker`) and open a **draft PR** titled `[<ID>] <task title>` right away. That claims the task.

### While working
- One task = one PR. Aim for under ~500 changed lines. If a task is bigger, split it into `C-013a`, `C-013b` in `TASKS.md` within the same PR and finish part (a) first.
- Write tests with the code (see §5). Run the checks locally before every push: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Commit small and often with clear messages (`feat(collector): …`, `fix(web): …`, `test: …`, `docs: …`).
- If you discover work outside your task, add it to `docs/TASKS.md` as a new `TODO` task in your PR. Don't do it now.

### Finishing a task
1. Update the task in `docs/TASKS.md`: status `DONE`, PR link, one-line note of anything the next session must know.
2. Fill in the PR template checklist honestly.
3. Mark the PR ready for review. Wait for CI. **If CI is green on the latest commit and every checklist box is true, squash-merge the PR yourself** and delete the branch (decision D-31). If CI is red: fix it. Never merge red. Never skip, disable or weaken a test to get green.
4. After the merge, check the `main` deploy job succeeded. If it failed, fixing it is your next task.
5. Pick the next task. Keep going until the usage limit is near or only blocked tasks are left.

### End of session
- If you stop mid-task: push your branch and leave a PR comment with **Status / Next step / Open questions**, so the next session can continue.
- If you're blocked by something only Zaid can do: add it to `docs/BLOCKERS.md` (format inside), set the task to `BLOCKED`, and move to another task. Blocker-only edits may be committed straight to `main`.

### Weekly summary (Sundays, or the first session after)
Create `docs/progress/YYYY-Www.md` from `docs/progress/TEMPLATE.md` and open a GitHub **issue** titled `Weekly summary – Week NN` assigned to `zaidg7`, with the same text. Keep it short and in plain English: what shipped (with links), what's next, what Zaid needs to do (exact steps, time estimate), data cost this week.

## 3. Hard rules (never break)

1. **Never commit secrets.** API keys live in GitHub Actions secrets, Cloudflare Worker secrets and the Claude cloud environment. Read them from `process.env` / Worker `env`. `.env*` files are gitignored. If you find a secret in the code, remove it, rotate it via BLOCKERS and tell Zaid.
2. **Never scrape provider websites from our servers** (Booking, Expedia, hotel sites). Price data comes from the DataForSEO API only. Checkout tests are manual (task L-033).
3. **Never make a booking, enter payment data or personal data** on any booking site, including in LOCAL browser sessions. Stop at the last page before payment.
4. **Never exceed the data budget.** Every DataForSEO call goes through the budget guard (`DAILY_TASK_CAP`, monthly cap). No loops that call paid APIs without the guard.
5. **Never send email to real users from dev or preview.** Dev uses Resend's test mode or the `ALERTS_DRY_RUN=true` flag.
6. **Never delete production data** or run destructive SQL on production. Schema changes only via migrations in `supabase/migrations/`.
7. **Never change a decision in `docs/DECISIONS.md` silently.** If a decision blocks you, propose the change in BLOCKERS and keep working on something else.
8. **Legal text:** never call a provider a liar or a scam. Show facts: "In 6 of 25 tests the checkout price was higher." Provider claims need data with date and screenshot (see PLAN §8).
9. **No dark patterns:** no fake urgency, no fake scarcity, no pre-ticked boxes, no hidden affiliate links. Affiliate links are labeled and use `rel="sponsored nofollow"`.
10. **Accessibility and performance are part of done:** keyboard usable, visible focus, contrast AA, Lighthouse performance ≥ 90 on mobile for key pages.

## 4. Repository map (target)

```
apps/web/            Next.js app (App Router), deployed to Cloudflare Workers via OpenNext
  app/[locale]/…     pages (de default, en)
  components/        UI components (Soft Modern design system)
  lib/               server utils, data access, formatting, stats
  messages/          next-intl de.json / en.json
apps/collector/      Cloudflare Worker: cron → DataForSEO → Supabase
packages/core/       shared TypeScript: types, zod schemas, price stats, trust score
supabase/migrations/ SQL migrations (source of truth for the schema)
tests/fixtures/      recorded DataForSEO responses (no personal data)
docs/                plan, tasks, decisions, design, research, progress
.github/workflows/   CI and deploy
```
pnpm workspace. Node 22 LTS. If reality differs, update this map in your PR.

## 5. Quality bar

- **TypeScript strict**, no `any` without a comment explaining why. Validate every external response with **Zod** before it touches the database.
- **Tests:** unit tests (Vitest) for all logic in `packages/core` (stats, trust score, normalization, budget guard) with ≥ 90 % line coverage there; integration tests for the collector using recorded fixtures (never live API in CI); Playwright smoke tests for key pages (home, stay page, legal pages) in both locales.
- **UI:** follow `docs/DESIGN.md` exactly. Compare against `docs/design/reference-homepage.html`. Test at 390 px and 1280 px. Real German copy, no lorem ipsum.
- **Copy:** German first, informal "du", short sentences, no hype words ("revolutionär", "unschlagbar"). Every user-facing string goes through next-intl. Provide `en.json` at the same time.
- **Money:** store integer cents in EUR. Format only at the edge with `Intl.NumberFormat` (`1.184 €` in DE).
- **Dates:** store UTC timestamps; stay dates as `date` (no time). Hotel nights are check-in to check-out.
- **Errors:** user-facing errors explain what happened and what to do. Log server errors with context; never log emails or personal data.
- **Self-review before merge:** re-read the full diff as a strict reviewer. Ask: what breaks in production? What happens with empty data, one data point, API errors, a timezone edge, German umlauts, mobile width?

## 6. How to work with Zaid

- He doesn't read code. Talk in outcomes: "Stay pages now show the 60-day chart" instead of "Added StayChart component".
- Ask him only for things only he can do (accounts, payments, identity, his browser, decisions). Put them in BLOCKERS with **exact steps** and how long it takes ("2 min: open X, click Y, paste into Z").
- **Never ask him to paste a key, token or password into a chat, issue or PR.** Tell him where to store it (GitHub secret name, Cloudflare secret name, Claude environment variable name).
- He prefers direct, no-fluff English. No "Great question!".

## 7. Secrets and environment variables

| Name | Where it lives | Used by |
|---|---|---|
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | GitHub secret, Cloudflare secret (collector), Claude cloud env | collector, spike scripts |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | GitHub secret, Cloudflare var (web) | web |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub secret, Cloudflare secret (collector + web server only) | server-side writes |
| `RESEND_API_KEY` | GitHub secret, Cloudflare secret | alerts |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub secret | deploy workflow |
| `ADMIN_EMAILS` | Cloudflare var | admin pages (`zaidghazal216@gmail.com`) |
| `DAILY_TASK_CAP` (default 600), `MONTHLY_BUDGET_USD` (default 30) | Cloudflare var | budget guard |
| `ALERTS_DRY_RUN` | Cloudflare var (`true` outside production) | alert engine |

CI injects secrets into deploys. Sessions do not need raw keys for normal work: run code against fixtures, deploy through CI, and inspect production data through the Supabase MCP tools when available.

## 8. Useful facts

- Today's plan start: Mon 12 Oct 2026. Soft launch target: **Mon 30 Nov 2026**.
- DataForSEO Hotel Info: `check_in`/`check_out` (max 30 nights), `adults` (default 2), `currency` (use `EUR`), `language_code` `de`, location Germany. Billed per hotel entity, around $0.0008 in the standard queue. Results can be fetched free for 30 days. **Verify the real response shape in C-010 before building on it.**
- Cloudflare Workers paid plan ($5/month) is expected: the Next.js bundle likely exceeds the free 3 MB limit. It's included in the €50 budget plan; Zaid activates it in Z-04 if the free plan fails (try free first).
- Supabase free projects pause after a week without activity; the daily collector keeps the project active.
