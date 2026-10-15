# Tidaq design system v2: Clean Premium

Zaid picked **direction B "Clean Premium"** on 15 Oct 2026 from two mockup directions (canvas "Tidaq design directions"), with changes (§0). It replaces Soft Modern (D-20, `docs/DESIGN.md`, `docs/design/CRAFT.md`) page by page through the tasks in §14. **Until a page is rebuilt, the old spec applies to it; from then on, this file wins.** When this file and a mockup disagree, this file wins.

The goal, in Zaid's words: *"top tier UI and UX … every single picture of every single frame … how the calendar pops out, animations, background pictures, fades, what text to leave out … it needs to be insanely good."* Every UI PR is built and reviewed against this file. If something isn't specified here, decide it in the spirit of §1 and add it here in the same PR.

---

## 0. Zaid's feedback that shaped this (15 Oct)

| Feedback | Rule in this spec |
| --- | --- |
| The first version had little attention to detail: the search button just scrolled down the hero. | Every control does something real and visible: search opens panels and leads to a real page with a loading state (§9). No dead ends, no "scroll to form" tricks. |
| Too much text, too many numbers. Unclear what a chart shows. | One answer per screen (§2). Every chart has a title that says what it shows and labels in words (§8). Text budgets per section (§4.4). |
| Looks vibe-coded, AI-made, cheap. | No gradient blobs, no purple washes, no emoji, no fake 3D, no stock icons in circles everywhere. Real photos everywhere, one font family, strict spacing scale (§3). |
| "Preisstürze" → just say **Price Drops**. It doesn't have to be all German. | English product terms (§4.2); everything else stays German with "du". |
| The thin italic serif "günstig" in the hero was hard to read. | One sans family, weights 500–700 for headings; no thin or italic display type (§3.2). |
| Didn't like "Eine klare Antwort. Statt 25 Zahlen." or the three how-it-works cards. | Removed. How it works is one line in the hero plus the result example (§10.1). |
| Didn't like the room photo behind the Price Alert section. | Dark section with real alert previews instead of a photo (§10.1). |
| Icons: the falling graph looks like stocks; wants minimal and cool, "think Airbnb". Liked the text logo. | Keep the `tidaq` wordmark; new symbol from the options in §5 (Zaid picks, B-020). |
| Pictures for every single hotel. | Photo program with 100 % coverage as a launch requirement (§7). |
| Nicest graphs and charts, right colors. | Chart spec §8. |

---

## 1. Feel

**Calm luxury you can read in one second.** Big real photos, lots of white, one confident accent, prices set like headlines. Think Airbnb's clarity, Aman's calm, Apple's restraint. Never a deal site: no red banners, countdowns, "only 2 left", confetti.

Three words: **clear, calm, photographic.**

Tests every screen must pass:
1. **Squint test:** blur your eyes. You should still see the one thing that matters (the price drop, the verdict, the button).
2. **3-second test:** a TikTok visitor who lands on a drop page knows within 3 seconds what hotel, how much cheaper, and what to tap.
3. **Screenshot test:** any phone screenshot of a Tidaq page looks good enough to post.
4. **Remove test:** for each line of text, ask "would anyone miss it?" If not, delete it.

---

## 2. Principles

1. **One answer per screen.** Each page has one hero fact (drop page: "−54 %"; stay page: "Gerade günstig"; hotel page: the cheapest dates). Everything else supports it, smaller.
2. **Photos carry the luxury.** Every hotel has a real photo (§7). No gradient placeholders on public pages after C-105.
3. **Numbers need words.** Never a bare number: "1.139 €" goes with "statt 2.500 €". Never a bare chart: it gets a title and plain-word labels.
4. **Progressive disclosure.** Show the answer; details (all sites, history, method) one tap away in a sheet or accordion, not on the first screen.
5. **Real interactions.** Popovers, sheets, loading states and transitions are designed, not left to browser defaults (§6, §9).
6. **Motion explains, never decorates.** Things move to show where they come from or what changed (§6). Respect reduced motion.
7. **Mobile first.** TikTok traffic is phones. Design 390 px first, then 768, 1280, 1440.
8. **Honest.** Facts with dates, labelled partner links, no dark patterns (CLAUDE.md hard rules 8, 9).

---

## 3. Tokens

All tokens live in `apps/web/app/globals.css` as CSS variables and Tailwind theme values (C-102). Names are semantic, not color names.

### 3.1 Color (light)

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#FAF9F7` | page background (warm white) |
| `--surface` | `#FFFFFF` | cards, panels, popovers, sheets |
| `--surface-2` | `#F4F2F7` | quiet sections, input fill on white, skeleton base |
| `--surface-accent` | `#F1EEF8` | highlight sections (result example, alert box) |
| `--line` | `#E8E5EE` | borders, dividers, chart grid |
| `--line-strong` | `#D9D5E2` | input borders, outline buttons |
| `--ink` | `#15131C` | headings, body, primary icons |
| `--ink-2` | `#3A3744` | secondary body on white |
| `--muted` | `#5B5866` | labels, meta, axis text (AA on `--bg` and white) |
| `--faint` | `#8C8996` | decorative only (never for text under 24 px) |
| `--accent` | `#4B33C9` | primary buttons, links, focus ring, selected states |
| `--accent-hover` | `#3D28A8` | hover/pressed accent |
| `--accent-soft` | `#EEEAFE` | selected chip fill, icon tiles |
| `--good` | `#0E6B47` | price down, "günstig", drop badges (white text on it passes AA) |
| `--good-soft` | `#E1F2E9` | good chips |
| `--good-bright` | `#3DDC97` | live dot and accents on dark or photo only |
| `--high` | `#B42318` | price up, "teuer" text (D-22) |
| `--high-soft` | `#FDEBE7` | high chips |
| `--high-fill` | `#E8A87C` | "teuer" zone in meters and heat cells (fill only, never text) |
| `--night` | `#15131C` | dark sections (Price Alerts, footer variant) |
| `--night-ink` | `#F4F2F7` | text on `--night` |
| `--scrim-top` | `linear-gradient(180deg, rgba(14,12,18,.45) 0%, rgba(14,12,18,0) 30%)` | keeps nav readable on photos |
| `--scrim-bottom` | `linear-gradient(180deg, rgba(14,12,18,0) 35%, rgba(14,12,18,.78) 100%)` | text on photos |

Rules:
- **Accent is for action.** Only buttons, links, selection and focus are violet. Never violet text blocks, never violet backgrounds behind content, never gradients of it.
- **Green means cheaper, red means more expensive** (D-22). Green and red never carry meaning alone: always with a sign (−/+), a word or an arrow.
- **Price-level scale** (calendar cells, meter, sparklines): 5 steps from `--good` to `--high-fill`: `#0E6B47`, `#5FA585`, `#E4E1EA` (normal), `#F0C3A2`, `#E8A87C`. Text on the two dark-green steps is white; on the others `--ink`.
- **Dark mode:** not in this overhaul. Today it is opt-in only (`data-theme="dark"`, never set), so nothing is lost. The old dark tokens are deleted in C-102; revisit after launch.

### 3.2 Typography

**One family: Instrument Sans** (variable, weights 400–700, Latin Extended for ä ö ü ß), loaded with `next/font/google` like Plus Jakarta Sans today (`lib/fonts.ts`): Next downloads it at build time and serves it from tidaq.com, so visitors never contact Google (D-15). Fallback stack: `"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` with `size-adjust` so the swap doesn't jump. Prices use `font-variant-numeric: tabular-nums` in tables, charts and lists, proportional in big hero numbers.

No serif, no italic display, nothing below weight 500 for headings (Zaid: thin type is unreadable).

| Style | Mobile | Desktop | Weight | Tracking | Line height | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `display` | 44 | 76 | 650 | −0.04em | 1.02 | home hero only |
| `hero-number` | 76 | 96 | 700 | −0.05em | 0.95 | "−54 %" on the drop page |
| `h1` | 32 | 48 | 650 | −0.03em | 1.1 | page titles |
| `h2` | 26 | 40 | 650 | −0.03em | 1.12 | section titles |
| `h3` | 18 | 20 | 600 | −0.01em | 1.3 | card titles |
| `price-xl` | 40 | 48 | 700 | −0.04em | 1 | the main price on a page |
| `price-l` | 20 | 22 | 700 | −0.02em | 1.2 | card prices |
| `lead` | 17 | 20 | 400 | 0 | 1.5 | one-sentence intros, max 2 lines |
| `body` | 16 | 17 | 400 | 0 | 1.55 | running text (rare) |
| `small` | 14 | 15 | 400/500 | 0 | 1.5 | meta lines |
| `label` | 13 | 13 | 600 | 0 | 1.3 | field labels, chip text |
| `caption` | 11 | 12 | 500 | 0.01em | 1.3 | photo credits, axis ticks |

No ALL CAPS letter-spaced labels (that was an AI-template tell); labels are sentence case, weight 600.

### 3.3 Space, size, radius, elevation

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96, 128. Nothing in between.
- **Page gutters:** 16 (≤ 480), 24 (≤ 768), 40 (≥ 1024). Max content width 1240; text measure max 640.
- **Section rhythm:** 72 mobile / 120 desktop between sections; 20 / 36 between a section title and its content.
- **Grid:** 4 columns mobile, 8 tablet, 12 desktop, gutter 12 / 20 / 28.
- **Radius:** 6 (credit tags), 12 (inputs, small thumbs), 16 (buttons), 22 (cards, photos), 28 (panels, sheets, search bar), 999 (chips, badges, live dot).
- **Elevation:** `--shadow-1` `0 1px 2px rgba(21,19,28,.06)` (resting cards); `--shadow-2` `0 1px 2px rgba(21,19,28,.06), 0 12px 32px rgba(21,19,28,.10)` (hover, popovers); `--shadow-3` `0 1px 2px rgba(21,19,28,.06), 0 24px 56px rgba(21,19,28,.16)` (search bar, sheets, dialogs). No colored glows.
- **Touch targets:** ≥ 44 × 44. **Focus:** 2 px `--accent` ring, 2 px offset, on every interactive element (`:focus-visible`).
- **Borders:** 1 px `--line`; cards on `--bg` get border + `--shadow-1`, cards on white get border only.

### 3.4 Breakpoints

`sm` 480, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1440. Every page is checked at 390, 768, 1280 and 1440 (C-123).

---

## 4. Words

### 4.1 Voice

German, informal "du", short sentences, confident and warm. Like a friend who knows hotels, not like a bank. No hype ("unschlagbar", "Hammer-Deal"), no fake urgency. Numbers instead of adjectives.

### 4.2 Glossary (use exactly these)

| Concept | DE (site) | EN (site) | Notes |
| --- | --- | --- | --- |
| sudden drop since yesterday | **Price Drop** (pl. **Price Drops**) | Price drop | replaces "Preissturz" everywhere: nav, headings, emails, OG cards, story images. "Ein Price Drop", "3 Price Drops". |
| email alert for drops | **Price Alert** | Price alert | replaces "Preissturz-Alarm". Verb: "Price Alert aktivieren". |
| watching one stay | **Preis beobachten** | Watch price | stays German (a verb). |
| verdict states | **Gerade günstig · Normaler Preis · Gerade teuer · Noch zu wenig Daten** | Low right now · Normal price · High right now · Not enough data yet | the one-line answer. |
| the usual price | **sonst um 953 €** | usually around €953 | always "um", never "Durchschnitt" on cards. |
| previous price | **statt 2.500 €** | instead of €2,500 | on drop cards; "gestern" only where it is literally yesterday's price. |
| checkout audit | **Kassen-Check** | Checkout check | unchanged. |
| photo fallback label | **Stadtbild** | City photo | on city photos used for a hotel without its own photo. |
| affiliate link label | **Partnerlink** | Partner link | next to every outbound booking button. |

URLs follow the product terms: `/price-drops`, `/price-drops/woche`, `/price-drops/<hotel>/<stay>`, `/price-alert/…`; the old `/preissturz…` and `/alarm…` paths redirect with 308 (C-122).

### 4.3 Formats

Prices `1.139 €` (D-21), no cents. Dates `Fr, 6. Nov` on cards, `Fr, 6. Nov 2026` on the stay/drop page header, ranges `6.–8. Nov`. Percent `−54 %` with a real minus (U+2212) and a narrow no-break space. Times `07:08`.

### 4.4 Text budgets

| Place | Budget |
| --- | --- |
| hero headline | ≤ 6 words |
| lead under any heading | 1 sentence, ≤ 18 words, ≤ 2 lines on a phone |
| card | title (hotel), 1 meta line, 1 price line. Nothing else. |
| section | heading ≤ 6 words + optional 1-sentence lead |
| button | verb first, ≤ 3 words (+ price where it helps: "Bei Trip.com ansehen · 1.139 €") |
| errors | what happened + what to do, 1 sentence each |
| legal/method pages | exempt, but use headings every ~120 words |

### 4.5 Text we remove

Repeated explanations of the method on every page (one link "So messen wir" instead), "2 Erwachsene" on every card (it's the default; show guests only when not 2), the "Auch günstiger:" lists on cards, "Kostenlos · ohne Konto · ohne Cookies" under every form (once in the hero trust row), long intros on list pages.

---

## 5. Brand: wordmark and symbol

- **Wordmark:** `tidaq` in Instrument Sans 700, tracking −0.04em, `--ink` (white on photos). Zaid liked it; it stays.
- **Symbol:** to be picked by Zaid (B-020) from the options on the canvas board "Icon-Ideen": *Tür* (a rounded-top door with a dot as handle: the room you're booking), *Glocke* (a concierge bell: hotel + alert), *Schlüsselanhänger* (a hotel key tag with a "t" cut out) and *t-Monogramm* (a soft lowercase t whose crossbar ends in a dot). Criteria: one shape, one color, readable at 16 px, no charts, no letters other than "t".
- **Lockup:** symbol + 8 px + wordmark, symbol height = cap height × 1.25.
- **App and browser icons (C-106):** `icon.svg` (symbol on `--accent` rounded square, radius 22 %), `apple-icon.png` 180, `icon-192/512.png` for the manifest, maskable variant with 20 % safe zone, `theme-color` `#FAF9F7`.

---

## 6. Motion

Tokens in CSS: `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-in: cubic-bezier(.4,0,1,1)`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)` (only for small pops); durations `--t-fast 120ms`, `--t-base 200ms`, `--t-panel 320ms`, `--t-slow 600ms`.

| Moment | Motion |
| --- | --- |
| page load, hero | photo fades in from its blur placeholder (400 ms) and settles from scale 1.04 → 1 (1.6 s, `--ease-out`); headline, lead, search bar fade up 12 px, staggered 80 ms |
| section enters viewport | fade up 16 px, 500 ms, once (IntersectionObserver, threshold .2); cards in a row stagger 60 ms |
| card hover (pointer only) | lift −4 px, `--shadow-2`, photo scale 1.04 over 400 ms; press: scale .98 |
| button press | scale .98, 120 ms; loading: label crossfades to a spinner + "Lädt…", width stays |
| popover open (desktop search panels, menus) | fade + scale .98 → 1 from its anchor, 200 ms; close 150 ms `--ease-in` |
| sheet open (mobile) | slide up from bottom, 320 ms `--ease-out`, backdrop fades to 40 % black; drag handle; swipe down or tap backdrop to close; focus trapped |
| full-screen search (mobile) | the tapped search bar morphs into the screen (View Transition) or slides up; steps slide horizontally 240 ms |
| card → detail | shared-element transition of the photo into the detail hero (View Transitions API where supported, plain navigation otherwise) |
| chart | line draws in left→right (stroke-dashoffset, 900 ms), today's dot pops (scale .6 → 1, `--ease-spring`, 300 ms) after the line arrives, labels fade in |
| big drop number | counts from 0 to −54 % over 700 ms on first view only (not on back navigation) |
| skeletons | shimmer sweep 1.4 s, `--surface-2` → white 60 % → `--surface-2` |
| toasts | slide up 12 px + fade, auto-hide after 4 s, pause on hover |
| live dot | soft pulse (opacity .6 → 1, 2 s) |

`prefers-reduced-motion: reduce`: no movement, no scale, no count-up, no draw-in; only opacity fades ≤ 150 ms. Never animate layout properties that cause jank (only transform/opacity).

---

## 7. Photography

**Goal: every hotel has at least one great, legal photo before launch; most have a gallery.** Photos are the biggest single reason the current site looks cheap: 37 of 87 hotels have a photo, and most of them are street snapshots with parked cars.

### 7.1 Sources, in order

1. **Wikimedia Commons, deeper search (C-104).** Today's pipeline only takes Wikidata's single "image" (P18). Extend it: the hotel's Commons category (Wikidata P373) and a Commons file search for the hotel name, licenses CC0 / PD / CC BY / CC BY-SA only, ≥ 1600 px wide preferred. Collect up to 8 candidates per hotel, score them (resolution, landscape, not a map/logo/interior detail), and render a **contact sheet** into the PR so a session can pick by eye. Runs in GitHub Actions (Wikimedia blocks the cloud IP).
2. **LiteAPI hotel images**, only after Nuitee confirms in writing that we may display them (B-021). Their content API has many professional photos per hotel.
3. **City photos (C-105)** as the fallback when a hotel has nothing usable yet: 2 per city (landscape for heroes, portrait for cards), from Unsplash (Unsplash License: free for commercial use, no permission needed; we credit anyway), self-hosted. Always labelled **Stadtbild** on the photo so nobody thinks it shows the hotel.
4. Never: Google, Booking, Expedia, Tripadvisor or hotel-website photos without written permission; AI-generated hotel photos (misleading).

### 7.2 Selection rules (what makes a photo "premium")

Prefer, in order: exterior at dusk/blue hour with lit windows, pool or terrace, lobby, room, exterior by day. Reject: tourists or cars dominating, crooked verticals that can't be fixed by cropping, construction, signage close-ups, dark/blurry, watermarks, maps, logos. One photo per hotel is marked **hero**; its focal point is stored (`hotels.image_focus`, e.g. `70% 50%`) and used as `object-position` everywhere.

### 7.3 Delivery

- Self-hosted on tidaq.com (C-011c rule stays). Widths 480, 960, 1600 (2400 for home-hero photos), **AVIF + WebP**, quality 60/70, plus a 24 px **LQIP** (blurred base64) per photo in the generated manifest for blur-up.
- Aspect ratios: cards 4:5, wide cards 16:10, page heroes 16:9 desktop / 4:5 mobile, thumbnails 1:1. Crops come from the focal point.
- The hero image of a page is preloaded (`fetchpriority="high"`), everything else lazy.
- **Credit:** a small tag in the photo's corner (`caption`, white on rgba(21,19,28,.5), radius 6) with "Foto: Name, Lizenz", linked to the Commons page. On cards only "Stadtbild" is shown; credits for card photos sit on the hotel page.
- `alt`: "<Hotel> in <Stadt>: <what's in it>" (e.g. "The Peninsula Beverly Hills in Los Angeles: Einfahrt mit Palmen").

### 7.4 Home and section photos

Not hotel-specific: from Unsplash, chosen per §7.2, self-hosted. Home hero: rooftop loungers at sunset (Zaid's reference photo). Rotates? No: one fixed hero, changed by hand when the season changes.

---

## 8. Charts and data visuals

Own SVG components (D-17). Shared rules: a title that says what is shown ("Preis für diese Nacht, jeden Morgen gemessen"), labels in words where possible, 3 gridlines max, axis text `caption` in `--muted`, tabular numbers, the line in `--ink`, good/bad only in `--good`/`--high`, no legends when direct labels work, no 3D, no shadows on lines, no rainbow.

| Visual | Where | Spec |
| --- | --- | --- |
| **Story chart** | drop page, drop share image | 14 days of this stay's price: line at the old level, then the drop to today. Direct labels: "2.500 € · zwei Wochen lang" above the line, "heute 1.139 €" at the green dot. Area under the line `--surface-accent`. Dates only at both ends. 176 px tall on phones. |
| **Price history** | stay page | line + area (`--accent-soft` → transparent), a soft grey band for the usual range (p25–p75) labelled "üblich", a small marker at the lowest point ("Tief 1.040 €"), today's dot in the verdict color. Range toggle **14 T · 30 T · Alles** (segmented control). Scrub on hover/touch: vertical hairline + floating pill "Mo, 12. Okt · 1.180 € · Booking.com"; keyboard: arrows move the scrub point; `aria-live` announces the value. |
| **Verdict meter** | stay page, home result example, drop page | three zones Günstig · Normal · Teuer (from the stay's percentiles), a white knob with ink ring at today's price, the zone label under it in its color. One sentence under the meter: "Sonst um 2.500 €. Heute zahlst du 1.361 € weniger." |
| **Price calendar** | hotel page, date popover | each night a cell with day number and price (e.g. "412"), tinted by the 5-step price-level scale (§3.1); today outlined; selected range filled `--ink` with white text; legend "günstiger ← → teurer" as a 5-swatch strip. |
| **Site comparison** | stay page | horizontal bars per booking site, sorted cheapest first, cheapest bar `--good` with "Günstigste", others `--line-strong` with "+84 €". Site logo-less (names), trust score chip next to each. |
| **Sparkline** | drop and hotel cards (optional) | 64 × 20, last 14 days, no axes, end dot in verdict color. Only if it reads at that size in review; otherwise left out. |

Empty and short-history states are designed: "Noch 3 Tage, dann zeigen wir den Verlauf" with a dashed skeleton line, never an empty box.

---

## 9. Search and booking flow (the core UX)

The search is where the first version felt dead. It must feel like Airbnb.

### 9.1 Desktop (≥ 1024)

The hero holds a white **search bar** (radius 28, `--shadow-3`, 76 px tall) with three segments and a button: **Hotel oder Stadt · Reisedaten · Gäste · [Preis prüfen]**. On scroll past the hero, a compact version docks into the navbar (fade + slide, 200 ms).

- **Hotel oder Stadt:** click → the segment turns white-on-`--surface-2` (active) and a **destination panel** (480 px, radius 28) opens under it. Empty input shows "Beliebte Städte" as 8 photo chips (40 px round photo + name) and "Gerade günstig" with 3 hotels (thumbnail, name, city, "−31 %"). Typing filters hotels and cities live (diacritics-insensitive: "zurich" finds Zürich), highlighting the match. Each row: 48 px rounded thumbnail, name, city, a small "Price Drop" badge if it has one today. Keyboard: ↑/↓, Enter, Esc. Picking moves focus to Reisedaten automatically.
- **Reisedaten:** a **two-month calendar popover** (720 px). If a hotel is picked, each night shows its price and price-level tint from the night grid, so you *see* the cheap nights (that's our superpower). Tabs: **Genaue Daten · Flexibel** (Flexibel: "Ein Wochenende im November" → the 3 cheapest weekends as cards). Range selection: first click = check-in, hover previews the range, second click = check-out; nights count shows ("2 Nächte"). Max 30 nights. Past days disabled. Footer: "Daten löschen" + "Weiter".
- **Gäste:** small popover with steppers (Erwachsene 1–4, Kinder later), default 2.
- **Preis prüfen:** see §9.3.

### 9.2 Phone (< 768)

The hero shows a single tappable pill "Wohin? · Hotel oder Stadt" (56 px). Tap → **full-screen search** (the pill morphs into it):
1. **Wohin?** input autofocused, keyboard up, same rows as desktop, popular cities as a horizontal photo-chip row.
2. **Wann?** vertically scrolling months (like Airbnb), price tints when a hotel is picked, sticky footer "Überspringen · Weiter".
3. **Wer?** steppers.
Sticky bottom bar on every step: "Alles löschen" (text) and **Preise ansehen** (accent). Close with ✕ top-left; back arrow between steps; Android back / swipe-back closes the step, not the page. Selections persist if closed.

### 9.3 Submitting

| Input | Goes to |
| --- | --- |
| hotel + dates | stay page `/hotel/<slug>/<in>--<out>?adults=n` |
| hotel only | hotel page (calendar opens with the price tints) |
| city (± dates) | city page with dates applied: hotels sorted by "gerade günstig" for those dates |
| nothing | the destination panel opens and the input gets a gentle shake (6 px, 2×) + "Wähl ein Hotel oder eine Stadt." |

The button shows a spinner while navigating; the target page renders its **skeleton** immediately (`loading.tsx` per route with the real layout: photo block, title bars, chart frame), then content fades in. Never a blank screen or a jump to the top without feedback.

### 9.4 Going to the booking site

Primary button "Bei Trip.com ansehen · 1.139 €" (`rel="sponsored nofollow"`, new tab), "Partnerlink" under it. On tap: a 1.2 s **handoff sheet** is *not* used (it would slow people down); instead the button shows "Öffnet Trip.com…" and the new tab opens. Price disclaimer stays one line: "Prüf den Preis vor dem Buchen, er ändert sich oft."

---

## 10. Pages, frame by frame

Order inside each page = top to bottom on a phone. "→" means a link or tap target. Every page lists its **hero fact**, its **states** and the **text we drop** compared with today (inventory of 15 Oct). Data, routes and server logic stay as they are unless a line says otherwise; this is a presentation overhaul.

### 10.1 Home `/`

Hero fact: *Is your hotel cheap right now?* + today's Price Drops.

1. **Hero** (phone 620 px tall, desktop 760): full-bleed photo (rooftop loungers at sunset), `--scrim-top` + `--scrim-bottom`. Transparent navbar on top (white wordmark and links). Content bottom-left: live pill "Live · heute 07:08 aktualisiert" (green dot pulsing; time = last collection run; hidden if older than 36 h), `display` headline **"Ist dein Hotel gerade günstig?"** (white, weight 650), lead "Wir prüfen jeden Morgen 83 Fünf-Sterne-Hotels. Du siehst sofort, ob sich Buchen gerade lohnt." (desktop) / "Wir prüfen jeden Morgen 83 Fünf-Sterne-Hotels." (phone). Desktop: the search bar (§9.1) overlaps the hero's bottom edge by 46 px. Phone: the "Wohin?" pill sits inside the hero, 24 px from the bottom (§9.2).
2. **Trust row:** one line, centered, `small` `--muted`: "Booking.com, Expedia, Trip.com und Agoda im Vergleich · kostenlos". No icons.
3. **Price Drops heute:** `h2` + lead "Über Nacht bis zu 70 % billiger." (the % is today's biggest drop; if none ≥ 20 %: "Über Nacht deutlich billiger.") and → "Alle 24" (count). Grid: 2 columns on phones, 4 on desktop, 4 cards (§11 DropCard). Empty: the section is replaced by a quiet card "Heute keine großen Price Drops. Morgen früh schauen wir wieder." + → "Price Alert aktivieren".
4. **Beliebte Ziele:** `h2` + → "Alle 27". Phone: horizontal snap row of 240 × 300 photo tiles; desktop: bento grid (1 large 2×2 + 4 small, row height 260). Each tile: city photo, `--scrim-bottom`, city name (24/34 px, 650) and "3 Hotels · 2 Price Drops heute" (omit the drops part when 0). Cities ordered by today's drops, then by popularity. → city page.
5. **Result example "Grün heißt: jetzt buchen."** (`--surface-accent` panel, radius 28): left the heading + "Wir vergleichen den Preis von heute mit den letzten Wochen. Ein Blick, und du weißt Bescheid."; right a live **Verdict card** (§11) for a real featured stay (today's best "Gerade günstig" stay with a photo; fallback: the sample from `lib/sampleStay.ts` labelled "Beispiel"). Card CTA "Zu Booking.com · 634 €" + "Partnerlink".
6. **Aus unseren Videos** (only for visitors arriving from `/tiktok` or `/instagram`, and on the Price Drops page; see 10.2).
7. **Price Alert** (dark `--night` section): pill "Price Alert", `h2` "Verpass keinen Price Drop.", lead "Wir schreiben dir, sobald ein Hotel in deiner Stadt plötzlich billiger wird. Max. eine E-Mail am Tag.", a one-line white form (E-Mail · Stadt · [Aktivieren]) and "Kostenlos. Abmelden mit einem Klick." Next to it (below on phones): **3 stacked alert previews** built from real drops (thumbnail, "tidaq · Price Alert", time, "−54 % im Peninsula Beverly Hills", "1.139 € statt 2.500 € · Fr, 6. Nov"), each one slightly more indented and faded, so it reads as an inbox. Success state: the form morphs into "Fast geschafft: Bestätige die E-Mail, die wir dir gerade geschickt haben." with a check icon.
8. **Footer** (§12).

Removed: HowItWorks cards, the "Eine klare Antwort / 25 Zahlen" idea, the Kassenbon teaser (it moves to the Kassen-Check page, 10.10), Deals teaser (Deals live inside Price Drops, 10.9), FinalCta (the docked search bar replaces it), hero blobs, the eyebrow "Fünf-Sterne-Hotels", the "tief/hoch" headline.

Motion: §6 hero sequence; drop cards and city tiles fade up with stagger; alert previews slide in from the right one after another (100 ms stagger) when the section enters.

### 10.2 Price Drops `/price-drops` (today `/preissturz`)

Hero fact: the biggest drop of the day.

1. Navbar solid (white).
2. **Header:** for bio-link visitors a welcome pill "Hi! Schön, dass du von TikTok kommst." (Instagram accordingly), then `h1` "Price Drops heute", one line "Stand 07:08 · 31 Nächte in 24 Hotels günstiger" with the live dot.
3. **Aus unseren Videos** (bio-link visitors only): horizontal row of compact cards (photo, hotel, "Im Video vom 12. Okt", pill "Läuft noch" green / "Vorbei" neutral).
4. **Drop of the day** (default sort, no filter): large card, photo 16:9 (phone 4:5) with the % badge in `hero-number`-like 40 px on the photo, hotel, city · date, `price-xl` + "statt 2.500 €", button "Ansehen". Whole card is the link.
5. **Filter bar** (sticky under the navbar when scrolling, white with `--shadow-1`): horizontally scrollable chips: **Alle Städte ▾** (opens a sheet/popover with city list + photo chips), **Wann ▾** (Nächste 7 Tage / 30 Tage / Später), **Wochenende** (toggle), **Sortieren ▾** (Größter Drop / Meiste Ersparnis / Bald). Selected chips fill `--ink` with white text. Changing a filter updates the URL (shareable) and the grid without a full reload; results fade/cross-fade (200 ms).
6. **Grid** of DropCards: 2 columns phone, 3 tablet, 4 desktop. Load 24, then "Mehr anzeigen" (no infinite scroll, footer must stay reachable).
7. **Price Alert** section (same as home, light variant on `--surface-accent`).
8. **"So erkennen wir einen Price Drop"**: collapsed accordion (one line visible), 5 bullets inside.

States: empty unfiltered ("Heute keine Price Drops. Morgen ab 7 Uhr schauen wir wieder." + alert CTA), empty filtered ("Keine Treffer mit diesen Filtern." + "Filter zurücksetzen"), unavailable (§10.16 style).

Removed: the proof checklist (moves into the accordion), the long intro, "Auch günstiger" lists on cards.

### 10.3 Drop page `/price-drops/<hotel>/<stay>` (the TikTok landing; mockup "B · Preissturz-Seite")

Hero fact: **−54 %**.

1. **Photo hero** (phone 400 px, desktop: two columns, photo left 7/12 at 4:3): hotel photo with `--scrim-top`; floating round buttons (44 px, white 92 %): back (→ Price Drops) and share. Credit tag bottom-right. Shared-element transition from the card photo.
2. **Content sheet** overlapping the photo by 28 px (radius 28 top, phone only): `small` "Los Angeles · Fünf Sterne" (→ city), `h1` hotel name, chips "Fr, 6. Nov" "1 Nacht" (+ "3 Erwachsene" only when not 2).
3. **Drop card** (white, radius 26): chip "Price Drop seit gestern" (green soft, trend icon), `hero-number` **−54 %** in `--good` (counts up once), "**1.139 €** statt 2.500 € gestern" (`price-xl`), divider, check icon + "Tiefster Preis, seit wir messen." (or "Tiefster Preis seit 21 Tagen.").
4. **Primary button** full width, 60 px: "Bei Trip.com ansehen" left, "1.139 € →" right; under it "Partnerlink. Prüf den Preis vor dem Buchen, er ändert sich oft." Desktop: the drop card + button sit in a sticky right column.
5. **Share row**: "Teilen" (Web Share sheet: link + story image), "Als Story" (generates the 1080×1920 image, §10.18), "Link kopieren" (toast "Link kopiert"). Icon + label buttons, secondary style.
6. **"So hat sich der Preis bewegt"**: story chart (§8) in a white card.
7. **"Günstig oder teuer?"**: verdict meter + "Sonst kostet diese Nacht um 2.500 €. Heute zahlst du 1.361 € weniger."
8. **"Weitere Price Drops hier"**: rows for this hotel's other dropped stays (dates, nights, green % chip) → their drop pages.
9. **Price Alert für dieses Hotel** (`--surface-accent` box): "Wir sagen Bescheid, wenn das Peninsula wieder billiger wird." + email + "Price Alert aktivieren".
10. **"Mehr Price Drops heute"**: 4 DropCards (2×2 on phones).
11. One line: "Gesamtpreis für 2 Erwachsene inkl. Steuern, günstigste geprüfte Seite. → So messen wir".

States: **over** ("Dieser Price Drop ist vorbei." The photo stays, grayscale 40 %; the old prices struck through; buttons "Aktuellen Preis ansehen" and "Alle Price Drops"; alert box stays), not found (404), unavailable.

Removed: "gesehen …" line, "Alle Anbieter und Preisverlauf" as a second big button (becomes a text link "Alle Seiten und Preisverlauf →" under the chart), duplicate saved/usual lines.

### 10.4 Weekly recap `/price-drops/woche`

Hero fact: "Die 10 größten Price Drops dieser Woche".
1. Header: `h1`, date range, a 3-number stat strip (Price Drops · Hotels · größter Drop −70 %) in big numbers with small labels (no more than 3).
2. **Top 10**: numbered list; rank in a 32 px ink circle, 88 px thumbnail, hotel, date, price "statt", green % chip. Rows → drop/stay page.
3. **"Wo es am meisten fiel"**: city photo tiles (like home 10.1 §4, small) with "5 Price Drops".
4. Price Alert section. States: empty week, unavailable.

### 10.5 Stay page `/hotel/<slug>/<in>--<out>`

Hero fact: **the verdict** ("Gerade günstig", price, meter).

1. **Compact photo header**: phone: 220 px photo strip with scrim, back/share buttons, hotel name in white at the bottom; desktop: 320 px wide banner with the name on the left over the scrim. Credit tag.
2. **Stay bar** (sticky under the navbar once scrolled): "Fr, 6.–8. Nov · 2 Nächte · 2 Erw." + "Ändern" → opens the search (dates step pre-filled) as a sheet/popover, not an inline form.
3. **Verdict card**: state chip (Gerade günstig / Normaler Preis / Gerade teuer), `price-xl` total + "· 570 € pro Nacht", the **meter**, one sentence ("Günstiger als an 18 von 21 Tagen."), primary button "Bei Booking.com ansehen · 1.139 €" + Partnerlink line. When this stay has a Price Drop: a green strip on top of the card "Price Drop seit gestern: −31 %" → drop page.
4. **"Preisverlauf"**: price history chart (§8) with the range toggle; under it 3 small stats in a row (Tief · Üblich · Hoch, each `price-l` + date in `caption`).
5. **"Wo am günstigsten"**: site comparison bars (§8), each row → `/go/` (Partnerlink label once in the header). Trust score chip per site (→ provider page). "an der Kasse ≈ +40 €" in `--high` where known.
6. **Preis beobachten** (`--surface-accent` box): "Wir sagen Bescheid, wenn der Preis fällt." + email + optional Wunschpreis + consent + button. Success morph like 10.1.
7. **"Andere Termine in diesem Hotel"**: horizontal row of date cards (dates, total, verdict chip) → stay pages; → "Alle Nächte im Kalender" (hotel page).
8. Method line → So messen wir.

States (each designed, all keep the photo header and stay bar): **collecting** (verdict card shows today's price, "Noch 3 Tage, dann sagen wir dir, ob der Preis gut ist." and a 7-dot progress row; chart in short-history state), **no data**, **untracked** (night-sum estimate with label "Schätzung aus Einzelnächten"), **past** ("Dieser Aufenthalt ist vorbei." + "Neue Daten wählen"), **inactive**, unavailable.

Removed: HistoryNote paragraph (→ an info "i" popover next to the chart title), the StatsRow + advice band duplication (advice merges into the verdict sentence), "So entsteht die Einschätzung" text block (→ link), "Stand/Quelle" lines (→ one caption under the chart).

### 10.6 Hotel page `/hotel/<slug>`

Hero fact: **the cheapest dates** for this hotel.

1. **Gallery hero**: phone: swipeable full-width photos (4:5, dots indicator, counter "1/6"); desktop: 1 large + 2 stacked photos (radius 22), "Alle Fotos" button opens a full-screen lightbox (swipe/arrow keys, credits per photo). Hotels with one photo: one large photo.
2. **Title block**: `h1` hotel name, "Fünf Sterne · Los Angeles" (→ city), a Price Drop chip if it has one today (→ drop page).
3. **"Günstigste Termine"**: 2 cards side by side (Wochenende Fr–So · Unter der Woche Di–Do): dates, total, "pro Nacht", → stay page.
4. **Price calendar** (§8): month view, 1 month on phones (swipe between months), 2 on desktop; picking a range shows a bottom bar "Fr 6.–So 8. Nov · 2.278 € bei Booking.com · [Preisverlauf]".
5. **Price Alert für dieses Hotel** box.
6. **Andere Hotels in Los Angeles**: 3 cards.

States: no nights yet ("Die Preise jeder Nacht kommen ab morgen früh." + alert CTA), unreliable nights (calendar without totals + one-line note), inactive, 404, unavailable.

### 10.7 City page `/stadt/<city>`

Hero fact: which of the city's hotels is cheap right now.
1. **City hero** (phone 360 px, desktop 480): city photo, `h1` "Fünf-Sterne-Hotels in Paris" in white, "3 Hotels · 2 Price Drops heute".
2. **Hotel list**: one large card per hotel (photo 16:10, name, verdict chip for the cheapest weekend, "Günstigstes Wochenende: 13.–15. Nov · 1.480 €" → stay page). Sorted: hotels with a drop first, then cheapest weekend relative to their usual price.
3. **Price Drops in Paris** (if any): DropCards.
4. **Price Alert für Paris** (city preselected).
5. Other cities row (photo chips).

### 10.8 All hotels `/hotels` and cities

`h1` "27 Städte, 83 Hotels". Region tabs (Deutschland · Europa · Naher Osten · Asien · Amerika) as a segmented control; under each, city tiles (photo, name, hotel count) and, expanded per city, the hotel names with thumbnails. Search field at the top filters live. No plain link lists.

### 10.9 Deals `/deals`

Becomes a filter of the Price Drops page: "Unter dem üblichen Preis" (stays ≥ 10 % under their 30-day average, not only sudden drops). The route redirects to `/price-drops?ansicht=guenstig`; the newsletter sign-up moves to the Price Alert box ("Jeden Montag die besten Preise" checkbox). Decided in C-114; until then `/deals` gets the new card and chip styles only.

### 10.10 Kassen-Check `/kassen-check` (today a 404, linked from nav and footer)

New page (C-119). Hero fact: "In 6 von 25 Tests war der Preis an der Kasse höher." (live numbers). Sections: what we test (3 short steps with a receipt illustration: the current Kassenbon component restyled), provider scores (list of sites with trust score bars → provider pages), method link. Until C-119 the nav and footer links point to `/methodik#anbieter` so nothing 404s (fixed in C-106).

### 10.11 Provider page `/anbieter/<slug>`

Header with the site name and its big **trust score** (0–100, ring chart 88 px). Two fact cards (Preistreue an der Kasse · Preise in unserer Abfrage) as 2×3 stat grids with plain-word labels. Other providers as chips.

### 10.12 Method `/methodik` ("So messen wir")

A visual explainer, not a wall of text: 4 steps with small diagrams (1 "Jeden Morgen um 7 Uhr" clock, 2 "4 Buchungsseiten" logos-as-text chips, 3 "Gesamtpreis inkl. Steuern" receipt, 4 "Vergleich mit den letzten Wochen" mini chart), then the live fact strip, then the detailed text in accordions.

### 10.13 Ranking `/ranking`, affiliate notice, Impressum, Datenschutz

Text pages: one 680 px column, `h1`, "Stand", sticky in-page table of contents on desktop (left), headings every section, body 17 px / 1.6, links in `--accent` with underline offset 3 px. English pages keep the "German is binding" box.

### 10.14 Alerts: confirm `/price-alert/bestaetigen`, manage `/price-alert/verwalten/<token>`

Confirm: centered card with a check illustration, "Bestätige deinen Price Alert" + one button; after confirming: success state with what they will get ("Du bekommst eine E-Mail, wenn …") and → "Price Drops ansehen". Manage: `h1` "Deine Alerts", email, then grouped cards (Preis beobachten · Price Alerts für Hotels · Städte · Newsletter) each with a quiet "Beenden" button; confirmation toasts instead of query-param notices; danger zone "Alles abbestellen und Adresse löschen" at the bottom with a confirm dialog.

### 10.15 Bio-link landings `/tiktok`, `/instagram`

Redirect to Price Drops with the welcome pill and "Aus unseren Videos" first (as today).

### 10.16 Status pages: 404, error, unavailable

Full-bleed calm photo (an empty hotel corridor or lobby at night, Unsplash) with scrim, white `h1` ("Diese Seite gibt es nicht." / "Da ist etwas schiefgelaufen." / "Preise gerade nicht erreichbar."), one sentence, primary "Zur Startseite" + secondary "Price Drops ansehen" (404) or "Nochmal versuchen" (error). Unavailable states inside pages use a compact inline version (icon, sentence, retry).

### 10.17 Loading states (new: there are none today)

Every route gets a `loading.tsx` skeleton that mirrors its real layout (photo block, title bars, chip row, card grid, chart frame) with the shimmer (§6). Content replaces the skeleton with a 200 ms fade, never a layout jump (skeleton sizes = real sizes).

### 10.18 Things that leave the site: emails, link previews, story images

- **Emails** (C-083 template): switch to the new tokens, Instrument Sans with system fallback, the new symbol in the header, Price Drop / Price Alert wording, hotel thumbnails in drop items.
- **OG cards** (`og-drop` edge function, default OG image): Instrument Sans, `--good` badge, photo full-bleed left, wordmark + symbol.
- **Story image** (1080×1920, `storyImage.ts`): photo top 60 % with scrim, huge −54 %, hotel, "1.139 € statt 2.500 €", date, wordmark + "tidaq.com" footer; bg `--night`.

---

## 11. Components

Each lives in `apps/web/components/ui` (primitives) or its feature folder and is shown on `/dev/ui` with all states. Names in brackets are today's components that are restyled instead of replaced.

| Component | Spec |
| --- | --- |
| **Button** [Button] | Variants: `primary` (accent fill, white, radius 16, 52 px; 60 px `lg`; 44 px `sm`), `secondary` (white, 1 px `--line-strong`, ink text), `ghost` (no border, ink text, hover `--surface-2`), `on-photo` (white 92 % + blur 12 px, ink), `dark` (ink fill, white). States: hover (accent → `--accent-hover`), pressed (scale .98), focus ring, disabled (40 % opacity, no pointer), loading (spinner + "Lädt…", width locked). Optional trailing slot for a price ("1.139 € →"). No gradients. |
| **IconButton** | 44 px circle, variants as Button; always `aria-label`. |
| **Chip / FilterChip** [Chip] | 36 px pill; default white + border; selected `--ink` fill white text; with ▾ for menus; scrollable chip rows fade at the edges (mask). |
| **Badge** [Badge] | Drop badge (green fill, white, 700, `−54 %`), status chips (good/normal/high soft fills with a dot), "Stadtbild"/credit tag (6 px radius, dark 50 %). |
| **Photo** (new) | Wraps every hotel/city image: `slug` + `variant` (card/hero/thumb), picks the right width/format, blur-up LQIP, focal point, optional credit tag or "Stadtbild" tag, fallback to the city photo; rounded per context; `alt` required. |
| **DropCard** [DropCard] | Photo 4:5 (radius 22/18), drop badge top-left, "Wochenende" white badge top-right, then title (`h3`, 1 line, ellipsis), meta "Los Angeles · Fr, 6. Nov", price line "**1.139 €** statt 2.500 €". Whole card one link. Hover per §6. Compact variant for 2-column phones (title 15 px). |
| **CityTile** (new) | Photo tile with scrim, name, counts; sizes `l` (bento hero), `m`, `chip` (40 px round photo + name, for search panels). |
| **VerdictCard** [VerdictBlock] | Hotel line (thumb, name, dates), state chip, price-xl + context, meter, sentence, CTA + Partnerlink. Variants: `full` (stay page), `teaser` (home). |
| **Meter** [RangeBar] | §8. |
| **PriceChart** [PriceChart + ChartScrub] | §8. |
| **StoryChart** (new) | §8. |
| **SiteBars** [ProviderTable] | §8, rows ≥ 56 px, whole row links. |
| **PriceCalendar** [PriceCalendar + DateRangePicker] | One calendar engine for the hotel page and the date popover/sheet; §8 + §9. |
| **SearchBar / SearchSheet** [SearchCard, HotelCombobox] | §9. |
| **Sheet** (new) | Bottom sheet for phones (drag handle, snap to content height, max 92 dvh, swipe-to-close, focus trap, scroll lock) and its desktop popover sibling. Built on `<dialog>`. |
| **Field** [Field] | 56 px, radius 12, white, 1 px `--line-strong`, label above (13 px 600), focus: 2 px accent ring; error: `--high` border + message with icon; success check for email after valid. |
| **AlertForm** [DropAlertForm, WatchForm, NewsletterForm] | One visual pattern: inline (email + select + button in one white row, desktop) / stacked (phone); success morphs in place (check icon, 1 sentence); errors one line; Turnstile invisible. |
| **Toast** [Toast] | Ink pill, white text, icon, bottom center (phone, above the safe area) / bottom right (desktop). |
| **Skeleton** [Skeleton] | Shimmer blocks with the real radii. |
| **Accordion** (new) | For method/explanations; 56 px rows, chevron rotates, content fades. |
| **Segmented** (new) | 14 T · 30 T · Alles; region tabs; 40 px, `--surface-2` track, white thumb slides (200 ms). |
| **Icon** [Icon] | Lucide, stroke 1.75 (2 at ≤ 16 px), sizes 16/20/24. Allowed set grows only via this table. |

---

## 12. Shell

- **Navbar:** 64 px phone / 72 px desktop. Over photo heroes: transparent with white content; after 64 px of scroll (or on pages without a photo hero): `--bg` 85 % + blur 16 px + 1 px `--line` bottom. Desktop: wordmark+symbol left; center links **Price Drops · Hotels · Städte**; right DE/EN switch (small, text), **Price Alert** (secondary button); once the hero search scrolls away, a compact search pill appears in the center ("Hotel oder Stadt · Daten · Gäste", 48 px) that opens the full search panel in place (no jump to `/#suche`). Phone: wordmark left; right a search icon (opens the full-screen search) and the menu button.
- **Mobile menu:** full-screen sheet from the right (320 ms), big links (28 px, 650) Price Drops · Hotels · Städte · Kassen-Check · So messen wir, below a "Price Alert aktivieren" primary button, language switch as two pills at the bottom, a small photo strip of 3 city photos for atmosphere.
- **Footer:** `--bg`, top border. Wordmark + symbol, tagline "Preise für Fünf-Sterne-Hotels. Jeden Morgen neu geprüft.", 3 link columns (Entdecken · Transparenz · Rechtliches), bottom line "© 2026 Tidaq · ohne Cookies · Partnerlinks sind gekennzeichnet." + language switch. Phones: 2-column link grid.
- **Skip link**, focus order, `lang` per locale: unchanged requirements.

---

## 13. Quality bar for every overhaul PR

1. Built from this file; anything new is added here in the same PR.
2. Screenshots at 390, 768, 1280 (and 1440 for home) attached to the PR description as a contact sheet (Playwright), before → after.
3. Real data and real German copy; long hotel names (e.g. "Four Seasons Hotel Bangkok at Chao Phraya River") and umlauts checked; empty, loading and error states rendered on `/dev/*`.
4. Keyboard: every control reachable, visible focus, Esc closes overlays, focus returns to the trigger. Screen reader names for icon buttons, charts (`role="img"` + summary), live regions for async results.
5. Contrast AA (axe in e2e, C-041a), reduced motion honored.
6. Performance: Lighthouse mobile ≥ 90 on home, Price Drops, drop page, stay page, hotel page; LCP image preloaded; no layout shift from fonts or images (CLS < 0.05); JS per route doesn't grow > 15 kB without a reason in the PR.
7. Visual baselines updated through the Visual baselines workflow when the PR changes UI on purpose.
8. Self-review against §1 tests (squint, 3-second, screenshot, remove).

---

## 14. Build plan

Tasks are in `docs/TASKS.md` under **Phase 3b: Clean Premium overhaul** in this order. Each is one PR. Foundations first, so later pages get the look for free; then the search (the core UX); then the pages by traffic (drop page and home first, they get the TikTok visitors); then the rest; then polish. Production stays on the old build until launch (D-38), so the overhaul ships to staging piece by piece.

| ID | Task | Size | Depends on |
| --- | --- | --- | --- |
| C-100 | This spec, the decision D-44, the task list | S | – |
| C-101 | Mockups v2 (Zaid's feedback) + icon options on the canvas | S | C-100 |
| C-102 | Foundations: tokens (§3), Instrument Sans, type styles, spacing, radii, shadows, motion tokens + reduced motion, focus ring; delete Soft Modern tokens and hero blobs; `/dev/ui` updated | M | C-100 |
| C-103 | Primitives: Button, IconButton, Chip, Badge, Field, Toast, Skeleton (shimmer), Segmented, Accordion, Sheet/Popover (§11) | M | C-102 |
| C-104 | Photos A: Commons category + search sweep for all hotels in GitHub Actions, contact sheets, picks, focal points, 3 widths AVIF/WebP + LQIP, `Photo` component | M | C-102 |
| C-105 | Photos B: 2 city photos per city (Unsplash, self-hosted), home/status photos, fallback wiring with "Stadtbild" tag; **every hotel shows a real photo** | S | C-104 |
| C-106 | Shell: navbar (transparent → solid, docked search pill), mobile menu, footer, wordmark + new symbol, favicon/app icons/manifest; fix the `/kassen-check` 404 links | M | C-103, B-020 |
| C-107 | Search 1: desktop search bar + destination panel (photo chips, thumbnails, live filter, keyboard) | M | C-103, C-105 |
| C-108 | Search 2: calendar engine with price tints + flexible weekends; date popover (desktop) and guests popover | M | C-107 |
| C-109 | Search 3: phone full-screen search (3 steps, sticky bar, transitions, back handling) | M | C-108 |
| C-110 | Search 4: submit routing (§9.3), button loading, `loading.tsx` skeletons for every route (§10.17) | S | C-109 |
| C-111 | Charts 1: price history redesign (area, usual band, low marker, scrub pill, range toggle, draw-in, short-history state) | M | C-102 |
| C-112 | Charts 2: Meter, StoryChart, SiteBars, calendar cells, sparkline evaluation | M | C-111 |
| C-113 | Drop page (10.3) incl. over state, share row, story image re-skin | M | C-105, C-112 |
| C-114 | Price Drops page (10.2) + route rename `/price-drops` with 308 redirects, sticky filter bar, Deals as a view (10.9) | M | C-113 |
| C-115 | Home (10.1) | M | C-110, C-114 |
| C-116 | Stay page (10.5) incl. all states | L → a/b | C-110, C-112 |
| C-117 | Hotel page (10.6): gallery + lightbox, cheapest dates, calendar | M | C-112, C-104 |
| C-118 | City page + all hotels (10.7, 10.8) | M | C-105 |
| C-119 | Kassen-Check page (new), provider, method, ranking, legal pages (10.10–10.13) | M | C-103 |
| C-120 | Alerts confirm/manage, status pages, weekly recap (10.4, 10.14, 10.16) | M | C-103 |
| C-121 | Emails, OG cards, default OG image re-skin (10.18) | S | C-106 |
| C-122 | Copy pass: glossary (§4.2) everywhere in de/en, text budgets, remove listed text; "Price Drop"/"Price Alert" in emails and URLs (`/price-alert/…` redirects) | S | C-115 |
| C-123 | Polish + QA: §13 on every page at 4 widths, Lighthouse, axe, WebKit (iPhone Safari) e2e, visual baselines, before/after contact sheet for Zaid | M | all above |

Zaid touchpoints: B-020 (pick the symbol, 2 min), B-021 (one email to LiteAPI about images, 3 min, optional), and two 10-minute phone reviews on staging after C-115 and after C-123 (Z-13, Z-14).
