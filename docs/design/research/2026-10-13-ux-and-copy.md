# Tidaq UX spec v1 (journeys, IA, content, microcopy)

Sources: PLAN.md, DESIGN.md, the reference homepage, de/en.json, and TASKS (C-020 to C-034). Where my advice changes existing copy or plans, it is marked **⚑**.

## 1. Core user journeys

**A. First-time visitor (Google "Adlon Preis Dezember", or TikTok)**
1. **Lands on a stay or hotel page, not the homepage.** Needs to see the hotel, the dates, the price, a verdict chip, the timestamp ("Stand") and the chart, all within 2 seconds. *Friction:* the dates in the link may not be the dates they want. Fix: an "Ändern" button in the header.
2. **Edits the dates.** Needs to know whether the new dates have a price history. *Friction:* most dates are outside the grid (2-night stays for 2 adults only), so the chart may be empty. See risk 1.
3. **Scans the provider table.** Needs the price, the price-accuracy score with its sample size, and the expected checkout total.
4. **Next step:** either "Preis beobachten" or "Zum Angebot".
**Most important action:** stay page → **Preis beobachten**. Homepage → **search**.

**B. Returning visitor from an alert email**
1. **The email.** It shows the price, the change since the last email, the verdict chip and the source time ("Stand"). Its one button opens the stay page.
2. **The stay page.** It must show the same price as the email, or explain why it differs ("Stand: heute 07:10 · E-Mail: 07:12").
3. **Next step:** compare providers, then "Zum Angebot". Second option: "Alarm verwalten".
*Friction:* the price moved after the email was sent. Show "Seit deiner E-Mail: +12 €" in plain words.

**C. Skeptical visitor (a mydealz or Reddit reader asking "is this a Booking affiliate?")**
1. **The trust score in the provider table.** They click "Wie messt ihr das?".
2. **`/anbieter/[slug]`.** Score, number of tests, dates, average markup, common extras.
3. **`/methodik` and `/ranking`.** They should find the formula in plain German and the statement that commission never changes the ranking.
**Most important action:** reach the methodology in **one tap** from any score.

## 2. Information architecture

**Navbar: 4 items plus a search icon.** ⚑ This replaces "Preisverlauf" (it has no destination page) and "Kostenlos starten" (it suggests an account).

| DE | EN | Target |
|---|---|---|
| Hotels | Hotels | `/hotels` (new: cities, then hotels) |
| Deals | Deals | `/deals` |
| Kassen-Check | Checkout check | `/anbieter` (new index) |
| So funktioniert's | How it works | `/methodik` |

On mobile, the search icon opens the search in a bottom sheet.

**Footer: 4 columns, then a bottom row.**
- **Tidaq:** one-line tagline and the last data update ("Stand").
- **Entdecken:** the 12 cities, Deals, Alle Hotels.
- **Transparenz:** So funktioniert's, Kassen-Check, Ranking, Affiliate-Hinweis.
- **Rechtliches:** Impressum, Datenschutz, Alarme verwalten.
- **Bottom row:** © 2026 Tidaq · language switch · the source line.

**URLs** (PLAN routes kept; new ones marked):
- `/hotel/[slug]`
- `/hotel/[slug]/2026-12-01--2026-12-03?adults=2`
- `/stadt/[city]`
- `/deals`
- `/anbieter` (new) and `/anbieter/[slug]`
- `/hotels` (new)
- `/methodik`, `/ranking`, `/affiliate-hinweis`, `/impressum`, `/datenschutz`
- `/watch/confirm`, `/watch/manage/[token]`, `/go/[offerId]`
- English versions: `/en/hotel/…`, `/en/city/…`, `/en/providers/…`, `/en/methodology`, `/en/affiliate-disclosure`, `/en/imprint`, `/en/privacy`. Hotel slugs are the same in both languages.

**Breadcrumbs** (also as BreadcrumbList JSON-LD):
- Stay page: Start › Berlin › Hotel Adlon Kempinski › 1.–3. Dez. 2026
- Hotel page: Start › Berlin › Hotel
- Provider page: Start › Kassen-Check › Booking.com

## 3. Page hierarchy (blocks in order)

**Homepage**
1. Hero: eyebrow, H1, subline, search card.
2. Proof row (below the search card on mobile).
3. Live example: a real stay with its chart and providers.
4. How it works: 3 steps.
5. Kassen-Check figures.
6. Deals of the week (cards link to stay pages).
7. CTA: "Dein Hotel finden".
8. Footer.
- **Above the fold at 390 px:** H1, subline, search card with the hotel field and the button. Move the proof row below.
- **Above the fold at 1280 px:** the whole hero, including the proof row.

**Stay page**
1. Breadcrumb.
2. Compact header: hotel, dates, nights, guests, "Ändern".
3. Price panel: price XL (total), "592 € pro Nacht · 2 Nächte", state chip, delta line, Stand.
4. Chart (with a data-table toggle).
5. Stats: Tief, Schnitt, Hoch, plus the number of days.
6. Advice box.
7. Provider table, then the affiliate line.
8. Watch card.
9. Ähnliche Termine (cheaper or tracked dates).
10. Methodology note with the source.
- **Above the fold at 390 px:** blocks 2–3 and the top of the chart. A sticky bottom bar shows the price and "Preis beobachten".
- **Above the fold at 1280 px:** two columns. Left: price panel, chart, stats. Right: advice, the top 3 providers, the watch card.

**Hotel page**
1. Photo or gradient with credit; name, city, facts.
2. Price calendar with a legend. Each cell shows the price as text, and a dot marks dates with ≥ 7 days of history.
3. Cheapest weekend and cheapest midweek stay.
4. Providers seen for this hotel, with their scores.
5. Source and Stand.
- **Above the fold:** the name, plus the first calendar row (390 px) or the full first month (1280 px).

**Provider page (Kassen-Check)**
1. Name and score, or "Noch zu wenig Tests".
2. Sample line.
3. Facts: tests, matches, average markup when higher, most common extras, last test date.
4. List of tests: date, hotel, shown price vs. checkout price, extras. Screenshot available on request.
5. How we test, with a link to the methodology.
6. A neutral note: "Ergebnisse gelten für unsere Stichprobe."
- **Above the fold:** blocks 1–3.

## 4. Microcopy (DE | EN)

**Hero headlines (pick one):**
1. "Ist dein Hotelpreis gerade *tief* oder hoch?" | "Is your hotel price low or high right now?" (**my pick**)
2. "Kenn den Preis, bevor du buchst." | "Know the price before you book."
3. "Dein Fünf-Sterne-Hotel. Der *richtige* Moment." | "Your five-star hotel. The right moment."

⚑ The reference headline "Zahl nie zu viel" promises an outcome. Drop it.

**Hero subline:** "Wir prüfen jeden Tag die Preise von 36 Fünf-Sterne-Hotels in 12 Städten. Du siehst den Verlauf und den Tiefpunkt. Und welcher Anbieter an der Kasse beim Preis bleibt." | "Every day we check prices for 36 five-star hotels in 12 cities. You see the history, the low, and which site keeps its price at checkout."

**Proof row:** "36 Hotels · 12 Städte · täglich geprüft · kostenlos, ohne Konto" | "36 hotels · 12 cities · checked daily · free, no account"

**Search card**

| Element | DE | EN |
|---|---|---|
| Hotel field label | Hotel oder Stadt | Hotel or city |
| Hotel field placeholder | z. B. Adlon oder Wien | e.g. Adlon or Vienna |
| Dates label | Anreise – Abreise | Check-in – check-out |
| Dates placeholder | Daten wählen | Choose dates |
| Nights hint | 2 Nächte | 2 nights |
| Guests | 2 Erwachsene | 2 adults |
| Calendar legend | • Verlauf vorhanden | • History available |
| Button ⚑ | **Preise ansehen** | **See prices** |

⚑ The reference button "Preis verfolgen" sounds like subscribing and clashes with "Preis beobachten". Keep "beobachten" for alerts only.

**Verdict states** (chip, then one line; k is derived from the percentile)

| State | DE | EN |
|---|---|---|
| collecting | Daten werden gesammelt (3/7). Ab 7 Tagen sagen wir dir, ob der Preis tief oder hoch ist. | Collecting data (3/7). After 7 days we'll tell you if the price is low or high. |
| near_low | Nahe Tiefpunkt. Nah am tiefsten Preis der letzten {n} Tage. | Near the low. Close to the lowest price of the last {n} days. |
| good | Guter Preis. Günstiger als an {k} von 10 Tagen seit {date}. | Good price. Cheaper than on {k} of 10 days since {date}. |
| normal | Normal. Im üblichen Bereich der letzten {n} Tage. | Normal. Within the usual range of the last {n} days. |
| high | Gerade teuer. Teurer als an {k} von 10 Tagen seit {date}. | Expensive right now. Pricier than on {k} of 10 days since {date}. |

- **Trend suffix:** "Trend: fällt (−3 % pro Woche)" | "Trend: falling (−3 % per week)".
- **Advice for near_low** ⚑: "Guter Zeitpunkt zum Buchen. Der Preis liegt nah am Tiefpunkt der letzten {n} Tage. Ob er weiter fällt, weiß niemand." | "A good time to book. … Nobody knows if it will drop further."

**Delta lines**
- "▼ 5 % unter dem 30-Tage-Schnitt" / "▲ 4 % über dem 30-Tage-Schnitt" / "Genau im 30-Tage-Schnitt"
- ⚑ With fewer than 30 days of data: "▼ 5 % unter dem Schnitt seit 14. Okt." | "5 % below the average since 14 Oct"
- "−84 € seit gestern" | "−€84 since yesterday"
- "Neuer Tiefstwert seit Beobachtungsbeginn" | "New lowest since we started tracking"

**Empty and edge states**

| Case | DE | EN |
|---|---|---|
| No search results | Kein Treffer für „{q}“. Wir beobachten 36 Fünf-Sterne-Hotels in 12 Städten. [Alle Hotels ansehen] | No match for "{q}". We track 36 five-star hotels in 12 cities. [See all hotels] |
| Unknown hotel | Dieses Hotel beobachten wir noch nicht. Hier sind Fünf-Sterne-Hotels in {city}. | We don't track this hotel yet. Here are five-star hotels in {city}. |
| Untracked dates ⚑ | Neu für uns: Für diese Daten haben wir noch keinen Verlauf. Wir starten morgen früh und prüfen dann täglich. Leg einen Alarm an, dann melden wir uns. [Termine mit Verlauf ansehen] | New dates: no history yet. We start tomorrow morning and check daily from then on. Set an alert and we'll be in touch. |
| Too far ahead | So weit im Voraus zeigen viele Anbieter noch keine Preise. Wir beobachten Aufenthalte bis {max} Tage vor Anreise. | Many sites don't list prices this far ahead. We track stays up to {max} days before check-in. |
| Stay in the past | Dieser Aufenthalt ist vorbei. So hat sich der Preis entwickelt. [Gleiche Wochentage, nächste Termine] | This stay is over. Here's how the price moved. |
| No deals | Gerade liegt kein Hotel 8 % oder mehr unter seinem Schnitt. Wir prüfen morgen früh wieder. | No hotel is 8 %+ below its average right now. We check again tomorrow morning. |

⚑ For untracked dates, PLAN says "Erste Preise in ca. 1 Stunde". The collector posts only at 05:00 UTC (D-39), so that promise is false. Use "morgen früh", or build an on-demand path.

**Error messages**

| Case | DE | EN |
|---|---|---|
| Network | Keine Verbindung. Prüf dein Internet und versuch es noch mal. | No connection. Check your internet and try again. |
| Check-out before check-in | Die Abreise muss nach der Anreise liegen. | Check-out must be after check-in. |
| Over 30 nights | Höchstens 30 Nächte. Wähl einen kürzeren Zeitraum. | 30 nights max. Pick a shorter stay. |
| Past date | Dieses Datum ist schon vorbei. Wähl eine Anreise ab heute. | That date has passed. Pick a check-in from today. |

**Watch flow**

| Element | DE | EN |
|---|---|---|
| Button | Preis beobachten | Watch price |
| Fields | E-Mail-Adresse · Wunschpreis (optional), Hinweis: „Wir melden uns auch bei neuem Tief.“ | Email address · Target price (optional) |
| Consent (unticked) | Schick mir E-Mails zu diesem Aufenthalt, höchstens eine pro Tag. Abmelden geht jederzeit mit einem Klick. | Email me about this stay, at most once a day. Unsubscribe anytime in one click. |
| Submit | Alarm anlegen | Create alert |
| After submit | Fast fertig. Wir haben dir eine E-Mail von alarm@tidaq.com geschickt. Klick auf den Link darin, dann ist dein Alarm aktiv. Nichts da? Schau im Spam-Ordner. [Erneut senden] | Almost done. We sent you an email from alarm@tidaq.com. Click the link to activate your alert. Nothing there? Check spam. [Resend] |
| Confirm email subject | Bitte bestätige deinen Preisalarm: {hotel}, {dates} | Please confirm your price alert: … |
| Confirmed page | Dein Alarm ist aktiv. Wir prüfen jeden Morgen und schreiben dir, wenn der Preis fällt oder ein neues Tief erreicht. | Your alert is active. We check every morning and email you when the price drops or hits a new low. |
| Alert email subject | {hotel}, {dates}: ▼ 6 % auf 1.184 € | {hotel}, {dates}: ▼ 6 % to €1,184 |
| Unsubscribe | Abgemeldet. Du bekommst keine E-Mails mehr zu diesem Aufenthalt. [Alle Alarme beenden] | Unsubscribed. No more emails about this stay. [End all alerts] |

**Trust score** ⚑ The current wording mixes three terms: "Vertrauenswert", "Vertrauens-Score" and "Vertrauens-Check". Use one feature name, **Kassen-Check** | Checkout check, and one score name, **Preistreue** | Price accuracy. They are factual and judge no provider.

| Case | DE | EN |
|---|---|---|
| 5+ tests | Preistreue 96 · 24 von 25 Tests: Preis an der Kasse gleich oder niedriger | Price accuracy 96 · 24 of 25 tests: same or lower at checkout |
| Markup known | An der Kasse erwartet ≈ 1.212 € | Expected at checkout ≈ €1,212 |
| 1–4 tests | Noch zu wenig Tests (3). Eine Zahl zeigen wir ab 5 Tests. | Not enough tests yet (3). We show a score from 5 tests. |
| 0 tests | Noch nicht getestet | Not tested yet |
| Tooltip | Wir gehen bei echten Aufenthalten bis zur letzten Seite vor der Zahlung und vergleichen den Endpreis mit dem Preis bei Google Hotels. Letzter Test: {date}. [So rechnen wir] | We go to the last page before payment on real stays and compare the total with the Google Hotels price. Last test: {date}. |

**Affiliate line:** "Mit „Partnerlink“ markierte Links: Buchst du darüber, bekommen wir ggf. eine Provision. Dein Preis ändert sich nicht. Die Reihenfolge hängt nie davon ab. [Mehr]" | "Links marked "Partner link": if you book through them, we may earn a commission. Your price doesn't change, and it never affects the order. [More]"

**Footer source line:** "Preise aus Google Hotels (Markt Deutschland), täglich morgens abgefragt. Wir buchen nichts und speichern keine Cookies." | "Prices from Google Hotels (German market), fetched every morning. We don't book anything and set no cookies."

**404:** "Diese Seite gibt es nicht. Vielleicht ein alter Link. [Hotel suchen] [Zur Startseite]" | "This page doesn't exist. Maybe an old link."

**500:** "Da ist bei uns etwas schiefgelaufen. Das liegt an uns, nicht an dir. Lade die Seite in einer Minute neu. Bleibt der Fehler, schreib uns: {contact}." | "Something went wrong on our side. Reload in a minute. If it persists, email us."

**⚑ Fixes to the reference homepage copy**
- "Wir buchen bis zur Kasse durch" is false. Replace it with "Wir gehen bis zur letzten Seite vor der Zahlung."
- "Lockpreis" and "Billigportale" judge providers. Replace them with "an der Kasse höher".
- Drop "Bester Gesamtwert" and the perks text: we have no data on perks.
- Drop the breakfast and room toggles (D-40).
- "25 Luxushotels" should be 36.
- "7 Anbieter" must come from real data.

## 5. Trust and honesty patterns

- **Source line under every price:** "Quelle: Google Hotels, Markt Deutschland · Gesamtpreis für 2 Nächte, 2 Erwachsene, günstigstes verfügbares Zimmer · Citytax kann dazukommen."
- **Freshness:** "Stand: heute, 07:12 Uhr" in Europe/Berlin time, always next to the price. If the data is older than 30 h, show it in the warn color: "Stand: gestern, 07:12 Uhr. Die heutige Abfrage fehlt noch."
- **Methodology in layers:** a one-line tooltip, then "So rechnen wir", then `/methodik` with a worked example (the 2-test provider shows 79, and why).
- **Every trust number comes with n and the test dates.** Below 5 tests, show no number.
- **Show what we don't know:** "Zimmertyp und Frühstück kann je Anbieter abweichen."
- **Affiliate labeling:** a per-link "Partnerlink" tag, but only when the affiliate template is active. Add the line under the table and the `/ranking` statement "Provision beeinflusst die Reihenfolge nie". Rank the hotel's own website normally.
- **Outbound note** (on the button tooltip, or a 1-second note on `/go`): "Preis von heute 07:12. Beim Anbieter kann er inzwischen anders sein."
- **No dark patterns:** no countdowns, no "nur noch 2 Zimmer". The tone is "Nobody knows the future".

## 6. Top 8 UX risks and mitigations

1. **The searched dates have no history.** The grid covers 2-night stays for 2 adults on a few dates, so most searches hit an empty chart.
   - Mark tracked dates with a dot in the picker.
   - Make the hotel calendar the main entry point.
   - On the untracked state, offer "Termine mit Verlauf" and an alert.
2. **The cheapest offer comes from untested resellers.** In staging this happened in 18 of 18 stays (C-013d).
   - Show two lines in the header: "Bester Preis: 1.020 € (ungetesteter Anbieter)" and "Günstigster geprüfter: 1.184 € bei Booking.com".
   - Show "Noch nicht getestet" chips.
   - Hide offers far above the median.
3. **Offers aren't comparable** (rooms and board unknown, per-night vs. total).
   - Always label the total and the nights.
   - Show the per-night price as a secondary figure.
   - Add the "kann abweichen" note.
4. **The verdict reads as a forecast**, and users get angry when the price falls later.
   - Phrase every chip as a fact about the past ("{k} von 10 Tagen").
   - Advice never says "wird".
   - Add "Ob er weiter fällt, weiß niemand."
5. **The price is stale at click-out,** and the user blames Tidaq.
   - Show "Stand" everywhere.
   - Add the outbound note.
   - The alert email shows the source time.
6. **Early trust data is thin.**
   - "Noch zu wenig Tests" below 5.
   - Always show n.
   - Show test dates on provider pages.
   - Publish the formula.
7. **The small catalog makes search a dead end** ("my hotel isn't here").
   - Say the scope up front (36 hotels, 12 cities).
   - Every no-results state links to `/hotels`.
   - Add a "Hotel vorschlagen" form (C-053).
8. **People drop off in the double opt-in.**
   - Name the sender and the subject on the confirm screen.
   - Add a resend button and a spam hint.
   - Keep the stay page reachable from the confirmation email.
   - The confirmation link stays valid for 7 days.