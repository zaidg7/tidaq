import { describe, expect, it } from 'vitest';
import {
  STAY_LIMITS,
  dayDiff,
  dayRole,
  isSelectable,
  lastDay,
  monthOf,
  monthWeeks,
  moveFocus,
  pickDay,
  shiftDays,
  shiftMonths,
  weekdayMonFirst,
  type RangeDraft,
} from './calendar';

const TODAY = '2026-10-13'; // a Tuesday
const empty: RangeDraft = { checkIn: '', checkOut: '', phase: 'in' };

describe('date math', () => {
  it('shifts days across months, years and the DST change', () => {
    expect(shiftDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDays('2026-10-25', -1)).toBe('2026-10-24');
    expect(dayDiff('2026-10-24', '2026-10-26')).toBe(2);
    expect(dayDiff('2026-10-26', '2026-10-24')).toBe(-2);
  });

  it('finds months and shifts them without day overflow', () => {
    expect(monthOf('2026-10-13')).toBe('2026-10-01');
    expect(shiftMonths('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(shiftMonths('2026-01-15', -1)).toBe('2025-12-01');
  });

  it('numbers weekdays from Monday', () => {
    expect(weekdayMonFirst('2026-10-12')).toBe(0); // Monday
    expect(weekdayMonFirst('2026-10-18')).toBe(6); // Sunday
  });
});

describe('monthWeeks', () => {
  it('starts weeks on Monday and pads with null', () => {
    const weeks = monthWeeks('2026-10-20'); // 1 Oct 2026 is a Thursday
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks[4]).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      null,
    ]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('handles a month that starts on Monday and leap February', () => {
    const june = monthWeeks('2026-06-01'); // Monday
    expect(june[0]?.[0]).toBe('2026-06-01');
    const feb = monthWeeks('2028-02-10');
    expect(feb.flat().filter(Boolean)).toHaveLength(29);
  });

  it('handles a month that ends on Sunday without an empty row', () => {
    const may = monthWeeks('2026-05-01'); // 31 May 2026 is a Sunday
    expect(may.at(-1)?.at(-1)).toBe('2026-05-31');
  });
});

describe('isSelectable', () => {
  it('never allows past days', () => {
    expect(isSelectable('2026-10-12', TODAY, empty)).toBe(false);
    expect(isSelectable(TODAY, TODAY, empty)).toBe(true);
  });

  it('allows check-ins up to a day before the last check-out', () => {
    expect(lastDay(TODAY)).toBe(shiftDays(TODAY, STAY_LIMITS.maxDaysAhead));
    expect(isSelectable(shiftDays(lastDay(TODAY), -1), TODAY, empty)).toBe(true);
    expect(isSelectable(lastDay(TODAY), TODAY, empty)).toBe(false);
  });

  it('limits the check-out to 30 nights', () => {
    const draft: RangeDraft = { checkIn: '2026-12-01', checkOut: '', phase: 'out' };
    expect(isSelectable('2026-12-31', TODAY, draft)).toBe(true); // 30 nights
    expect(isSelectable('2027-01-01', TODAY, draft)).toBe(false); // 31 nights
    expect(isSelectable('2026-11-20', TODAY, draft)).toBe(true); // restarts as check-in
  });

  it('caps the check-out at the last day', () => {
    const checkIn = shiftDays(lastDay(TODAY), -2);
    const draft: RangeDraft = { checkIn, checkOut: '', phase: 'out' };
    expect(isSelectable(lastDay(TODAY), TODAY, draft)).toBe(true);
    expect(isSelectable(shiftDays(lastDay(TODAY), 1), TODAY, draft)).toBe(false);
  });
});

describe('pickDay', () => {
  it('picks check-in, then check-out, then starts over', () => {
    const a = pickDay(empty, '2026-12-04');
    expect(a).toEqual({ checkIn: '2026-12-04', checkOut: '', phase: 'out' });
    const b = pickDay(a, '2026-12-06');
    expect(b).toEqual({ checkIn: '2026-12-04', checkOut: '2026-12-06', phase: 'in' });
    const c = pickDay(b, '2026-12-20');
    expect(c).toEqual({ checkIn: '2026-12-20', checkOut: '', phase: 'out' });
  });

  it('restarts when the check-out is on or before the check-in', () => {
    const draft: RangeDraft = { checkIn: '2026-12-04', checkOut: '', phase: 'out' };
    expect(pickDay(draft, '2026-12-04')).toEqual({
      checkIn: '2026-12-04',
      checkOut: '',
      phase: 'out',
    });
    expect(pickDay(draft, '2026-12-01')).toEqual({
      checkIn: '2026-12-01',
      checkOut: '',
      phase: 'out',
    });
  });

  it('keeps a check-out that still fits when the check-in moves', () => {
    const draft: RangeDraft = { checkIn: '2026-12-04', checkOut: '2026-12-06', phase: 'in' };
    expect(pickDay(draft, '2026-12-02')).toEqual({
      checkIn: '2026-12-02',
      checkOut: '2026-12-06',
      phase: 'out',
    });
    expect(pickDay(draft, '2026-11-05').checkOut).toBe(''); // 31 nights
    expect(pickDay(draft, '2026-11-06').checkOut).toBe('2026-12-06'); // 30 nights
    expect(pickDay(draft, '2026-12-06').checkOut).toBe(''); // same day
  });
});

describe('dayRole', () => {
  const range: RangeDraft = { checkIn: '2026-12-04', checkOut: '2026-12-07', phase: 'in' };

  it('marks the ends and the nights between', () => {
    expect(dayRole('2026-12-04', range)).toBe('start');
    expect(dayRole('2026-12-05', range)).toBe('between');
    expect(dayRole('2026-12-07', range)).toBe('end');
    expect(dayRole('2026-12-08', range)).toBe('none');
  });

  it('previews the range up to the pointer while choosing the check-out', () => {
    const draft: RangeDraft = { checkIn: '2026-12-04', checkOut: '', phase: 'out' };
    expect(dayRole('2026-12-05', draft, '2026-12-07')).toBe('preview');
    expect(dayRole('2026-12-07', draft, '2026-12-07')).toBe('none');
    expect(dayRole('2026-12-05', draft, '2026-12-03')).toBe('none');
    expect(dayRole('2026-12-05', draft)).toBe('none');
    expect(dayRole('2026-12-05', range, '2026-12-09')).toBe('between');
  });
});

describe('moveFocus', () => {
  const day = '2026-12-16'; // Wednesday

  it('moves by day and week', () => {
    expect(moveFocus(day, 'ArrowLeft', TODAY)).toBe('2026-12-15');
    expect(moveFocus(day, 'ArrowRight', TODAY)).toBe('2026-12-17');
    expect(moveFocus(day, 'ArrowUp', TODAY)).toBe('2026-12-09');
    expect(moveFocus(day, 'ArrowDown', TODAY)).toBe('2026-12-23');
  });

  it('jumps to the start and end of the week', () => {
    expect(moveFocus(day, 'Home', TODAY)).toBe('2026-12-14');
    expect(moveFocus(day, 'End', TODAY)).toBe('2026-12-20');
  });

  it('moves by month and year, keeping the day where it exists', () => {
    expect(moveFocus(day, 'PageDown', TODAY)).toBe('2027-01-16');
    expect(moveFocus(day, 'PageUp', TODAY)).toBe('2026-11-16');
    expect(moveFocus('2027-01-31', 'PageDown', TODAY)).toBe('2027-02-28');
    expect(moveFocus('2026-12-01', 'PageDown', TODAY, true)).toBe(lastDay(TODAY));
  });

  it('never leaves today … the last day', () => {
    expect(moveFocus(TODAY, 'ArrowLeft', TODAY)).toBe(TODAY);
    expect(moveFocus('2026-10-20', 'PageUp', TODAY)).toBe(TODAY);
    expect(moveFocus(lastDay(TODAY), 'ArrowRight', TODAY)).toBe(lastDay(TODAY));
  });
});
