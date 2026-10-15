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

## B-022 · Decision: track prices up to mid-July instead of mid-February (1 min)

Status: OPEN · Opened: 2026-10-15 by CLOUD · Blocks: C-127 (June/July in the Price Drops month filter)
What I need: a yes or no. You asked to search Price Drops in June or July. Right now we check every night of every hotel for the next **120 days** (decision D-42), so the latest month we have is February. The month filter on Price Drops already works; it simply has no June or July to show yet.
If you say yes, the collector checks **270 days** ahead (to mid-July; next spring that window moves on into August):
- Cost: €0. The price source (Xotelo) is free.
- Calls per day: about 22,400 instead of 9,960. The collector then needs ~21 hours a day instead of ~9. That fits, but leaves less room for retries.
- Risk: Xotelo has no SLA. If it starts refusing that many calls, I turn the window back down and tell you. Nothing else breaks.
- Database: grows about 2.3× faster; still far below the 8 GB of the Pro plan for a year.
My recommendation: **yes**. Summer holidays are what people plan months ahead, and that's exactly where 5- and 7-night drops are most useful.
Steps:
1. Reply "B-022 yes" (or "no") in the chat or change this Status to DONE with your answer.
   Where to put the result: nothing else. The session updates D-42 and the collector setting.

## B-020 · Pick the new symbol (2 min)

Status: DONE (15 Oct): Zaid chose **the `t` from the wordmark, black on white** (app icon, favicon, touch icon). · Opened: 2026-10-15 by CLOUD · Blocks: C-106 (navbar, browser icon, app icon)
What I need: the number of the symbol you like. Open the design canvas → board **"Icon-Ideen v2"**: 1 t-Monogramm, 2 Tür, 3 Rezeptionsglocke, 4 Schlüsselanhänger, 5 Ort mit Stern. Each is shown big, as an app icon, as a 16-pixel browser icon and next to the `tidaq` wordmark.
Steps for Zaid (≈ 2 min):

1. Open the canvas, scroll to the bottom board.
2. Reply in the chat with a number (or "none, more like X").
   Where to put the result: the chat. If you don't answer by the time C-106 starts, the session uses **1 t-Monogramm** (closest to the wordmark you liked) and you can still switch later; it's one file.

## B-021 · Recommended: ask LiteAPI whether we may show their hotel photos (3 min)

Status: OPEN · Opened: 2026-10-15 by CLOUD · Updated: 15 Oct, evening · Blocks: own photos for the last 17 hotels, galleries (C-117b)
What I need: a written yes/no from LiteAPI (Nuitee). Their hotel data has many professional photos per hotel. We may only show them with permission, because people book on other sites through our links.
Why it matters now: you want every hotel to have its own picture. 66 of 83 hotels now have a free, licensed photo (Wikimedia Commons, Flickr). For the other 17, no free photo exists anywhere: Bulgari Hotel Milano, Bulgari Resort Dubai, Capella Bangkok, Cheval Blanc Randheli, Four Seasons Abu Dhabi, Four Seasons Resort Dubai, Mandarin Oriental Bosphorus, Mandarin Oriental Jumeira, Raffles Sentosa, Rosewood Abu Dhabi, The Abu Dhabi EDITION, The Ivens, The Ritz-Carlton Maldives, The Shanghai EDITION, The Siam, St. Regis Saadiyat, Waldorf Astoria Maldives. Until then they show the city's photo, labelled "Stadtbild". One "yes" from LiteAPI fixes all 17 at once (and gives every hotel a gallery).
Steps for Zaid (≈ 3 min), as a reply in your existing B-012 support ticket:

1. Paste: `One more question: may we display the hotel images from your content API (hotel details endpoint) on our price comparison pages, with credit, when the booking itself happens on other sites through affiliate links? If yes, are there conditions (caching, attribution, size)?`
   Where to put the result: tell the session what they answered (chat or weekly issue).

## B-019 · Decision: which design direction (A Haussmann or B Clean Premium)

Status: DONE (15 Oct): **B**, with changes (Price Drops wording, thicker hero type, no 25-numbers section, no room photo, new icon). Plan: `docs/design/PREMIUM.md`. · Opened: 2026-10-15 by CLOUD · Blocks: the design overhaul (tasks get written once you pick)
What I need: your pick, plus what you'd change. The mockups are on a private canvas (link in the chat from 15 Oct, also under claude.ai → Artifacts → "Tidaq design directions"): homepage on desktop and phone, and the price-drop page on the phone, for both directions, plus three browser-icon options.
Steps for Zaid (≈ 10 min):

1. Open the canvas on your phone and on your PC. Look at the phone screens first; that's where TikTok visitors land.
2. Answer in the chat: **A**, **B**, or a mix (e.g. "B layout with A's arched photos"). Name the icon you like.
3. Optional: click any spot on the canvas and leave a comment ("too much text here", "love this").
   Where to put the result: reply in the chat or change this Status to DONE with your pick.

## B-018 · Paste the new login email into Supabase (3 min)

Status: OPEN · Opened: 2026-10-15 by CLOUD · Blocks: nothing (only the look of your admin login email)
What I need: the new design for the login email you get for /admin. Supabase sends it, so the template has to be pasted in its dashboard (I can't reach that setting).
Steps for Zaid (≈ 3 min, after the C-083 PR is merged):

1. Open github.com/zaidg7/tidaq/blob/main/docs/email/supabase-login.html → click **Raw** → select all (Ctrl+A) → copy (Ctrl+C).
2. supabase.com/dashboard → project **tidaq** → **Authentication** → **Emails** → **Templates** → **Magic Link**.
3. **Subject:** `Dein Login-Link für Tidaq`. **Message body:** delete everything, paste (Ctrl+V) → **Save**.
4. Test: open tidaq.com/admin and ask for a login link. The email should look like the price-drop emails.
   Where to put the result: nothing. Change this Status to DONE.

## B-017 · Decision: Cloudflare Workers Paid ($5/month) for share images with today's price

Status: DONE – not needed (15 Oct): Zaid would pay only if there's no free way. There is one: a Supabase Edge Function on the Pro plan we already pay for (2 s CPU per call, 2 M calls a month included) draws the images, so the web Worker stays on the free plan. C-028c is built that way. · Opened: 2026-10-14 by CLOUD · Blocks: nothing now
What I need: a yes or no. When someone shares a link to a price drop or a stay page (WhatsApp, Instagram DM, iMessage, X), the preview could be an image with the hotel, **"−33 %"**, today's price against yesterday's and a small price chart, instead of just the hotel photo. Drawing such an image takes about 0.1–0.5 seconds of computing. The free Cloudflare plan allows 0.01 seconds per request, so it only works on the paid plan ($5 a month, already in the €50 budget plan as Z-04). The in-browser story images (C-080b) work without it; this is only about link previews.
My recommendation (updated 15 Oct): **yes, before launch.** Price drops are now our main sharing feature (`/preissturz`), and most sharing in Germany happens as WhatsApp links, where the preview image is all people see. A "−33 %" preview gets far more clicks than a hotel photo. If you'd rather wait, nothing breaks: previews keep showing the photo.
Steps for Zaid if yes (≈ 3 min):

1. dash.cloudflare.com → account **tidaq** → **Workers & Pages** → **Plans** → **Workers Paid** → subscribe.
   Where to put the result: change this Status to DONE ("paid plan active"); the next session builds C-028c.

## B-016 · Turnstile keys for the price-alert form (bot protection)

Status: DONE (15 Oct: Zaid stored `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` as GitHub secrets) · Opened: 2026-10-14 by CLOUD · Blocks: nothing now (C-030c can start)
What I need: a free Cloudflare Turnstile widget, so bots can't use our form to send emails to strangers.
Steps for Zaid (≈ 4 min):

1. dash.cloudflare.com → account **tidaq** → **Turnstile** → **Add widget**.
2. Name `tidaq-watch`, hostnames `tidaq.com` and `tidaq-web-staging.tidaq.workers.dev`, mode **Managed**, pre-clearance **No** → Create.
3. You see a **Site Key** and a **Secret Key**. Store them as GitHub secrets (repo tidaq → Settings → Secrets and variables → Actions → New repository secret): `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Never paste them in a chat or issue.
   Where to put the result: the two GitHub secrets, then change this Status to DONE.

## B-015 · Turn on Cloudflare Web Analytics (cookieless visitor numbers)

Status: DONE (15 Oct: Zaid added the site; automatic setup wasn't offered, so Cloudflare gave a script snippet. Its token is public by design (it's in every page's HTML). The session adds the snippet to the site, production only: C-082) · Opened: 2026-10-14 by CLOUD · Blocks: nothing now
What I need: one switch in your Cloudflare account. It counts visits without cookies (decision D-15), so no cookie banner is needed. The privacy page already describes it.
Steps for Zaid (≈ 3 min):

1. dash.cloudflare.com → account **tidaq** → **Analytics & Logs** → **Web Analytics** → **Add a site**.
2. Choose the domain **tidaq.com** (it's already on Cloudflare) and pick **Enable automatic setup** (Cloudflare adds the small script itself; no code change).
3. Leave "Exclude EU visitors" off and don't enable anything that mentions cookies or session replay.
   Where to put the result: nothing. Change this Status to DONE. The numbers appear in the same Web Analytics screen; the weekly summary will quote them.

## B-014 · Read the legal pages once, sign the Supabase data agreement (Z-12)

Status: DONE (14 Oct: Zaid read the pages and signed the Supabase DPA; no USt-IdNr. assumed, so the Impressum stays as is) · Opened: 2026-10-14 by CLOUD · Blocks: nothing now
What I need: you read the five legal pages once and answer two questions. Not legal advice from me: the texts follow PLAN §11 and describe what Tidaq really does today.
Steps for Zaid (≈ 20 min, any time before launch on 30 Nov):

1. Open the staging site (link in the newest weekly summary) and read **/impressum**, **/datenschutz**, **/affiliate-hinweis**, **/ranking** and **/methodik**. Anything wrong or unclear? Write it in the weekly issue.
2. **USt-IdNr.:** do you have a VAT ID (USt-IdNr., starts with `DE`)? If yes, it must be in the Impressum; if no, nothing to do. (A plain Steuernummer does not belong in the Impressum, so I left that line out.)
3. **Supabase data agreement (AVV/DPA):** supabase.com → your **Pro organization** → **Settings** → **Legal documents** → **DPA** → request/sign it with your name. Cloudflare's and Resend's agreements are part of their terms; nothing to sign.
   Where to put the result: reply in the weekly issue ("legal read, no USt-IdNr, DPA signed"), then change this Status to DONE.

## B-013 · Decision: $50 DataForSEO top-up to bring back CHECK24, HolidayCheck, TUI

Status: OPEN · Opened: 2026-10-14 by CLOUD · Blocks: C-076
**Update 15 Oct, Zaid asked: "Is $50 enough for 5 months of ALL five-star hotels?"** Not at today's depth. One check = one hotel × one stay × $0.0008. Today: 83 hotels × 4 real stay checks a day ≈ $8 a month → $50 lasts ~6 months. All five-star hotels in the 25 cities (D-43; estimate 500–700) × 4 checks ≈ $50–65 a month → less than a month (and the $12 monthly guard would stop it after ~6 days). With **1 check per hotel a day plus the stays visitors open or watch** it's ≈ $12–17 a month → **~3–4 months**. CHECK24 for every night of every hotel (like the free night grid) would cost several hundred dollars a month: not possible. Recommendation: top up $50 around **20 Nov** (just before launch) and run 1 check per hotel a day; the free night grid keeps covering every date.
**Update 15 Oct, Zaid asked for a cheaper way, even short-term for a traffic test:** $50 is DataForSEO's smallest top-up, so the payment can't be smaller; only how fast it's used can change. Cheapest options: (1) **$0: no top-up for the traffic test.** Prices from Booking, Expedia, Agoda, Trip.com and hotel sites keep coming free (Xotelo); only CHECK24/HolidayCheck/TUI are missing. A test tells us whether people come and share; it doesn't need CHECK24. (2) **$50, on demand only:** check German platforms only for the stays visitors open or watch (≈ 50–200 a day at launch ≈ $1–5 a month), so the $50 lasts many months. (3) The fixed daily checks from the table above come later, once traffic justifies them. Recommendation: **(1) now**, and decide on (2) after 2–3 weeks of real traffic data.
What I need: a yes or no. Our free source (Tripadvisor via Xotelo) doesn't show German platforms. CHECK24, HolidayCheck and TUI only come through Google Hotels (DataForSEO), which we used until 13 Oct. Research (C-073, `docs/research/german-platforms.md`): none of these platforms offers us a price API; Google Hotels is the only legal way.
Cost: about **$9.60 a month** (≈ 400 real stay checks a day × $0.0008). The minimum top-up is **$50, which lasts about 5 months**. The monthly limit of $12 (D-13) still applies and stops spending automatically. The free night grid stays as it is.
My recommendation: **yes**, once there's a launch date in sight (German users will look for CHECK24 first). If money is tight, it can wait until shortly before launch (30 Nov); nothing else depends on it.
Steps for Zaid (≈ 5 min, only if yes):

1. Log in at **app.dataforseo.com** → **Billing** / **Add funds** → **$50** → pay.
2. Tell the session "B-013 yes, topped up".
   Where to put the result: the chat or the weekly issue. Change this Status to DONE.

## B-012 · Ask LiteAPI (Nuitee) two questions in writing

Status: OPEN · Opened: 2026-10-14 by CLOUD · Blocks: C-074, C-075 (prices per guest count, room and board, D-43)
**Update 15 Oct (the support form asks for "Environment" and "Priority"):** choose **Sandbox** (that's the key we use) and **Low** (a question before going live, not an outage) → Continue. Subject: `Usage questions before going live: search volume, storing rates, production key`. Description: the text in step 1 below, as it is.
What I need: written answers from LiteAPI. The test (C-072, `docs/research/liteapi.md`) works: one search gives every room type and board (room only, breakfast, half board) for any guest count, close to market prices. Before we run it daily we need their OK, because we compare prices and rarely book. It has to come from your account.
Steps for Zaid (≈ 5 min):

1. Log in at **dashboard.liteapi.travel** → open the support chat (or the help/contact page) and send this text:

   > Hi, I'm building Tidaq (tidaq.com), a price tracker for luxury hotel stays. I use the LiteAPI sandbox key on my account. Before going further: (1) We would search rates for about 700 to 5,000 hotel/date combinations a day to track how prices change, and send users to book. What search volume or look-to-book ratio is acceptable on your free plan? (2) May we store the rates we receive over time and show the price history (charts) to our visitors, naming LiteAPI as the source? (3) Does the sandbox return the same rates as production, and what do we need for a production key? Thanks, Zaid Ghazal

2. When they answer, paste the answer (no keys) in the chat with the session or in the weekly issue.
   Where to put the result: the chat or the weekly issue. Change this Status to DONE.

## B-011 · GitHub Actions stopped: no CI, no merges, no deploys

Status: DONE (14 Oct, 18:30: Zaid set the $5 Actions budget; CI runs again, C-002c, C-071a and C-071c merged, collector deployed) · Opened: 2026-10-14 by CLOUD · Blocks: nothing now
Update 14 Oct, 17:20: Zaid confirmed the limit (2,000 of 2,000 minutes used; reset on 1 Nov) and asked not to spend much. C-002c cuts the cost of each merged change from ≈ 10 to ≈ 6 minutes. With a **$5 budget and "Stop usage" on**, GitHub can never charge more than $5, and at ≈ 6 minutes ($0.05) per change the expected bill until 1 Nov is **about $2–3**. Without a budget nothing can be merged or deployed until 1 Nov (18 days).
What I need: GitHub Actions running again. Since 14:16 UTC on 14 Oct every workflow (CI, Catalog photos) fails within 3 seconds without a runner. That is what GitHub does when the account's free Actions minutes (2,000 a month for private repos) are used up or billing blocks them. The site and the data collection keep running; only code changes are stuck.
Steps for Zaid (≈ 3 min):

1. github.com → your profile picture → **Settings** → **Billing and licensing** → **Usage**: check that Actions minutes are at the limit (if they're not, tell the session; then it's something else).
2. **Budgets and alerts** → **New budget** (or edit the Actions budget) → product **Actions** → amount **$5** → keep **Stop usage when budget limit is reached** on → Create. GitHub may ask for a payment method; extra Linux minutes cost $0.008 each, so $5 ≈ 600 minutes, enough until the free minutes reset on 1 Nov.
   Where to put the result: nothing. Tell the session "budget set" (or change this Status to DONE). The session re-runs CI and merges the waiting PRs.

Alternative without paying: make the repo **public** (Settings → General → Danger zone → Change visibility). Public repos get unlimited free Actions minutes. Secrets stay secret (they live in GitHub/Cloudflare settings, not in the code), but anyone could read and copy the code. My recommendation: the $5 budget.

## B-010 · Free LiteAPI sandbox key (room types, breakfast, half board)

Status: DONE (14 Oct: GitHub secret `LITEAPI_KEY` and the cloud network secret for `api.liteapi.travel` work; a test call returned 200) · Opened: 2026-10-14 by CLOUD · Blocks: C-072 (room/board/occupancy data, D-43)
What I need: a free LiteAPI sandbox key, stored as a secret. It has to be your account. No credit card, no cost.
Steps for Zaid (≈ 5 min):

1. Go to **liteapi.travel**, then **Sign up** (your email).
2. In the dashboard, open **API keys** and copy the **sandbox** key (it starts with `sand_`).
3. Store it in **two** places (never in chat):
   - GitHub: repo **tidaq** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, name `LITEAPI_KEY`.
   - Claude cloud environment: the environment menu in the session's title bar → **Edit** → **Network secrets** (or **API credentials**) for host `api.liteapi.travel`, header `X-API-Key`. If that section isn't offered, add it as an environment variable named `LITEAPI_KEY` instead. A new session picks it up.
   Where to put the result: those two places, then change this Status to DONE.

## B-009 · Decision: daily price-check limit 400 → 500 (free source)

Status: DONE – superseded by D-42 (14 Oct): history now comes from single nights, so visitor requests no longer need cap room. No answer needed. · Opened: 2026-10-14 by CLOUD
What I need: a yes or no. Visitors will be able to ask us to track their own dates (C-022c). Each tracked stay costs one price check per day, and the daily limit (`DAILY_TASK_CAP`, D-13) is 400. Our fixed dates already use 396, so only ~4 visitor requests fit. Since 14 Oct the prices come from the free source (Xotelo), so 100 more checks cost **$0**. If we ever switch back to the paid source, the monthly limit ($12, unchanged) still stops spending, as it does today.
My recommendation: **yes, 500.** Room for ~100 visitor-requested stays at a time; the fixed dates keep their place (visitor requests are only accepted while there's room).
Steps for Zaid (≈ 1 min):

1. Reply "B-009 yes" or "B-009 no" in the chat or the weekly issue. I change the setting and D-13.
   Where to put the result: nothing else.

## B-008 · GitHub Actions minutes: optional safety budget

Status: DONE ($5 Actions budget set, see B-011) · Opened: 2026-10-13 by CLOUD · Blocks: see B-011. If the 2,000 free minutes run out before 1 Nov, CI stops and no PR can be merged until then.
What I need: a decision. CI now uses far fewer minutes (C-002b), and I'm pacing the work, so we should land under the limit. If you want a safety net: extra minutes cost less than 1 cent each, so a $5 cap buys at least 600 minutes. Don't set a $0 budget: that stops CI completely at the limit.
Steps for Zaid (≈ 2 min, optional):

1. github.com → your profile picture → **Settings** → **Billing and licensing** → **Budgets and alerts**.
2. **New budget** → product **Actions** → amount **$5** → turn on **Stop usage when budget limit is reached** → Create.
   Where to put the result: nothing. Change this Status to DONE (or tell the session "budget set" or "no budget").

## B-007 · Turn on the admin login (Supabase settings + email via Resend)

Status: DONE (15 Oct: Zaid set it up and tested the login. Feedback: the email looks plain; it needs a premium design → C-083 redesigns all Tidaq emails and gives a matching Supabase login template to paste) · Opened: 2026-10-13 by CLOUD · Blocks: nothing now
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
