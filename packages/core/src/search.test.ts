import { describe, expect, it } from 'vitest';
import { foldText, matchesCity, matchHotels } from './search';

const hotels = [
  { slug: 'baur-au-lac', name: 'Baur au Lac', city: 'Zürich' },
  { slug: 'dolder', name: 'The Dolder Grand', city: 'Zürich' },
  { slug: 'adlon', name: 'Hotel Adlon Kempinski', city: 'Berlin' },
  { slug: 'de-rome', name: 'Hotel de Rome', city: 'Berlin' },
  { slug: 'bayerischer-hof', name: 'Hotel Bayerischer Hof', city: 'München' },
  { slug: 'charles', name: 'The Charles Hotel', city: 'München' },
  { slug: 'eden', name: 'Hotel Eden', city: 'Rom' },
];
const slugs = (q: string) => matchHotels(q, hotels).map((h) => h.slug);

describe('foldText', () => {
  it('removes accents, case, ß and punctuation', () => {
    expect(foldText('  Zürich  ')).toBe('zurich');
    expect(foldText('Claridge’s')).toBe('claridge s');
    expect(foldText('Großer Hof')).toBe('grosser hof');
    expect(foldText('Hôtel Le Bristol')).toBe('hotel le bristol');
  });
});

describe('matchHotels', () => {
  it('returns everything by city and name for an empty query', () => {
    expect(slugs('')).toEqual([
      'adlon',
      'de-rome',
      'bayerischer-hof',
      'charles',
      'eden',
      'baur-au-lac',
      'dolder',
    ]);
  });

  it('finds cities without umlauts or with the ue spelling', () => {
    expect(slugs('zurich')).toEqual(['baur-au-lac', 'dolder']);
    expect(slugs('zuerich')).toEqual(['baur-au-lac', 'dolder']);
    expect(slugs('münchen')).toEqual(['bayerischer-hof', 'charles']);
    expect(slugs('muenchen')).toEqual(['bayerischer-hof', 'charles']);
  });

  it('ranks name starts before word matches before city matches', () => {
    expect(slugs('hotel')).toEqual(['adlon', 'de-rome', 'bayerischer-hof', 'eden', 'charles']);
    expect(slugs('adlon')).toEqual(['adlon']);
    expect(slugs('the')).toEqual(['charles', 'dolder']);
  });

  it('matches several words in any order across hotel and city', () => {
    expect(slugs('rome hotel')).toEqual(['de-rome']);
    expect(slugs('berlin adlon')).toEqual(['adlon']);
  });

  it('falls back to substrings and returns nothing for nonsense', () => {
    expect(slugs('lon')).toEqual(['adlon']);
    expect(slugs('xyz')).toEqual([]);
  });
});

describe('matchesCity', () => {
  it('matches word prefixes of the city, with or without umlauts', () => {
    expect(matchesCity('zuer', 'Zürich')).toBe(true);
    expect(matchesCity('Zurich', 'Zürich')).toBe(true);
    expect(matchesCity('new y', 'New York')).toBe(true);
    expect(matchesCity('york', 'New York')).toBe(true);
    expect(matchesCity('adlon', 'Berlin')).toBe(false);
    expect(matchesCity('', 'Berlin')).toBe(false);
    expect(matchesCity('  ', 'Berlin')).toBe(false);
  });
});
