import { describe, expect, it } from 'vitest';
import { renderMail } from './mailTemplate';
import { newsletterMail } from './newsletter';

const deals = [
  {
    hotel: 'Baur au Lac',
    city: 'Zürich',
    checkIn: '2026-11-20',
    checkOut: '2026-11-22',
    nowCents: 118_000,
    drop: -0.14,
    url: 'https://tidaq.com/hotel/baur-au-lac-zuerich/2026-11-20--2026-11-22?adults=2',
  },
  {
    hotel: 'Hotel <Adlon>',
    city: 'Berlin',
    checkIn: '2026-12-04',
    checkOut: '2026-12-06',
    nowCents: 98_000,
    drop: -0.09,
    url: 'https://tidaq.com/hotel/hotel-adlon-kempinski-berlin/2026-12-04--2026-12-06?adults=2',
  },
];

describe('newsletterMail', () => {
  it('lists each deal with city, dates, price and drop, linked to its stay page', () => {
    const { subject, content } = newsletterMail({
      locale: 'de',
      deals,
      dealsUrl: 'https://tidaq.com/deals',
      manageUrl: 'https://tidaq.com/alarm/verwalten/x',
    });
    expect(subject).toBe('2 Luxushotels gerade deutlich günstiger');
    const { html, text } = renderMail(content);
    expect(text).toMatch(
      /Zürich · 20\.–22\. Nov\. 2026 · 1\.180\s€, 14\s% unter dem 30-Tage-Schnitt/,
    );
    expect(text).toContain(
      'https://tidaq.com/hotel/baur-au-lac-zuerich/2026-11-20--2026-11-22?adults=2',
    );
    expect(text).toContain('Abbestellen oder Alarme ändern: https://tidaq.com/alarm/verwalten/x');
    expect(html).toContain('Hotel &lt;Adlon&gt;');
    expect(html).toContain('href="https://tidaq.com/deals"');
  });

  it('writes English', () => {
    const { subject, content } = newsletterMail({
      locale: 'en',
      deals,
      dealsUrl: 'https://tidaq.com/en/deals',
      manageUrl: 'https://tidaq.com/en/alarm/verwalten/x',
    });
    expect(subject).toBe('2 luxury hotels clearly cheaper right now');
    expect(renderMail(content).text).toMatch(
      /Zürich · 20–22 Nov 2026 · €1,180, 14% below the 30-day average/,
    );
  });
});
