import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { alertInputFromSeries, alertKind, alertMail, type AlertInput } from './alerts';
import { renderMail } from './mailTemplate';

const base: AlertInput = {
  nowCents: 100_000,
  previousLowCents: 105_000,
  state: 'good',
  previousState: 'good',
  targetCents: null,
  lastAlertCents: null,
  lastAlertAt: null,
  today: '2026-11-10',
};

describe('alertKind', () => {
  it('fires on the target price, and again only after a further 2 % drop', () => {
    expect(alertKind({ ...base, targetCents: 100_000 })).toBe('target');
    expect(alertKind({ ...base, targetCents: 99_999, previousLowCents: null })).toBeNull();
    const after = { lastAlertCents: 100_000, lastAlertAt: '2026-11-08T06:00:00Z' };
    expect(
      alertKind({ ...base, ...after, targetCents: 101_000, previousLowCents: null }),
    ).toBeNull();
    expect(
      alertKind({
        ...base,
        ...after,
        nowCents: 98_000,
        targetCents: 101_000,
        previousLowCents: null,
      }),
    ).toBe('target');
  });

  it('fires on a new low that is also 2 % under the last alert', () => {
    expect(alertKind(base)).toBe('new_low');
    expect(alertKind({ ...base, previousLowCents: 100_000 })).toBeNull();
    const after = { lastAlertCents: 101_000, lastAlertAt: '2026-11-08T06:00:00Z' };
    expect(alertKind({ ...base, ...after })).toBeNull(); // only 1 % under the last alert
    expect(alertKind({ ...base, ...after, nowCents: 98_900 })).toBe('new_low');
  });

  it('fires on a 5 % drop since the last alert', () => {
    const after = { lastAlertCents: 110_000, lastAlertAt: '2026-11-08T06:00:00Z' };
    expect(alertKind({ ...base, ...after, previousLowCents: 90_000, nowCents: 104_500 })).toBe(
      'drop',
    );
    expect(
      alertKind({ ...base, ...after, previousLowCents: 90_000, nowCents: 104_600 }),
    ).toBeNull();
  });

  it('fires when the state turns near_low, not while it stays there', () => {
    const quiet = { ...base, previousLowCents: 90_000 };
    expect(alertKind({ ...quiet, state: 'near_low', previousState: 'good' })).toBe('near_low');
    expect(alertKind({ ...quiet, state: 'near_low', previousState: 'near_low' })).toBeNull();
    expect(alertKind({ ...quiet, state: 'near_low', previousState: null })).toBeNull();
  });

  it('sends at most one email per Berlin day', () => {
    // 23:30 UTC on 9 Nov is already 10 Nov in Berlin.
    expect(alertKind({ ...base, lastAlertAt: '2026-11-09T23:30:00Z' })).toBeNull();
    expect(alertKind({ ...base, lastAlertAt: '2026-11-09T22:30:00Z' })).toBe('new_low');
  });

  it('ignores broken prices', () => {
    expect(alertKind({ ...base, nowCents: 0 })).toBeNull();
    expect(alertKind({ ...base, nowCents: 12.5 })).toBeNull();
  });
});

describe('alertInputFromSeries', () => {
  const today = '2026-11-10';
  const series = Array.from({ length: 20 }, (_, i) => ({
    day: addDays(today, i - 19),
    // Yesterday dear (120,000), today a clear new low (95,000).
    bestCents: i === 19 ? 95_000 : i === 18 ? 120_000 : 120_000 - (i % 4) * 2_000,
  }));
  const watch = { targetCents: null, lastAlertCents: null, lastAlertAt: null };

  it("needs today's price", () => {
    expect(alertInputFromSeries(series.slice(0, -1), today, '2026-12-04', watch)).toBeNull();
  });

  it('takes the previous low from the days before today and both states', () => {
    const input = alertInputFromSeries(series, today, '2026-12-04', watch);
    expect(input?.nowCents).toBe(95_000);
    expect(input?.previousLowCents).toBe(114_000);
    expect(input?.state).toBe('near_low');
    expect(input?.previousState).not.toBe('near_low');
    expect(input && alertKind(input)).toBe('new_low');
  });

  it('leaves states empty while collecting', () => {
    const input = alertInputFromSeries(series.slice(-2), today, '2026-12-04', watch);
    expect(input?.state).toBeNull();
    expect(input?.previousState).toBeNull();
  });
});

describe('alertMail', () => {
  it('writes German and English emails without euro amounts (C-149)', () => {
    const data = {
      kind: 'target' as const,
      locale: 'de' as const,
      hotel: 'Hotel Adlon Kempinski',
      checkIn: '2026-12-04',
      checkOut: '2026-12-06',
      adults: 2,
      nowCents: 98_000,
      targetCents: 100_000,
      lastAlertCents: null,
      stayUrl: 'https://tidaq.com/hotel/a/2026-12-04--2026-12-06?adults=2',
      manageUrl: 'https://tidaq.com/alarm/verwalten/x',
    };
    const de = alertMail(data);
    expect(de.subject).toBe('Hotel Adlon Kempinski: dein Wunschpreis ist erreicht');
    const text = renderMail(de.content).text;
    expect(text).toContain('2 Erwachsene');
    expect(text).toContain('Endpreis mit Steuern und Gebühren');
    expect(text).toContain('https://tidaq.com/alarm/verwalten/x');
    expect(text).not.toMatch(/€/);
    const en = alertMail({
      ...data,
      locale: 'en',
      kind: 'new_low',
      targetCents: null,
      lastAlertCents: 101_000,
    });
    expect(en.subject).toBe('Hotel Adlon Kempinski: new low');
    expect(renderMail(en.content).text).toContain('Since our last email the total');
    expect(renderMail(en.content).text).toContain('changed by -3%');
  });

  it('puts the drop since the last email in the subject', () => {
    const drop = alertMail({
      kind: 'drop',
      locale: 'de',
      hotel: 'Hotel Adlon Kempinski',
      checkIn: '2026-12-04',
      checkOut: '2026-12-06',
      adults: 2,
      nowCents: 90_000,
      targetCents: null,
      lastAlertCents: 100_000,
      stayUrl: 'https://tidaq.com/s',
      manageUrl: 'https://tidaq.com/m',
    });
    expect(drop.subject).toBe('Hotel Adlon Kempinski: Preis um 10\u00a0% gefallen');
  });

  it('names the best offer with its link, the checkout markup and the partner label', () => {
    const data = {
      kind: 'drop' as const,
      locale: 'de' as const,
      hotel: 'Hotel Adlon Kempinski',
      checkIn: '2026-12-04',
      checkOut: '2026-12-06',
      adults: 2,
      nowCents: 98_000,
      targetCents: null,
      lastAlertCents: 105_000,
      stayUrl: 'https://tidaq.com/hotel/a/2026-12-04--2026-12-06?adults=2',
      manageUrl: 'https://tidaq.com/alarm/verwalten/x',
    };
    const offer = {
      name: 'Booking.com',
      isDirect: false,
      totalCents: 98_000,
      expectedCents: null,
      partner: false,
      url: 'https://tidaq.com/go/booking-com/a?in=2026-12-04',
    };
    const plain = renderMail(alertMail({ ...data, offer }).content);
    expect(plain.text).toContain('Am günstigsten heute: Booking.com.');
    expect(plain.text).toContain(
      'Zu Booking.com: https://tidaq.com/go/booking-com/a?in=2026-12-04',
    );
    expect(plain.html).toContain('href="https://tidaq.com/go/booking-com/a?in=2026-12-04"');

    const expected = renderMail(
      alertMail({ ...data, offer: { ...offer, expectedCents: 103_900, partner: true } }).content,
    ).text;
    expect(expected).toMatch(/an der Kasse dort oft etwa 6\s%\s?höher\./);
    expect(expected).toContain('Zu Booking.com (Partnerlink):');
    expect(expected).not.toMatch(/€/);

    const direct = renderMail(
      alertMail({
        ...data,
        locale: 'en',
        offer: { ...offer, isDirect: true, name: 'Hotel direkt' },
      }).content,
    ).text;
    expect(direct).toContain('Cheapest today: directly with the hotel.');
    expect(direct).toContain("Go to the hotel's website:");

    const none = renderMail(alertMail({ ...data, offer: null }).content);
    expect(none.text).not.toContain('Am günstigsten heute');
    expect(none.html).not.toContain('font-weight:600">Zu ');
  });
});
