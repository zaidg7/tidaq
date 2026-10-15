import { describe, expect, it } from 'vitest';
import { CAPTION, cityTag, dropCaption, dropHashtags, topCaption } from './dropCaptions';
import { groupDrops, type PriceDropRow } from './drops';

const row = (over: Partial<PriceDropRow>): PriceDropRow => ({
  hotel_id: 1,
  hotel_slug: 'baur-au-lac-zuerich',
  hotel_name: 'Baur au Lac',
  city_slug: 'zuerich',
  city_name_de: 'Zürich',
  city_name_en: 'Zurich',
  night: '2026-10-27',
  seen_day: '2026-10-15',
  seen_at: '2026-10-15T06:12:00Z',
  now_cents: 68_400,
  prev_cents: 98_900,
  drop_pct: 0.3084,
  prior_low_cents: 98_900,
  prior_days: 9,
  prior_avg_cents: 95_200,
  provider_slug: 'booking-com',
  provider_name: 'Booking.com',
  provider_direct: false,
  offers: 4,
  confirmed: true,
  ...over,
});

/** Intl puts non-breaking spaces in prices and percents; compare with plain ones. */
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('cityTag', () => {
  it('keeps umlauts, drops spaces and punctuation', () => {
    expect(cityTag('Zürich')).toBe('#zürich');
    expect(cityTag('New York')).toBe('#newyork');
    expect(cityTag('Abu Dhabi')).toBe('#abudhabi');
    expect(cityTag('St. Moritz')).toBe('#stmoritz');
  });

  it('puts the city first', () => {
    expect(dropHashtags('Berlin')).toBe(
      '#berlin #luxushotel #fünfsterne #hoteldeal #preissturz #reisen',
    );
  });
});

describe('dropCaption', () => {
  it('states both prices, the site, the night, the low and when we saw it', () => {
    const [g] = groupDrops([row({})]);
    expect(g).toBeDefined();
    if (!g) return;
    const text = plain(dropCaption(g, g.top));
    expect(text).toContain('Preissturz im Baur au Lac, Zürich');
    expect(text).toContain(
      'Nacht vom Di, 27. Okt.: 684 € statt 989 € am Vortag (−31 %) bei Booking.com.',
    );
    expect(text).toContain('Sonst um 952 €. Niedrigster Preis seit 10 Tagen.');
    expect(text).toContain('Stand: 15. Okt., 08:12.');
    expect(text).toContain('prüf sie vor dem Buchen');
    expect(text).toContain(CAPTION.url);
    expect(text.endsWith('#zürich #luxushotel #fünfsterne #hoteldeal #preissturz #reisen')).toBe(
      true,
    );
  });

  it('a weekend drop says "Wochenende"', () => {
    const [g] = groupDrops([row({ night: '2026-10-23', check_out: '2026-10-25' })]);
    if (!g) throw new Error('no group');
    expect(plain(dropCaption(g, g.top))).toContain(
      'Wochenende Fr, 23. Okt. – So, 25. Okt.: 684 € statt 989 € am Vortag',
    );
  });

  it('says "direkt beim Hotel" and "seit wir messen" when that applies', () => {
    const [g] = groupDrops([row({ provider_direct: true, prior_days: 1 })]);
    if (!g) throw new Error('no group');
    const text = plain(dropCaption(g, g.top));
    expect(text).toContain('(−31 %) direkt beim Hotel.');
    expect(text).toContain('Niedrigster Preis, seit wir messen.');
  });

  it('never uses urgency words', () => {
    const [g] = groupDrops([row({})]);
    if (!g) throw new Error('no group');
    expect(dropCaption(g, g.top)).not.toMatch(/nur heute|schnell sein|jetzt buchen|letzte/i);
  });
});

describe('topCaption', () => {
  const groups = groupDrops([
    row({}),
    row({
      hotel_id: 2,
      hotel_slug: 'hotel-adlon-kempinski-berlin',
      hotel_name: 'Hotel Adlon Kempinski',
      city_slug: 'berlin',
      city_name_de: 'Berlin',
      city_name_en: 'Berlin',
      night: '2026-10-18',
      seen_at: '2026-10-15T07:40:00Z',
      now_cents: 38_900,
      prev_cents: 52_600,
      drop_pct: 0.2605,
    }),
  ]);

  it('numbers the hotels biggest first with the latest check time and every city tag', () => {
    const text = plain(topCaption(groups));
    expect(text.split('\n')[0]).toBe(
      'Die 2 größten Preisstürze in Luxushotels seit gestern (Stand: 15. Okt., 09:40):',
    );
    expect(text).toContain(
      '1. Baur au Lac, Zürich: 684 € statt 989 € (−31 %), Nacht vom Di, 27. Okt.',
    );
    expect(text).toContain('2. Hotel Adlon Kempinski, Berlin: 389 € statt 526 € (−26 %)');
    expect(text).toContain('#zürich #berlin #luxushotel');
  });

  it('the weekly version says "diese Woche"', () => {
    expect(plain(topCaption(groups, 'week')).split('\n')[0]).toBe(
      'Die 2 größten Preisstürze in Luxushotels diese Woche (Stand: 15. Okt., 09:40):',
    );
  });

  it('handles one hotel and none', () => {
    expect(topCaption(groups.slice(0, 1))).toMatch(/^Der größte Preissturz in Luxushotels/);
    expect(topCaption([])).toBe('');
  });
});
