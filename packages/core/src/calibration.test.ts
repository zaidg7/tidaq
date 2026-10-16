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

describe('calibrationPoints: ambiguous pairs (C-157f)', () => {
  const paris = (name: string, lat: number): CalibrationHotel => ({
    hotelId: lat,
    name,
    lat: 48.87 + lat / 10_000,
    lng: 2.3,
    identifier: null,
    baseNightCents: 110_000,
  });
  const results = [
    { id: 'A', title: 'Hôtel Barrière Paris', lat: 48.8701, lng: 2.3, price: 1662 },
    { id: 'B', title: 'Hotel Lutetia Paris', lat: 48.8702, lng: 2.3, price: 1500 },
    { id: 'C', title: 'Pullman Paris', lat: 48.8703, lng: 2.3, price: 300 },
    { id: 'D', title: 'Le Royal Monceau Raffles', lat: 48.8704, lng: 2.3, price: 1400 },
  ];

  it("doesn't pair hotels by the city's name alone", () => {
    const points = calibrationPoints(
      [paris('Hôtel Fouquet’s Paris', 1), paris('Le Royal Monceau Raffles Paris', 4)],
      results,
    );
    expect(points.map((p) => p.hotelId)).toEqual([4]);
  });

  it('gives no point when one result pairs with two of our hotels', () => {
    const twins = [paris('Grand Hotel Lutetia', 2), paris('Lutetia Grand', 3)];
    expect(calibrationPoints(twins, results)).toEqual([]);
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
