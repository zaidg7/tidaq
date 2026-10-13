# Xotelo as a free price source (spike, 13 Oct 2026)

Why: the DataForSEO balance ran out and Zaid wants to test the market without paying for data (D-41). Question: can a free source replace DataForSEO for our daily grid?

## What Xotelo is

- `https://data.xotelo.com/api/rates?hotel_key=<TripAdvisor key>&chk_in=&chk_out=&adults=&currency=EUR`: one hotel, one stay, the nightly rate per booking site from TripAdvisor's meta search. No account, no key.
- `/api/list?location_key=<geo>&offset&limit=100&sort=popularity|best_value|distance`: every hotel of a city (Berlin 1,689, Rome 9,974) with key, rating and a price range. No star filter, no price sort.
- `/api/heatmap?hotel_key&chk_out`: check-in days marked cheap / average / expensive. Raw material for later price-drop features.
- `/api/search` needs RapidAPI (401 without). Run by one person on donations: no SLA, no published terms or rate limits.

## Results

| Check | Result |
| --- | --- |
| Our hotels found (city list, name match) | **38 of 40**, all matches correct; Villa Kennedy (inactive) and Bulgari Milano ("Bvlgari", added by hand) missing → 39 of 39 active hotels have a key |
| Stays with prices | 33 of 34 test stays (one hotel had no rate that day, the next day it had 1) |
| Sites per stay | median 4: Booking.com, Agoda.com, Trip.com, Vio.com, the hotel's own site ("RitzCarlton.com", "IHG", "Fairmont", "Official website" …) |
| Price vs DataForSEO, same stay, a few hours apart | median **−5.8 %**, 21 of 33 within ±10 %; outliers −25 % to +50 % (often a single site) |
| Reliability | 76 calls at one per ~1.5 s, **0 errors**, median 2.7 s per call |

The gap to DataForSEO is part timing (prices move during the day), part what each meta search shows (taxes and fees, room types). It doesn't matter for our signal as long as each stay's history comes from one source: switching never mixes the two (see the C-013g migration: `stay_daily` follows the source of a stay's newest snapshot).

## Decision

D-41: Xotelo is the price source while there is no data budget; DataForSEO stays in the code as the fallback (`PRICE_SOURCE`). We never scrape booking sites or Google ourselves (hard rule 2): it's against their terms and they block cloud servers within minutes.

## Risks and what we do about them

- **It can stop or block us any day.** Switch back with `PRICE_SOURCE=dataforseo` after a top-up; the daily check emails on failed runs.
- **Gentle use:** at most `DAILY_TASK_CAP` calls a day, 400 ms between calls, our user agent `Tidaq/1.0 (+https://tidaq.com)`. If it becomes important to us, donate.
- **Not verified from Cloudflare yet** at the time of writing; the first staging run after C-013g checks it.

Recorded answers: `tests/fixtures/xotelo/`. Spike scripts were one-off (session scratchpad), not committed.
