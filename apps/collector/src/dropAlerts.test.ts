import { describe, expect, it } from 'vitest';
import type { PriceDropRow } from '@tidaq/core';
import { runDropAlerts } from './dropAlerts';
import { testEnv } from './test/env';
import { memoryStore } from './test/memoryStore';

const NOW = new Date('2026-10-15T07:55:00Z');
const TODAY = '2026-10-15';
const live = testEnv({ APP_ENV: 'production', ALERTS_DRY_RUN: 'false', RESEND_API_KEY: 're_test' });

const drop = (
  hotel: number,
  city: 'paris' | 'zuerich',
  pct: number,
  over: Partial<PriceDropRow> = {},
): PriceDropRow => ({
  hotel_id: hotel,
  hotel_slug: `hotel-${hotel}`,
  hotel_name: `Hotel ${hotel}`,
  city_slug: city,
  city_name_de: city === 'paris' ? 'Paris' : 'Zürich',
  city_name_en: city === 'paris' ? 'Paris' : 'Zurich',
  night: '2026-11-20',
  seen_day: TODAY,
  seen_at: '2026-10-15T03:00:00Z',
  now_cents: Math.round(100_000 * (1 - pct)),
  prev_cents: 100_000,
  drop_pct: pct,
  prior_low_cents: 100_000,
  prior_days: 5,
  prior_avg_cents: 104_000,
  provider_slug: 'booking-com',
  provider_name: 'Booking.com',
  provider_direct: false,
  offers: 4,
  confirmed: true,
  ...over,
});

function fakeBatch(status = 200) {
  const calls: {
    url: string;
    body: {
      from: string;
      to: string[];
      subject: string;
      text: string;
      headers: Record<string, string>;
    }[];
  }[] = [];
  const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    return status === 200 ? Response.json({ data: [] }) : new Response('error', { status });
  };
  return { fetchFn, calls };
}

const subscriber = (
  i: number,
  city: string | null,
  locale: 'de' | 'en' = 'de',
  sentOn: string | null = null,
  follow: { cityAlarm?: boolean; hotels?: number[] } = {},
) => ({
  id: `3333333${i}-3333-4333-8333-333333333333`,
  email: `gast${i}@example.com`,
  locale,
  manageToken: `4444444${i}-4444-4444-8444-444444444444`,
  cityAlarm: follow.cityAlarm ?? true,
  city,
  hotels: follow.hotels ?? [],
  sentOn,
});

function setup() {
  const mem = memoryStore([]);
  mem.drops.push(
    drop(1, 'paris', 0.3),
    drop(2, 'zuerich', 0.2),
    drop(3, 'paris', 0.25),
    // Seen before yesterday's send: already mailed, never again.
    drop(4, 'paris', 0.4, { seen_day: '2026-10-14', seen_at: '2026-10-14T03:00:00Z' }),
  );
  mem.dropRecipients.push(
    subscriber(1, 'paris'),
    subscriber(2, null, 'en'),
    subscriber(3, 'zuerich', 'de', TODAY), // already got one today
    subscriber(4, 'london'), // no drop there today
  );
  return mem;
}

describe('runDropAlerts (C-080e2)', () => {
  it("one email per subscriber with their city's drops, then marks them sent", async () => {
    const mem = setup();
    const mail = fakeBatch();
    const s = await runDropAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(s).toMatchObject({
      hotels: 3,
      recipients: 3,
      matched: 2,
      sent: 2,
      failed: 0,
      dryRun: false,
    });
    expect(mail.calls).toHaveLength(1);
    const [paris, all] = mail.calls[0]?.body ?? [];
    expect(paris?.to).toEqual(['gast1@example.com']);
    expect(paris?.from).toBe('Tidaq <alarm@tidaq.com>');
    expect(paris?.subject.replace(/[\u00a0\u202f]/g, ' ')).toBe(
      'Preissturz: −30 % im Hotel 1 und 1 weiterer',
    );
    expect(paris?.text).toContain('https://tidaq.com/price-drops/hotel-1/2026-11-20');
    expect(paris?.text).toContain('https://tidaq.com/price-drops?stadt=paris');
    expect(paris?.text).not.toContain('Hotel 4');
    expect(paris?.text).not.toContain('Hotel 2');
    expect(paris?.headers['List-Unsubscribe']).toContain('44444441-4444-4444-8444-444444444444');
    // "All cities" in English: three hotels, English paths.
    expect(all?.subject.replace(/[\u00a0\u202f]/g, ' ')).toBe(
      'Price drop: −30% at Hotel 1 and 2 more',
    );
    expect(all?.text).toContain('https://tidaq.com/en/price-drops/hotel-2/2026-11-20');

    expect(mem.dropRecipients.map((r) => r.sentOn)).toEqual([TODAY, TODAY, TODAY, null]);
    // A second run the same day sends nothing new.
    const again = await runDropAlerts({
      store: mem.store,
      env: live,
      now: NOW,
      fetchFn: mail.fetchFn,
    });
    expect(again).toMatchObject({ recipients: 1, matched: 0, sent: 0 });
    expect(mail.calls).toHaveLength(1);
  });

  it('followed hotels (C-080k): alone, or next to a city alarm', async () => {
    const mem = memoryStore([]);
    mem.drops.push(drop(1, 'paris', 0.3), drop(2, 'zuerich', 0.2), drop(3, 'paris', 0.25));
    mem.dropRecipients.push(
      // Only Hotel 2, no city alarm.
      subscriber(1, null, 'de', null, { cityAlarm: false, hotels: [2] }),
      // Paris plus Hotel 2 in Zürich.
      subscriber(2, 'paris', 'de', null, { hotels: [2] }),
      // Follows a hotel without a drop today: no email.
      subscriber(3, null, 'de', null, { cityAlarm: false, hotels: [9] }),
    );
    const mail = fakeBatch();
    const s = await runDropAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(s).toMatchObject({ recipients: 3, matched: 2, sent: 2 });
    const [only, both] = mail.calls[0]?.body ?? [];
    expect(only?.subject.replace(/[\u00a0\u202f]/g, ' ')).toBe('Preissturz: −20 % im Hotel 2');
    expect(only?.text).toContain('Neue Preisstürze in deinen Hotels');
    expect(only?.text).not.toContain('Hotel 1');
    // The radar button isn't filtered to a city without a city alarm.
    expect(only?.text).not.toContain('?stadt=');
    expect(both?.text).toContain('Neue Preisstürze in Paris und deinen Hotels');
    expect(both?.text).toContain('https://tidaq.com/price-drops/hotel-2/2026-11-20');
    expect(both?.text).toContain('https://tidaq.com/price-drops?stadt=paris');
    expect(mem.dropRecipients.map((r) => r.sentOn)).toEqual([TODAY, TODAY, null]);
  });

  it('dry run outside production: counts only, nothing marked', async () => {
    const mem = setup();
    const mail = fakeBatch();
    const s = await runDropAlerts({
      store: mem.store,
      env: testEnv({ APP_ENV: 'staging' }),
      now: NOW,
      fetchFn: mail.fetchFn,
    });
    expect(s).toMatchObject({ matched: 2, sent: 0, dryRun: true });
    expect(mail.calls).toHaveLength(0);
    expect(mem.dropRecipients.filter((r) => r.sentOn === TODAY)).toHaveLength(1);
  });

  it('a failed batch is counted and not marked, so tomorrow it tries again', async () => {
    const mem = setup();
    const mail = fakeBatch(500);
    const s = await runDropAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(s).toMatchObject({ sent: 0, failed: 2 });
    expect(mem.dropRecipients[0]?.sentOn).toBeNull();
  });

  it('skips when there is no drop today or nobody subscribed', async () => {
    const empty = memoryStore([]);
    empty.drops.push(
      drop(1, 'paris', 0.3, { seen_day: '2026-10-14', seen_at: '2026-10-14T06:00:00Z' }),
    );
    empty.dropRecipients.push(subscriber(1, null));
    expect((await runDropAlerts({ store: empty.store, env: live, now: NOW })).skipped).toBe(
      'no_drops',
    );
    const nobody = memoryStore([]);
    nobody.drops.push(drop(1, 'paris', 0.3));
    expect((await runDropAlerts({ store: nobody.store, env: live, now: NOW })).skipped).toBe(
      'no_recipients',
    );
  });
});
