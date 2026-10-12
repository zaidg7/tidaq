import { describe, expect, it } from 'vitest';
import { isoDateSchema, z } from './zod';

describe('isoDateSchema', () => {
  it('accepts real dates', () => {
    expect(isoDateSchema.parse('2028-02-29')).toBe('2028-02-29');
  });

  it('rejects impossible dates', () => {
    expect(isoDateSchema.safeParse('2027-02-29').success).toBe(false);
  });

  it('composes with other zod schemas', () => {
    const stay = z.object({ checkIn: isoDateSchema, checkOut: isoDateSchema });
    expect(stay.safeParse({ checkIn: '2026-12-01', checkOut: 'soon' }).success).toBe(false);
  });
});
