/**
 * Date range picker logic (C-021b), kept free of Zod so the client bundle stays small. All dates
 * are `YYYY-MM-DD` strings; weeks start on Monday. A stay is at most 30 nights and checks out at
 * most a year ahead.
 */

export const STAY_LIMITS = { maxNights: 30, maxDaysAhead: 365 } as const;

const DAY_MS = 86_400_000;

const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** `date` moved by `days` (negative goes back). */
export function shiftDays(date: string, days: number): string {
  return toIso(toMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to`. */
export function dayDiff(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

/** First day of the month of `date`. */
export function monthOf(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** First day of the month `months` after the month of `date`. */
export function shiftMonths(date: string, months: number): string {
  const d = new Date(toMs(monthOf(date)));
  d.setUTCMonth(d.getUTCMonth() + months);
  return toIso(d.getTime());
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMonFirst(date: string): number {
  return (new Date(toMs(date)).getUTCDay() + 6) % 7;
}

/** The month of `date` as Monday-first weeks; days outside the month are null. */
export function monthWeeks(date: string): (string | null)[][] {
  const first = monthOf(date);
  const length = dayDiff(first, shiftMonths(first, 1));
  const cells: (string | null)[] = Array.from({ length: weekdayMonFirst(first) }, () => null);
  for (let i = 0; i < length; i++) cells.push(shiftDays(first, i));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** What the picker is choosing next: the check-in or the check-out. '' means not chosen. */
export type RangeDraft = { checkIn: string; checkOut: string; phase: 'in' | 'out' };

/** Latest selectable day overall: check-out at most `maxDaysAhead` days after today. */
export function lastDay(today: string): string {
  return shiftDays(today, STAY_LIMITS.maxDaysAhead);
}

/**
 * Can `day` be clicked? No past days. While choosing the check-out, days up to 30 nights after
 * the check-in (a day on or before the check-in starts over as the new check-in).
 */
export function isSelectable(day: string, today: string, draft: RangeDraft): boolean {
  if (day < today) return false;
  const choosingOut = draft.phase === 'out' && draft.checkIn !== '';
  if (choosingOut && day > draft.checkIn) {
    return day <= shiftDays(draft.checkIn, STAY_LIMITS.maxNights) && day <= lastDay(today);
  }
  return day < lastDay(today);
}

/**
 * Applies a click on `day`. Choosing the check-in keeps a check-out that still fits (after it,
 * at most 30 nights), then asks for the check-out. Choosing the check-out on or before the
 * check-in restarts from that day.
 */
export function pickDay(draft: RangeDraft, day: string): RangeDraft {
  if (draft.phase === 'out' && draft.checkIn !== '' && day > draft.checkIn) {
    return { checkIn: draft.checkIn, checkOut: day, phase: 'in' };
  }
  const keep =
    draft.checkOut !== '' &&
    day < draft.checkOut &&
    dayDiff(day, draft.checkOut) <= STAY_LIMITS.maxNights;
  return { checkIn: day, checkOut: keep ? draft.checkOut : '', phase: 'out' };
}

export type DayRole = 'start' | 'end' | 'between' | 'preview' | 'none';

/**
 * How a day is drawn: the chosen ends, the nights between them, or a preview band from the
 * check-in to the hovered or focused day while choosing the check-out.
 */
export function dayRole(day: string, draft: RangeDraft, pointer?: string): DayRole {
  const { checkIn, checkOut } = draft;
  if (day === checkIn) return 'start';
  if (day === checkOut) return 'end';
  if (checkIn && checkOut && day > checkIn && day < checkOut) return 'between';
  if (draft.phase === 'out' && checkIn && pointer && pointer > checkIn) {
    if (day > checkIn && day < pointer) return 'preview';
  }
  return 'none';
}

export type GridKey =
  'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'PageUp' | 'PageDown';

/**
 * The day keyboard focus moves to (WAI-ARIA date picker grid): arrows by day and week, Home/End
 * to the week's Monday/Sunday, PageUp/PageDown by month (by year with Shift), keeping the day of
 * the month where it exists. Clamped to today … the last selectable day.
 */
export function moveFocus(day: string, key: GridKey, today: string, shift = false): string {
  let next: string;
  switch (key) {
    case 'ArrowLeft':
      next = shiftDays(day, -1);
      break;
    case 'ArrowRight':
      next = shiftDays(day, 1);
      break;
    case 'ArrowUp':
      next = shiftDays(day, -7);
      break;
    case 'ArrowDown':
      next = shiftDays(day, 7);
      break;
    case 'Home':
      next = shiftDays(day, -weekdayMonFirst(day));
      break;
    case 'End':
      next = shiftDays(day, 6 - weekdayMonFirst(day));
      break;
    case 'PageUp':
    case 'PageDown': {
      const months = (key === 'PageUp' ? -1 : 1) * (shift ? 12 : 1);
      const month = shiftMonths(day, months);
      const length = dayDiff(month, shiftMonths(month, 1));
      next = shiftDays(month, Math.min(Number(day.slice(8)), length) - 1);
      break;
    }
  }
  const last = lastDay(today);
  return next < today ? today : next > last ? last : next;
}
