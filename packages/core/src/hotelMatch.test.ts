import { describe, expect, it } from 'vitest';
import { dfsLocationCode, matchHotelSearch, metersBetween, nameWords } from './hotelMatch';

const ritz = { name: 'Ritz Paris', lat: 48.868008, lng: 2.328764 };

describe('matchHotelSearch (C-153)', () => {
  it('takes the result with the same name nearby', () => {
    const m = matchHotelSearch(ritz, [
      { id: 'a', title: 'Hôtel Vendôme', lat: 48.8676, lng: 2.3291 },
      { id: 'b', title: 'Ritz Paris', lat: 48.8681, lng: 2.3287 },
    ]);
    expect(m).toMatchObject({ id: 'b', overlap: 1 });
    expect(m?.meters).toBeLessThan(50);
  });

  it('accepts brand suffixes and accents in Google’s title', () => {
    const m = matchHotelSearch({ name: 'Hôtel de Crillon', lat: 48.86728, lng: 2.321096 }, [
      { id: 'x', title: 'Hôtel de Crillon, A Rosewood Hotel', lat: 48.8673, lng: 2.3211 },
    ]);
    // "crillon", "rosewood" → 1 of 2 words, but 3 m away.
    expect(m?.id).toBe('x');
  });

  it('rejects the same name in another place and a different hotel next door', () => {
    expect(
      matchHotelSearch(ritz, [{ id: 'far', title: 'Ritz Paris', lat: 48.9, lng: 2.4 }]),
    ).toBeNull();
    expect(
      matchHotelSearch(ritz, [
        { id: 'next', title: 'Park Hyatt Paris-Vendôme', lat: 48.8687, lng: 2.3305 },
      ]),
    ).toBeNull();
  });

  it('skips results without coordinates or a name', () => {
    expect(
      matchHotelSearch(ritz, [
        { id: 'n', title: 'Ritz Paris', lat: null, lng: null },
        { id: 'e', title: 'The Hotel', lat: 48.868, lng: 2.3287 },
      ]),
    ).toBeNull();
    expect(matchHotelSearch(ritz, [])).toBeNull();
  });
});

describe('helpers', () => {
  it('drops filler words and accents from names', () => {
    expect([...nameWords('The St. Regis Rome – a Luxury Collection Hotel')]).toEqual([
      'st',
      'regis',
      'rome',
    ]);
    expect([...nameWords('Çırağan Palace')]).toEqual(['ciragan', 'palace']);
  });

  it('measures metres', () => {
    expect(Math.round(metersBetween(52.52, 13.405, 52.52, 13.405))).toBe(0);
    // Berlin → Potsdam ≈ 26.6 km.
    expect(Math.round(metersBetween(52.52, 13.405, 52.3906, 13.0645) / 1000)).toBe(27);
  });

  it('maps countries to DataForSEO location codes', () => {
    expect(dfsLocationCode('DE')).toBe(2276);
    expect(dfsLocationCode('mv')).toBe(2462);
    expect(dfsLocationCode('SC')).toBe(2690);
    expect(dfsLocationCode('XX')).toBeNull();
  });
});
