import { describe, expect, it } from 'vitest';
import { cityIn, cityPath, groupByRegion, regionOf } from './places';

describe('places', () => {
  it('builds city paths and natural "in" phrases', () => {
    expect(cityPath('muenchen')).toBe('/stadt/muenchen');
    expect(cityIn('muenchen', 'München', 'de')).toBe('in München');
    expect(cityIn('malediven', 'Malediven', 'de')).toBe('auf den Malediven');
    expect(cityIn('malediven', 'Maldives', 'en')).toBe('in the Maldives');
    expect(cityIn('mallorca', 'Mallorca', 'de')).toBe('auf Mallorca');
    expect(cityIn('cote-d-azur', 'French Riviera', 'en')).toBe('on the French Riviera');
    expect(cityIn('seychellen', 'Seychellen', 'de')).toBe('auf den Seychellen');
  });

  it('maps countries to regions, Europe by default', () => {
    expect(regionOf('DE')).toBe('germany');
    expect(regionOf('mv')).toBe('asiaPacific');
    expect(regionOf('AE')).toBe('middleEast');
    expect(regionOf('US')).toBe('americas');
    expect(regionOf('PT')).toBe('europe');
    expect(regionOf('MA')).toBe('africa');
    expect(regionOf('SC')).toBe('africa');
    expect(regionOf('QA')).toBe('middleEast');
    expect(regionOf('MX')).toBe('americas');
  });

  it('groups by region in display order and sorts names by locale', () => {
    const cities = [
      { c: 'US', n: 'Miami' },
      { c: 'AT', n: 'Wien' },
      { c: 'DE', n: 'München' },
      { c: 'DE', n: 'Berlin' },
      { c: 'ES', n: 'Ávila' },
      { c: 'ES', n: 'Barcelona' },
    ];
    const groups = groupByRegion(
      cities,
      (x) => x.c,
      (x) => x.n,
      'de',
    );
    expect(groups.map((g) => g.region)).toEqual(['germany', 'europe', 'americas']);
    expect(groups[0]?.items.map((x) => x.n)).toEqual(['Berlin', 'München']);
    expect(groups[1]?.items.map((x) => x.n)).toEqual(['Ávila', 'Barcelona', 'Wien']);
    expect(
      groupByRegion(
        [],
        (x: { c: string }) => x.c,
        () => '',
        'en',
      ),
    ).toEqual([]);
  });
});
