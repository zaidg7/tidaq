import { addDays } from '@tidaq/core';
import { describe, expect, it } from 'vitest';
import { alertsLive, runAlerts } from './alerts';
import type { AlertOffer, AlertWatch } from './store';
import { testEnv } from './test/env';
import { fakeMail } from './test/mail';
import { memoryStore } from './test/memoryStore';

const NOW = new Date('2026-11-10T06:30:00Z');
const TODAY = '2026-11-10';

/** 20 days of a stay around 1,200 €, today's price last. */
const series = (todayCents: number) =>
  Array.from({ length: 20 }, (_, i) => ({
    day: addDays(TODAY, i - 19),
    bestCents: i === 19 ? todayCents : 120_000 - (i % 3) * 1_000,
  }));

const watch = (over: Partial<AlertWatch> = {}): AlertWatch => ({
  watchId: '11111111-1111-4111-8111-111111111111',
  email: 'gast@example.com',
  locale: 'de',
  manageToken: '22222222-2222-4222-8222-222222222222',
  hotelSlug: 'hotel-adlon-kempinski-berlin',
  hotelName: 'Hotel Adlon Kempinski',
  checkIn: '2026-12-04',
  checkOut: '2026-12-06',
  adults: 2,
  targetCents: null,
  lastAlertCents: null,
  lastAlertAt: null,
  series: series(110_000),
  ...over,
});

const live = testEnv({ APP_ENV: 'production', ALERTS_DRY_RUN: 'false', RESEND_API_KEY: 're_test' });

describe('runAlerts (C-031)', () => {
  it('sends a new-low email with the price, links and one-click unsubscribe, and records it', async () => {
    const mem = memoryStore([]);
    mem.alertWatches.push(watch());
    const mail = fakeMail();
    const s = await runAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(s).toMatchObject({ watches: 1, due: { new_low: 1 }, sent: 1, failed: 0, dryRun: false });
    const sent = mail.sent[0] as unknown as {
      to: string[];
      subject: string;
      text: string;
      headers: Record<string, string>;
    };
    expect(sent.to).toEqual(['gast@example.com']);
    expect(sent.subject).toBe('Hotel Adlon Kempinski: neuer Tiefpunkt');
    expect(sent.text).not.toMatch(/€/);
    expect(sent.text).toContain(
      'https://tidaq.com/hotel/hotel-adlon-kempinski-berlin/2026-12-04--2026-12-06?adults=2',
    );
    expect(sent.headers['List-Unsubscribe']).toBe(
      '<https://tidaq.com/api/watch/unsubscribe?token=22222222-2222-4222-8222-222222222222>',
    );
    expect(mem.recordedAlerts).toEqual([
      { watchId: watch().watchId, kind: 'new_low', priceCents: 110_000, resendId: 'email-1' },
    ]);
  });

  it('throttles to one email per watch and day', async () => {
    const mem = memoryStore([]);
    mem.alertWatches.push(watch({ lastAlertAt: '2026-11-10T05:00:00Z', lastAlertCents: 115_000 }));
    const mail = fakeMail();
    const s = await runAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(s.sent).toBe(0);
    expect(mail.sent).toHaveLength(0);
  });

  it('only logs in dry runs (staging, or ALERTS_DRY_RUN not "false")', async () => {
    const mem = memoryStore([]);
    mem.alertWatches.push(watch());
    const mail = fakeMail();
    const s = await runAlerts({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: mail.fetchFn,
    });
    expect(s).toMatchObject({ due: { new_low: 1 }, sent: 0, dryRun: true });
    expect(mail.sent).toHaveLength(0);
    expect(mem.recordedAlerts).toHaveLength(0);
    expect(alertsLive(testEnv({ APP_ENV: 'production', RESEND_API_KEY: 'x' }))).toBe(false);
    expect(alertsLive(testEnv({ ALERTS_DRY_RUN: 'false', RESEND_API_KEY: 'x' }))).toBe(false);
  });

  it('skips watches without a price today and keeps going after a failed email', async () => {
    const mem = memoryStore([]);
    mem.alertWatches.push(
      watch({ watchId: 'a', series: series(110_000).slice(0, -1) }),
      watch({ watchId: 'b' }),
    );
    const mail = fakeMail({ status: 500 });
    const s = await runAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(s).toMatchObject({ watches: 2, sent: 0, failed: 1 });
    expect(mem.recordedAlerts).toHaveLength(0);
  });

  it('writes English emails for English watchers', async () => {
    const mem = memoryStore([]);
    mem.alertWatches.push(watch({ locale: 'en', targetCents: 112_000 }));
    const mail = fakeMail();
    await runAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(mail.sent[0]?.subject).toMatch(/your target price is reached$/);
    expect(mail.sent[0]?.text).toContain('https://tidaq.com/en/hotel/');
  });

  it('names the first offer by expected checkout price and links it through /go (C-031b)', async () => {
    const mem = memoryStore([]);
    mem.alertWatches.push(watch());
    const offer = (o: Partial<AlertOffer>): AlertOffer => ({
      providerId: 1,
      slug: 'booking-com',
      name: 'Booking.com',
      isDirect: false,
      partner: false,
      totalCents: 110_000,
      trust: null,
      ...o,
    });
    mem.alertOffers.set(watch().watchId, [
      // Cheapest listed, but our tests expect +6 % at checkout: 116.600 €.
      offer({
        providerId: 4,
        slug: 'trip-com',
        name: 'Trip.com',
        totalCents: 110_000,
        trust: { score: 60, tests: 8, matches: 4, avgMarkupPct: 6 },
      }),
      offer({ providerId: 1, totalCents: 112_000, partner: true }),
    ]);
    const mail = fakeMail();
    await runAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    const text = mail.sent[0]?.text ?? '';
    expect(text).toContain('Am günstigsten heute: Booking.com.');
    expect(text).toContain(
      'Zu Booking.com (Partnerlink): https://tidaq.com/go/booking-com/hotel-adlon-kempinski-berlin?in=2026-12-04&out=2026-12-06&adults=2&lang=de',
    );
  });

  it('sends without an offer line when the offer lookup fails', async () => {
    const mem = memoryStore([]);
    mem.alertWatches.push(watch());
    mem.store.alertOffers = () => Promise.reject(new Error('db down'));
    const mail = fakeMail();
    const s = await runAlerts({ store: mem.store, env: live, now: NOW, fetchFn: mail.fetchFn });
    expect(s.sent).toBe(1);
    expect(mail.sent[0]?.text).not.toContain('Am günstigsten heute');
  });
});
