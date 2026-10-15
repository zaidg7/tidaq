import { formatDrop, usualCents, type HotelDrops, type PriceDrop } from './drops';
import { formatPrice, formatWeekdayDayMonth, updatedAtParts } from './format';

/**
 * Ready-to-post German captions for the creator kit (C-080c, /admin/preisstuerze): one per drop
 * and one for the day's top list. Facts only (CLAUDE.md rule 8): both prices, the site, the night,
 * when we saw it, and the reminder to check before booking. No urgency words (rule 9).
 */

export const CAPTION = {
  url: 'tidaq.com/preissturz',
  /** Always added; the city tag comes first. */
  tags: ['luxushotel', 'fünfsterne', 'hoteldeal', 'preissturz', 'reisen'],
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

const site = (d: PriceDrop) => (d.provider.direct ? 'direkt beim Hotel' : `bei ${d.provider.name}`);

/** Caption for one drop's story or post. */
export function dropCaption(g: HotelDrops, d: PriceDrop): string {
  const low =
    d.priorDays >= 2
      ? `Niedrigster Preis seit ${d.priorDays + 1} Tagen.`
      : 'Niedrigster Preis, seit wir messen.';
  const usual = usualCents(d);
  return [
    `Preissturz im ${g.hotel.name}, ${g.city.name.de} 📉`,
    `Nacht vom ${formatWeekdayDayMonth(d.night, 'de')}: ${formatPrice(d.nowCents, 'de')} statt ${formatPrice(d.prevCents, 'de')} am Vortag (${formatDrop(d.drop, 'de')}) ${site(d)}.`,
    usual !== null ? `Sonst um ${formatPrice(usual, 'de')}. ${low}` : low,
    `Stand: ${seenText(d.seenAt)}. Preise ändern sich oft, prüf sie vor dem Buchen.`,
    `Alle Preisstürze mit Preisverlauf: ${CAPTION.url}`,
    '',
    dropHashtags(g.city.name.de),
  ].join('\n');
}

/** Caption for the day's top list (carousel or slideshow), biggest drop first. */
export function topCaption(groups: readonly HotelDrops[]): string {
  const top = groups.slice(0, CAPTION.topSize);
  const first = top[0];
  if (!first) return '';
  const seen = top.reduce((max, g) => (g.top.seenAt > max ? g.top.seenAt : max), first.top.seenAt);
  const lines = top.map(
    (g, i) =>
      `${i + 1}. ${g.hotel.name}, ${g.city.name.de}: ${formatPrice(g.top.nowCents, 'de')} statt ${formatPrice(g.top.prevCents, 'de')} (${formatDrop(g.top.drop, 'de')}), Nacht vom ${formatWeekdayDayMonth(g.top.night, 'de')}`,
  );
  const cities = [...new Set(top.map((g) => cityTag(g.city.name.de)))];
  return [
    `${top.length === 1 ? 'Der größte Preissturz' : `Die ${top.length} größten Preisstürze`} in Luxushotels seit gestern (Stand: ${seenText(seen)}):`,
    ...lines,
    '',
    `Preise ändern sich oft, prüf sie vor dem Buchen. Alle mit Preisverlauf: ${CAPTION.url}`,
    '',
    [...cities, ...CAPTION.tags.map((t) => `#${t}`)].join(' '),
  ].join('\n');
}
