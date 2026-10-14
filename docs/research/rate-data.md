# Room, board and occupancy data: options (research 14 Oct 2026)

**Goal (Zaid, 14 Oct):** long term, Tidaq must answer "3 people, half board, deluxe suite at hotel X" and show drops like "the deluxe suite all-inclusive at the five-star hotel in Shanghai just got 65 % cheaper", for the five-star hotels of the 20–25 most popular cities. Main audience: 1–2 adults, but families and other occupancies need data too. It must be affordable: per-call pricing at that scale (~$40,000/month) is out.

## Key facts

- **Room type and board don't multiply calls.** A room-level rates API returns every room × board combination in one call. **Dates and occupancies do**: 1,500 hotels × 365 nights × 4 occupancies ≈ 2.2 M calls a day.
- **No free source allows unlimited calls without bookings.** The free supplier APIs expect a "reasonable look-to-book" ratio (searches per booking).
- **Two kinds of data, never both from one source.**
  - Meta-search (Xotelo, Google Hotels, DataForSEO) gives **each platform's price, without rooms or board**.
  - Supplier / bedbank APIs (LiteAPI, Hotelbeds, Expedia Rapid, RateHawk) give **rooms, board and occupancy, without other platforms' prices**.
  - So room- and board-level drops must be measured against that supplier's own price over time.
- No affordable dataset of past prices exists. History has to be collected (as we do since 14 Oct, D-42).

## Options

| Source | Cost | Access | Room / board / occupancy | Notes |
|---|---|---|---|---|
| **LiteAPI (Nuitee)** | Rates, prebook and book free; price-index endpoints $0.05 per request | Self-serve, free sandbox key, no card | **Yes**: board type, room name, adults/children | "Reasonable look-to-book, fair usage" (no number). Storing/showing history: ask in writing |
| Expedia Rapid | Commission | Partner application, approval, certification; weighs traffic and bookings | Yes; up to 250 hotels per request | For later, once we have traffic |
| Booking.com Demand API | Commission | Managed affiliate partners only (contract); small affiliates moved to Awin/CJ in June 2025 | Room level | Not realistic for a new site |
| Hotelbeds APItude | Net rates (B2B) | Free registration; evaluation key 50 requests/day; live needs certification | Yes | For later |
| RateHawk / ETG | Net/gross (B2B) | Registration, contact, certification | Yes, meals and full room names | Docs allow caching rates |
| SerpApi Google Hotels | $75/mo 5k, $150/mo 15k searches | Self-serve | Platform prices, adults/children; **no rooms/board** | Spot checks only |
| Makcorps | $350/mo 10k calls … $4,000/mo 10 M credits | Self-serve | Platforms; room/board not advertised | Too expensive for full grids |
| Lighthouse, RateGain, Aggregate Intelligence | Quotes | Hotel-side B2B licences | Some room/board | Not built for consumer redistribution; possible history back-fill at scale |
| Apify and similar scrapers | — | — | — | **No**: breaks hard rule 2 (no scraping) |
| Amadeus Self-Service, Hotellook | — | **Shut down** (Jul 2026, Oct 2025) | — | — |

Sources: LiteAPI docs (api-pricing-usage-costs, hotel-rates-api-json-data-structure), developers.expediagroup.com/rapid, developers.booking.com/demand, developer.hotelbeds.com, docs.emergingtravel.com, serpapi.com/pricing, makcorps.com, aggregateintelligence.com. Prices and terms as published on 14 Oct 2026; unverified items are marked in the task notes.

## Plan

1. **Now (free):** keep the night grid for per-platform prices (2 adults, Xotelo). Spike **LiteAPI** (C-072): does it return room type, board and occupancy for our five-star hotels? How fast? Is storing and showing price history allowed (ask Nuitee in writing)? If yes, add a second, room-level grid:
   - 2 adults daily for the next 60 nights, weekly for 61–365;
   - 1 adult and 2+1 only for hotels and dates people watch.
2. **After launch (traffic, first bookings):** earn through affiliate links (Awin/CJ for Booking.com, LiteAPI bookings). Bookings make a high look-to-book acceptable. Apply to Expedia Rapid and Hotelbeds with real numbers.
3. **At scale:** bedbank plus Expedia Rapid contracts (250 hotels per request); poll what users watch often and the rest less often; buy back-fill history from a rate-intelligence vendor if it pays off.

**Not possible:** every night × every occupancy × daily for 1,500 hotels for free; platform prices and room/board from one source.
