import { describe, expect, it } from 'vitest';
import { calibrationPoints, withTaxes, type CalibrationHotel } from './calibration';

const ritz: CalibrationHotel = {
  hotelId: 1,
  name: 'The Ritz-Carlton Berlin',
  lat: 52.5104,
  lng: 13.3753,
  identifier: null,
  baseNightCents: 26_000,
};
const adlon: CalibrationHotel = {
  hotelId: 2,
  name: 'Hotel Adlon Kempinski Berlin',
  lat: 52.5159,
  lng: 13.3801,
  identifier: 'ADLON',
  baseNightCents: 25_000,
};
const ritzItem = {
  id: 'RITZ',
  title: 'The Ritz-Carlton',
  lat: 52.5103836,
  lng: 13.3752744,
  price: 300,
};
const items = [
  ritzItem,
  { id: 'ADLON', title: 'Hotel Adlon Kempinski Berlin', lat: 52.5159, lng: 13.3801, price: 284 },
  { id: 'MERC', title: 'Mercure Hotel Wittenbergplatz', lat: 52.5016, lng: 13.3427, price: 102 },
];

describe('calibrationPoints (C-157)', () => {
  it('pairs our hotels with Google results by name and place, or by id', () => {
    const points = calibrationPoints([ritz, adlon], items);
    expect(points).toEqual([
      {
        hotelId: 1,
        googleNightCents: 30_000,
        baseNightCents: 26_000,
        ratio: 1.1538,
        identifier: 'RITZ',
      },
      {
        hotelId: 2,
        googleNightCents: 28_400,
        baseNightCents: 25_000,
        ratio: 1.136,
        identifier: null,
      },
    ]);
  });

  it('with a known id, only that result counts', () => {
    expect(calibrationPoints([{ ...adlon, identifier: 'OTHER' }], items)).toEqual([]);
  });

  it('drops pairs too far apart to be the same room, and results without a price', () => {
    expect(calibrationPoints([{ ...ritz, baseNightCents: 10_000 }], items)).toEqual([]);
    expect(calibrationPoints([ritz], [{ ...ritzItem, price: null }])).toEqual([]);
    expect(calibrationPoints([{ ...ritz, baseNightCents: 0 }], items)).toEqual([]);
  });
});

describe('withTaxes (C-157)', () => {
  it('multiplies by the factor, never lowers a price', () => {
    expect(withTaxes(100_000, 1.113)).toBe(111_300);
    expect(withTaxes(100_000, 1)).toBe(100_000);
    expect(withTaxes(100_000, undefined)).toBe(100_000);
    expect(withTaxes(100_000, 0.9)).toBe(100_000);
  });
});
