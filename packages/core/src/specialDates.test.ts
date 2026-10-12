import { describe, expect, it } from 'vitest';
import {
  defaultSpecialStays,
  easterSunday,
  oktoberfestStart,
  specialStaysForYear,
} from './specialDates';

describe('easterSunday', () => {
  it.each([
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2028, '2028-04-16'],
    [2029, '2029-04-01'],
  ])('%i → %s', (year, expected) => {
    expect(easterSunday(year)).toBe(expected);
  });
});

describe('oktoberfestStart', () => {
  it.each([
    [2025, '2025-09-20'],
    [2026, '2026-09-19'],
    [2027, '2027-09-18'],
    [2028, '2028-09-16'],
    [2029, '2029-09-22'], // 15 Sep 2029 is a Saturday: the next one opens
  ])('%i → %s', (year, expected) => {
    expect(oktoberfestStart(year)).toBe(expected);
  });
});

describe('specialStaysForYear', () => {
  const stays = specialStaysForYear(2026);
  const byKey = Object.fromEntries(stays.map((s) => [s.key, s]));

  it('covers Easter, Oktoberfest, two December weekends and New Year', () => {
    expect(byKey['easter-2026']).toEqual({
      key: 'easter-2026',
      checkIn: '2026-04-03',
      checkOut: '2026-04-06',
    });
    expect(byKey['oktoberfest-2026-1']).toMatchObject({
      checkIn: '2026-09-18',
      checkOut: '2026-09-20',
      cities: ['muenchen'],
    });
    expect(byKey['oktoberfest-2026-2']).toMatchObject({
      checkIn: '2026-09-25',
      checkOut: '2026-09-27',
    });
    expect(byKey['advent-2026-1']).toMatchObject({ checkIn: '2026-12-04', checkOut: '2026-12-06' });
    expect(byKey['advent-2026-2']).toMatchObject({ checkIn: '2026-12-11', checkOut: '2026-12-13' });
    expect(byKey['nye-2026']).toMatchObject({ checkIn: '2026-12-30', checkOut: '2027-01-01' });
  });

  it('starts December weekends on a Friday even when 1 December is a Friday', () => {
    // 1 Dec 2028 is a Friday.
    const advent = specialStaysForYear(2028).find((s) => s.key === 'advent-2028-1');
    expect(advent).toMatchObject({ checkIn: '2028-12-01', checkOut: '2028-12-03' });
  });

  it('includes the next year in the defaults', () => {
    const keys = defaultSpecialStays('2026-12-29').map((s) => s.key);
    expect(keys).toContain('nye-2026');
    expect(keys).toContain('easter-2027');
  });
});
