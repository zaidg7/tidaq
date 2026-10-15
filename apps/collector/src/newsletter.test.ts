import { describe, expect, it } from 'vitest';
import { runNewsletter } from './newsletter';
import type { DealRow } from './store';
import { testEnv } from './test/env';
import { memoryStore } from './test/memoryStore';

const MONDAY = new Date('2026-11-09T07:55:00Z');
const TUESDAY = new Date('2026-11-10T07:55:00Z');
const live = testEnv({ APP_ENV: 'production', ALERTS_DRY_RUN: 'false', RESEND_API_KEY: 're_test' });

const deal = (i: number, drop: number, over: Partial<DealRow> = {}): DealRow => ({
  stayId: i,
  hotelSlug: `hotel-${i}`,
  hotelName: `Hotel ${i}`,
  cityName: { de: 'Zürich', en: 'Zurich' },
  checkIn: '2026-12-04',
  checkOut: '2026-12-06',
  adults: 2,
  nowCents: Math.round(100_000 * (1 + drop)),
  avg30Cents: 100_000,
  daysTracked: 20,
  ...over,
});

function fakeBatch(status = 200) {
  const calls: {
    url: string;
    body: { to: string[]; subject: string; text: string; headers: Record<string, string> }[];
  }[] = [];
  const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    return status === 200 ? Response.json({ data: [] }) : new Response('error', { status });
  };
  return { fetchFn, calls };
}

function setup(n = 5, recipients = 2) {
  const mem = memoryStore([]);
  for (let i = 1; i <= n; i++) mem.dealCandidates.push(deal(i, -0.08 - i / 100));
  // Not a deal: only 5 % under the average.
  mem.dealCandidates.push(deal(99, -0.05));
  for (let i = 0; i < recipients; i++) {
    mem.newsletterRecipients.push({
      email: `gast${i}@example.com`,
      locale: i % 2 ? 'en' : 'de',
      manageToken: `2222222${i}-2222-4222-8222-222222222222`,
    });
  }
  return mem;
}

describe('runNewsletter (C-054b)', () => {
  it('sends on Mondays: the biggest drops first, own unsubscribe link per recipient', async () => {
    const mem = setup(10, 2);
    const mail = fakeBatch();
    const s = await runNewsletter({
      store: mem.store,
      env: live,
      now: MONDAY,
      fetchFn: mail.fetchFn,
    });
    expect(s).toMatchObject({
      skipped: null,
      deals: 8,
      recipients: 2,
      sent: 2,
      failed: 0,
      dryRun: false,
    });
    expect(mail.calls).toHaveLength(1);
    expect(mail.calls[0]?.url).toBe('https://api.resend.com/emails/batch');
    const [de, en] = mail.calls[0]?.body ?? [];
    expect(de?.to).toEqual(['gast0@example.com']);
    expect(de?.subject).toBe('8 Luxushotels gerade deutlich günstiger');
    // Hotel 10 has the biggest drop (18 %), so it comes first; the 5 % stay is not a deal.
    expect(de?.text.indexOf('Hotel 10')).toBeLessThan(de?.text.indexOf('Hotel 9') ?? 0);
    expect(de?.text).not.toContain('Hotel 99');
    expect(de?.text).toContain('https://tidaq.com/hotel/hotel-10/2026-12-04--2026-12-06?adults=2');
    expect(de?.headers['List-Unsubscribe']).toBe(
      '<https://tidaq.com/api/watch/unsubscribe?token=22222220-2222-4222-8222-222222222222>',
    );
    expect(en?.subject).toBe('8 luxury hotels clearly cheaper right now');
    expect(en?.text).toContain('https://tidaq.com/en/hotel/hotel-10/');
    expect(en?.text).toContain('Zurich');
  });

  it('skips other weekdays, weeks with fewer than 3 deals and empty lists', async () => {
    const mail = fakeBatch();
    expect(
      (
        await runNewsletter({
          store: setup().store,
          env: live,
          now: TUESDAY,
          fetchFn: mail.fetchFn,
        })
      ).skipped,
    ).toBe('weekday');
    expect(
      (
        await runNewsletter({
          store: setup(2).store,
          env: live,
          now: MONDAY,
          fetchFn: mail.fetchFn,
        })
      ).skipped,
    ).toBe('few_deals');
    expect(
      (
        await runNewsletter({
          store: setup(5, 0).store,
          env: live,
          now: MONDAY,
          fetchFn: mail.fetchFn,
        })
      ).skipped,
    ).toBe('no_recipients');
    expect(mail.calls).toHaveLength(0);
  });

  it('only counts in dry runs (staging, or ALERTS_DRY_RUN not "false")', async () => {
    const mail = fakeBatch();
    const s = await runNewsletter({
      store: setup().store,
      env: testEnv(),
      now: MONDAY,
      fetchFn: mail.fetchFn,
    });
    expect(s).toMatchObject({ dryRun: true, deals: 5, recipients: 2, sent: 0 });
    expect(mail.calls).toHaveLength(0);
  });

  it('sends in batches of 100 and counts a failed batch without stopping', async () => {
    const mem = setup(5, 150);
    const mail = fakeBatch(500);
    const s = await runNewsletter({
      store: mem.store,
      env: live,
      now: MONDAY,
      fetchFn: mail.fetchFn,
    });
    expect(mail.calls.map((c) => c.body.length)).toEqual([100, 50]);
    expect(s).toMatchObject({ sent: 0, failed: 150 });
  });
});
