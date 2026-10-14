# LiteAPI: room types, board and guest counts (C-072 spike, 14 Oct 2026)

**Question (D-43):** can Tidaq show prices per guest count (1 adult, 2 adults, families, 3 adults), room type and board (room only, breakfast, half board, all-inclusive) without per-call pricing at scale? LiteAPI (Nuitee) was the only free, self-serve supplier API found (`docs/research/rate-data.md`).

**Answer: yes, technically.** One call returns every room type and board of a hotel for one stay and one guest mix, with prices close to the market. Whether we may run it at scale (no bookings, many searches) and store the history is a question for Nuitee (see "Open questions").

## Method

- Sandbox key (B-010). The cloud proxy adds the `X-API-Key` header. Only the read-only endpoints were used: `GET /v3.0/data/hotels` (catalog) and `POST /v3.0/hotels/rates` (search). We never called booking or prebook endpoints (hard rule 3).
- 10 hotels: Adlon Berlin, Mandarin Oriental Munich, George V Paris, Claridge's, Sacher Vienna, Four Seasons Madrid, Four Seasons Ritz Lisbon, Bvlgari Dubai, Four Seasons New York, Raffles Singapore. Their LiteAPI ids come from the C-071a matching (`hotels.liteapi_id`, `scripts/catalog/candidates.json`).
- 2 stays each (Fri 20–Sun 22 Nov, Tue 8–Thu 10 Dec 2026) × 4 guest mixes (1 adult; 2 adults; 2 adults + child aged 8; 3 adults) = 80 searches, plus the same stays for 2 adults from Xotelo (our platform prices) as a reference.
- Raw results: session scratchpad only, not committed (prices, no personal data).

## Results

| | Result |
| --- | --- |
| Searches with prices | 1 adult 19/20 · 2 adults 19/20 · 2+1 18/20 · 3 adults 17/20 (Raffles 8 Dec: nothing at all; Adlon 20 Nov: 2+1 and 3 adults sold out) |
| Room types per answer | up to 200 (the answer is capped at 200 room types; luxury hotels often hit it: many rate plans per room) |
| Board types seen | Room Only, Breakfast Included, Half Board (Raffles). All-inclusive only exists at resorts; not in this sample |
| Cancellation | refundable/non-refundable tag on every rate |
| Price vs market (2 adults, cheapest rate per night vs cheapest Tripadvisor site) | median **+4.7 %**, 15 of 18 within ±10 %. Outliers: Four Seasons New York +16/+21 % (US taxes included vs excluded), Raffles Singapore −32 % |
| Response time | median 3.2 s, p90 9 s, max 14.5 s |
| Sandbox flag | `sandbox: true` on the answers, but the prices track the market (above), so the sandbox seems to serve live supplier rates |

Examples (2 nights, total):

- Claridge's, 8–10 Dec: room only 882 €, with breakfast 1,051 €; 2+1 child 1,068 €; 3 adults 1,055 €.
- Mandarin Oriental Munich, 20–22 Nov: room only 1,663 €, with breakfast 2,167 €; 3 adults 2,021 €.
- Raffles Singapore, 20–22 Nov: breakfast 2,041 €, room only 2,071 €, half board 3,246 €.
- Adlon, 8–10 Dec: room only 580 €, breakfast 687 €; 2+1 666 €; 3 adults 738 €.

## What it means for Tidaq

1. **Guest count is solved.** Today the night grid only collects 2 adults. LiteAPI gives every guest mix with one search each.
2. **Board is solved where hotels sell it.** "Breakfast included" exists at most city hotels; half board and all-inclusive mostly at resorts (Maldives, Dubai beach). That fits D-43's resort use case.
3. **Room type is solvable but messy.** Names come from many suppliers ("Superior Room (Plus)", "Habitación superior (Plus)", "Double room - Accommodation Only - Superior Courtyard View"). Showing "deluxe suite" history needs a room-type normalizer (per hotel: map supplier names to a small set like Standard / Deluxe / Suite). That is the hard part.
4. **It doesn't name the platforms.** These are wholesale/supplier rates (`retailRate` = suggested selling price), not "Booking.com vs hotel website". So LiteAPI complements the platform comparison (Xotelo, D-41); it doesn't replace it.

## Proposed design (only after Nuitee's answer)

- Keep the free night grid (Xotelo, 2 adults, every night × 120 days) for platform prices.
- Add a **room grid** from LiteAPI for the watched and most-viewed stays only: one search per (stay, guest mix) per day, storing per board the cheapest rate, plus per normalized room type the cheapest rate. With 82 hotels × 4 grid stays × 2 guest mixes ≈ 660 searches a day, about 35 minutes of calls in a 2-minute cycle.
- Visitors with other guest counts get a live LiteAPI search on the stay page (3 s) plus a "watch" that starts daily history for exactly their guest mix and board.
- Storage: new table `room_daily(stay_id, occupancy, board, room_class, day, cents)`. Raw answers are pruned like D-19.

## Open questions for Nuitee (Zaid sends them, see BLOCKERS B-012)

1. We compare and track prices and link out; we rarely book. What look-to-book ratio or search volume is fine on the free plan (about 700 to 5,000 searches a day)?
2. May we store rates over time and show the history (price charts) to visitors, with LiteAPI named as the source?
3. Does the sandbox serve the same rates as production, and what does production need from us (company, booking flow)?

## Verdict

**Go for a small build after Nuitee says yes in writing.** Until then, no LiteAPI calls from our servers beyond tests. Next tasks: C-074 (room-type normalizer prototype on stored answers) and C-075 (room grid for watched stays) are added to TASKS, both blocked on B-012.
