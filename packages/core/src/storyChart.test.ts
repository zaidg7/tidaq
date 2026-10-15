import { describe, expect, it } from 'vitest';
import { storyChart } from './storyChart';

describe('storyChart', () => {
  it('places days left to right and prices top to bottom', () => {
    const c = storyChart(
      [
        { day: '2026-10-15', bestCents: 113_900 },
        { day: '2026-10-01', bestCents: 250_000 },
        { day: '2026-10-08', bestCents: 250_000 },
      ],
      '2026-10-15',
    );
    expect(c?.from).toBe('2026-10-01');
    expect(c?.to).toBe('2026-10-15');
    expect(c?.points.map((p) => p.x)).toEqual([0, 0.5, 1]);
    expect(c?.points[0]?.y).toBeCloseTo(0.18);
    expect(c?.points[2]?.y).toBeCloseTo(0.78);
  });

  it('keeps a flat line in the middle and drops future days', () => {
    const c = storyChart(
      [
        { day: '2026-10-14', bestCents: 1000 },
        { day: '2026-10-15', bestCents: 1000 },
        { day: '2026-10-16', bestCents: 500 },
      ],
      '2026-10-15',
    );
    expect(c?.points).toHaveLength(2);
    expect(c?.points.every((p) => p.y === 0.5)).toBe(true);
  });

  it('needs two prices', () => {
    expect(storyChart([{ day: '2026-10-15', bestCents: 1000 }], '2026-10-15')).toBeNull();
    expect(storyChart([], '2026-10-15')).toBeNull();
  });
});
