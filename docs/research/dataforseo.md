# DataForSEO spike (C-010)

12 Oct 2026, CLOUD session. **Question:** what does the DataForSEO Google Hotels API really return for our luxury stays, what does it cost, and can we build Tidaq on it?

**Short answer: yes.** Hotel Info gives 25–33 booking sites per hotel with per-night prices in EUR, an "official site" flag, free-cancellation dates and links. It costs $0.0008 per task, and results come back in under 5 minutes. Three things differ from the plan: prices are **per night** (not totals), hotels must be looked up **by Google hotel ID** (not by name), and there is **no breakfast/board data**.

## Method

- Script: `scripts/spike/dataforseo.ts` (`balance`, `post`, `post-info`, `ready`, `get`). Hard cap of 20 paid tasks.
- Location Germany (`location_code` 2276), `language_code` `de`, `currency` `EUR`, 2 adults, standard queue (`task_post` → `tasks_ready` → `task_get`).
- Round 1 (16:02 UTC): Hotel Searches "Luxushotel Berlin" for 1–3 Dec 2026, Hotel Info **by hotel name** (`keyword`) for Adlon, Ritz-Carlton and Waldorf Astoria × 2 stays (Fri 16 → Sun 18 Oct, 1 → 3 Dec), plus one price calendar task.
- Round 2 (16:06 UTC): the same 7 Hotel Info tasks **by `hotel_identifier`** taken from the search result.
- Fixtures (no personal data): `tests/fixtures/dataforseo/`. Zod schemas: `packages/core/src/dataforseo.ts` (tested against every fixture).

## Numbers

| What                             | Result                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Cost of the whole spike          | **$0.0136** (15 tasks; balance $1.00 → $0.9864)                                                                    |
| Price per task                   | $0.0008 (Hotel Info, Hotel Searches), $0.0016 with `load_prices_by_dates`                                          |
| Failed tasks are still billed    | Yes: the 7 name-based tasks failed and cost $0.0064                                                                |
| Latency (standard queue)         | All tasks ready in **< 4 minutes** (docs promise up to 45 min)                                                     |
| `task_get` / `tasks_ready`       | Free, ~250–350 ms per call                                                                                         |
| Hotel Info by `keyword`          | **7 of 7 failed**: status `40102 No Search Results`                                                                |
| Hotel Info by `hotel_identifier` | **7 of 7 OK**                                                                                                      |
| Booking sites per hotel and stay | 25–33 entries (avg 29), of which 3–4 are Google ads; **21–29 organic** (avg 25)                                    |
| Official hotel site included     | **7 of 7** (`official_site: true`, booking engine domains like `linkcenter.derbysoftca…`, `marriottclk.koddi.com`) |
| Free-cancellation date given     | 0–8 sites per stay (`free_cancellation_until`)                                                                     |

## What each booking site entry contains

`result[0].prices.items[]` (`type: hotel_info_price`):

| Field                     | Meaning                                                                                                                  | Notes                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `title`                   | Site name: `Booking.com`, `Expedia.de`, `CHECK24.de`, `Hotels.com`, `Trip.com`, `Agoda`, `trivago DEALS`, `Super.com`, … | Map providers by **domain**, not title (titles vary, e.g. the hotel's own name) |
| `domain`                  | `www.booking.com`, `www.expedia.de`, `de.hotels.com`, `de.trip.com`, `hotel.check24.de`, …                               | `google.de` on ads                                                              |
| `url`                     | Deep link to the site                                                                                                    | Long tracking URLs; use as outbound target (C-026)                              |
| `price`                   | **Integer EUR per night**, no cents                                                                                      | See "Per night vs total"                                                        |
| `currency`                | `EUR`                                                                                                                    | As requested                                                                    |
| `is_paid`                 | Google ad                                                                                                                | Ads duplicate an organic entry of the same site                                 |
| `official_site`           | Hotel's own website                                                                                                      | Can appear twice (ad + organic)                                                 |
| `free_cancellation_until` | UTC datetime or null                                                                                                     | Only some sites                                                                 |
| `offers[]`                | Room offers: `title` (room name), `price`, `max_visitors`                                                                | **Only on ad entries** (3–4 per stay)                                           |

Hotel-level fields worth keeping for the catalog (C-011): `title`, `stars` (**unreliable**: 0 for Waldorf Astoria Berlin), `address`, `location.latitude/longitude`, `check_url`, `reviews.value`, `about.url` (official website).

Not in the response: **taxes, a total price, board/breakfast, room type for organic entries**.

## Findings that change the plan

1. **Prices are per night.** PLAN §7.3 assumed stay totals. Normalization (C-014) must store `total_cents = price × nights × 100` and mark `nightly: true` in `raw`.
2. **Some sites report the stay total instead.** On the Adlon weekend stay, 9 of 29 organic entries were 1.9–2.4× the median (1,036–1,320 € vs a 557 € median). That looks like 2-night totals or a different rate. On 1 of 7 stays a site showed 3.65× the median. Rule for C-014: if `price / median ≈ nights` (±25 %), flag the entry as a suspected total and **exclude it from best price and provider tables** (keep it in `raw`). High outliers never change the best price (that's the minimum), but they would show wrong per-provider prices.
3. **Hotels must be resolved by `hotel_identifier`.** Name lookups failed every time and still cost money. The catalog (C-011) resolves identifiers once with Hotel Searches, stores them in `hotels.dfs_hotel_identifier`, and the collector only uses identifiers. Hotel Searches also returns non-luxury hotels ("Luxushotel Berlin" gave a B&B Hotel), so the catalog stays a curated list.
4. **Ads duplicate organic entries.** Dedupe per provider per stay: keep the cheapest entry, prefer the organic one for the URL.
5. **No breakfast/board data.** 0 of 198 room offers mention breakfast. Room names exist only on ads. **C-055 (breakfast and room filters) is not feasible with this source**; `price_snapshots.board` stays null.
6. **The lowest price usually comes from small resellers.** The top-level `prices.price` (cheapest) came from Super.com, trivago DEALS, Stayforlong or Amimir, 5–20 % under Booking/Expedia/the hotel. That is exactly the trust question Tidaq answers. The checkout audit (L-033) should include these resellers.

## Price calendar (`load_prices_by_dates`)

Works. With `prices_date_range: three_months` it returned **121 nightly entries** (1 Dec 2026 → 31 Mar 2027) for double the price ($0.0016). Each entry is the **cheapest 1-night price for that check-in date**, without providers. Good for the hotel page calendar (C-023): one task per hotel per week covers 4 months for $0.0016. It can't replace stay tracking: no 2-night stays and no per-site prices.

## Postback vs polling

Not tested with a live endpoint, because the staging collector only went live today (C-005) and `/postback` is still a stub. Polling is cheap and simple: `tasks_ready` and `task_get` are free and results were ready within 4 minutes. **Recommendation for C-013: post at 05:00 UTC and collect with a second cron at 05:30 UTC (polling `tasks_ready`)**, plus a retry at 06:30 for stragglers. Postback can be added later if polling becomes a problem; it needs a secret token in the URL and gzip decoding.

## Recommendation

- **Grid and budget: keep D-13 as is.** 36 hotels × 8 stays ≈ 290 tasks/day × $0.0008 = **$0.23/day ≈ $7/month**. Optional: one price-calendar task per hotel per week (36 × $0.0016 ≈ $0.25/month) for C-023.
- **Run times:** post 05:00 UTC, collect 05:30 UTC, retry 06:30 UTC. Evening run stays off (D-13).
- **Breakfast/room filters (C-055):** not feasible; drop from v1 (D-40).
- **Second source:** not needed now. SerpApi stays the fallback if coverage for a city turns out poor (check in C-011 for the non-German cities).
- **Top-up:** the data works. Zaid can top up the $50 minimum now (BLOCKERS B-003); the $0.98 left covers only ~4 days of the lean grid.

## PLAN/DECISIONS changes from this spike

- PLAN §7.3 updated (per-night prices, identifier lookups, ad dedupe, suspected totals).
- D-39: collector posts by `hotel_identifier` only, normalizes per-night prices to stay totals, collects by polling (05:00 post, 05:30 collect).
- D-40: C-055 breakfast/room filters dropped for v1 (no data in the source).
