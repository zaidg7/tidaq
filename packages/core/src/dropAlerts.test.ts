import { describe, expect, it } from 'vitest';
import { DROP_ALERTS, dropAlertMail, dropsFor } from './dropAlerts';
import { dropKey, groupDrops, type PriceDropRow } from './drops';
import { renderMail } from './mailTemplate';

const TODAY = '2026-10-15';
/** The send's window: the 24 hours before 07:55 UTC on TODAY. */
const SINCE = Date.parse('2026-10-14T07:55:00Z');
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

let id = 0;
const row = (over: Partial<PriceDropRow>): PriceDropRow => ({
  hotel_id: 1,
  hotel_slug: 'baur-au-lac-zuerich',
  hotel_name: 'Baur au Lac',
  city_slug: 'zuerich',
  city_name_de: 'Zürich',
  city_name_en: 'Zurich',
  night: '2026-10-27',
  seen_day: TODAY,
  seen_at: '2026-10-15T03:12:00Z',
  now_cents: 68_400,
  prev_cents: 98_900,
  drop_pct: 0.3084,
  prior_low_cents: 98_900,
  prior_days: 9,
  prior_avg_cents: 102_900,
  provider_slug: 'booking-com',
  provider_name: 'Booking.com',
  provider_direct: false,
  offers: 4,
  confirmed: true,
  ...over,
});
const hotel = (n: number, city: string, drop: number, over: Partial<PriceDropRow> = {}) =>
  row({
    hotel_id: n,
    hotel_slug: `hotel-${n}`,
    hotel_name: `Hotel ${n}`,
    city_slug: city,
    city_name_de: city === 'paris' ? 'Paris' : 'Zürich',
    city_name_en: city === 'paris' ? 'Paris' : 'Zurich',
    drop_pct: drop,
    night: `2026-11-${String(10 + (id++ % 10)).padStart(2, '0')}`,
    ...over,
  });

const city = (slug: string | null) => ({ cityAlarm: true, city: slug, hotels: [] });

describe('dropsFor', () => {
  const groups = groupDrops([
    hotel(1, 'paris', 0.2),
    hotel(2, 'zuerich', 0.4),
    // Seen before yesterday's send: already mailed.
    hotel(3, 'paris', 0.3, { seen_day: '2026-10-14', seen_at: '2026-10-14T05:00:00Z' }),
    hotel(4, 'paris', 0.16),
    hotel(4, 'paris', 0.25, { seen_day: '2026-10-14', seen_at: '2026-10-14T04:10:00Z' }),
    // Found after yesterday's send: new for today's.
    hotel(5, 'paris', 0.18, { seen_day: '2026-10-14', seen_at: '2026-10-14T08:30:00Z' }),
  ]);

  it('keeps only drops seen since the last send, in the city, biggest first', () => {
    const paris = dropsFor(groups, city('paris'), SINCE);
    expect(paris.map((g) => g.hotel.id)).toEqual([1, 5, 4]);
    // Hotel 4's biggest drop was mailed yesterday: today's smaller one becomes its entry.
    expect(paris[2]?.top.drop).toBe(0.16);
    expect(paris[2]?.more).toEqual([]);
  });

  it('all cities when no city is set, at most maxHotels', () => {
    expect(dropsFor(groups, city(null), SINCE).map((g) => g.hotel.id)).toEqual([2, 1, 5, 4]);
    const many = groupDrops(
      Array.from({ length: 8 }, (_, i) => hotel(10 + i, 'paris', 0.2 + i / 100)),
    );
    expect(dropsFor(many, city(null), SINCE)).toHaveLength(DROP_ALERTS.maxHotels);
  });

  it('nothing when the city had no drop today', () => {
    expect(dropsFor(groups, city('london'), SINCE)).toEqual([]);
  });

  it('followed hotels (C-080k): alone, or on top of a city', () => {
    const only = { cityAlarm: false, city: null, hotels: [2, 3] };
    // Hotel 3's drop was mailed yesterday; the city alarm is off, so Paris hotels don't count.
    expect(dropsFor(groups, only, SINCE).map((g) => g.hotel.id)).toEqual([2]);
    const both = { cityAlarm: true, city: 'paris', hotels: [2] };
    expect(dropsFor(groups, both, SINCE).map((g) => g.hotel.id)).toEqual([2, 1, 5, 4]);
    expect(dropsFor(groups, { cityAlarm: false, city: null, hotels: [] }, SINCE)).toEqual([]);
  });
});

describe('dropAlertMail', () => {
  const groups = groupDrops([
    row({}),
    row({ night: '2026-10-28', drop_pct: 0.2, now_cents: 72_000 }),
    hotel(2, 'paris', 0.2, { prior_days: 1, now_cents: 300_000, prev_cents: 375_000 }),
  ]);
  const mail = (
    locale: 'de' | 'en',
    cityName: string | null,
    g = groups,
    hotels?: 'only' | 'also',
  ) =>
    dropAlertMail({
      locale,
      groups: g,
      cityName,
      ...(hotels && { hotels }),
      dropUrl: (s, d) => `https://tidaq.com/preissturz/${s}/${dropKey(d)}`,
      radarUrl: 'https://tidaq.com/preissturz',
      manageUrl: 'https://tidaq.com/alarm/verwalten/abc',
    });

  it('names the biggest drop in the subject and lists every hotel with both prices', () => {
    const { subject, content } = mail('de', null);
    expect(plain(subject)).toBe('Preissturz: −31 % im Baur au Lac und 1 weiterer');
    expect(content.heading).toBe('Neue Preisstürze in allen Städten');
    const [first, second] = content.items ?? [];
    expect(plain(first?.title ?? '')).toBe('−31 % · Baur au Lac');
    expect(plain(first?.meta ?? '')).toBe(
      'Zürich · Di, 27. Okt. · 684 € statt 989 € am Vortag (−31 %), sonst um 1.029 € · 1 weitere Nacht günstiger',
    );
    expect(first?.url).toBe('https://tidaq.com/preissturz/baur-au-lac-zuerich/2026-10-27');
    // One earlier check only: no "usual" price.
    expect(plain(second?.meta ?? '')).not.toContain('sonst um');
    expect(content.button.url).toBe('https://tidaq.com/preissturz');
    expect(content.footer.join(' ')).toContain('Höchstens eine am Tag.');
    expect(content.footer.join(' ')).toContain('https://tidaq.com/alarm/verwalten/abc');
  });

  it('city wording, a single hotel and English', () => {
    expect(mail('de', 'Zürich', groups.slice(0, 1)).content.heading).toBe(
      'Neue Preisstürze in Zürich',
    );
    expect(plain(mail('de', 'Zürich', groups.slice(0, 1)).subject)).toBe(
      'Preissturz: −31 % im Baur au Lac',
    );
    const en = mail('en', 'Zurich');
    expect(plain(en.subject)).toBe('Price drop: −31% at Baur au Lac and 1 more');
    expect(plain(en.content.items?.[0]?.meta ?? '')).toContain('instead of');
  });

  it('followed hotels in the heading (C-080k)', () => {
    expect(mail('de', null, groups, 'only').content.heading).toBe(
      'Neue Preisstürze in deinen Hotels',
    );
    expect(mail('de', 'Paris', groups, 'also').content.heading).toBe(
      'Neue Preisstürze in Paris und deinen Hotels',
    );
    expect(mail('en', null, groups, 'only').content.heading).toBe('New price drops at your hotels');
    // All cities already include every hotel.
    expect(mail('de', null, groups, 'also').content.heading).toBe(
      'Neue Preisstürze in allen Städten',
    );
  });

  it('renders to HTML and text without urgency words', () => {
    const { html, text } = renderMail(mail('de', null).content);
    expect(html).toContain('Baur au Lac');
    expect(text).not.toMatch(/nur heute|schnell|jetzt buchen|letzte Chance/i);
  });

  it('a weekend says so, with its dates and link', () => {
    const [w] = groupDrops([row({ night: '2026-10-23', check_out: '2026-10-25' })]);
    if (!w) throw new Error('no group');
    const item = mail('de', null, [w]).content.items?.[0];
    expect(plain(item?.meta ?? '')).toContain('Fr, 23. Okt. – So, 25. Okt. (Wochenende, 2 Nächte)');
    expect(item?.url).toBe(
      'https://tidaq.com/preissturz/baur-au-lac-zuerich/2026-10-23--2026-10-25',
    );
  });

  it('refuses an empty list', () => {
    expect(() => mail('de', null, [])).toThrow();
  });
});
