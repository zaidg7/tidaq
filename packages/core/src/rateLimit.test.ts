import { describe, expect, it } from 'vitest';
import { clientIp, createRateLimiter } from './rateLimit';

describe('createRateLimiter', () => {
  it('allows max hits per window and key, then refuses until the window slides', () => {
    const l = createRateLimiter({ max: 2, windowMs: 1000 });
    expect(l.limited('a', 0)).toBe(false);
    expect(l.limited('a', 100)).toBe(false);
    expect(l.limited('a', 200)).toBe(true);
    expect(l.limited('b', 200)).toBe(false);
    // 0 and 100 have left the window: 200 and 1150 are inside, refused hits count too.
    expect(l.limited('a', 1150)).toBe(false);
    expect(l.limited('a', 1160)).toBe(true);
    expect(l.limited('a', 2300)).toBe(false);
  });

  it('starts over when the table is full, so memory stays bounded', () => {
    const l = createRateLimiter({ max: 1, windowMs: 1000, maxKeys: 2 });
    l.limited('a', 0);
    expect(l.limited('a', 1)).toBe(true);
    l.limited('b', 2);
    l.limited('c', 3); // table full: cleared, then c added
    expect(l.limited('a', 4)).toBe(false);
  });
});

describe('clientIp', () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  it("prefers Cloudflare's header, then the first proxy hop", () => {
    expect(clientIp(h({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' }))).toBe(
      '1.2.3.4',
    );
    expect(clientIp(h({ 'x-forwarded-for': ' 5.6.7.8 , 9.9.9.9' }))).toBe('5.6.7.8');
    expect(clientIp(h({}))).toBe('');
  });
});
