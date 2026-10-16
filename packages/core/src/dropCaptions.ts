import { dropDates, formatDrop, type HotelDrops, type PriceDrop } from './drops';
import { formatPrice, updatedAtParts } from './format';

/**
 * Ready-to-post German captions for the creator kit (C-080c, /admin/preisstuerze): one per drop
 * and one for the day's top list. Facts only (CLAUDE.md rule 8): both prices, the site, the night,
 * when we saw it, and the reminder to check before booking. No urgency words (rule 9).
 */

export const CAPTION = {
  url: 'tidaq.com/price-drops',
  /** Always added; the city tag comes first. */
  tags: ['luxushotel', 'fünfsterne', 'hoteldeal', 'pricedrop', 'reisen'],
  topSize: 5,
} as const;

/** `#zürich`, `#newyork`, `#abudhabi`: letters and digits only, lower case. */
export function cityTag(city: string): string {
  return `#${city.toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]/gu, '')}`;
}

export function dropHashtags(city: string): string {
  return [cityTag(city), ...CAPTION.tags.map((t) => `#${t}`)].join(' ');
}

/** "15. Okt., 08:12" in German time. */
function seenText(seenAt: string): string {
  const p = updatedAtParts(seenAt, new Date(seenAt), 'de');
  return `${p.date}, ${p.time}`;
}

/** "5 Nächte, Di, 3. Nov. – So, 8. Nov." (C-125), "Wochenende …" or "Nacht vom …" (C-080f). */
const when = (d: PriceDrop) =>
  d.nights > 2
    ? `${d.nights} Nächte, ${dropDates(d, 'de')}`
    : d.nights > 1
      ? `Wochenende ${dropDates(d, 'de')}`
      : `Nacht vom ${dropDates(d, 'de')}`;

const site = (d: PriceDrop) => (d.provider.direct ? 'direkt beim Hotel' : `bei ${d.provider.name}`);

/** Caption for one drop's story or post. */
export function dropCaption(g: HotelDrops, d: PriceDrop): string {
  const low =
    d.priorDays >= 2
      ? `Niedrigster Preis seit ${d.priorDays + 1} Tagen.`
      : 'Niedrigster Preis, seit wir messen.';
  // Exact quotes only (D-52): nightly as the site shows it and the stay total, taxes included.
  return [
    `Price Drop im ${g.hotel.name}, ${g.city.name.de} 📉`,
    `${when(d)}: ${formatPrice(d.nightlyCents, 'de')} pro Nacht ${site(d)}, ${formatPrice(d.nowCents, 'de')} für ${d.nights === 1 ? '1 Nacht' : `${d.nights} Nächte`} inkl. Steuern und Gebühren (${formatDrop(d.drop, 'de')} seit gestern).`,
    low,
    `Stand: ${seenText(d.seenAt)}. Preise ändern sich oft, prüf sie vor dem Buchen.`,
    `Alle Price Drops mit Preisverlauf: ${CAPTION.url}`,
    '',
    dropHashtags(g.city.name.de),
  ].join('\n');
}

/**
 * Caption for a top list (carousel or slideshow), biggest drop first: today's ("seit gestern")
 * or the week's (C-080h, "diese Woche").
 */
export function topCaption(groups: readonly HotelDrops[], period: 'day' | 'week' = 'day'): string {
  const top = groups.slice(0, CAPTION.topSize);
  const first = top[0];
  if (!first) return '';
  const seen = top.reduce((max, g) => (g.top.seenAt > max ? g.top.seenAt : max), first.top.seenAt);
  const lines = top.map(
    (g, i) =>
      `${i + 1}. ${g.hotel.name}, ${g.city.name.de}: ${formatPrice(g.top.nightlyCents, 'de')} pro Nacht (${formatDrop(g.top.drop, 'de')} seit gestern), ${when(g.top)}`,
  );
  const cities = [...new Set(top.map((g) => cityTag(g.city.name.de)))];
  return [
    `${top.length === 1 ? 'Der größte Price Drop' : `Die ${top.length} größten Price Drops`} in Luxushotels ${period === 'week' ? 'diese Woche' : 'seit gestern'} (Stand: ${seenText(seen)}):`,
    ...lines,
    '',
    `Preise ändern sich oft, prüf sie vor dem Buchen. Alle mit Preisverlauf: ${CAPTION.url}`,
    '',
    [...cities, ...CAPTION.tags.map((t) => `#${t}`)].join(' '),
  ].join('\n');
}
