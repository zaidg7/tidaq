# Design prompt: the stay page (one hotel, your dates)

Paste everything below the line into any AI (Claude, ChatGPT, Gemini, v0, Lovable…). It gets the real
data and our brand rules, and is free to decide layout, visuals and the user flow. Compare the results
on your phone, keep what works, and tell Claude which ideas to build.

---

You are a senior product designer and front-end developer. Design and build **one page** of Tidaq, a
price tracker for five-star hotels. I give you the data the page has, the brand rules it must follow
and the hard rules it must not break. Everything else is your call: layout, order, what is shown first,
what is hidden behind a tap, which charts or visuals you use, what you leave out, when the user presses
a button and what happens then. I want to see how YOU would make this data clear, trustworthy and
beautiful. Surprise me, but stay inside the brand.

## What Tidaq is

Tidaq checks the prices of luxury hotels every day on several booking sites (Booking.com, Trip.com,
Agoda, Expedia, the hotel's own website…) and shows whether a price is good right now. Visitors mostly
come from TikTok on a phone, often from a "Price Drop" video. We earn a commission when they book via a
partner link. The visitor's question on this page: **"What does my stay cost, is that a good price
right now, and where do I book it?"**

## The page

A visitor picked a hotel and dates. URL: `tidaq.com/hotel/fairmont-bab-al-bahr-abu-dhabi/2026-12-25--2026-12-27`.
Show the page in **two states** (design both, the second can be smaller):

1. **Mature**: we have 30+ days of history (data set A).
2. **New**: we only started tracking these dates a week ago (data set B). Our rule: no "good/bad price"
   verdict before 7 days with a price; show what we have honestly, never an empty placeholder box.

## The data

```json
{
  "hotel": {
    "name": "Fairmont Bab Al Bahr",
    "city": "Abu Dhabi",
    "country": "Vereinigte Arabische Emirate",
    "stars": 5,
    "photo": "one licensed landscape photo (use a neutral placeholder block, credit line: 'Foto: Name, CC BY-SA 4.0')",
    "official_website": "https://www.fairmont.com/abu-dhabi/"
  },
  "stay": {
    "check_in": "2026-12-25",
    "check_out": "2026-12-27",
    "nights": 2,
    "adults": 2,
    "editable": "dates and guests can be changed (opens a date picker / guest stepper)"
  },
  "today": {
    "checked_at": "2026-10-22T07:12:00+02:00",
    "prices_incl_taxes_total_eur": [
      { "site": "Trip.com", "total": 920, "partner": true, "link": "opens the hotel on Trip.com with these dates" },
      { "site": "Agoda", "total": 920, "partner": false },
      { "site": "Booking.com", "total": 922, "partner": false },
      { "site": "Website des Hotels", "total": 945, "partner": false, "note": "Direkt beim Hotel" }
    ],
    "more_sites_not_yet_reviewed": 1,
    "price_quality": "calculated: summed nightly rates plus the city's measured taxes; real checkout price can differ by a few percent"
  },
  "checkout_tests": {
    "explanation": "We test sites by going to the last page before payment and comparing the price there with what the site advertised. 'Preistreue' = how often it matched.",
    "Trip.com": { "tests": 0 },
    "Booking.com": { "tests": 25, "matched": 24, "score": 96 },
    "Agoda": { "tests": 3 },
    "Expedia": { "tests": 12, "matched": 7, "score": 58, "avg_markup_at_checkout_pct": 8.9 }
  },
  "history_A_mature_30_days": {
    "unit": "cheapest total for these exact 2 nights on the day it was checked, EUR incl. taxes",
    "cheapest_site_per_day": "mostly Trip.com, some days Agoda",
    "days": [
      ["2026-09-23", 955], ["2026-09-24", 960], ["2026-09-25", 961], ["2026-09-26", 958],
      ["2026-09-27", 955], ["2026-09-28", 952], ["2026-09-29", 951], ["2026-09-30", 952],
      ["2026-10-01", 953], ["2026-10-02", 951], ["2026-10-03", 945], ["2026-10-04", 936],
      ["2026-10-05", 925], ["2026-10-06", 916], ["2026-10-07", 912], ["2026-10-08", 913],
      ["2026-10-09", 918], ["2026-10-10", 926], ["2026-10-11", 932], ["2026-10-12", 936],
      ["2026-10-13", 936], ["2026-10-14", 934], ["2026-10-15", 933], ["2026-10-16", 934],
      ["2026-10-17", 937], ["2026-10-18", 941], ["2026-10-19", 944], ["2026-10-20", 942],
      ["2026-10-21", 936], ["2026-10-22", 920]
    ],
    "stats": { "low": 912, "high": 961, "average": 939, "usual_range_middle_half": [926, 953] },
    "verdict": "good",
    "verdict_rule_simplified": "good = cheaper than at least 70 % of the tracked days; high = more expensive than 70 %; near_low = within 2 % of the lowest; else normal"
  },
  "history_B_new_7_days": {
    "days": [
      ["2026-10-16", 929], ["2026-10-17", 919], ["2026-10-18", 924], ["2026-10-19", 926],
      ["2026-10-20", 930], ["2026-10-21", 920], ["2026-10-22", 920]
    ],
    "per_site": {
      "Booking.com": [940, 919, 924, 928, 931, 920, 922],
      "Trip.com": [929, 920, 926, 926, 930, 921, 920],
      "Agoda": [939, 921, 926, 932, 931, 921, 920]
    },
    "verdict": "collecting (day 7 of 7: first verdict tomorrow)"
  },
  "price_alert": {
    "what": "email when the price for exactly these dates drops",
    "fields": ["email (required)", "target price in EUR (optional)", "consent checkbox, never pre-ticked, with link to Datenschutz"],
    "double_opt_in": true
  },
  "price_drop": {
    "exists_when": "the price fell sharply since yesterday on one site",
    "example": { "site": "Trip.com", "drop_pct": -21, "now_total": 920, "yesterday_total": 1165, "lowest_in_days": 10 },
    "note": "optional: design how this would appear on the page if this stay has a live drop"
  }
}
```

Mature data set A is an example of what 30 days look like; data set B is real.

## Brand (keep it: the page must feel like the rest of tidaq.com)

- **Style:** "Clean Premium": calm, editorial, lots of white space, no clutter. Think Apple, Linear, Airbnb.
- **Font:** Instrument Sans (Google Fonts), weights 400 / 500 / 600 / 700. Tabular numbers for prices.
- **Colors:** background `#faf9f7`, cards `#ffffff`, soft surface `#f4f2f7`, lines `#e8e5ee` / `#d9d5e2`,
  text `#15131c`, secondary text `#5b5866`, **one accent `#4b33c9`** (violet, for the main action only),
  accent soft `#eeeafe`, good/cheap `#0e6b47` on `#e1f2e9`, expensive `#b42318` on `#fdebe7`,
  dark surface `#15131c`.
- **Shapes:** cards radius 20–24 px, buttons radius 16 px, soft shadows only, no gradient washes,
  no glows, no emoji, no left-border cards.
- **Price format (German):** `920 €`, `1.184 €` (dot as thousands separator, space before €).
- **Copy:** German, informal "du", short sentences, no hype words. Product terms "Price Drop" and
  "Price Alert" stay in English. Write all copy yourself.

## Hard rules (never break)

1. **Phone first:** design for 390 px width, then show how it adapts at 1280 px. On the phone it must
   feel compact, not oversized: our owner's main complaint is that everything is too big right now.
2. **Facts, not forecasts.** Never say "the price will rise" or "book now before it's gone". No fake
   urgency, no countdowns, no "only 2 rooms left".
3. **Buttons only to partners.** Only Trip.com pays us today, so only Trip.com gets a booking button
   ("Bei Trip.com buchen"). Every other site shows its price as plain text without a link. Every partner
   link is labelled "Partnerlink". Commission never changes the order or which prices are shown: sort by
   price.
4. **Honest data:** prices are totals for the whole stay incl. taxes, from our last check, and can
   differ by a few percent at checkout; say so briefly (one line, or behind an info tap).
5. **Accessibility:** contrast AA, touch targets ≥ 44 px, real buttons/links, the chart must be readable
   without hover too (show the key numbers as text).
6. **No other dates.** Don't suggest cheaper dates; the visitor already chose theirs.

## What I want back

- **One self-contained HTML file** (inline CSS and JS, Google Fonts link allowed, no frameworks
  required) that shows: the phone version of state A, the phone version of state B, and the desktop
  version of state A, side by side or one after another.
- Interactions should work: hover/tap on the chart shows the price of that day, the date line opens
  something to change dates (a mock is fine), the Price Alert form, any toggles you invent.
- Below the design, **5–10 short bullet points**: what you show first and why, what you hid or left
  out and why, and the user flow (what the visitor sees, taps, and where they end up).
