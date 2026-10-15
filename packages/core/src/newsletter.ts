import { formatDateRange, formatPercent, formatPrice, type Locale } from './format';
import type { MailContent } from './mailTemplate';

/** Weekly deals newsletter (C-054b). */
export const NEWSLETTER = {
  /** Deals per email. */
  maxDeals: 8,
  /** Fewer deals than this: no email that week (nothing worth an email). */
  minDeals: 3,
  /** Sent on this weekday (UTC day of the daily check; 1 = Monday). */
  weekday: 1,
  /** Recipients per Resend batch request (Resend's limit is 100). */
  batchSize: 100,
} as const;

export interface NewsletterDeal {
  hotel: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nowCents: number;
  /** Relative to the stay's 30-day average, e.g. −0.14. */
  drop: number;
  url: string;
}

const TEXT = {
  de: {
    subject: (n: number) => `${n} Luxushotels gerade deutlich günstiger`,
    preheader: 'Die Aufenthalte, die diese Woche am weitesten unter ihrem 30-Tage-Schnitt liegen.',
    heading: 'Die besten Deals dieser Woche',
    intro:
      'Diese Aufenthalte liegen heute am deutlichsten unter ihrem eigenen Durchschnitt der letzten 30 Tage. Gesamtpreis für 2 Erwachsene, günstigste geprüfte Seite, Stand heute Morgen.',
    meta: (city: string, dates: string, price: string, drop: string) =>
      `${city} · ${dates} · ${price}, ${drop} unter dem 30-Tage-Schnitt`,
    hint: 'Preise ändern sich oft mehrmals am Tag. Prüf den Preis auf der Buchungsseite, bevor du buchst.',
    button: 'Alle Deals ansehen',
    why: 'Du bekommst diese E-Mail, weil du auf tidaq.com die Deals per E-Mail bestellt hast. Einmal pro Woche.',
    manage: (u: string) => `Abbestellen oder Alarme ändern: ${u}`,
  },
  en: {
    subject: (n: number) => `${n} luxury hotels clearly cheaper right now`,
    preheader: 'The stays furthest below their 30-day average this week.',
    heading: "This week's best deals",
    intro:
      'These stays are furthest below their own average of the last 30 days today. Total for 2 adults, cheapest reviewed site, as of this morning.',
    meta: (city: string, dates: string, price: string, drop: string) =>
      `${city} · ${dates} · ${price}, ${drop} below the 30-day average`,
    hint: 'Prices often change several times a day. Check the price on the booking site before you book.',
    button: 'See all deals',
    why: "You're getting this email because you asked for the deals by email on tidaq.com. Once a week.",
    manage: (u: string) => `Unsubscribe or change alerts: ${u}`,
  },
} as const;

/** Subject and content of the weekly deals email for one locale (rendered with `renderMail`). */
export function newsletterMail(d: {
  locale: Locale;
  deals: readonly NewsletterDeal[];
  dealsUrl: string;
  manageUrl: string;
}): { subject: string; content: MailContent } {
  const t = TEXT[d.locale];
  return {
    subject: t.subject(d.deals.length),
    content: {
      preheader: t.preheader,
      heading: t.heading,
      paragraphs: [t.intro],
      items: d.deals.map((x) => ({
        title: x.hotel,
        meta: t.meta(
          x.city,
          formatDateRange(x.checkIn, x.checkOut, d.locale),
          formatPrice(x.nowCents, d.locale),
          formatPercent(Math.abs(x.drop), d.locale),
        ),
        url: x.url,
      })),
      button: { label: t.button, url: d.dealsUrl },
      footer: [t.hint, t.why, t.manage(d.manageUrl)],
    },
  };
}
