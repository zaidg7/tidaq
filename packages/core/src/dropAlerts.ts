import { dropDates, formatDrop, usualCents, type HotelDrops } from './drops';
import { formatPrice, type Locale } from './format';
import type { MailContent } from './mailTemplate';

/** Preissturz-Alarm emails (C-080e2). */
export const DROP_ALERTS = {
  /** Drops seen within this many hours before the send are new. */
  windowHours: 24,
  /** Hotels per email, biggest drop first. */
  maxHotels: 5,
  /** Recipients per Resend batch request (Resend's limit is 100). */
  batchSize: 100,
} as const;

/** What one subscriber follows (C-080e, C-080k). */
export interface DropScope {
  /** The city alarm is on: drops in `city`, or in all cities when it is null. */
  cityAlarm: boolean;
  city: string | null;
  /** Hotel ids followed one by one, any city. */
  hotels: readonly number[];
}

/**
 * The drops one subscriber gets: only those seen since `since` (epoch ms; the send runs daily, so
 * "the last 24 hours" mails every drop once, also those the night grid found after yesterday's
 * send), in their city (null = all) when the city alarm is on, plus their followed hotels, one
 * entry per hotel, biggest first, at most `DROP_ALERTS.maxHotels`.
 */
export function dropsFor<T extends HotelDrops>(
  groups: readonly T[],
  scope: DropScope,
  since: number,
): T[] {
  const out: T[] = [];
  for (const g of groups) {
    const inCity = scope.cityAlarm && (!scope.city || g.city.slug === scope.city);
    if (!inCity && !scope.hotels.includes(g.hotel.id)) continue;
    const fresh = [g.top, ...g.more].filter((d) => Date.parse(d.seenAt) >= since);
    const [top, ...rest] = fresh.sort((a, b) => b.drop - a.drop || a.night.localeCompare(b.night));
    if (top) out.push({ ...g, top, more: rest.sort((a, b) => a.night.localeCompare(b.night)) });
  }
  return out
    .sort((a, b) => b.top.drop - a.top.drop || a.hotel.name.localeCompare(b.hotel.name))
    .slice(0, DROP_ALERTS.maxHotels);
}

const TEXT = {
  de: {
    subject: (pct: string, hotel: string, more: number) =>
      more === 0
        ? `Preissturz: ${pct} im ${hotel}`
        : `Preissturz: ${pct} im ${hotel} und ${more} ${more === 1 ? 'weiterer' : 'weitere'}`,
    preheader: (where: string) => `Neue Preisstürze in Fünf-Sterne-Hotels ${where}, Stand heute.`,
    heading: (where: string) => `Neue Preisstürze ${where}`,
    eyebrow: 'Preissturz-Alarm',
    all: 'in allen Städten',
    in: (city: string) => `in ${city}`,
    hotels: 'in deinen Hotels',
    andHotels: ' und deinen Hotels',
    intro:
      'Diese Aufenthalte sind seit gestern deutlich billiger geworden, auf den niedrigsten Preis, den wir für sie gesehen haben. 2 Erwachsene, günstigste geprüfte Seite, Gesamtpreis.',
    // The drop itself is the card's badge (C-083).
    meta: (city: string, night: string, now: string, was: string) =>
      `${city} · ${night} · ${now} statt ${was} am Vortag`,
    usual: (u: string) => `, sonst um ${u}`,
    weekend: ' (Wochenende, 2 Nächte)',
    more: (n: number) => ` · ${n === 1 ? '1 weitere Nacht' : `${n} weitere Nächte`} günstiger`,
    button: 'Alle Preisstürze ansehen',
    hint: 'Preise ändern sich oft mehrmals am Tag. Prüf den Preis auf der Buchungsseite, bevor du buchst.',
    why: 'Du bekommst diese E-Mail, weil du auf tidaq.com den Preissturz-Alarm bestellt hast. Höchstens eine am Tag.',
    manage: (u: string) => `Abbestellen oder Alarme ändern: ${u}`,
  },
  en: {
    subject: (pct: string, hotel: string, more: number) =>
      more === 0
        ? `Price drop: ${pct} at ${hotel}`
        : `Price drop: ${pct} at ${hotel} and ${more} more`,
    preheader: (where: string) => `New price drops at five-star hotels ${where}, as of today.`,
    heading: (where: string) => `New price drops ${where}`,
    eyebrow: 'Price drop alert',
    all: 'in all cities',
    in: (city: string) => `in ${city}`,
    hotels: 'at your hotels',
    andHotels: ' and at your hotels',
    intro:
      "These stays got much cheaper since yesterday, to the lowest price we've seen for them. 2 adults, cheapest reviewed site, total price.",
    meta: (city: string, night: string, now: string, was: string) =>
      `${city} · ${night} · ${now} instead of ${was} the day before`,
    usual: (u: string) => `, usually around ${u}`,
    weekend: ' (weekend, 2 nights)',
    more: (n: number) => ` · ${n === 1 ? '1 more night' : `${n} more nights`} cheaper`,
    button: 'See all price drops',
    hint: 'Prices often change several times a day. Check the price on the booking site before you book.',
    why: "You're getting this email because you set up the price drop alert on tidaq.com. At most one a day.",
    manage: (u: string) => `Unsubscribe or change alerts: ${u}`,
  },
} as const;

/** Subject and content of one Preissturz-Alarm email (rendered with `renderMail`). */
export function dropAlertMail(d: {
  locale: Locale;
  /** From `dropsFor`: non-empty, biggest first. */
  groups: readonly HotelDrops[];
  /** The subscriber's city name, or null for all cities. */
  cityName: string | null;
  /**
   * Followed hotels (C-080k): 'only' without the city alarm ("in deinen Hotels"), 'also' next to
   * a single city ("in Paris und deinen Hotels"). Leave it out for city alarms alone.
   */
  hotels?: 'only' | 'also';
  dropUrl: (hotelSlug: string, stay: { night: string; checkOut: string }) => string;
  radarUrl: string;
  manageUrl: string;
}): { subject: string; content: MailContent } {
  const t = TEXT[d.locale];
  const first = d.groups[0];
  if (!first) throw new Error('dropAlertMail needs at least one drop');
  const where =
    d.hotels === 'only'
      ? t.hotels
      : d.cityName
        ? t.in(d.cityName) + (d.hotels === 'also' ? t.andHotels : '')
        : t.all;
  return {
    subject: t.subject(formatDrop(first.top.drop, d.locale), first.hotel.name, d.groups.length - 1),
    content: {
      preheader: t.preheader(where),
      eyebrow: t.eyebrow,
      heading: t.heading(where),
      paragraphs: [t.intro],
      items: d.groups.map((g) => {
        const usual = usualCents(g.top);
        return {
          badge: formatDrop(g.top.drop, d.locale),
          title: g.hotel.name,
          meta:
            t.meta(
              g.city.name[d.locale],
              dropDates(g.top, d.locale) + (g.top.nights > 1 ? t.weekend : ''),
              formatPrice(g.top.nowCents, d.locale),
              formatPrice(g.top.prevCents, d.locale),
            ) +
            (usual !== null ? t.usual(formatPrice(usual, d.locale)) : '') +
            (g.more.length > 0 ? t.more(g.more.length) : ''),
          url: d.dropUrl(g.hotel.slug, g.top),
        };
      }),
      button: { label: t.button, url: d.radarUrl },
      footer: [t.hint, t.why, t.manage(d.manageUrl)],
    },
  };
}
