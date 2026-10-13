import { describe, expect, it } from 'vitest';
import { TRUST, trustLevel } from './trust';

describe('trustLevel', () => {
  it('needs at least 5 tests and a score', () => {
    expect(trustLevel(95, TRUST.minTests - 1)).toBe('insufficient');
    expect(trustLevel(null, 25)).toBe('insufficient');
    expect(trustLevel(Number.NaN, 25)).toBe('insufficient');
    expect(trustLevel(95, TRUST.minTests)).toBe('high');
  });

  it('uses the DESIGN.md thresholds 85 and 60', () => {
    expect(trustLevel(85, 25)).toBe('high');
    expect(trustLevel(84.9, 25)).toBe('mid');
    expect(trustLevel(60, 25)).toBe('mid');
    expect(trustLevel(59, 25)).toBe('low');
    expect(trustLevel(0, 25)).toBe('low');
  });
});
