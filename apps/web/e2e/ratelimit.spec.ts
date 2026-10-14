import { expect, test } from '@playwright/test';

// Per-IP limits (C-041b). Each test uses its own documentation-range IP, so they don't interact.
test.describe('rate limits', () => {
  test('/go allows 30 clicks a minute per IP, then answers 429', async ({ request }) => {
    const url =
      '/go/booking-com/hotel-adlon-kempinski-berlin?in=2026-12-04&out=2026-12-06&adults=2';
    const headers = { 'cf-connecting-ip': '203.0.113.10' };
    for (let i = 0; i < 30; i++) {
      const res = await request.get(url, { headers, maxRedirects: 0 });
      // Without a database (CI) the route says it's unavailable, but it isn't limited.
      expect(res.status(), `click ${i + 1}`).not.toBe(429);
    }
    const res = await request.get(url, { headers, maxRedirects: 0 });
    expect(res.status()).toBe(429);
    expect(res.headers()['retry-after']).toBe('60');
    expect(await res.text()).toContain('Zu viele Aufrufe');
    // Another visitor is not affected.
    const other = await request.get(url, {
      headers: { 'cf-connecting-ip': '203.0.113.11' },
      maxRedirects: 0,
    });
    expect(other.status()).not.toBe(429);
  });

  test('one-click unsubscribe allows 10 a minute per IP', async ({ request }) => {
    const headers = { 'cf-connecting-ip': '203.0.113.20' };
    for (let i = 0; i < 10; i++) {
      const res = await request.post('/api/watch/unsubscribe?token=not-a-token', { headers });
      expect(res.status()).toBe(400);
    }
    const res = await request.post('/api/watch/unsubscribe?token=not-a-token', { headers });
    expect(res.status()).toBe(429);
  });
});
