import { describe, expect, it } from 'vitest';
import { inNightGrid, NIGHT_GRID, nightSumGap } from './nightGrid';

describe('inNightGrid', () => {
  const today = '2026-10-14';
  it('covers 2-adult stays whose nights are all inside the window', () => {
    expect(inNightGrid({ checkIn: '2026-12-01', checkOut: '2026-12-04', adults: 2 }, today)).toBe(
      true,
    );
    // Check-out exactly 120 days ahead: the last night is day 119, still collected.
    expect(inNightGrid({ checkIn: '2027-02-09', checkOut: '2027-02-11', adults: 2 }, today)).toBe(
      true,
    );
    expect(inNightGrid({ checkIn: today, checkOut: '2026-10-15', adults: 2 }, today)).toBe(true);
  });

  it('leaves out other occupancies, past stays and nights beyond the window', () => {
    expect(inNightGrid({ checkIn: '2026-12-01', checkOut: '2026-12-04', adults: 3 }, today)).toBe(
      false,
    );
    expect(inNightGrid({ checkIn: '2026-10-13', checkOut: '2026-10-15', adults: 2 }, today)).toBe(
      false,
    );
    expect(inNightGrid({ checkIn: '2027-02-10', checkOut: '2027-02-12', adults: 2 }, today)).toBe(
      false,
    );
    expect(NIGHT_GRID.windowDays).toBe(120);
  });
});

describe('nightSumGap', () => {
  it('reports gaps above 3 % only', () => {
    expect(nightSumGap(154_400, 224_400)).toBeCloseTo(-0.312, 3);
    expect(nightSumGap(103_000, 100_000)).toBeNull();
    expect(nightSumGap(103_100, 100_000)).toBeCloseTo(0.031, 3);
  });

  it('needs both prices', () => {
    expect(nightSumGap(null, 100_000)).toBeNull();
    expect(nightSumGap(100_000, null)).toBeNull();
    expect(nightSumGap(100_000, 0)).toBeNull();
  });
});
