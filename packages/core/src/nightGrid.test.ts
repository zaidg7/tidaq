import { describe, expect, it } from 'vitest';
import {
  accuracyShare,
  inNightGrid,
  NIGHT_GRID,
  nightAccuracyAlarm,
  nightSumGap,
} from './nightGrid';

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

describe('nightAccuracyAlarm', () => {
  const day = (d: string, pairs: number, within3: number) => ({ day: d, pairs, within3 });

  it('fires after 3 consecutive weak days and returns their shares, newest first', () => {
    const rows = [
      day('2026-10-12', 100, 70),
      day('2026-10-14', 200, 120),
      day('2026-10-13', 100, 50),
      day('2026-10-11', 100, 90),
    ];
    expect(nightAccuracyAlarm(rows)).toEqual([0.6, 0.5, 0.7]);
  });

  it('stays quiet with a good day, a gap in days, too few pairs or too little history', () => {
    expect(
      nightAccuracyAlarm([
        day('2026-10-14', 100, 60),
        day('2026-10-13', 100, 75),
        day('2026-10-12', 100, 60),
      ]),
    ).toBeNull();
    expect(
      nightAccuracyAlarm([
        day('2026-10-14', 100, 60),
        day('2026-10-13', 100, 60),
        day('2026-10-11', 100, 60),
      ]),
    ).toBeNull();
    expect(
      nightAccuracyAlarm([
        day('2026-10-14', 100, 60),
        day('2026-10-13', 19, 0),
        day('2026-10-12', 100, 60),
      ]),
    ).toBeNull();
    expect(nightAccuracyAlarm([day('2026-10-14', 100, 60), day('2026-10-13', 100, 60)])).toBeNull();
    expect(nightAccuracyAlarm([])).toBeNull();
  });

  it('share is null without pairs', () => {
    expect(accuracyShare(day('2026-10-14', 0, 0))).toBeNull();
    expect(accuracyShare(day('2026-10-14', 4, 3))).toBe(0.75);
  });
});
