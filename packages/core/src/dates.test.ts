import { describe, expect, it } from 'vitest';
import { nights, parseIsoDate } from './dates';

describe('nights', () => {
  it('counts nights between check-in and check-out', () => {
    expect(nights('2026-12-01', '2026-12-03')).toBe(2);
  });

  it('works across month and year boundaries', () => {
    expect(nights('2026-12-30', '2027-01-01')).toBe(2);
    expect(nights('2028-02-28', '2028-03-01')).toBe(2); // leap year
  });

  it('is not affected by daylight saving changes', () => {
    // Germany switches to winter time on 25 Oct 2026.
    expect(nights('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('rejects check-out on or before check-in', () => {
    expect(() => nights('2026-12-03', '2026-12-03')).toThrow(RangeError);
    expect(() => nights('2026-12-03', '2026-12-01')).toThrow(RangeError);
  });
});

describe('parseIsoDate', () => {
  it('parses a stay date as UTC midnight', () => {
    expect(parseIsoDate('2026-12-01')).toBe(Date.UTC(2026, 11, 1));
  });

  it.each(['2026-02-30', '2026-13-01', '1.12.2026', '2026-12-1', ''])('rejects %j', (value) => {
    expect(() => parseIsoDate(value)).toThrow();
  });
});
