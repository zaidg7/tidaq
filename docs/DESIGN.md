# Tidaq design system: Soft Modern

Chosen by Zaid from six full-page directions (D-20). Visual reference: `docs/design/reference-homepage.html` (open it in a browser; it is the Soft Modern homepage with example data). Build to this spec; when the reference and this file disagree, this file wins.

**Craft spec:** `docs/design/CRAFT.md` (C-006b) sets the exact sizes, states, motion and wording every UI PR is built and reviewed against. Where it changed this file, the line below is marked **Δ CRAFT**. If the two ever disagree, CRAFT.md wins.

## 1. Feel

Friendly, calm, premium-but-approachable, like a good fintech app for travel. Rounded shapes, soft lavender light, generous white cards, one confident violet accent. Numbers are big and clear. Never "deal site" loud: no red banners, no countdowns, no stock-photo clutter.

Three words: **clear, warm, trustworthy.**

Borrowed from Riviera Editorial (Zaid liked it too), used sparingly: photo-forward deal cards with a soft sky gradient placeholder, and an occasional italic accent word in hero headlines.

## 2. Tokens

### Color (light, the default)

| Token           | Hex       | Use                                              |
| --------------- | --------- | ------------------------------------------------ |
| `--bg`          | `#F5F3FC` | page background (lavender-white)                 |
| `--surface`     | `#FFFFFF` | cards, panels, search card                       |
| `--field`       | `#F8F6FF` | input backgrounds                                |
| `--line`        | `#E6E0F7` | borders, dividers, chart grid                    |
| `--fg`          | `#221C3B` | text, headlines                                  |
| `--muted`       | `#6C6687` | secondary text, labels, axis text                |
| `--accent`      | `#6A49E0` | primary buttons, links, focus ring, active chips |
| `--accent-ink`  | `#FFFFFF` | text on accent                                   |
| `--accent-soft` | `#EDE7FF` | selected chip background, hover                  |
| `--good`        | `#178A62` | falling price, near-low state, high trust        |
| `--bad`         | `#D1435B` | rising price, low trust, checkout markup         |
| `--warn`        | `#B26A00` | "collecting data", caution notes                 |
| `--blob-1`      | `#DDD2FF` | decorative background blob (top left)            |
| `--blob-2`      | `#FFD6E5` | decorative background blob (right)               |

### Color (dark, phase 2)

Provide tokens now, ship later: `--bg #14111F`, `--surface #1D1930`, `--field #221D38`, `--line #2E2848`, `--fg #EEEAFB`, `--muted #A39DC0`, `--accent #9C85FF`, `--accent-ink #14111F`, `--good #4FD1A0`, `--bad #FF7A90`. Respect `prefers-color-scheme` once enabled.

Contrast: `--muted` on `--bg` ≈ 5:1 (AA). Never put `--muted` text on `--accent-soft` below 14 px.

**More tokens (Δ CRAFT §2):** `--surface-2 #FBFAFF`, `--line-strong #D6CCF2`, `--accent-hover #5B3BD1`, `--accent-press #4F31BE`, solid soft tints `--good-soft #E3F3EC`, `--bad-soft #FBE6EA`, `--warn-soft #F8EDDC`, `--neutral-soft #ECE8F6` (chips, badges, TrustScore; no alpha tints), `--disabled-ink #8A84A3`, `--blob-3 #E6DDFF`.

**Ink tokens for small text (added in C-006, AA check):** `--good`, `--bad` and `--warn` reach only 3.5–4.3:1 as small text on white or on their own 14–18 % tints, and `--muted` on `--line` only 4.2:1. Text up to 18 px (chips, deltas, notes, TrustScore numbers) therefore uses `--good-ink #126B4C`, `--bad-ink #AF2B41`, `--warn-ink #8C5300`, `--muted-ink #655F7E` (each ≥ 4.6:1 on white, `--bg` and its tint). Tints, chart lines, borders and large numbers keep the base colors.

### Typography

- Family: **Plus Jakarta Sans** as a variable font via `next/font` (Δ CRAFT: any weight; 600 for buttons, labels, nav). Fallback `system-ui, -apple-system, Segoe UI, sans-serif`.
- Numbers: same family with `font-variant-numeric: tabular-nums` everywhere digits align.

| Role                 | Size (mobile → desktop) | Weight        | Letter-spacing | Line-height |
| -------------------- | ----------------------- | ------------- | -------------- | ----------- |
| Display (hero H1)    | 38 → 60 px (Δ CRAFT)    | 800           | −0.035em       | 1.04        |
| H2 (section)         | 28 → 40 px (Δ CRAFT)    | 800           | −0.03em        | 1.1         |
| H3 (card title)      | 18 → 20 px              | 700 (Δ CRAFT) | −0.015em       | 1.25        |
| Price XL (stay page) | 38 → 44 px              | 800           | −0.02em        | 1           |
| Body                 | 16 → 16.5 px (Δ CRAFT)  | 500           | 0              | 1.55        |
| Small / meta         | 13 px                   | 500           | 0              | 1.45        |
| Label / eyebrow      | 12 px, uppercase        | 700           | 0.12em         | 1.3         |

Headlines use `text-wrap: balance`. Body text max 65 characters per line.

### Shape, depth, spacing

- Radius: cards and panels **18 px**; search card **26 px**; inputs **18 px**; chips and buttons **999 px (pill)**; small badges 10 px.
- Shadow (cards that float): two layers, `0 1px 2px rgba(34,28,59,.04), 0 16px 40px -8px rgba(106,73,224,.14)` (Δ CRAFT). Flat cards use only a 1 px `--line` border. Don't put shadows on everything; only the search card, the stay panel and hover states.
- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 56, 72. Section padding 64 px desktop, 44 px mobile. Page gutter 28 px desktop, 18 px mobile. Max content width 1080 px.
- Background blobs: two large blurred radial gradients (`--blob-1` top-left, `--blob-2` right), only on home and landing pages, behind content, `pointer-events: none`.

### Motion

- Durations 150–250 ms, easing `cubic-bezier(.2,.8,.2,1)`.
- Allowed: hover lift on cards (translateY −2 px + shadow), chart line draw-in once on first view (600 ms), sheet/popover fade+scale.
- **No price count-up** (Δ CRAFT: it reads like a slot machine).
- Respect `prefers-reduced-motion`: no draw-in.

## 3. Components

| Component                    | Spec                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logo**                     | Wordmark `tidaq.` lowercase, Plus Jakarta Sans 800, −0.04em, as SVG outlines. Δ CRAFT: the q's descender curls right and ends next to an accent dot (the chart's "today" dot). Favicon: white `q.` on a `#7A5CF0→#5B3BD1` rounded square (a white `t` looked like Tumblr).                                                                                                                                                         |
| **Button**                   | Pill. Primary: `--accent` gradient bg, white text, 600 weight, sizes sm/md/lg = 36/44/52 px (Δ CRAFT). Ghost: transparent, 1 px `--line`, `--fg` text. Focus: 2 px `--accent` ring, 2 px offset. Disabled: `--line` bg, `--disabled-ink` text, no shadow (Δ CRAFT).                                                                                                                                                                |
| **Search card**              | White, radius 26, shadow, padding 18. Fields stacked: "Hotel oder Stadt", then a 2-col row "Daten" + "Gäste", then toggle chips, then a full-width primary button "Preise ansehen" (Δ CRAFT).                                                                                                                                                                                                                                      |
| **Field**                    | Label on top (12.5 px 600 sentence case `--muted-ink`, Δ CRAFT), value 16 px 700, `--field` bg, 1 px `--line`, radius 18, padding 10×12. Error: `--bad` border + message under it.                                                                                                                                                                                                                                                 |
| **Chip / Toggle**            | Pill, 1 px `--line`, 13 px. On: `--accent` border, `--accent-soft` bg, `--fg` text.                                                                                                                                                                                                                                                                                                                                                |
| **StateChip**                | Pill, 12 px 700. near_low "Nah am Tiefpunkt" and good "Guter Preis": `--good` text on 16 % `--good` bg. normal "Normal": `--muted` on `--line`. high "Gerade teuer": `--bad` text on 14 % `--bad` bg. collecting "Daten werden gesammelt (3/7)": `--warn`.                                                                                                                                                                         |
| **PriceDelta**               | "▼ 5 % unter dem 30-Tage-Schnitt" in `--good`, "▲ 4 % über …" in `--bad`. Tabular numbers.                                                                                                                                                                                                                                                                                                                                         |
| **TrustScore**               | Name "Preistreue" (Δ CRAFT). Small rounded box (radius 10) with the number (13 px 800): ≥ 85 `--good` on 18 % `--good`; 60–84 `--muted` on `--line`; < 60 `--bad` on 18 % `--bad`. Under 5 tests: text "Noch zu wenig Tests" instead of a number. Always with the sample line "24 von 25 Tests stimmten" nearby.                                                                                                                   |
| **Provider row**             | Grid: name + note (13 px muted) · price (right-aligned, 15 px 800, tabular) · TrustScore · "Zum Angebot" ghost button. Expected checkout price shown under the price in `--bad` small text when markup is known.                                                                                                                                                                                                                   |
| **Price chart**              | SVG, height ~240 desktop / 200 mobile. Line 2.25 px `--accent` always (Δ CRAFT), area fill 10 % opacity, grid lines `--line` 1 px, y labels every 50 € in `--muted` 11 px, x labels 4–5 dates, dashed `--muted` line for the 30-day average with a label, low point as a hollow circle with label "Tief 1.162 €", today as a filled dot. Tooltip on hover/tap: date + price + provider. Data table alternative for screen readers. |
| **Stats row**                | Three bordered boxes: Tief / Schnitt / Hoch, label 11 px uppercase muted, value 17 px 800 tabular.                                                                                                                                                                                                                                                                                                                                 |
| **Advice box**               | `--good` 10 % bg, 1 px `--good` 30 % border, radius 18, padding 12×14, bold first sentence.                                                                                                                                                                                                                                                                                                                                        |
| **Deal card**                | Photo (or sky gradient placeholder `linear-gradient(135deg, #D9CFFC, #FFD9E6)`), radius 18, title 18 px 800, meta 13 px muted, price + "▼ 14 %" in `--good`. Hover lift.                                                                                                                                                                                                                                                           |
| **Calendar cell**            | 44×44 px min, radius 12, background tinted by price level (5 steps from `--good` 20 % to `--bad` 20 %), price text inside (11 px 700). Today outlined.                                                                                                                                                                                                                                                                             |
| **Empty / collecting state** | Illustration-free: icon + short headline + one sentence + action. Example: "Wir sammeln noch Daten (3/7 Tage). Der Verlauf wird jeden Tag genauer." + "Preis beobachten".                                                                                                                                                                                                                                                          |

## 4. Page layouts

- **Home:** blobs → navbar → centered hero (eyebrow, H1, sub, proof row, search card centered at max 560 px) → live example panel (two columns desktop: chart left, providers right) → how it works (3 cards) → trust figures → deals (3 cards) → CTA → footer.
- **Stay page:** compact header (hotel, dates, guests, edit button) → panel (price + state + delta, chart, stats, advice) → providers table → watch CTA card → "Ähnliche Termine" (cheaper dates in the same hotel) → methodology note.
- **Hotel page:** hero with photo/placeholder and facts → price calendar → best upcoming stays → providers summary.
- **Mobile first:** everything single-column under 720 px; sticky bottom bar on the stay page with price + "Preis beobachten".

## 5. Copy style

- German, informal "du", short. Numbers over adjectives: "9 % günstiger als sonst" instead of "super Deal".
- Buttons say what happens: "Preise ansehen" (search), "Preis beobachten" (alerts), "Zum Angebot". "Preis verfolgen" is retired (Δ CRAFT).
- Names (Δ CRAFT): "Kassen-Check" (checkout tests), "Preistreue" (provider score), "Partnerlink" (affiliate). Navbar: Hotels · Deals · Kassen-Check · So funktioniert's.
- Never promise the future; never shame providers (facts only).
- Price format: `1.184 €` (DE), `€1,184` (EN). Dates: `1.–3. Dez. 2026` (DE), `1–3 Dec 2026` (EN).
