// Builds docs/Tidaq-Build-Plan.pdf from the markdown docs.
// Usage (from repo root): node scripts/docs/build-pdf.mjs
// Needs: `marked` and `playwright` resolvable (e.g. `pnpm add -D -w marked playwright` once the workspace exists)
// and a Chromium (set CHROMIUM_PATH if Playwright's bundled one is not installed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { marked } = require(process.env.MARKED_PATH || "marked");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
marked.setOptions({ gfm: true });

const VERSION = "1.2";
const DATE = "12 October 2026";

// strip the first H1 of each doc (we render our own part titles)
const body = (md) => marked.parse(md.replace(/^# .*\n/, ""));
const swatches = (html) =>
  html.replace(/<code>(#[0-9A-Fa-f]{6})<\/code>/g, '<span class="sw" style="background:$1"></span><code>$1</code>');

const parts = [
  { id: "zaid", kicker: "Part A", title: "Your to-do list", sub: "Only what the sessions can't do for you, with exact steps.", html: body(read("docs/ZAID.md")) },
  { id: "plan", kicker: "Part B", title: "The plan", sub: "Product, architecture, data model, methods, legal, risks.", html: body(read("docs/PLAN.md")) },
  { id: "tasks", kicker: "Part C", title: "Task backlog", sub: "The work queue for the CLOUD and LOCAL sessions, with acceptance criteria.", html: body(read("docs/TASKS.md")) },
  { id: "design", kicker: "Part D", title: "Design system", sub: "Soft Modern: tokens, components, layouts, copy.", html: swatches(body(read("docs/DESIGN.md"))) },
  { id: "decisions", kicker: "Part E", title: "Decisions", sub: "Locked. Sessions follow these without asking.", html: body(read("docs/DECISIONS.md")) },
  { id: "manual", kicker: "Part F", title: "Operating manual for Claude sessions", sub: "CLAUDE.md: what every session reads first.", html: body(read("CLAUDE.md")) },
];

const weeks = [
  ["W42", "12–18 Oct", "Setup", "Z-01 to Z-07, Z-10 (~2.5 h)", "C-001, C-002, C-003, C-007, C-004, C-005, C-010", "Repo, CI, accounts, spike report"],
  ["W43", "19–25 Oct", "Data", "Sunday review", "C-012, C-014, C-015, C-011, C-013a", "Catalog of 36–50 hotels, collector posting"],
  ["W44", "26 Oct – 1 Nov", "Data", "Sunday review", "C-013b, C-006, C-020a", "Data flowing daily ★"],
  ["W45", "2–8 Nov", "MVP", "Audit sessions start", "C-016, C-032, C-020b, C-021", "Admin + audit tool, homepage"],
  ["W46", "9–15 Nov", "MVP", "Audit 2–3×", "C-022, C-023, C-026, C-027", "Stay page, hotel calendar, legal"],
  ["W47", "16–22 Nov", "MVP", "Audit 2–3×, Z-09", "C-024, C-025, C-028, C-029", "Feature-complete on staging ★"],
  ["W48", "23–29 Nov", "Alerts", "Audit, Z-12 legal read", "C-030, C-031, C-034, C-041, L-040", "Alerts live, QA, 150 tests"],
  ["W49", "30 Nov – 6 Dec", "Launch", "Z-13 videos, posting", "C-042, C-043, C-044", "tidaq.com live ★"],
  ["Dec–Mar", "", "Growth", "Z-11 affiliate apps, content", "C-050 to C-056", "First €100 commission by March"],
];

const css = `
@page { size: A4; margin: 18mm 16mm 20mm; }
:root { --bg:#F5F3FC; --surface:#fff; --line:#E6E0F7; --fg:#221C3B; --muted:#6C6687; --accent:#6A49E0; --soft:#EDE7FF; --good:#178A62; --bad:#D1435B; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; color: var(--fg); font-size: 9.6pt; line-height: 1.5; margin: 0; }
h1,h2,h3,h4 { letter-spacing: -0.02em; line-height: 1.15; text-wrap: balance; break-after: avoid; }
h2 { font-size: 16pt; font-weight: 800; margin: 22pt 0 8pt; padding-top: 6pt; border-top: 1px solid var(--line); }
h3 { font-size: 12pt; font-weight: 800; margin: 16pt 0 6pt; color: var(--fg); }
h4 { font-size: 10.5pt; margin: 12pt 0 4pt; }
p, li { orphans: 3; widows: 3; }
a { color: var(--accent); text-decoration: none; }
code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 8.2pt; background: var(--soft); padding: 0 3px; border-radius: 4px; }
pre { background: #1D1930; color: #EEEAFB; padding: 10pt 12pt; border-radius: 10px; font-size: 7.6pt; line-height: 1.45; white-space: pre-wrap; word-break: break-word; break-inside: auto; }
pre code { background: none; padding: 0; color: inherit; font-size: inherit; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 8.4pt; break-inside: auto; }
th { text-align: left; background: var(--soft); font-weight: 700; }
th, td { border: 1px solid var(--line); padding: 4pt 6pt; vertical-align: top; word-break: normal; overflow-wrap: break-word; }
tr { break-inside: avoid; }
blockquote { margin: 8pt 0; padding: 8pt 12pt; background: var(--soft); border-radius: 10px; border: 0; }
blockquote p { margin: 0; }
hr { border: 0; border-top: 1px solid var(--line); margin: 14pt 0; }
ul, ol { padding-left: 16pt; }
li { margin: 2pt 0; }
input[type=checkbox] { width: 9pt; height: 9pt; margin: 0 5pt 0 -13pt; vertical-align: -1pt; accent-color: var(--accent); }
li:has(> input[type=checkbox]) { list-style: none; }
.sw { display: inline-block; width: 10pt; height: 10pt; border-radius: 3px; border: 1px solid var(--line); vertical-align: -1.5pt; margin-right: 4pt; }

/* cover */
.cover { height: 257mm; position: relative; overflow: hidden; border-radius: 22px; background: var(--bg); padding: 28mm 18mm 18mm; break-after: page; }
.cover::before { content: ""; position: absolute; top: -60mm; left: -50mm; width: 160mm; height: 160mm; border-radius: 50%; background: radial-gradient(closest-side, #DDD2FF, transparent); }
.cover::after { content: ""; position: absolute; top: 40mm; right: -60mm; width: 150mm; height: 150mm; border-radius: 50%; background: radial-gradient(closest-side, #FFD6E5, transparent); }
.cover > * { position: relative; z-index: 1; }
.logo { font-weight: 800; font-size: 64pt; letter-spacing: -0.05em; line-height: 1; }
.logo span { color: var(--accent); }
.cover h1 { font-size: 30pt; font-weight: 800; margin: 18pt 0 6pt; letter-spacing: -0.03em; }
.cover .lead { font-size: 12.5pt; color: var(--muted); max-width: 140mm; margin: 0; }
.meta { margin-top: 10pt; font-size: 10pt; color: var(--muted); }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; margin-top: 22pt; }
.kpi { background: #fff; border-radius: 16px; padding: 10pt 12pt; box-shadow: 0 10px 28px rgba(106,73,224,.10); }
.kpi b { display: block; font-size: 15pt; font-weight: 800; letter-spacing: -0.02em; }
.kpi span { font-size: 8.5pt; color: var(--muted); }
.roles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin-top: 14pt; }
.role { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 12pt; }
.role h3 { margin: 0 0 4pt; font-size: 11.5pt; }
.role p { margin: 0; font-size: 8.8pt; color: var(--muted); }
.role .tag { display: inline-block; font-size: 7.5pt; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); margin-bottom: 4pt; }
.cover .foot { position: absolute; bottom: 14mm; left: 18mm; right: 18mm; font-size: 8.5pt; color: var(--muted); display: flex; justify-content: space-between; }

/* start + timeline pages */
.page { break-after: page; }
.page h1 { font-size: 24pt; font-weight: 800; margin: 0 0 4pt; letter-spacing: -0.03em; }
.page .sub { color: var(--muted); margin: 0 0 14pt; font-size: 10.5pt; }
.steps { counter-reset: s; display: grid; gap: 5pt; }
.step { background: var(--bg); border-radius: 12px; padding: 7pt 12pt 7pt 36pt; position: relative; }
.step::before { counter-increment: s; content: counter(s); position: absolute; left: 11pt; top: 7pt; width: 18pt; height: 18pt; border-radius: 50%; background: var(--accent); color: #fff; font-weight: 800; font-size: 9pt; display: grid; place-items: center; }
.step b { display: block; font-size: 10.5pt; }
.step span { color: var(--muted); font-size: 9pt; }
.loop { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6pt; margin: 10pt 0 4pt; }
.loop div { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 8pt; font-size: 8.4pt; text-align: center; }
.loop div b { display: block; font-size: 9.2pt; margin-bottom: 2pt; }
.note { font-size: 8.8pt; color: var(--muted); }
.tl td:nth-child(1) { font-weight: 800; white-space: nowrap; }
.tl td:nth-child(2) { white-space: nowrap; }
.tl .ph { white-space: nowrap; display: inline-block; padding: 1pt 6pt; border-radius: 999px; background: var(--soft); color: var(--accent); font-weight: 700; font-size: 7.6pt; }

/* part dividers */
.divider { break-before: page; background: var(--bg); border-radius: 18px; padding: 16pt 18pt; margin-bottom: 12pt; }
.divider .k { font-size: 8pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
.divider h1 { font-size: 24pt; font-weight: 800; margin: 2pt 0 2pt; letter-spacing: -0.03em; }
.divider p { margin: 0; color: var(--muted); }
.part > h2:first-child { border-top: 0; margin-top: 4pt; }
.toc { display: grid; grid-template-columns: 1fr 1fr; gap: 4pt 16pt; margin-top: 14pt; font-size: 8.8pt; }
.toc div { border-bottom: 1px dashed var(--line); padding-bottom: 3pt; }
.toc b { font-weight: 700; }
`;

const cover = `
<section class="cover">
  <div class="logo">tidaq<span>.</span></div>
  <h1>Build plan</h1>
  <p class="lead">Price history, low/high signals and checkout-trust scores for luxury hotel stays in DACH and Europe. Built by two Claude sessions; Zaid owns the business.</p>
  <div class="meta">Version ${VERSION} · ${DATE} · Repo zaidg7/tidaq · tidaq.com</div>
  <div class="kpis">
    <div class="kpi"><b>30 Nov 2026</b><span>soft launch</span></div>
    <div class="kpi"><b>~€20</b><span>per month (data + hosting)</span></div>
    <div class="kpi"><b>36–50</b><span>five-star hotels, 12 cities</span></div>
    <div class="kpi"><b>~2 h</b><span>of Zaid's time per week</span></div>
  </div>
  <div class="roles">
    <div class="role"><span class="tag">Owner</span><h3>Zaid</h3><p>Accounts, money, decisions, checkout audit with the LOCAL session, content. A 15-minute review every Sunday. Part A.</p></div>
    <div class="role"><span class="tag">Main builder</span><h3>CLOUD session</h3><p>Works the backlog top-down in the cloud. One PR per task, tests included, merges itself when CI is green.</p></div>
    <div class="role"><span class="tag">On Zaid's PC</span><h3>LOCAL session</h3><p>Tasks that need a real browser or Zaid's accounts: the checkout audit with Claude in Chrome and device QA.</p></div>
  </div>
  <div class="toc">
    ${[["Start here", "2"], ["Timeline", "3"], ...parts.map((p) => [`${p.kicker} · ${p.title}`, ""])].map(([t]) => `<div><b>${t}</b><span></span></div>`).join("")}
  </div>
  <div class="foot"><span>Not legal or tax advice. Verify legal texts before launch.</span><span>Generated from the repo docs</span></div>
</section>`;

const start = `
<section class="page">
  <h1>Start here</h1>
  <p class="sub">What happens next, and the only things you need to do this week.</p>
  <h3>Your steps this week (about 2 hours left)</h3>
  <div class="steps">
    <div class="step"><b>✓ Repo, trademark check, domain: done (12 Oct)</b><span>zaidg7/tidaq exists with Claude access, "Tidaq" is clean in EUIPO/DPMA/WIPO, tidaq.com is bought at Namecheap. (Z-01 to Z-03)</span></div>
    <div class="step"><b>Point tidaq.com to Cloudflare (10 min)</b><span>Add the domain in Cloudflare (Free plan), paste its two nameservers into Namecheap → Custom DNS. (Z-03b)</span></div>
    <div class="step"><b>Accounts and keys (40 min)</b><span>Cloudflare token + account ID, Supabase project in your Pro organization (Frankfurt, Micro), DataForSEO top-up. Keys go into GitHub secrets with the exact names in Part A, never into a chat. (Z-04, Z-05)</span></div>
    <div class="step"><b>Claude environment settings (10 min)</b><span>Allow the listed domains and add the DataForSEO + Supabase variables, so cloud sessions can reach the services. (Z-06)</span></div>
    <div class="step"><b>Set up your PC (30 min)</b><span>Git, Node 22, Claude desktop app, Chrome + Claude in Chrome, clone the repo. (Z-07)</span></div>
    <div class="step"><b>Start the CLOUD session</b><span>New claude.ai Code session with the tidaq repo, paste the CLOUD start prompt (Part B §14). It can start C-001 to C-003 right away; data tasks wait for the accounts.</span></div>
  </div>
  <h3>How the machine runs</h3>
  <div class="loop">
    <div><b>1 · Pick</b>first open task in TASKS.md, priority order</div>
    <div><b>2 · Claim</b>draft PR titled [ID], so no double work</div>
    <div><b>3 · Build</b>code + tests, small commits</div>
    <div><b>4 · Prove</b>CI green, checklist, self-review</div>
    <div><b>5 · Ship</b>squash-merge, auto-deploy, next task</div>
  </div>
  <p class="note">Blocked on you? The session writes exact steps into docs/BLOCKERS.md and moves on. Every Sunday you get a GitHub issue "Weekly summary" with what shipped, what's next and what you need to do.</p>
  <p class="note"><b>On the Claude Pro plan:</b> run one session at a time (CLOUD by default; LOCAL only for its tasks or the audit). If milestones slip by more than a week, upgrade to Max 5x and run both in parallel.</p>
</section>`;

const timeline = `
<section class="page">
  <h1>Timeline</h1>
  <p class="sub">Targets, not promises. Data collection is the critical path: the earlier the collector runs, the better the charts at launch. ★ = milestone.</p>
  <table class="tl">
    <thead><tr><th>Week</th><th>Dates</th><th>Phase</th><th>Zaid</th><th>Sessions (task IDs)</th><th>Outcome</th></tr></thead>
    <tbody>${weeks.map((w) => `<tr><td>${w[0]}</td><td>${w[1]}</td><td><span class="ph">${w[2]}</span></td><td>${w[3]}</td><td>${w[4]}</td><td>${w[5]}</td></tr>`).join("")}</tbody>
  </table>
  <h3>Goals after launch</h3>
  <table><thead><tr><th>When</th><th>Goal</th></tr></thead><tbody>
    <tr><td>Dec 2026</td><td>Trust report + first video series; 500 visitors</td></tr>
    <tr><td>Mar 2027</td><td>Affiliate programs approved; first €100 in commission</td></tr>
    <tr><td>Jun 2027</td><td>5,000 visitors/month, 1,000 active price watches; then decide on Pro tier or B2B reports</td></tr>
  </tbody></table>
</section>`;

const partsHtml = parts
  .map((p) => `<section class="divider"><div class="k">${p.kicker}</div><h1>${p.title}</h1><p>${p.sub}</p></section><section class="part">${p.html}</section>`)
  .join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&family=JetBrains+Mono:wght@500&display=swap">
<style>${css}</style></head><body>${cover}${start}${timeline}${partsHtml}</body></html>`;

const out = path.join(root, "docs/Tidaq-Build-Plan.pdf");
fs.writeFileSync(path.join(root, "docs/.build-plan.html"), html);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.goto("file://" + path.join(root, "docs/.build-plan.html"), { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font-family:system-ui,sans-serif;font-size:7.5px;color:#6C6687;padding:0 16mm;display:flex;justify-content:space-between"><span>tidaq · Build plan v${VERSION} · ${DATE}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  margin: { top: "16mm", bottom: "18mm", left: "16mm", right: "16mm" },
});
await browser.close();
fs.unlinkSync(path.join(root, "docs/.build-plan.html"));
console.log("Wrote", out);
