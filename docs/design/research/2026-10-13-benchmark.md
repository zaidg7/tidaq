# Tidaq UI pattern research (13 Oct 2026)

**How this was researched:** I used web search and published coverage. I did not open the live apps, so treat the exact pixel details of the leaders' UIs as approximate. The recommendations build on `docs/DESIGN.md` and avoid repeating what it already specifies.

## 1. Pattern library

### (a) Homepage hero and search card

- **What the leaders do:**
  - Airbnb uses one pill-shaped search bar split into Where / When / Who. It is about 64 px tall with a round brand-color search button at the end ([getdesign.md](https://getdesign.md/design-md/airbnb/preview), a secondary source).
  - A Pratt critique of Hopper found the homepage confusing: users couldn't tell whether "search" or "add watch" was the main action ([Pratt IxD](https://ixd.prattsi.org/2020/02/design-critique-hopper/)).
  - Linear-style pages read in one direction, use few CTAs and restrained color ([LogRocket](https://blog.logrocket.com/ux-design/linear-design/)).
  - Stripe shows real product UI in place of illustrations.
- **Avoid:** A city-first search. Tidaq tracks one specific hotel, so a city query should lead to a list of hotels, not to a results page.
- **Tidaq:**
  - Give the hero one job: "Preis verfolgen".
  - In the hotel autocomplete, each row shows hotel name, city and star count.
  - The date field reads "1.–3. Dez. 2026 · 2 Nächte". The guest field reads "2 Erwachsene".
  - On mobile, tapping a field opens a full-screen sheet with the keyboard already up.
  - The live example panel (a real stay with real data) is the "product shot" and sits directly under the search card.
  - The proof row uses real counts only: "25 Checkout-Tests pro Anbieter · täglich geprüft".

### (b) Verdict block ("is this a good price?")

- **What the leaders do:**
  - Google Flights rates prices as Low / Typical / High on a bar colored green / yellow / red, with a 60-day graph underneath ([Tom's Guide](https://tomsguide.com/how-to/google-flights-has-a-new-tool-to-find-you-the-cheapest-airfare-every-time)).
  - Google Hotels places the price on a green-to-red line against the hotel's "typical price" ([SEJ](https://www.searchenginejournal.com/google-adds-price-insights-to-hotel-flights-searches/267225/)).
  - KAYAK says Buy / Wait and shows how confident the forecast is ([KAYAK help](https://www.kayak.com/c/help/pricing/how-does-kayak-price-forecast-work.62022.faq)).
  - Hopper's hotel beta said "Book now" for a $264 room that cost $223 elsewhere ([TravelPulse](https://www.travelpulse.com/news/hotels-and-resorts/hopper-rolls-out-predictive-hotel-pricing-app.html)).
- **What works:** One word, one number and one range bar.
- **Avoid:**
  - Predictions. They conflict with the "never promise the future" rule in DESIGN.md.
  - Verdicts that ignore cheaper providers.
- **Tidaq:**
  - Layout: StateChip, then Price XL, then PriceDelta.
  - Add a **range bar**: an 8 px rounded track from "Tief 1.162 €" to "Hoch 1.410 €". Tint it with a green-to-neutral-to-red gradient at 20 % opacity and put a 14 px violet dot at today's price.
  - Add one fact sentence: "Günstiger als an 52 der letzten 60 Tage."
  - Add a basis line in 13 px muted text: "Basis: 60 Tage · zuletzt geprüft vor 3 Std."
  - The verdict always uses the **cheapest provider's total price**.

### (c) Price history chart

- **What the leaders do:**
  - Robinhood and Coinbase let you press and drag ("scrub") along the chart. While you drag, the big header number changes to the price under your finger. Coinbase's Scrubber shows a dotted vertical line, a dot on the line with a label above it, and fades the part of the chart after that point ([Coinbase CDS](https://cds.coinbase.com/components/charts/Scrubber/), [Robinhood Spark](https://p.codekk.com/detail/Android/robinhood/spark)).
  - Libraries such as react-native-wagmi-charts give a short vibration when scrubbing starts and whenever the selected point changes.
- **Y-axis guidance:**
  - Starting a line chart's y-axis above zero is acceptable ([ONS](https://digitalblog.ons.gov.uk/2016/06/27/does-the-axis-have-to-start-at-zero-part-1-line-charts)).
  - But the higher the axis starts, the bigger people judge the trend to be ([EU data-viz guide](https://data.europa.eu/apps/data-visualisation-guide/scales-in-line-charts)).
  - One heuristic is to keep the bottom third of the plot empty ([Bill Mill](https://notes.billmill.org/link_blog/2024/11/A_golden_ratio_for_line_charts_with_truncated_y-axis.html)).
- **Tidaq:**
  - **Y-domain:** `[min − 0.5·range, max + 0.15·range]`, with the visible span at least ±6 % of the average. A 9 € wiggle on a 1,200 € stay should not look like a cliff.
  - **Line shape:** straight segments or `monotoneX`, never a spline. Splines overshoot and draw lows that never happened.
  - **Missing days:** break the line or draw a dotted bridge, never interpolate silently.
  - **Range chips:** "30 T / 60 T" above the chart, right-aligned.
  - **Touch scrub:** keep vertical page scrolling (`touch-action: pan-y`). Start scrubbing after an 8 px horizontal drag or a 150 ms long-press. Update the header price and date while dragging, and snap back to today on release.
  - **Keyboard:** the chart is focusable; ←/→ move one day, Home/End jump to the start and end. Use an `aria-live` region and a "Als Tabelle anzeigen" disclosure.
  - **Fewer than 7 points:** show the points as dots and leave the empty part of the chart as a faint dashed band with "Hier entsteht dein Verlauf".

### (d) Booking-site comparison rows

- **What the leaders get wrong:**
  - Australia's consumer regulator (ACCC) said trivago highlighted a price that often wasn't the cheapest, ranked offers by how much each site paid per click, and used strike-through prices that compared different room types. A NZ survey found the highlighted deal was more expensive about half the time, and the "More deals" link was in small type ([Consumer NZ](https://consumer.org.nz/articles/trivago-how-to-find-the-hidden-deals), [Travel Weekly](https://travelweekly.com.au/accc-takes-aim-at-trivago-over-misleading-hotel-prices/)).
- **German law:**
  - § 5b UWG requires disclosing the main ranking parameters.
  - Bought placements must be clearly marked ([CMS](https://cms.law/en/deu/legal-updates/online-plattformen-muessen-ranking-parameter-offenlegen), [Osborne Clarke](https://osborneclarke.com/insights/enforcement-risks-mount-germany-comparison-and-intermediary-platforms)).
- **Google:** now shows the total price including taxes and fees ([VentureBeat](https://venturebeat.com/ai/google-now-includes-taxes-and-fees-in-hotel-searches)).
- **Tidaq:**
  - Default sort is the **total price for the stay, including taxes**. Label it above the table: "Sortiert nach Gesamtpreis · So sortieren wir".
  - Show the "Günstigster" badge only on the truly lowest row.
  - Add chips per row: room type, "Frühstück", "Kostenlos stornierbar". When rows aren't comparable, mark them "Anderes Zimmer" and don't rank them as cheaper.
  - Place the TrustScore directly next to the price, with the expected checkout price underneath.
  - Show freshness per row: "vor 2 Std.".
  - CTA: "Zum Angebot ↗", opening in a new tab with `rel="sponsored nofollow"`. Mark it with a small "Partnerlink" tag and add a footnote under the table: "Wir erhalten bei manchen Links eine Provision. Die Reihenfolge ändert das nicht."
  - On mobile, each row becomes a two-line card.

### (e) Price alert / watch

- **What the leaders do:**
  - Google uses a "Track prices" toggle and emails on a "significant" change, without defining what that means ([TPG](https://thepointsguy.com/news/google-hotels-price-tracking/)).
  - Skyscanner requires an account.
  - Wise offers either a daily update or "tell me when it reaches X" ([Wise](https://www.wise.com/tools/exchange-rate-alerts)).
- **Tidaq:**
  - Email only, no account, with double opt-in.
  - Two radio options: "Bei jedem Rückgang ab 2 %" and "Wenn unter [1.150 €]", pre-filled at current price −5 %. Publish the threshold so it isn't a vague "significant".
  - After submitting, the card changes in place to: "Fast geschafft: Bestätige den Link in deiner Mail."
  - Once confirmed: "Du beobachtest diesen Aufenthalt."
  - Email subject: "▼ 80 €: Hotel X, 1.–3. Dez. jetzt 1.104 €".
  - One-click unsubscribe.

### (f) Mobile sticky bar

- **Layout:** 64 px tall plus `env(safe-area-inset-bottom)`, white with a 1 px `--line` top border. Left: price (17 px, weight 800) with the StateChip. Right: pill button "Preis beobachten".
- **Behavior:**
  - Appears only after the hero price scrolls out of view (IntersectionObserver).
  - Hides while the watch card is on screen and while the keyboard is open.
  - Add matching `padding-bottom` so it never covers content.
- **Avoid:** A second "Jetzt buchen" button. The bar has one CTA.

### (g) Loading and "collecting data"

- **Evidence:** Reported thresholds (attributed to NN/g, secondhand) are an indicator after about 1 s and determinate progress for waits over 10 s. Skeletons suit familiar layouts and short waits only ([Carbon](https://carbondesignsystem.com/patterns/loading-pattern)). A Viget study found skeletons performed worse than spinners.
- **Tidaq:**
  - Render stay pages on the server so most visits need no skeleton.
  - When a new stay is fetched for the first time, show honest steps: "Wir fragen 6 Buchungsseiten ab … meist 20–40 Sek.", with a checkmark per provider as it arrives.
  - The chart placeholder is a flat dashed baseline. Never draw fake shimmer lines that look like data.
  - Collecting state: a 7-segment progress bar labelled "Tag 3 von 7", plus "Erste Einschätzung ab Sa, 17. Okt." and a "Preis beobachten" button.

### (h) Trust and methodology

- **What the leaders do:**
  - Wise: "We have nothing to hide", and it recommends whichever provider leaves the recipient with the most money, "whether or not that's us" ([Wise](https://wise.com/gb/mid-market-rate/)).
  - KAYAK admits its forecasts can be wrong and shows its confidence.
- **Tidaq:**
  - Every number gets a small "ⓘ" popover. Example: "24 von 25 Tests stimmten · letzter Test 2. Okt. 2026 · Was zählt als Treffer?"
  - The popover links to a test log with dated screenshots (PLAN §8).
  - The methodology page lists sample sizes, what counts as a match (for example ≤ 1 € difference), how often prices are checked, and what Tidaq does _not_ know.

## 2. Anti-patterns to avoid

1. A highlighted "deal" that isn't the cheapest, or ranking by commission (trivago/ACCC).
2. Strike-through or "−30 %" comparisons across different room types or against invented "was" prices.
3. Countdowns, "Nur noch 1 Zimmer!", "12 Personen sehen sich das an".
4. Buy/Wait predictions or "accuracy %" claims without published backtests.
5. A truncated y-axis with no labels or min/max context, splines that invent lows, or interpolating missing days.
6. Shimmer placeholders that look like real data, or a verdict shown before 7 days of data.
7. Pre-ticked newsletter boxes, or a required account to set an alert.
8. Affiliate links that aren't labelled, or paid placements without "Anzeige".
9. A vague "significant drop" alert rule.
10. Showing a nightly price where the total is what you pay. Germany's price-display law (PAngV) requires the total price.

## 3. Ten ideas, ranked by impact/effort

| #   | Idea                                                                          | Impact | Effort |
| --- | ----------------------------------------------------------------------------- | ------ | ------ |
| 1   | Range bar with today's dot plus "Günstiger als an 52 von 60 Tagen"            | High   | Low    |
| 2   | Guarded y-domain (min span ±6 %, empty bottom third) and no spline            | High   | Low    |
| 3   | "Sortiert nach Gesamtpreis" line plus the commission footnote under the table | High   | Low    |
| 4   | "Zuletzt geprüft vor 3 Std." on the verdict and on every row                  | High   | Low    |
| 5   | Two alert options (any drop ≥ 2 % / under X €) with in-place confirmation     | High   | Medium |
| 6   | Touch and keyboard scrub that updates the header price (finance-app feel)     | High   | Medium |
| 7   | "ⓘ" trust popovers linked to the dated test log                               | High   | Medium |
| 8   | Sticky bar with appear/hide rules and safe-area padding                       | Medium | Low    |
| 9   | Collecting state with a 7-segment bar and the date of the first verdict       | Medium | Low    |
| 10  | First-fetch progress with a checkmark per provider in place of a spinner      | Medium | Medium |

**Gaps:** I could not verify the exact current wording and spacing of Google's or Hopper's UIs from text sources. A 15-minute look at the live products on a phone would confirm them before C-tasks lock the copy.
