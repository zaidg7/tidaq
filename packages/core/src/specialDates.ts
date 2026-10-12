import { addDays, weekday } from './dates';

/** A stay worth tracking early because demand peaks (PLAN §7.1). */
export interface SpecialStay {
  key: string;
  checkIn: string;
  checkOut: string;
  /** City slugs (see `cities.slug`). Omitted = every city. */
  cities?: readonly string[];
}

const iso = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** Easter Sunday (Gregorian), anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

/** Opening Saturday of the Oktoberfest: the first Saturday after 15 September. */
export function oktoberfestStart(year: number): string {
  let day = addDays(iso(year, 9, 15), 1);
  while (weekday(day) !== 6) day = addDays(day, 1);
  return day;
}

/** First `count` Friday→Sunday stays whose Friday is in December of `year`. */
function decemberWeekends(year: number, count: number): [string, string][] {
  let friday = iso(year, 12, 1);
  while (weekday(friday) !== 5) friday = addDays(friday, 1);
  return Array.from({ length: count }, (_, n) => {
    const checkIn = addDays(friday, 7 * n);
    return [checkIn, addDays(checkIn, 2)];
  });
}

/** Special stays of one calendar year. */
export function specialStaysForYear(year: number): SpecialStay[] {
  const easter = easterSunday(year);
  const wiesn = oktoberfestStart(year);
  const advent = decemberWeekends(year, 2);
  return [
    // Good Friday → Easter Monday.
    { key: `easter-${year}`, checkIn: addDays(easter, -2), checkOut: addDays(easter, 1) },
    // Oktoberfest opening weekend and the weekend after, Munich only.
    {
      key: `oktoberfest-${year}-1`,
      checkIn: addDays(wiesn, -1),
      checkOut: addDays(wiesn, 1),
      cities: ['muenchen'],
    },
    {
      key: `oktoberfest-${year}-2`,
      checkIn: addDays(wiesn, 6),
      checkOut: addDays(wiesn, 8),
      cities: ['muenchen'],
    },
    // First two December weekends (Christmas markets, city breaks).
    ...advent.map(([checkIn, checkOut], n) => ({
      key: `advent-${year}-${n + 1}`,
      checkIn,
      checkOut,
    })),
    // New Year's Eve: 30 Dec → 1 Jan.
    { key: `nye-${year}`, checkIn: iso(year, 12, 30), checkOut: iso(year + 1, 1, 1) },
  ];
}

/** Special stays for the year of `today` and the next one (the grid filters by horizon). */
export function defaultSpecialStays(today: string): SpecialStay[] {
  const year = Number(today.slice(0, 4));
  return [...specialStaysForYear(year), ...specialStaysForYear(year + 1)];
}
