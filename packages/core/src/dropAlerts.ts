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

/**
 * The drops one subscriber gets: only those seen since `since` (epoch ms; the send runs daily, so
 * "the last 24 hours" mails every drop once, also those the night grid found after yesterday's
 * send), in their city (null = all), one entry per hotel, biggest first, at most
 * `DROP_ALERTS.maxHotels`.
 */
export function dropsFor<T extends HotelDrops>(
  groups: readonly T[],
  city: string | null,
  since: number,
): T[] {
  const out: T[] = [];
  for (const g of groups) {
    if (city && g.city.slug !== city) continue;
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
    all: 'in allen Städten',
    in: (city: string) => `in ${city}`,
    intro:
      'Diese Aufenthalte sind seit gestern deutlich billiger geworden, auf den niedrigsten Preis, den wir für sie gesehen haben. 2 Erwachsene, günstigste geprüfte Seite, Gesamtpreis.',
    meta: (city: string, night: string, now: string, was: string, pct: string) =>
      `${city} · ${night} · ${now} statt ${was} am Vortag (${pct})`,
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
    all: 'in all cities',
    in: (city: string) => `in ${city}`,
    intro:
      "These stays got much cheaper since yesterday, to the lowest price we've seen for them. 2 adults, cheapest reviewed site, total price.",
    meta: (city: string, night: string, now: string, was: string, pct: string) =>
      `${city} · ${night} · ${now} instead of ${was} the day before (${pct})`,
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
  dropUrl: (hotelSlug: string, stay: { night: string; checkOut: string }) => string;
  radarUrl: string;
  manageUrl: string;
}): { subject: string; content: MailContent } {
  const t = TEXT[d.locale];
  const first = d.groups[0];
  if (!first) throw new Error('dropAlertMail needs at least one drop');
  const where = d.cityName ? t.in(d.cityName) : t.all;
  return {
    subject: t.subject(formatDrop(first.top.drop, d.locale), first.hotel.name, d.groups.length - 1),
    content: {
      preheader: t.preheader(where),
      heading: t.heading(where),
      paragraphs: [t.intro],
      items: d.groups.map((g) => {
        const usual = usualCents(g.top);
        return {
          title: `${formatDrop(g.top.drop, d.locale)} · ${g.hotel.name}`,
          meta:
            t.meta(
              g.city.name[d.locale],
              dropDates(g.top, d.locale) + (g.top.nights > 1 ? t.weekend : ''),
              formatPrice(g.top.nowCents, d.locale),
              formatPrice(g.top.prevCents, d.locale),
              formatDrop(g.top.drop, d.locale),
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
