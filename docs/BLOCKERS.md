# Blockers

Things the sessions need from Zaid. Newest on top. Zaid: do the steps, then change **Status** to `DONE` (or reply in the weekly issue). Sessions: never ask for keys or passwords here; say where to store them.

Format:

```
## B-NNN · <short title>
Status: OPEN | DONE · Opened: YYYY-MM-DD by CLOUD/LOCAL · Blocks: <task IDs>
What I need: <one sentence>
Steps for Zaid (≈ N min):
1. …
2. …
Where to put the result: <GitHub secret name / reply in issue / nothing>
```

---

## B-009 · Decision: daily price-check limit 400 → 500 (free source)

Status: OPEN · Opened: 2026-10-14 by CLOUD · Blocks: C-022c gets only ~4 slots until then (feature works, just tiny)
What I need: a yes or no. Visitors will be able to ask us to track their own dates (C-022c). Each tracked stay costs one price check per day, and the daily limit (`DAILY_TASK_CAP`, D-13) is 400. Our fixed dates already use 396, so only ~4 visitor requests fit. Since 14 Oct the prices come from the free source (Xotelo), so 100 more checks cost **$0**. If we ever switch back to the paid source, the monthly limit ($12, unchanged) still stops spending, as it does today.
My recommendation: **yes, 500.** Room for ~100 visitor-requested stays at a time; the fixed dates keep their place (visitor requests are only accepted while there's room).
Steps for Zaid (≈ 1 min):

1. Reply "B-009 yes" or "B-009 no" in the chat or the weekly issue. I change the setting and D-13.
   Where to put the result: nothing else.

## B-008 · GitHub Actions minutes: optional safety budget

Status: OPEN · Opened: 2026-10-13 by CLOUD · Blocks: nothing yet. If the 2,000 free minutes run out before 1 Nov, CI stops and no PR can be merged until then.
What I need: a decision. CI now uses far fewer minutes (C-002b), and I'm pacing the work, so we should land under the limit. If you want a safety net: extra minutes cost less than 1 cent each, so a $5 cap buys at least 600 minutes. Don't set a $0 budget: that stops CI completely at the limit.
Steps for Zaid (≈ 2 min, optional):

1. github.com → your profile picture → **Settings** → **Billing and licensing** → **Budgets and alerts**.
2. **New budget** → product **Actions** → amount **$5** → turn on **Stop usage when budget limit is reached** → Create.
   Where to put the result: nothing. Change this Status to DONE (or tell the session "budget set" or "no budget").

## B-007 · Turn on the admin login (Supabase settings + email via Resend)

Status: OPEN · Opened: 2026-10-13 by CLOUD · Blocks: using `/admin` (C-016 data health, C-032 checkout audit tool). Building them is not blocked.
What I need: two settings in the Supabase dashboard so the login link can reach you and bring you back to tidaq.com. The code is done; without these the link either never arrives or lands on the wrong address.
Steps for Zaid (≈ 6 min):

1. Open supabase.com/dashboard → project **tidaq** → **Authentication** → **URL Configuration**.
   - **Site URL:** `https://tidaq.com` → Save.
   - **Redirect URLs → Add URL**, one at a time:
     `https://tidaq.com/admin/auth/callback`
     `https://tidaq-web-staging.tidaq.workers.dev/admin/auth/callback`
     `http://localhost:3000/admin/auth/callback`
2. Open resend.com → **API Keys** → **Create API key**. Name `supabase-auth`, permission **Sending access**, domain **tidaq.com** → Create → copy the key. Don't paste it anywhere except the next step.
3. Back in Supabase → **Authentication** → **Emails** → **SMTP Settings** → turn on **Enable custom SMTP**:
   - Sender email `login@tidaq.com`, sender name `Tidaq`
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the key from step 2 → Save.
4. Test (after the C-020c PR is merged and staging has deployed): open https://tidaq-web-staging.tidaq.workers.dev/admin, enter `zaidghazal216@gmail.com`, then click the link in the email **in the same browser**. You should see "Übersicht" and "Angemeldet als …".
   Where to put the result: nothing. Change this Status to DONE (or tell the session "admin login works"). If you want a different admin email, tell the session which one.

## B-006 · Decision: raise the daily task cap from 300 to 400

Status: DONE – yes (12 Oct 2026, cap 400 in `wrangler.jsonc`, D-13 updated) · Opened: 2026-10-12 by CLOUD · Blocks: nothing today (the guard keeps spending safe); affects data for the December special dates
What I need: a yes or no. D-13 assumed 8 stays per hotel (36 × 8 ≈ 290 tasks/day, cap 300). The grid also tracks the special dates (first two December weekends, New Year's Eve), so today it's **11 stays per hotel = 396 tasks/day**. With cap 300 the budget guard drops the stays furthest away, and those are exactly the December specials. They would only start collecting history in late November.
My recommendation: **yes, cap 400.** Cost: max 400 × $0.0008 × 31 days ≈ **$9.90/month** instead of ~$7. That is still under the existing monthly limit (`MONTHLY_BUDGET_USD` = $12), which stays as the hard stop, and well inside the €50 budget.
Steps for Zaid (≈ 1 min):

1. Change this Status to `DONE – yes` or `DONE – no` (or tell the session "cap 400 ok").
   Where to put the result: nothing. The session changes `DAILY_TASK_CAP` in `apps/collector/wrangler.jsonc` and updates D-13.

## B-005 · DataForSEO paused the account ("unusual activity")

Status: DONE (12 Oct 2026: Zaid wrote to support; the account worked again at 21:11 UTC, staging posted 50 tasks) · Opened: 2026-10-12 by CLOUD · Blocks: C-013b live check, all daily price collection
What I need: DataForSEO support to re-enable the account. On 12 Oct 2026 at 20:48 UTC the first staging collector run got error `40201`: "We noticed some unusual activity in your DataForSEO account, so we've temporarily paused access as a precaution. Please reach out to support@dataforseo.com." Nothing was charged; the balance is still $0.9256. Reading results still works, only new price requests are blocked. Probably triggered because requests now come from Cloudflare's servers (our collector) in addition to the development environment.
Steps for Zaid (≈ 5 min):

1. From the email address you used for DataForSEO, write to **support@dataforseo.com** (or use the live chat on app.dataforseo.com).
2. Text you can use (English):
   > Hi, my account got error 40201 ("unusual activity") on 12 Oct 2026 around 20:48 UTC. I'm building tidaq.com, a price tracker for hotel stays. Requests come from my Cloudflare Worker (scheduled job, Google Hotel Info, standard queue, about 300–400 tasks per day) and from my development environment. Could you please re-enable the account? I'm planning to top up $50 once it works again. Thanks, Zaid Ghazal
3. When they reply that it's unlocked, change this Status to DONE (or tell the session "DataForSEO unlocked"). Do the $50 top-up (B-003) after that, not before.
   Where to put the result: nothing.

## B-004 · Delete two old DNS records so tidaq.com can show the site

Status: DONE (12 Oct 2026: Zaid deleted the A and www CNAME records; production deploy 21:14 UTC; tidaq.com and /en answer 200, www → 308) · Opened: 2026-10-12 by CLOUD · Blocks: C-005 (production on tidaq.com), later C-044 (go live)
What I need: the old placeholder records for `tidaq.com` and `www` removed in Cloudflare DNS. They point to a dead server (tidaq.com shows "Error 522"), and Cloudflare won't connect our website to a name that already has such a record. Staging works already: https://tidaq-web-staging.tidaq.workers.dev
Steps for Zaid (≈ 3 min):

1. Open dash.cloudflare.com and choose the account **tidaq**, then the domain **tidaq.com**.
2. Left menu: **DNS → Records**.
3. Delete only the records whose **Type is A, AAAA or CNAME** and whose **Name is `tidaq.com` (or `@`) or `www`**. Click the record → **Delete**. Usually that's 2 records (often Namecheap leftovers like `parkingpage.namecheap.com` or an IP address).
4. Don't touch **TXT** or **MX** records or anything with `resend`, `_domainkey`, `send` or `_dmarc` in the name: those are for email.
5. Done. Change this Status to DONE or tell the session "DNS cleaned". The session re-runs the production deploy, which creates the right records itself.
   Where to put the result: nothing.

## B-003 · Top up DataForSEO with $50

Status: NOT NEEDED for now (13 Oct: Zaid chose the free source Xotelo, D-41 / C-013g; keep this as the fallback if Xotelo stops working) · Opened: 2026-10-12 by CLOUD · Blocks: nothing while Xotelo works
What I need: the $50 minimum top-up at DataForSEO. The data works end to end (12 Oct: staging stored 756 prices for 28 hotels). About $0.88 is left: that's **~2 days** of daily collection at 400 tasks/day. When it runs out, the morning run fails and you get an error email.
Steps for Zaid (≈ 3 min):

1. Open app.dataforseo.com and log in.
2. Click **Billing** (or "Add funds") → amount **$50** → pay with your card or PayPal.
3. Done. Nothing to paste anywhere; the keys stay the same.
   Where to put the result: nothing. Change this Status to DONE (or tell the session "topped up").

## B-001 · Create the repo and give Claude access

Status: DONE · Opened: 2026-10-11 by kickoff · Blocks: everything
What I need: an empty private repo `zaidg7/tidaq` with the Claude GitHub App installed.
Steps for Zaid (≈ 5 min): see `docs/ZAID.md` → Z-01.
Where to put the result: write "repo ready" in the chat.

## B-002 · Week-1 accounts and settings

Status: DONE (12 Oct 2026) · Opened: 2026-10-11 by kickoff, updated 2026-10-12 · Blocks: C-004, C-005, C-010, C-030
Done already: repo (Z-01), trademark check clean (Z-02), tidaq.com bought at Namecheap (Z-03), Cloudflare zone active (Z-03b), Supabase project created, Resend account created.
What I still need: the DataForSEO network secret in the Claude environment (Z-06). GitHub secrets, accounts and full network access are done.
Steps for Zaid (≈ 5 min): `docs/ZAID.md` → Z-06.
Where to put the result: GitHub secrets with the exact names in Z-04/Z-05; Claude environment per Z-06.
