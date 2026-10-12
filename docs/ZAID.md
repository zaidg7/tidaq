# Zaid's to-do list

Only things the sessions can't do for you: your identity, money, logins, decisions and your face on camera. Everything else is outsourced.

**Golden rule:** never paste a key, token or password into a chat, issue or PR. Put keys only where a step says (GitHub secrets, Cloudflare, the Claude environment settings).

Total for week 1: **about 2 hours** (Z-01 to Z-03 are already done). After that: about 1–3 hours a week, mostly the checkout audit and content.

---

## Week 1 (Mon 12 – Sun 18 Oct 2026)

### Z-01 · Create the GitHub repo and give Claude access ✅ DONE (12 Oct)
1. Open github.com/new
2. Owner `zaidg7`, name `tidaq`, **Private**. Leave "Add a README" **unticked** (the repo must be empty).
3. Create repository.
4. Open github.com/settings/installations → **Claude** → Configure → Repository access → add `tidaq` → Save.
   (If Claude isn't listed: install it from github.com/apps/claude and choose `tidaq`.)
5. Repo → Settings → General → Pull Requests: tick **Allow squash merging** and **Automatically delete head branches**.
6. Write "repo ready" in the chat. Claude pushes the plan into it.

### Z-02 · Trademark check ✅ DONE (12 Oct): clean in EUIPO, DPMA and WIPO.

### Z-03 · Domain ✅ DONE (12 Oct): tidaq.com bought at Namecheap.

### Z-03b · Point tidaq.com to Cloudflare (10 min + up to 24 h waiting)
The domain stays at Namecheap; only the DNS moves to Cloudflare (needed for the website, emails and Google).
1. Namecheap → Domain List → `tidaq.com` → Manage → **Advanced DNS**: if **DNSSEC** is on, turn it off first.
2. Cloudflare dashboard → **Add a domain** (or "Add site") → `tidaq.com` → choose the **Free** plan → continue. Cloudflare shows **two nameservers** (like `xxx.ns.cloudflare.com`).
3. Namecheap → `tidaq.com` → Manage → **Nameservers** → choose **Custom DNS** → paste both Cloudflare nameservers → save (green check).
4. Wait. Cloudflare emails you when the domain is **Active** (usually under 1 hour, at most 24 h). Nothing else to do; the sessions add the DNS records.
5. Optional, later: turn DNSSEC on again inside Cloudflare (DNS → Settings) and add the DS record it shows at Namecheap.

### Z-04 · Accounts and keys (40 min)
**Cloudflare (account already created ✅)**
1. Workers & Pages → open it once so Workers is activated (free plan for now).
2. My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers** → All accounts / your account, zone `tidaq.com` → Create. Copy the token.
3. Copy your **Account ID** (Workers & Pages overview, right sidebar).
4. Later, only if a session asks in BLOCKERS: Workers Paid plan ($5/month).

**Supabase** (decided 12 Oct: use your existing **Pro organization**, about +$10/month for the extra project)
1. supabase.com → your **Pro organization** → New project → name `tidaq`, region **Frankfurt (eu-central-1)**, compute **Micro**. Save the database password in your password manager.
   (Don't create a new free organization: the free plan's 500 MB fills within weeks and free projects pause.)
2. Project Settings → API: copy **Project URL**, **anon/publishable key** and **service_role/secret key**.

**DataForSEO**
1. dataforseo.com → sign up, verify email.
2. Add funds: the smallest top-up offered (around $50 lasts about 2 months at our budget).
3. Dashboard → API Access: copy the **API login** and **API password** (different from your account password).

**Put the keys into GitHub** (repo `tidaq` → Settings → Secrets and variables → Actions → New repository secret). One secret per line, exact names:

| Secret name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the Cloudflare token |
| `CLOUDFLARE_ACCOUNT_ID` | your Account ID |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role/secret key |
| `DATAFORSEO_LOGIN` | API login |
| `DATAFORSEO_PASSWORD` | API password |

### Z-05 · Resend for emails (10 min)
1. resend.com → sign up → Domains → Add domain `tidaq.com` → follow the Cloudflare DNS steps (Resend can add the records automatically if you connect Cloudflare).
2. API Keys → Create → "Sending access" → copy.
3. Add GitHub secret `RESEND_API_KEY`.

### Z-06 · Claude cloud environment settings (10 min)
In a claude.ai Code session for `tidaq`: environment menu in the session title bar → **Edit**.
1. **Network access:** keep "Limited" and add these **Allowed domains** (keep "Allow package managers" ticked):
   `api.dataforseo.com`, `docs.dataforseo.com`, `*.supabase.co`, `api.supabase.com`, `api.cloudflare.com`, `*.workers.dev`, `tidaq.com`, `www.tidaq.com`, `api.resend.com`, `developers.cloudflare.com`, `opennext.js.org`, `nextjs.org`
2. **Network secrets / environment variables** (whichever the settings page offers): `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Same values as in GitHub.
3. Save. New sessions pick it up.

### Z-07 · Set up your PC for the LOCAL session (30 min, once)
1. Install **Git for Windows** (git-scm.com) with default options.
2. Install **Node.js 22 LTS** (nodejs.org). Then open PowerShell and run `corepack enable`.
3. Install the **Claude desktop app** (claude.ai/download) and sign in. Claude Code is inside it.
4. Install **Google Chrome** and the **Claude in Chrome** extension (Chrome Web Store), sign in.
5. Clone the repo: in PowerShell `cd $HOME\Documents` then `git clone https://github.com/zaidg7/tidaq.git`.
6. Open the `tidaq` folder in Claude Code and paste the LOCAL start prompt (PLAN §14). The LOCAL session can help with anything that fails.

### How to "link" the accounts to Claude
There are three places, and each has a different job. Never paste keys into a chat.
1. **GitHub secrets** (Z-04/Z-05): the deploy pipeline uses them. That's the main one.
2. **Claude cloud environment** (Z-06): allowed domains + a few variables so cloud sessions can test against the real services.
3. **claude.ai connectors** (Settings → Connectors): the **Supabase** connector is already connected to your account. Make sure it can see your **Pro organization**, so sessions can apply database changes and check data directly. GitHub is connected too. Nothing else is needed.

### Z-08 · Every Sunday: 15-minute review
Open the newest **Weekly summary** issue on GitHub (you'll get a notification), do the listed steps, close it.

---

## Weeks 2–7 (19 Oct – 29 Nov)

### Z-07b · Checkout audit sessions (2–3× a week, 30–45 min each). Your most important job before launch.
With the LOCAL session (task L-033): Claude in Chrome does the clicking and reading; you watch, approve sites when asked and make sure nothing gets booked. Goal: 150 tests by 29 Nov. **Never enter payment or personal data.**
Film a few of these sessions (screen recording + your voice). That's your launch content.

### Z-09 · Google Search Console (5 min, when a session asks)
search.google.com/search-console → add property `tidaq.com` (Domain) → verify via Cloudflare DNS (Search Console offers a Cloudflare button).

### Z-10 · Reserve social handles (10 min, this week if possible)
TikTok, Instagram, YouTube, X: `@tidaq` (or `@tidaq.de` / `@tidaqhotels` if taken). Use the same profile picture (the session makes one from the logo).

### Z-12 · Read the legal pages once (20 min, week of 23 Nov)
Read `/impressum`, `/datenschutz`, `/affiliate-hinweis`, `/ranking` on staging. Check your name, address and email. If you have a Steuernummer, add it as the GitHub issue comment the session asks for (it's public on the Impressum anyway).

### Z-13 · Content (your part, from launch week)
The sessions write scripts and make the charts. You record and post. Start with 3 videos in launch week:
1. "Ich habe 150 Hotel-Checkouts getestet. Das ist passiert."
2. "Dieses 5-Sterne-Hotel ist gerade 14 % günstiger als sonst" (live chart)
3. "Booking vs. Hotel direkt: wer ist wirklich günstiger?"

---

## After launch (Dec 2026 onward)

### Z-11 · Affiliate programs (60 min total, spread out; after the site is live with content)
The session prepares the application texts and exact links in a BLOCKERS entry. You sign up because it needs your identity and tax details:
- Awin publisher account → apply to **Booking.com** (or CJ if Booking assigns that)
- **Expedia Group** affiliate program (Expedia, Hotels.com)
- **Trip.com** and **Agoda** affiliate programs
Then put each affiliate ID where the session tells you (usually a GitHub secret).

### Z-14 · Finances (ongoing)
Keep invoices from Cloudflare, DataForSEO, Resend and later affiliate payouts for your Kleinunternehmer bookkeeping. Commissions are business income.

---

## Your weekly time budget

| Week | What | Time |
|---|---|---|
| 12–18 Oct | Z-03b to Z-07, Z-10 (Z-01 to Z-03 done ✅) | ~2 h |
| 19 Oct – 29 Nov | audit sessions, Sunday review, Z-09, Z-12 | ~1.5–2.5 h/week |
| Launch week (30 Nov) | Z-13 videos, posting | ~3 h |
| Dec onward | Sunday review, content, Z-11 | ~2–3 h/week |
