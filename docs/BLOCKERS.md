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

## B-004 · Delete two old DNS records so tidaq.com can show the site
Status: OPEN · Opened: 2026-10-12 by CLOUD · Blocks: C-005 (production on tidaq.com), later C-044 (go live)
What I need: the old placeholder records for `tidaq.com` and `www` removed in Cloudflare DNS. They point to a dead server (tidaq.com shows "Error 522"), and Cloudflare won't connect our website to a name that already has such a record. Staging works already: https://tidaq-web-staging.tidaq.workers.dev
Steps for Zaid (≈ 3 min):
1. Open dash.cloudflare.com and choose the account **tidaq**, then the domain **tidaq.com**.
2. Left menu: **DNS → Records**.
3. Delete only the records whose **Type is A, AAAA or CNAME** and whose **Name is `tidaq.com` (or `@`) or `www`**. Click the record → **Delete**. Usually that's 2 records (often Namecheap leftovers like `parkingpage.namecheap.com` or an IP address).
4. Don't touch **TXT** or **MX** records or anything with `resend`, `_domainkey`, `send` or `_dmarc` in the name: those are for email.
5. Done. Change this Status to DONE or tell the session "DNS cleaned". The session re-runs the production deploy, which creates the right records itself.
Where to put the result: nothing.

## B-003 · Top up DataForSEO with $50
Status: OPEN · Opened: 2026-10-12 by CLOUD · Blocks: C-013 (daily data collection)
What I need: the $50 minimum top-up at DataForSEO. The spike worked (report: `docs/research/dataforseo.md`, cost $0.0136). The $0.98 left lasts only ~4 days of daily collection.
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
