# German platforms: CHECK24, HolidayCheck, TUI & co. (C-073, 14 Oct 2026)

**Question (Zaid, 14 Oct):** our audience is German, so CHECK24, HolidayCheck, TUI, HRS and hotel.de matter. How do we get their prices without scraping (hard rule 2)?

**Short answer:** none of them gives a small website price data per hotel and date. Their partner programs give links, banners, widgets and at most static "from" price feeds. The only legal per-stay source that includes CHECK24, HolidayCheck and TUI is a meta-search API, which in practice means **Google Hotels via DataForSEO**, our existing paid fallback (D-41).

## What we had and what we lost

Until 13 Oct the collector used DataForSEO Google Hotels with the German locale. Those results listed CHECK24, HolidayCheck, TUI.com and trivago next to Booking.com and Expedia (C-010). Since the switch to the free source Xotelo (Tripadvisor meta-search, D-41), they are gone: Tripadvisor doesn't list them.

## The options

| Option | Data per hotel and date? | Cost | Can a small new site join? | Verdict |
| --- | --- | --- | --- | --- |
| **DataForSEO Google Hotels** (existing code) | Yes, every site Google shows, incl. CHECK24/HolidayCheck/TUI | $0.0008 per hotel and stay (standard queue); minimum top-up $50 | Yes | **Best option** for German platforms |
| CHECK24 partner program | No. Calculators/widgets in an iframe, deeplinks; hotel isn't even a listed product (energy, DSL, insurance, travel packages) | Free | Yes, also private persons | Links/widgets only |
| hotel.de / HRS (Awin) | No public price API; booking connectivity only via integrators | Free (5 % commission) | Yes | Affiliate links only |
| HolidayCheck (Awin) | No API; prices may only be shown together with their offer | Free | Yes | Affiliate links only |
| TUI.com (Awin) | Product feed with "from" prices (not per date, unverified) | Free (4 %) | Yes | Not usable for history |
| trivago (Awin) | No publisher data API (FastConnect is for hotels) | CPC | Yes | Links only |
| SerpApi Google Hotels | Yes | 250 free searches/month, $25 per 1,000 | Yes | Too small; Google sued SerpApi in Dec 2025 |
| KAYAK, Skyscanner, Wego APIs | Yes | Partner deals | Not before traffic and a company | Later |
| Hotellook (Travelpayouts) | – | – | – | Closed Oct 2025 |

Sources (read 14 Oct 2026): check24.de/partner/partnerprogramm, Awin merchant profiles 16018 (hotel.de), 13877 (HolidayCheck), 10102 (TUI), 9369 (ab-in-den-urlaub), 105923 (trivago), developer.trivago.com (FastConnect), dataforseo.com/pricing (Google Hotels), serpapi.com/pricing, Computerworld 19 Dec 2025 (Google v. SerpApi), Travelpayouts FAQ on the Hotellook closure, affiliates.kayak.com.

## Recommendation

1. **Use DataForSEO for the real stay checks only, next to Xotelo for the night grid.** About 400 stay checks a day ≈ $9.60 a month, so a $50 top-up lasts about 5 months and fits the budget cap (D-13, $12). The night grid stays free on Xotelo. This brings CHECK24, HolidayCheck and TUI back into the provider table and the history of the stays we check for real, but not into histories built from single nights. Needs Zaid: the top-up (decision, see BLOCKERS) and a code change to run both sources at once (today `PRICE_SOURCE` picks one).
   Risk: Google-derived data. Google's lawsuit against SerpApi (Dec 2025) targets the scraper, not its customers, but a ruling could hit similar providers. We keep Xotelo as the base so we're never dependent on one source.
2. **Sign up for Awin later** (free, private persons allowed) for labelled affiliate links to hotel.de, HolidayCheck, TUI and trivago (`rel="sponsored nofollow"`, hard rule 9). That's revenue, not data. Awin's terms don't allow keeping their data after a program ends, so no history from feeds.
3. CHECK24's partner program only offers widgets and no hotel product: skip for now.
4. KAYAK/Skyscanner/Wego partner APIs once Tidaq has traffic and a company.

Not verified here: whether CHECK24 still appears in Google Hotels for every luxury hotel (it did in the C-010 sample), and what TUI's Awin product feed contains (needs an Awin login).
