# Tidaq craft spec (v1, 13 Oct 2026)

`DESIGN.md` sets the direction (Soft Modern, D-20). This file sets the **craft bar**: exact sizes, states, motion and wording that every UI PR is built and reviewed against. It merges three expert reviews (art direction, benchmark research, UX and copy), stored in `docs/design/research/`. If this file and DESIGN.md disagree, DESIGN.md has been updated in the same PR. Items marked **Δ** changed DESIGN.md.

**The bar:** someone who has used Stripe, Linear, Revolut and Airbnb should find nothing that looks unconsidered. Calm, exact and honest. Every number has a source and a time.

## 1. Principles

1. **One job per screen.** Homepage: find your hotel. Stay page: watch the price or go to the offer. Never two primary buttons in view.
2. **Facts, not forecasts.** Verdicts describe the past ("günstiger als an 52 der letzten 60 Tage"). Never "wird fallen". Say it plainly: "Ob er weiter fällt, weiß niemand."
3. **Every number has a source and a time.** Prices show "Stand: heute, 07:12 Uhr" (Europe/Berlin), the total, the nights and the guests.
4. **Honest charts.** No splines that invent lows, no bare truncated axes, gaps stay gaps.
5. **Typographic correctness is a feature.** Small €, narrow no-break spaces, real minus signs (−), en-dash date ranges, the Ø sign.
6. **Quiet by default, one moment of ink.** Lavender and white everywhere. The only dark surfaces are the chart tooltip and toasts.

## 2. Foundations

### Font
Plus Jakarta Sans as a **variable font**: one file, weights 200–800, self-hosted via `next/font` with no fixed weight list. Use 500 (body), 600 (buttons, labels, nav), 700 (card titles, small emphasis), 800 (display, prices). Set `-webkit-font-smoothing: antialiased`. No italic file.

### Type scale (390 px → 1280 px) Δ

| Role | Size | Weight | Tracking | Line-height | Max width |
|---|---|---|---|---|---|
| Display (H1) | 38 → 60 | 800 | −0.035em | 1.04 | 16ch |
| H2 | 28 → 40 | 800 | −0.03em | 1.1 | 22ch |
| Title (hotel on stay page) | 22 → 28 | 800 | −0.025em | 1.15 | — |
| H3 (card title) | 18 → 20 | **700** | −0.015em | 1.25 | — |
| Lead (hero subline) | 17 → 19 | 500 | −0.005em | 1.5 | 46ch |
| Body | **16** → 16.5 | 500 | 0 | 1.55 | 65ch |
| Meta | 13 → 13.5 | 500 | 0 | 1.45 | — |
| Field label | 12.5, **sentence case** | 600 | 0.005em | 1.2 | — |
| Eyebrow (short words only) | 12, uppercase | 700 | 0.1em | 1.3 | — |
| Button | 14 / 15 / 16 (sm/md/lg) | 600 | −0.005em | 1 | — |

**German text**
- Body gets `hyphens: auto`.
- Headlines get `text-wrap: balance`, with a manual `&shy;` in long compounds.
- Cards get `overflow-wrap: anywhere`.
- Never uppercase text containing ß (CSS turns it into "SS").

### Numbers and prices
- `tabular-nums` in tables, chart axes, stats and anything that changes. The XL price uses proportional digits.
- **Price composition**, via `Intl.NumberFormat#formatToParts`:
  - XL/LG: digits 800 / −0.03em. € at 0.58em, weight 700, `--muted`, on the baseline.
  - The space is a **narrow no-break space (U+202F)** next to the small €, and the price never wraps (`1.184 €` stays D-21's format, just typeset).
  - At text sizes (sm/md): € at the same size with a normal no-break space (U+00A0); the narrow one looked cramped there.
  - EN: `€1,184`, same scaling.
- Totals never show cents. Under every XL price: "gesamt · 592 € pro Nacht · 2 Nächte, 2 Erwachsene".
- Use a real minus `−` (U+2212), NBSP before %, and en dashes in ranges ("1.–3. Dez. 2026").

### Spacing and layout
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 88, 96.
- Tiers: inside a component 4–16; between components 16–32; between sections **56 mobile / 88 desktop** Δ.
- No `border-top` on every section: use space, and occasionally a `--surface-2` band.

| Viewport | Columns | Gutter | Gap |
|---|---|---|---|
| 390 | 4 | 20 | 12 |
| 768 | 8 | 28 | 16 |
| 1280 | 12, max 1080 | 28 | 24 |

- Card padding: flat 20/24, stay panel 20/32, search card 16/20.
- Inside a card: title→meta 4, meta→content 16, between blocks 20.

### Colour (new tokens Δ, all text pairs AA-checked)

| Token | Value | Use |
|---|---|---|
| `--surface-2` | `#FBFAFF` | table header, row hover, inner zones, footer |
| `--line-strong` | `#D6CCF2` | hover borders |
| `--accent-hover` / `--accent-press` | `#5B3BD1` / `#4F31BE` | button states (white text 7.0 / 8.4:1) |
| `--good-soft` / `--bad-soft` / `--warn-soft` / `--neutral-soft` | `#E3F3EC` / `#FBE6EA` / `#F8EDDC` / `#ECE8F6` | **solid** tints behind ink text (5.0–5.7:1) |
| `--ink-surface` | `#221C3B` (= `--fg`) | tooltip, toast |

- Use solid tints, not alpha: `bg-good/15` shifts hue on lavender.
- Shadows have two layers:
  - float: `0 1px 2px rgba(34,28,59,.04), 0 16px 40px -8px rgba(106,73,224,.14)`
  - hover: `0 2px 4px rgba(34,28,59,.05), 0 24px 48px -10px rgba(106,73,224,.20)`
  - Floating cards get border `rgba(106,73,224,.10)`.
- Primary button: `linear-gradient(180deg,#7556E8,#6343DA)` plus `inset 0 1px 0 rgba(255,255,255,.18)`.
- Page blobs: three blobs (adding `#E6DDFF` bottom-left) plus a 2 % SVG grain on the blob layer only. Home and landing pages only.
- `::selection { background: #DDD2FF }`.
- Never put `--muted` text on `--accent-soft`: use `--fg`.

### Icons
**Lucide**, imported per icon through one `<Icon>` wrapper, `currentColor`. Stroke 1.75 at 20/24 px, 2 at 16 px. No emoji and no font glyphs (▼▲ become `TrendingDown`/`TrendingUp`).

### Motion
- Durations: 120 ms (press, colour), 180 ms (hover, chips), 240 ms (popover, sheet), 600 ms (chart draw, once).
- Easing in: `cubic-bezier(.2,.8,.2,1)`. Out: 140 ms `cubic-bezier(.4,0,1,1)`.
- Animate only transform, opacity and colour. Never prices, layout or loops. **No price count-up** Δ (it reads like a slot machine).
- `prefers-reduced-motion`: no draw-in, no lifts or slides (opacity only), static skeletons.

## 3. Components

**Button**
- Heights 36 / 44 / 52; padding-x 16 / 20 / 24; gap 8; icon 16/18.
- Primary:
  - hover: the gradient stays and darkens through an overlay (18 %, animated opacity; swapping `background-image` would snap), −1 px lift, `0 8px 20px -8px rgba(106,73,224,.6)` plus the inset white edge
  - active: overlay 28 %, scale .98; no lift or scale under reduced motion
  - disabled: `--line` background, `#8A84A3` text, no shadow
  - loading: same width, hidden label, 16 px spinner, `aria-busy`
- Ghost: `--surface` background, `--line` border. Hover `--line-strong` border on `--surface-2`.
- Subtle: accent text, hover `--accent-soft`.
- sm (36 px) keeps a 44 px touch target with an invisible ::after band.
- IconButton: 44 px circle.
- Focus: 2 px accent outline, 2 px offset.

**TextField and the search card**
- Min height 60, padding 10×14, radius 18. Value **16 px** 700 (no iOS zoom). Label 12.5 px 600 in sentence case.
- Hover: `--line-strong`.
- Focus-within: white background, accent border, `0 0 0 4px rgba(106,73,224,.14)`, no outer outline.
- Error: `--bad` border and halo, then a row with AlertCircle 14 px and 13 px 600 `--bad-ink` text.
- Fields stacked in one form either all have a leading icon or none, so labels line up.
- Half-width values must fit at 390 px (about 95 px of text): "2 Gäste", not "2 Erwachsene"; hide leading icons in half-width segments below 400 px.
- The search card is **one segmented group**: Hotel (MapPin) full width, then Daten (CalendarDays) | Gäste (Users); 1 px inner dividers. The active segment turns white with an inset accent ring.
- Then an lg block button **"Preise ansehen"** Δ. Below it, 12.5 px muted: "Kostenlos · ohne Konto · ohne Cookies".

**Chip**
- Height 36 (44 px hit area), padding-x 14, 13.5 px 600.
- Off: white background, `--line` border, `--muted-ink` text.
- On: `--accent-soft` background, accent border, `--fg` text, leading Check icon (a non-colour cue).
- On and off have the **same width** (off: 20 px each side; on: 8 left, then the 14 px icon and a 4 px gap, 14 right), so a row never reflows on tap. No wrapping.

**Badge**
- Sentence case, 12 px 600, height 22, padding-x 8, radius **8** Δ, solid soft tints.
- "Partnerlink" (neutral) sits on every affiliate link.

**StateChip**
- Pill, height 28, padding-x 10, 12.5 px 700, a leading 6 px dot in the base colour on the soft tint.
- `collecting`: a 12 px progress ring instead of the dot (3/7 arc, `--warn`). No pulsing.
- **sm** (sticky bar, lists): height 22 (= Badge), 12 px, short labels: "3/7 Tage", "Nah am Tief", "Guter Preis", "Normal", "Teuer". md labels: "Nah am Tiefpunkt", "Guter Preis", "Normal", "Gerade teuer", "Daten werden gesammelt (3/7)".

**PriceDelta**
- Icon (TrendingDown/Up/Minus 14 px), then "**−5 %** unter dem 30-Tage-Schnitt": number 700, rest 500.
- With fewer than 30 days of data: "unter dem Schnitt seit 14. Okt."

**Verdict block** (stay panel and homepage example), in this order:
1. StateChip.
2. XL price, with the "gesamt · … pro Nacht" line.
3. PriceDelta.
4. **Range bar**: 8 px rounded track from "Tief 1.162 €" to "Hoch 1.410 €", a soft good→neutral→bad tint, and a 14 px accent dot at today's price.
5. A fact sentence: "Günstiger als an 52 der letzten 60 Tage."
6. Source line: "Stand: heute, 07:12 Uhr · Quelle: Google Hotels".

**Price chart** (built in C-006c; geometry in `packages/core/src/chart.ts`)
- Plot height 220 / 260, plus a 36 px readout row above it. No axis lines; 3–4 horizontal grid lines (`--line`) at round euro steps.
- Y labels 11.5 px 600 `--muted-ink`, tabular, in a **left gutter** sized to the longest label, so they never touch the line. 4 X dates ("15. Okt.") under the plot.
- Line 2.25 px in **`--accent` always** Δ. Direction colour belongs to the chip and delta (D-22 stays).
- **Straight segments only.**
- Area: accent gradient 16 % → 0 %, one gradient across gaps.
- **Y-domain**: `[min − 0.5·range, max + 0.15·range]`, spanning at least ±6 % of the average, so a 9 € wiggle doesn't look like a cliff. **Outliers** (above 1.6× or below 0.5× the median) stay out of the domain: they sit on the edge as a small triangle labelled "↑ 5.200 €" and break the line.
- Average: dashed 4/4, 1.25 px `--muted`, explained in a **legend row under the chart** ("╌ Ø 30 Tage: 1.146 €"). A pill at the line's end covered today's dot; the legend never does. No average below 7 points.
- Low point: hollow circle r 4.5 (2 px `--good`), label "Tief 1.162 €" in `--good-ink` **below** it (the lowest mark, so that space is free).
- Today: r 5 accent dot on an r 8 white disc. Only when the last price is from today or yesterday.
- Missing days break the line.
- **Fewer than 7 points**: dots only over a window of at least 14 days, with a dashed `--surface-2` band over the days before tracking started: "Hier entsteht dein Verlauf".
- **No data for 2+ days**: a dashed band over the tail with "Keine Daten seit 8. Okt."
- **No data at all**: a dashed baseline and "Noch keine Preise für diesen Aufenthalt." No dates.
- **Flat prices** (range under 0.5 %): no low marker, no grid line under the line.
- **Readout chip** (the one dark ink surface, `--ink-surface` in both themes): one line in the row above the plot, centred on the crosshair and clamped to the edges: date 12.5 px `--ink-muted`, price 14 px 800 white, provider. It never covers the data.
- **Interaction**:
  - Mouse hover. Touch scrubs after 8 px of horizontal travel (`touch-action: pan-y`, pointer capture) and snaps back on release. The chart fires `tidaq:chartscrub` so the verdict block can update its price while scrubbing (C-006d).
  - Keyboard by **calendar day**: ←/→ day, PageUp/PageDown week, Home/End, Esc. Days without data read "kein Preis".
  - `role="slider"` with `aria-valuetext` at rest ("13. Okt.: 1.142 €, Booking.com, heute"). A live region outside the slider speaks touch scrubbing.
  - "Als Tabelle anzeigen" disclosure: every day of the window, newest first, gaps as "kein Preis", provider column.

**Provider row**
- Desktop grid `32px 1fr 120px 104px auto`:
  - a monogram tile (radius 10, `--surface-2`; no third-party logos)
  - name 15 px 700 with a note at 13 px
  - price right-aligned, 16 px 800 tabular; when the markup is known, "an der Kasse ≈ 1.212 €" below it at 12.5 px `--bad-ink`
  - TrustScore
  - ghost "Zum Angebot ↗" with `rel="sponsored nofollow"`
- Rows are min 72 px with hover `--surface-2`.
- The single cheapest row gets a "Günstigster" badge, never colour alone.
- Above the table: "Sortiert nach Gesamtpreis · So sortieren wir". Below it, the commission line (§5).
- Mobile: two-line card rows; the whole row is the tap target.

**TrustScore ("Preistreue")**
- One geometry for every state, so table columns line up: a box (radius 10, height **28**) on top, a 12.5 px `--muted-ink` line below, max width 132.
- Scored: in the box, number 14 px 800 + "/100" 11 px 600 (full ink colour: any opacity fails AA), then a 3 × 36 px bar, in one row. Below: "24 von 25 Tests stimmten".
- Under 5 tests: the same box dashed with "–"; below: "Noch zu wenig Tests (3)" or "Noch nicht getestet".

**Logo**
- SVG wordmark `tidaq.` from Jakarta 800 outlines at −0.04em (fontTools, so it never waits for the web font), 24 px desktop / 22 px mobile, in `--fg`.
- The q's descender curls right and ends next to an accent dot: the same "today" dot as in the chart. A longer wave was tried at 22 px and turned into a squiggle, so the curl stays short and clean.
- Favicon: white `q.` on a `#7A5CF0→#5B3BD1` rounded square. A white "t" was dropped: it looks like Tumblr's icon.
- On dark surfaces the dot uses the light accent `#9C85FF` (`onDark`).

**Navbar**
- Sticky. Height 60 mobile / 72 desktop.
- Transparent at the top. Once scrolled: `rgba(245,243,252,.82)`, blur 12 px, saturate 140 %, bottom border `--line`. Use a CSS scroll-driven animation with an IntersectionObserver fallback.
- Links Δ: **Hotels · Deals · Kassen-Check · So funktioniert's**. 14.5 px 600 `--muted-ink`. The current page is `--fg` with a 4 px accent dot underneath.
- Right side:
  - desktop: language switch (subtle), search IconButton, primary sm "Preise ansehen"
  - mobile: logo, search IconButton, menu IconButton
- The menu is a top sheet with 56 px rows at 20 px 700, focus-trapped; Esc closes it.

**Footer**
- `--surface-2` band, top border, padding 56/40.
- Columns:
  - Tidaq: tagline and Stand
  - Entdecken: cities, Deals, Alle Hotels
  - Transparenz: So funktioniert's, Kassen-Check, Ranking, Affiliate-Hinweis
  - Rechtliches: Impressum, Datenschutz
- 13.5 px `--muted-ink`; links hover `--fg` with an underline at 0.2em offset.
- Bottom row: © 2026 Tidaq · language switch · source line.

**Sticky mobile bar (stay page)**
- 64 px + safe area. White at 92 % with blur 12 and a top border.
- Left: price 17–20 px 800 with a mini StateChip. Right: primary "Preis beobachten" with a Bell icon.
- It appears only after the panel price has scrolled out of view, and hides while the watch card or the keyboard is visible.
- One CTA only.

**Skeleton**
- `--neutral-soft` blocks in the exact final geometry, a 1.4 s opacity pulse .55↔1, static under reduced motion.
- **Never fake chart lines**: the chart placeholder is a dashed baseline.

**Empty / collecting state**
- 48 px `--accent-soft` circle with a 22 px accent icon.
- Headline 18 px 700, one 15 px muted sentence.
- A **7-segment bar** (6 px tall, gap 4) with "Tag 3 von 7 · erste Einschätzung ab Sa, 17. Okt."
- One action.

**Toast**
- Dark ink, white 14 px 600, radius 14, padding 12×16, max 360 px.
- Bottom centre on mobile (above the sticky bar), bottom right on desktop.
- `role="status"`, 5 s, pauses on hover. Errors that need an action stay inline.

## 4. Signature details

1. **The curl and the dot**: the logo's q curls into the accent dot; the chart marks today with the same dot, and a soft falling hairline sits under the accent word of the hero H1 ("tief").
2. **The checkout receipt**: the Kassen-Check teaser is a white "Kassenbon" card with a zig-zag bottom edge, dashed dividers, and "angezeigt 1.020 € → Kasse 1.212 €" in tabular figures.
3. **Typographic correctness**, as in §2.
4. **Lavender depth**: three blobs, grain, two-layer violet shadows, white-edged gradient buttons.
5. **One dark ink surface**: tooltip and toast only.

## 5. Words (DE first; EN in `messages/en.json`)

- **Naming** Δ:
  - feature "**Kassen-Check**" (EN "Checkout check")
  - score "**Preistreue**" (EN "Price accuracy")
  - "Partnerlink" for affiliate links
  - Never "Vertrauenswert", "Lockpreis" or "Billigportal".
- **CTAs**: search → "**Preise ansehen**" Δ; alerts → "**Preis beobachten**". "Preis verfolgen" is retired because it sounds like a subscription.
- **Hero H1**: "Ist dein Hotelpreis gerade *tief* oder hoch?" ("tief" gets the wave underline).
- **Hero lead**: "Wir prüfen jeden Tag die Preise von 36 Fünf-Sterne-Hotels in 12 Städten. Du siehst den Verlauf, den Tiefpunkt und welcher Anbieter an der Kasse beim Preis bleibt."
- **Proof row**: "36 Hotels · 12 Städte · täglich geprüft · kostenlos, ohne Konto". Real numbers only, read from the data.
- **Verdict lines** (C-006d: every fact names its window; days with a price, not calendar days):
  - near_low "Nah am tiefsten Preis seit {Datum}."
  - good "Günstiger als an {k} von {n} Tagen seit {Datum}."
  - normal "Im üblichen Bereich seit {Datum}."
  - high "Teurer als an {k} von {n} Tagen seit {Datum}."
  - collecting "Für ein Urteil fehlen noch {m} Tage mit Preis."
  - Within ±2 % of the average the delta reads "Etwa im 30-Tage-Schnitt" (neutral, no colour).
  - While the chart is scrubbed, the price follows it; chip, delta, range, fact and "Stand" fade to 35 %. A day without a price shows "–", never today's price.
- **Affiliate line**: "Mit „Partnerlink“ markierte Links: Buchst du darüber, bekommen wir ggf. eine Provision. Dein Preis ändert sich nicht, die Reihenfolge auch nicht."
- **Source line**: "Preise aus Google Hotels (Markt Deutschland), jeden Morgen abgefragt. Wir buchen nichts und setzen keine Cookies."
- **404**: "Diese Seite gibt es nicht. Vielleicht ein alter Link." → [Hotel finden] [Zur Startseite]
- **500**: "Da ist bei uns etwas schiefgelaufen. Das liegt an uns, nicht an dir. Lade die Seite in einer Minute neu."
- Full microcopy tables: `research/2026-10-13-ux-and-copy.md` §4.

## 6. Review loop for every UI PR

1. Screenshots at **390 and 1280** (Playwright, `scratchpad`), including hover, focus, error, empty and loading states.
2. A **design-critic pass**: a reviewer agent compares the screenshots with this file and DESIGN.md and lists concrete defects. Fix them all, then re-shoot.
3. Check: AA contrast (computed), keyboard path, `prefers-reduced-motion`, no horizontal scroll, Lighthouse mobile ≥ 90 on key pages.
4. Words: German first, du, no hype, numbers over adjectives; EN in the same PR.
