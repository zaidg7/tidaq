import { describe, expect, it } from 'vitest';
import { withExactToday } from './exactToday';

const series = [
  { day: '2026-10-24', bestCents: 300_000 },
  { day: '2026-10-25', bestCents: 257_700 },
];

describe('withExactToday (C-182)', () => {
  it("replaces today's point with the cheapest of today's offers", () => {
    expect(withExactToday(series, '2026-10-25', [320_000, 331_000])).toEqual([
      { day: '2026-10-24', bestCents: 300_000 },
      { day: '2026-10-25', bestCents: 320_000 },
    ]);
  });

  it('leaves the series alone without offers or without a point for today', () => {
    expect(withExactToday(series, '2026-10-25', [])).toBe(series);
    expect(withExactToday(series, '2026-10-26', [1])).toBe(series);
    expect(withExactToday([], '2026-10-25', [1])).toEqual([]);
  });
});
