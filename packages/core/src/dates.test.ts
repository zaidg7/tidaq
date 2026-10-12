import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, nights, parseIsoDate, toIsoDate, weekday } from './dates';

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

describe('date helpers', () => {
  it('adds days across month, year and leap day', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('knows the weekday', () => {
    expect(weekday('2026-10-12')).toBe(1); // Monday
    expect(weekday('2026-10-16')).toBe(5); // Friday
    expect(weekday('2026-10-18')).toBe(0); // Sunday
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-12', '2026-11-23')).toBe(42);
    expect(daysBetween('2026-10-12', '2026-10-10')).toBe(-2);
  });

  it('formats timestamps as dates', () => {
    expect(toIsoDate(Date.UTC(2026, 9, 12, 23, 59))).toBe('2026-10-12');
  });
});
