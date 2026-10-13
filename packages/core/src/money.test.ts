import { describe, expect, it } from 'vitest';
import { parseEuroCents } from './money';

describe('parseEuroCents', () => {
  it('reads German and English styles', () => {
    expect(parseEuroCents('1.184')).toBe(118_400);
    expect(parseEuroCents('1.184,50')).toBe(118_450);
    expect(parseEuroCents('1184,5')).toBe(118_450);
    expect(parseEuroCents('1,184.50')).toBe(118_450);
    expect(parseEuroCents('1184.50 €')).toBe(118_450);
    expect(parseEuroCents(' 2.480 € ')).toBe(248_000);
    expect(parseEuroCents('650')).toBe(65_000);
    expect(parseEuroCents('12.345.678')).toBe(1_234_567_800);
    expect(parseEuroCents('12,345')).toBe(1_234_500);
  });

  it('rejects everything else', () => {
    for (const bad of ['', '0', '0,00', 'abc', '1.18.4', '1,1,1', '-50', '1.184,505']) {
      expect(parseEuroCents(bad), bad).toBeNull();
    }
  });
});
