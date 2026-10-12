import { describe, expect, it } from 'vitest';
import { addDays, weekday } from './dates';
import { buildGrid, gridConfigFromEnv, isStayExpired, type GridConfig } from './grid';
import { defaultSpecialStays, type SpecialStay } from './specialDates';

const config: GridConfig = { weekends: 6, midweek: 2 };
const berlin = { id: 1, citySlug: 'berlin' };
const munich = { id: 2, citySlug: 'muenchen' };

const forHotel = (today: string, specials: SpecialStay[] = [], cfg = config) =>
  buildGrid(today, [berlin], specials, cfg);

describe('buildGrid weekends', () => {
  it('starts with the next Friday when today is Monday', () => {
    const stays = forHotel('2026-10-12').filter((s) => s.reasons.includes('weekend'));
    expect(stays.map((s) => s.checkIn)).toEqual([
      '2026-10-16',
      '2026-10-23',
      '2026-10-30',
      '2026-11-06',
      '2026-11-13',
      '2026-11-20',
    ]);
    expect(stays.every((s) => weekday(s.checkIn) === 5 && weekday(s.checkOut) === 0)).toBe(true);
  });

  it('never tracks a stay that starts today (today is a Friday)', () => {
    const first = forHotel('2026-10-16').find((s) => s.reasons.includes('weekend'));
    expect(first?.checkIn).toBe('2026-10-23');
  });

  it('crosses the year boundary', () => {
    const weekends = forHotel('2026-12-29')
      .filter((s) => s.reasons.includes('weekend'))
      .map((s) => `${s.checkIn}→${s.checkOut}`);
    expect(weekends[0]).toBe('2027-01-01→2027-01-03');
    expect(weekends).toHaveLength(6);
  });

  it('handles the leap day', () => {
    const weekends = forHotel('2028-02-27').filter((s) => s.reasons.includes('weekend'));
    expect(weekends[0]).toMatchObject({ checkIn: '2028-03-03', checkOut: '2028-03-05' });
    const midweek = forHotel('2028-02-26').filter((s) => s.reasons.includes('midweek'));
    expect(midweek.every((s) => weekday(s.checkIn) === 2)).toBe(true);
  });
});

describe('buildGrid midweek', () => {
  it('returns exactly GRID_MIDWEEK Tue→Thu stays within 6 weeks', () => {
    for (const today of ['2026-10-12', '2026-10-13', '2026-10-17', '2026-12-28', '2027-02-23']) {
      const midweek = forHotel(today).filter((s) => s.reasons.includes('midweek'));
      expect(midweek, today).toHaveLength(2);
      for (const s of midweek) {
        expect(weekday(s.checkIn)).toBe(2);
        expect(weekday(s.checkOut)).toBe(4);
      }
    }
  });

  it('keeps a midweek stay chosen every day until its check-in (stable history)', () => {
    const first = forHotel('2026-10-12').filter((s) => s.reasons.includes('midweek'));
    const target = first.at(-1)?.checkIn ?? '';
    expect(target).not.toBe('');
    let day = '2026-10-12';
    while (day < target) {
      const checkIns = forHotel(day)
        .filter((s) => s.reasons.includes('midweek'))
        .map((s) => s.checkIn);
      expect(checkIns, day).toContain(target);
      day = addDays(day, 1);
    }
  });

  it('respects the config sizes, including zero', () => {
    const none = forHotel('2026-10-12', [], { weekends: 0, midweek: 0 });
    expect(none).toEqual([]);
    const more = forHotel('2026-10-12', [], { weekends: 2, midweek: 6 });
    expect(more.filter((s) => s.reasons.includes('weekend'))).toHaveLength(2);
    expect(more.filter((s) => s.reasons.includes('midweek'))).toHaveLength(6);
  });
});

describe('buildGrid special dates', () => {
  it('adds specials within 90 days and only for their cities', () => {
    const stays = buildGrid(
      '2026-10-12',
      [berlin, munich],
      defaultSpecialStays('2026-10-12'),
      config,
    );
    const specials = (id: number) =>
      stays.filter((s) => s.hotelId === id && s.reasons.includes('special')).map((s) => s.checkIn);
    // Advent weekends (4 Dec, 11 Dec) and New Year's Eve (30 Dec) are within 90 days.
    expect(specials(1)).toEqual(['2026-12-04', '2026-12-11', '2026-12-30']);
    // Oktoberfest 2026 has passed; 2027 is too far away.
    expect(specials(2)).toEqual(['2026-12-04', '2026-12-11', '2026-12-30']);
  });

  it('adds the Oktoberfest weekends for Munich only', () => {
    const stays = buildGrid(
      '2027-07-01',
      [berlin, munich],
      defaultSpecialStays('2027-07-01'),
      config,
    );
    const oktoberfest = stays.filter((s) => s.checkIn === '2027-09-17');
    expect(oktoberfest.map((s) => s.hotelId)).toEqual([2]);
  });

  it('merges a special stay that is also a grid weekend', () => {
    const special: SpecialStay = { key: 'x', checkIn: '2026-10-16', checkOut: '2026-10-18' };
    const stays = forHotel('2026-10-12', [special]);
    const merged = stays.filter((s) => s.checkIn === '2026-10-16');
    expect(merged).toHaveLength(1);
    expect(merged[0]?.reasons).toEqual(['weekend', 'special']);
  });

  it('ignores past, same-day, too-far and empty specials', () => {
    const specials: SpecialStay[] = [
      { key: 'past', checkIn: '2026-10-01', checkOut: '2026-10-03' },
      { key: 'today', checkIn: '2026-10-12', checkOut: '2026-10-14' },
      { key: 'far', checkIn: '2027-02-01', checkOut: '2027-02-03' },
      { key: 'empty', checkIn: '2026-11-02', checkOut: '2026-11-02' },
    ];
    expect(forHotel('2026-10-12', specials).some((s) => s.reasons.includes('special'))).toBe(false);
  });
});

describe('buildGrid output', () => {
  it('has no duplicates, no past dates, 2 adults, sorted by hotel and date', () => {
    const stays = buildGrid(
      '2026-11-30',
      [munich, berlin],
      defaultSpecialStays('2026-11-30'),
      config,
    );
    const keys = stays.map((s) => `${s.hotelId}|${s.checkIn}|${s.checkOut}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(stays.every((s) => s.checkIn > '2026-11-30' && s.adults === 2)).toBe(true);
    expect(stays.map((s) => s.hotelId)).toEqual([...stays.map((s) => s.hotelId)].sort());
    // 6 weekends + 2 midweek; advent 1 (4 Dec) and 2 (11 Dec) are also grid weekends; NYE is extra.
    expect(stays.filter((s) => s.hotelId === 1)).toHaveLength(9);
  });

  it('returns nothing without hotels and rejects an invalid date', () => {
    expect(buildGrid('2026-10-12', [], [], config)).toEqual([]);
    expect(() => buildGrid('2026-13-01', [berlin], [], config)).toThrow();
  });
});

describe('gridConfigFromEnv', () => {
  it('reads sizes and falls back to the defaults', () => {
    expect(gridConfigFromEnv({ GRID_WEEKENDS: '4', GRID_MIDWEEK: '1' })).toEqual({
      weekends: 4,
      midweek: 1,
    });
    expect(gridConfigFromEnv({})).toEqual({ weekends: 6, midweek: 2 });
    expect(gridConfigFromEnv({ GRID_WEEKENDS: '' })).toEqual({ weekends: 6, midweek: 2 });
  });

  it('rejects nonsense instead of guessing', () => {
    expect(() => gridConfigFromEnv({ GRID_WEEKENDS: 'six' })).toThrow();
    expect(() => gridConfigFromEnv({ GRID_MIDWEEK: '-1' })).toThrow();
    expect(() => gridConfigFromEnv({ GRID_WEEKENDS: '1.5' })).toThrow();
  });
});

describe('isStayExpired', () => {
  it('expires stays whose check-in has passed', () => {
    expect(isStayExpired('2026-10-11', '2026-10-12')).toBe(true);
    expect(isStayExpired('2026-10-12', '2026-10-12')).toBe(false);
    expect(isStayExpired('2026-10-13', '2026-10-12')).toBe(false);
  });
});
