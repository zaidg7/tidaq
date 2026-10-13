# Tidaq Soft Modern: craft spec v1

Changes that go against DESIGN.md are marked **[Δ DESIGN]**. Each one needs a DESIGN.md edit in the same PR.

## 1. Verdict

**What works:** the palette is calm, sure of itself and clearly ownable. The H1 at 800/−0.03em has presence. The ink tokens already solve AA. Lavender shadows beat grey ones.

**What looks generic or unfinished:**
- **Weight 800 is everywhere.** The H3 "Hotel Adlon Kempinski", the prices and the logo all shout at the same volume, so hierarchy collapses.
- **Buttons render at 700.** The spec says 600, but 600 isn't loaded. md and lg look almost identical (≈40 vs 46 px). Disabled at 50 % opacity reads as a lighter brand variant, not as "off".
- **Fields have a real bug.** Input text is 15 px, so iOS zooms the page on focus. The focus ring floats 2 px outside the box and looks detached. Uppercase 11 px labels look like an admin panel, and CSS uppercase turns German "ß" into "SS".
- **Chips are about 30 px tall** (below the touch-target size) and show selection by colour alone.
- **Badges** (11 px uppercase) look like database tags.
- **TrustScore:** "96" in a 38 px box, with no scale, reads as an orphan number.
- **The € sign is full size and full weight next to the digits.** "1.184 €" looks typed, not typeset.
- **Flat, float and search cards look the same** on the screenshot. There's no real depth system.
- **The Logo is plain text**, and the two sizes sit on different baselines.
- **No icons anywhere.** ▼/▲ are font glyphs.

## 2. Typography

**Font:** drop `weight: [...]` in `lib/fonts.ts` so next/font serves the **variable** Plus Jakarta Sans (one file, weights 200–800). It is usually no larger than 3–4 static files; verify the latin woff2 is under about 60 KB. That unlocks 600 for buttons and labels, and 700 for small titles. Add `-webkit-font-smoothing: antialiased`. No italic file.

| Role | 390 px | 1280 px | Weight | Tracking | Line-height | Max width |
|---|---|---|---|---|---|---|
| Display | 38 | 60 | 800 | −0.035em | 1.04 | 16ch |
| H2 | 28 | 40 | 800 | −0.03em | 1.1 | 22ch |
| Title (stay hotel name) | 22 | 28 | 800 | −0.025em | 1.15 | — |
| H3 (card) | 18 | 20 | **700** [Δ] | −0.015em | 1.25 | — |
| Lead (hero subline) | 17 | 19 | 500 | −0.005em | 1.5 | 46ch |
| Body | **16** [Δ, was 15] | 16.5 | 500 | 0 | 1.55 | 65ch |
| Meta | 13 | 13.5 | 500 | 0 | 1.45 | — |
| Field label | 12.5, sentence case [Δ] | same | 600 | 0.005em | 1.2 | — |
| Eyebrow (short words only) | 12, uppercase | same | 700 | 0.1em | 1.3 | — |
| Button | 14 / 15 / 16 (sm / md / lg) | same | 600 | −0.005em | 1 | — |

**German text**
- Body copy gets `hyphens: auto` (`lang` is already set).
- Headlines get `text-wrap: balance` plus a manual `&shy;` in long compounds. No auto-hyphens in headlines.
- Cards get `overflow-wrap: anywhere` for names like "Mandarin Oriental Ritz".

**Numbers**
- Use `tabular-nums` in tables, chart axes, stats and anything that updates.
- The XL price uses **proportional** digits, because tabular "1"s leave gaps at 44 px.
- No slashed zero: it reads technical, not consumer.
- Use a real minus `−` (U+2212), en dashes in date ranges ("1.–3. Dez."), and NBSP before "%".

**Price composition:** split with `Intl.NumberFormat#formatToParts`.
- XL/LG: digits at full size, 800, −0.03em. € at **0.58em**, weight 700, `--muted` (still about 5:1 at this size), baseline-aligned. Replace the NBSP with a **narrow NBSP U+202F** and keep the price unbreakable.
- 15 px and below: € at the same size and weight.
- EN "€1,184": € before the number with no gap, same scaling.
- Never show cents. Always qualify the price: "gesamt · 606 € pro Nacht" in Meta under XL.

## 3. Spacing and layout

- Keep the 4/8 scale. Add **96** to it.
- Three tiers:
  - inside a component: 4–16
  - between components: 16–32
  - between sections: 56 mobile / **88 desktop** [Δ, was 44/64]
- Drop the `border-top` on every section. Use space plus the occasional `--surface-2` band. Borders make it look like a document.

| Viewport | Columns | Page gutter | Gap | Notes |
|---|---|---|---|---|
| 390 | 4 | 20 | 12 | everything stacked |
| 768 | 8 | 28 | 16 | deals 2-up |
| 1280 | 12 (max 1080) | 28 | 24 | panel 7/5 split, deals 3-up |

**Paddings**
- Flat card: 20 / 24.
- Stay panel: 20 / 32.
- Search card: 16 / 20.
- Inside a card: title→meta 4, meta→content 16, between blocks 20.

**Hero rhythm**
- 390: nav 60, then 32 → H1 → 14 → lead → 20 → proof → 28 → search.
- 1280: nav 72, then 72 → H1 → 18 → lead → 24 → proof → 40 → search, then 88 to the next section.

## 4. Colour depth

All new tokens below are checked:

| Token | Value | Use |
|---|---|---|
| `--surface-2` | `#FBFAFF` | table header, row hover, inner zones |
| `--line-strong` | `#D6CCF2` | hover borders |
| `--accent-hover` | `#5B3BD1` | white text on it: 7.0:1 |
| `--accent-press` | `#4F31BE` | 8.4:1 |
| `--good-soft` | `#E3F3EC` | good-ink on it: 5.7:1 |
| `--bad-soft` | `#FBE6EA` | bad-ink on it: 5.4:1 |
| `--warn-soft` | `#F8EDDC` | warn-ink on it: 5.4:1 |
| `--neutral-soft` | `#ECE8F6` | muted-ink on it: 5.0:1 |

- **Solid tints, not alpha.** `bg-good/15` shifts hue on the lavender page background.
- **Two-layer shadows:**
  - `--shadow-float`: `0 1px 2px rgba(34,28,59,.04), 0 16px 40px -8px rgba(106,73,224,.14)`
  - `--shadow-hover`: `0 2px 4px rgba(34,28,59,.05), 0 24px 48px -10px rgba(106,73,224,.20)`
  - Floating cards: border `rgba(106,73,224,.10)`, so the shadow carries the edge. Flat cards: `--line`.
- **Primary button:** `linear-gradient(180deg,#7556E8,#6343DA)`. White on the lightest stop is 4.94:1. Add `inset 0 1px 0 rgba(255,255,255,.18)`.
- **Page:** blobs get a third, smaller blob (`#E6DDFF`, bottom-left of the hero), plus a 2 % SVG noise layer on the blob container only. That removes gradient banding.
- `::selection { background:#DDD2FF }`.
- **Focus:** buttons and links keep the 2 px accent outline with 2 px offset. Fields get an inset treatment (§5).
- **Rule:** `--muted` text never on `--accent-soft` (4.49:1). Use `--fg`.

## 5. Components

**Icons:** use **Lucide** (ISC licence; round caps match Jakarta). Stroke **1.75** at 20/24 px, **2** at 16 px, colour `currentColor`. Wrap it in an `<Icon>` and import per icon. Never use font glyphs.

**Button**
- Heights 36 / 44 / 52, padding-x 16 / 20 / 24, gap 8, icon 16/18.
- Primary:
  - hover: `--accent-hover`, −1 px lift, `0 8px 20px -8px rgba(106,73,224,.6)`
  - active: `--accent-press`, `scale(.98)`, no lift
  - disabled: `--line` background, `#8A84A3` text, no shadow, `cursor:not-allowed`
  - loading: same width, label `visibility:hidden`, 16 px spinner (2 px arc, 0.8 s linear), `aria-busy`
- Ghost: **`--surface` background**, not transparent. Hover `--line-strong` border with `--surface-2` fill; active `--accent-soft`.
- New `subtle` variant: accent text, hover `--accent-soft`.
- New `IconButton`: 44 × 44 circle.

**TextField / search fields**
- Min height 60, padding 10 × 14, radius 18.
- Value **16 px** 700, placeholder 16 px 500 `--muted`.
- Hover: `--line-strong` border.
- Focus-within: background white, border accent, `0 0 0 4px rgba(106,73,224,.14)`. Remove the outer outline.
- Error: border `--bad`, focus halo `rgba(209,67,91,.14)`, then a row with an AlertCircle (14 px) and the message (13 px 600 `--bad-ink`), 6 px below the field.
- The search card uses one **segmented group**: one `--field` box, 1 px internal dividers, Hotel full width, then Daten | Gäste. Leading icons MapPin / CalendarDays / Users at 18 px `--muted`. The active segment goes white with an inset accent ring.
- Then the chip row, then an lg block button "Preis verfolgen".
- Under the button, centred, 12.5 px muted: "Kostenlos · keine Kreditkarte · jederzeit abbestellbar".

**Chip**
- Visual height 36 (44 px hit area via `::before`), padding-x 14, 13.5 px 600.
- Off: white background, `--line` border, `--muted-ink` text. Hover: `--line-strong` border, `--fg` text.
- On: `--accent-soft` background, accent border, `--fg` text, leading Check icon 14 px. The icon gives a non-colour cue.
- Transition 150 ms.

**Card**
- Flat / float as in §4.
- Interactive cards: hover lifts −2 px with `--shadow-hover` and a `--line-strong` border. Use a stretched link and show a focus ring on the card.

**Badge**
- Sentence case, 12 px 600, height 22, padding-x 8, **radius 8** [Δ, was 10], so it reads differently from pill-shaped state chips. Solid soft tints.
- The "Anzeige" badge is neutral and sits next to every affiliate link.

**StateChip**
- Pill, height 28, padding-x 10, 12.5 px 700.
- Leading 6 px dot in the base colour, on the soft tint.
- `collecting`: replace the dot with a 12 px progress ring (3/7 arc in `--warn`). No pulsing.

**Price:** as in §2.

**PriceDelta**
- Lucide `TrendingDown` / `TrendingUp`, 14 px.
- The number is 700 and the rest is 500: "**−5 %** unter dem 30-Tage-Schnitt".
- At the average: Minus icon, muted.

**TrustScore**
- Box radius 10, height 28, padding-x 8: number at 14 px 800, then "/100" at 11 px 600 at 70 % of the text colour, then a 3 px bar 36 px wide (filled = score) underneath.
- Sample line below at 12.5 px muted.
- Insufficient: a dashed `--line-strong` box with "–" and "Noch zu wenig Tests (3)". Show the count.

**Logo**
- Make it an SVG wordmark (outlined from Jakarta 800, −0.04em) at 24 px desktop and 22 px mobile, in `--fg`.
- The **q descender** bends right into one soft downward S-curve (about 2 stroke-widths drop) and ends in a 3 px **accent dot**, the same "today" dot as in the chart. It must stay legible as a q at 22 px.
- Favicon: keep the white "t", with a `#7A5CF0→#5B3BD1` gradient square, rx 14/64.

**Navbar**
- Sticky. Height 72 on desktop, 60 on mobile.
- Background is transparent at the top. Once scrolled: `rgba(245,243,252,.82)`, `backdrop-filter: blur(12px) saturate(140%)`, bottom border `--line`. Drive it with a CSS scroll-driven animation (`animation-timeline: scroll()`) and an IntersectionObserver fallback; no scroll listeners.
- Desktop: links 14.5 px 600 `--muted-ink`, hover `--fg`, current page `--fg` with a 4 px accent dot below. On the right: DE/EN (subtle), "Meine Alarme" (ghost sm), "Preis verfolgen" (primary sm).
- Mobile: logo, primary sm, menu IconButton. The menu is a top sheet with 56 px rows at 20 px 700. Trap focus; Esc closes it.

**Footer**
- On `--surface-2`, top border, padding 56/40.
- Three columns on desktop: brand + one sentence + affiliate disclosure; Produkt; Rechtliches. Stacked on mobile.
- 13.5 px `--muted-ink`. Links hover `--fg` with an underline at 0.2em offset.
- Bottom row: © plus language switch.

**Price chart**
- Height 220 / 260. No axis lines, just 3–4 horizontal grid lines (1 px `--line`).
- Y labels inside the left edge, 11.5 px 600 `--muted-ink`, tabular. Four X dates ("15. Okt.").
- Line 2.25 px with round joins. Draw it as a **monotone cubic** that never overshoots the real low (honesty). Colour it **always `--accent`** [Δ]: trend colour is judgement and belongs in the chip and delta.
- Area: accent gradient 16 % → 0 %.
- Average: dashed 4/4 line, 1.25 px `--muted`, with the label in a white pill at the right end.
- Low point: hollow circle r 4.5 (2 px `--good`, white fill) with label "Tief 1.196 €" 11.5 px 700 `--good-ink` and a white halo (`paint-order: stroke`).
- Today: r 5 accent dot with a 3 px white ring and a static 10 px halo at 15 %.
- Tooltip: dark (`--fg` background, radius 12, padding 10 × 12). Date 12 px `#C9BEF5`, price 15 px 800 white, provider 12 px. Crosshair 1 px at `--fg` 20 %.
- Interaction: tap and drag on touch; arrow keys when focused, with an `aria-live` readout. Keep the "Als Tabelle anzeigen" link.

**Provider row**
- Desktop grid: `32px 1fr 120px 104px auto`.
  - 32 px monogram tile, radius 10, `--surface-2`. No third-party logos.
  - Name 15 px 700, note 13 px muted.
  - Price right-aligned, 16 px 800 tabular. Below it, when markup is known: "an der Kasse 1.212 €", 12.5 px 600 `--bad-ink`.
  - TrustScore, then a ghost "Zum Angebot" button (`rel="sponsored nofollow"`).
- Rows min 72 px, divided by `--line`, hover `--surface-2`. The best row gets the `--surface-2` fill and a badge, never colour alone.
- Mobile: two lines (name + price / note + TrustScore). The whole row is the tap target with a chevron.

**Sticky mobile bar (stay page)**
- Fixed, 72 px + `safe-area-inset-bottom`. Background white at 92 % with blur 12, top border, `0 -8px 24px rgba(34,28,59,.06)`.
- Left: price 20 px 800 and a mini StateChip. Right: primary md "Preis beobachten" with a Bell icon.
- It slides in (200 ms) only once the panel price has scrolled out of view, and hides while the inline call-to-action is visible. Add body padding so it never covers the footer.

**Skeletons**
- `--neutral-soft` blocks with exact final geometry (no layout shift): text radius 6, price radius 10.
- A 1.4 s opacity pulse between 0.55 and 1. No sweeping shimmer. Static under reduced motion.

**Empty / collecting state**
- 48 px `--accent-soft` circle with a 22 px accent icon.
- Headline 18 px 700, one sentence at 15 px muted (40ch).
- A **7-segment bar**: 6 px tall, gap 4, 3 filled accent, the rest `--line`, labelled "3 von 7 Tagen". Then one action.

**Toasts**
- Bottom centre on mobile (above the sticky bar), bottom right on desktop.
- Dark `--fg` background, white 14 px 600, radius 14, padding 12 × 16, max width 360. Success icon `#4FD1A0`.
- `role="status"`, 5 s, pauses on hover or focus. Never for errors that need an action: those stay inline.

## 6. Motion

**Tokens**
- Durations: 120 ms (press, colour), 180 ms (hover, chips), 240 ms (popovers, sheets), 600 ms (chart draw, once).
- Entering: `cubic-bezier(.2,.8,.2,1)`. Exiting: 140 ms `cubic-bezier(.4,0,1,1)`. Sheets: `cubic-bezier(.65,0,.35,1)`.

**Rules**
- Animate only `transform`, `opacity` and colour.
- Never animate prices, layout, the blobs, or anything that loops.
- Propose **dropping the price count-up** [Δ]: it reads like a slot machine, fights trust and delays the visible final number.
- Reduced motion: no draw-in, no lifts or slides (opacity only), static skeletons. Colour transitions stay.

## 7. Signature details

1. **The falling-wave motif.** The q-tail curve and its accent dot appear in three places only: the logo, the chart's "today" dot, and a hairline underline under the accent word in the hero H1. Draw them as one shared SVG path.
2. **The checkout receipt.** The trust section shows a white "Kassenbon" card with a zig-zag bottom edge (CSS `mask`), dashed dividers, and "angezeigt 1.020 € → Kasse 1.212 €" in tabular figures. It's memorable and factual.
3. **Typographic correctness as a feature.** Small €, narrow NBSPs, real minus signs, en-dash date ranges, the "Ø" sign in stats. Most competitors get these wrong.
4. **Lavender depth.** Three blobs plus 2 % grain, layered violet shadows, and white-edged buttons. The whole page feels lit, not flat.
5. **The dark tooltip and toast pair.** One dark ink surface used sparingly, like a fintech app's moment of focus.

## 8. Top 10 priorities

1. **Fields:** 16 px input (fixes the iOS zoom), inset focus, sentence-case labels, error row with icon.
2. **Variable font** for 600 and 700 → buttons, H3 and labels at the spec weights.
3. **Price and PriceDelta:** `formatToParts`, small €, narrow NBSP, proportional XL, real minus, icons.
4. **Button system:** 36/44/52, all states including loading, ghost on white, IconButton.
5. **New tokens** (`--surface-2`, `--line-strong`, accent hover and press, solid soft tints) and two-layer shadows. Restyle Badge, StateChip (dot / progress ring) and Chip (36 px plus check).
6. **Lucide `<Icon>` wrapper**; remove the ▼/▲ glyphs.
7. **Logo SVG with the q-wave**, favicon, navbar (with scroll state), footer.
8. **Search card** with the segmented field group.
9. **Price chart:** monotone line, markers, dark tooltip, keyboard access, table fallback.
10. **Stay page kit:** provider row, sticky mobile bar, skeletons, collecting state, toasts. Then update DESIGN.md for every [Δ] above.

All contrast figures in this spec were computed, not estimated. Every new text pair passes AA, at 4.94:1 or higher.