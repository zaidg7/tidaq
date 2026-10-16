# Exact final prices: what each source really shows (16 Oct 2026, night)

**Why:** Zaid compared our Price Drops with the booking sites and the numbers didn't match (Ritz-Carlton Maldives: we showed 34.015 € for 5 nights, Agoda showed 7.981 € a night = 39.905 €). Rule from Zaid: no estimates, no ranges. Every price we show must be the price the visitor sees on the site.

## Finding 1: Xotelo (Tripadvisor) prices are not final prices

Xotelo's `rate` is Tripadvisor's base rate: without taxes and fees. The API has no parameter for taxes (`tax` is always `null`, an undocumented `tax=` parameter is rejected; docs at xotelo.com list only hotel_key, currency, chk_in, chk_out, rooms, adults, age_of_children).

Same stay, same moment, Xotelo vs Google Hotels (DataForSEO Hotel Info, location Germany, language de, EUR, 2 adults), per night:

| Hotel (17–19 Nov 2026) | Site | Xotelo | Google (DE) | Gap |
| --- | --- | ---: | ---: | ---: |
| Hotel Adlon Kempinski Berlin | Booking.com | 314 € | 359 € | +14 % |
| Four Seasons Hotel New York | Booking.com | 2.263 € | 2.592 € | +15 % |
| Four Seasons Resort Dubai | Booking.com | 966 € | 1.077 € | +11 % |
| Four Seasons Resort Dubai | Agoda | 1.030 € | 1.077 € | +5 % |
| Mandarin Oriental Conservatorium Amsterdam | Booking.com | 511 € | 682 € | +33 % |
| Ritz-Carlton Maldives (5–10 Jan 2027) | Agoda | 6.803 € | 7.985 € | +17 % |

The gap differs per hotel **and per site** (Dubai: Booking +11 %, Agoda +5 %), so no factor can turn Xotelo into exact prices.

## Finding 2: Google Hotels via DataForSEO, searched from Germany, gives the final price

Ritz-Carlton Maldives, 5–10 Jan 2027, 2 adults: Google lists Agoda at **7.985 € a night**; Agoda's own page shows **7.981 € a night incl. taxes & fees** (Zaid's screenshot, same night). Booking.com 7.986 €. Opodo's link carries the total `mpf=39928.00` = 5 × 7.985,6 €.

One Hotel Info task returns 12–20 sites with their per-night price for the exact stay, plus a direct link per site (hotel, dates, guests prefilled). Cost: $0.0008 per task (standard queue, results in 1–5 minutes).

Notes:
- Search hotels with the hotel's country as location (`hotel_searches`), then always price with **location Germany** (`hotel_info`, 2276): German visitors see totals incl. taxes.
- Per-night prices are whole euros (the site's total ÷ nights, rounded). The total for the stay is per-night × nights (±0,50 € per night from rounding).

## Consequence for Tidaq

- **Showing prices:** only Google/DataForSEO quotes, with the time we asked. Never Xotelo amounts.
- **Finding drops:** Xotelo's night grid stays useful for *changes* (a site's own price today vs yesterday, same basis), at no cost. A drop is shown only after a DataForSEO quote for the exact trip confirms the site still sells it, and then with the quoted price.
- **Cost:** ~130 drops a day, each quoted when found and re-quoted every few hours ≈ 500–1.500 tasks a day ≈ $12–36 a month. Needs a DataForSEO top-up (balance 16 Oct: $0.57).
