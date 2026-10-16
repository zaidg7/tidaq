import { addDays, daysBetween } from './dates';
import type { StayState } from './db';
import { formatDateRange, formatPercent, type Locale } from './format';
import type { MailContent } from './mailTemplate';
import { computeStayStats, type DailyPrice } from './stats';

/**
 * Price alerts (C-031, PLAN §9): when a watched stay's price is worth an email. Pure; the
 * collector feeds it each watch's series and its last alert.
 */
export const ALERT = {
  /** A new low must also be this much under the last alerted price (−2 %). */
  newLowStep: 0.02,
  /** A drop since the last alert of at least this much (−5 %). */
  dropStep: 0.05,
  /** A target alert repeats only when the price fell this much further. */
  targetStep: 0.02,
} as const;

export type AlertKind = 'target' | 'new_low' | 'drop' | 'near_low';

export interface AlertInput {
  /** Today's best price (latest day of the series), cents. */
  nowCents: number;
  /** Lowest best price on the days before today within the stats window, or null. */
  previousLowCents: number | null;
  /** Today's state (core `computeStayStats`), null while collecting. */
  state: StayState | null;
  /** Yesterday's state, null when unknown. */
  previousState: StayState | null;
  targetCents: number | null;
  lastAlertCents: number | null;
  /** UTC timestamp of the last alert email. */
  lastAlertAt: string | null;
  /** `YYYY-MM-DD` (Berlin). */
  today: string;
}

/**
 * The alert input of one watch from its daily series (stay checks or night sums): today's price
 * must be from today, otherwise there is nothing new to tell. States come from
 * `computeStayStats` for today and for yesterday (series without today).
 */
export function alertInputFromSeries(
  series: readonly DailyPrice[],
  today: string,
  checkIn: string,
  watch: Pick<AlertInput, 'targetCents' | 'lastAlertCents' | 'lastAlertAt'>,
): AlertInput | null {
  const valid = series.filter((p) => Number.isInteger(p.bestCents) && p.bestCents > 0);
  const latest = valid.find((p) => p.day === today);
  if (!latest) return null;
  const before = valid.filter((p) => p.day < today);
  const nowStats = computeStayStats(valid, today, checkIn);
  const prevStats = before.length ? computeStayStats(before, addDays(today, -1), checkIn) : null;
  const previousLowCents = before.length
    ? Math.min(...before.filter((p) => daysBetween(p.day, today) < 60).map((p) => p.bestCents))
    : null;
  return {
    nowCents: latest.bestCents,
    previousLowCents: Number.isFinite(previousLowCents) ? previousLowCents : null,
    state: nowStats.state === 'collecting' ? null : nowStats.state,
    previousState: prevStats && prevStats.state !== 'collecting' ? prevStats.state : null,
    today,
    ...watch,
  };
}

const berlinDay = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date(iso));

/**
 * The alert to send today, or null. At most one email per watch and day; the strongest reason
 * wins: target price, new low, drop since the last alert, then "near the low".
 */
export function alertKind(i: AlertInput): AlertKind | null {
  if (!Number.isInteger(i.nowCents) || i.nowCents <= 0) return null;
  if (i.lastAlertAt && daysBetween(berlinDay(i.lastAlertAt), i.today) < 1) return null;
  const last = i.lastAlertCents;
  const under = (step: number) => last === null || i.nowCents <= last * (1 - step);

  if (i.targetCents !== null && i.nowCents <= i.targetCents && under(ALERT.targetStep)) {
    return 'target';
  }
  if (i.previousLowCents !== null && i.nowCents < i.previousLowCents && under(ALERT.newLowStep)) {
    return 'new_low';
  }
  if (last !== null && i.nowCents <= last * (1 - ALERT.dropStep)) return 'drop';
  if (i.state === 'near_low' && i.previousState !== null && i.previousState !== 'near_low') {
    return 'near_low';
  }
  return null;
}

export interface AlertMailData {
  kind: AlertKind;
  locale: Locale;
  hotel: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  nowCents: number;
  targetCents: number | null;
  lastAlertCents: number | null;
  stayUrl: string;
  manageUrl: string;
  /**
   * The first offer of core `rankOffers` on today's prices (C-031b): listed total, the expected
   * checkout total when our tests show a markup, and the `/go/…` link. Null without offers.
   */
  offer?: AlertMailOffer | null;
}

export interface AlertMailOffer {
  name: string;
  isDirect: boolean;
  totalCents: number;
  expectedCents: number | null;
  /** Affiliate link: labelled as a partner link (CLAUDE.md rule 9). */
  partner: boolean;
  url: string;
}

const TEXT = {
  de: {
    subject: {
      target: (h: string) => `${h}: dein Wunschpreis ist erreicht`,
      new_low: (h: string) => `${h}: neuer Tiefpunkt`,
      drop: (h: string, p: string | null) =>
        p ? `${h}: Preis um ${p} gefallen` : `${h}: Preis gefallen`,
      near_low: (h: string) => `${h}: Preis nah am Tiefpunkt`,
    },
    heading: {
      target: 'Dein Wunschpreis ist erreicht',
      new_low: 'Neuer Tiefpunkt',
      drop: 'Der Preis ist gefallen',
      near_low: 'Der Preis ist nah am Tiefpunkt',
    },
    stay: (h: string, d: string, a: number) =>
      `${h}, ${d}, ${a} ${a === 1 ? 'Erwachsener' : 'Erwachsene'}`,
    now: (s: string) => `Dein Aufenthalt: ${s}.`,
    since: (p: string) =>
      `Seit unserer letzten E-Mail hat sich der Gesamtpreis auf der günstigsten geprüften Seite um ${p} verändert.`,
    amounts:
      'Den genauen Endpreis mit Steuern und Gebühren siehst du auf der Buchungsseite. Preise ändern sich oft mehrmals am Tag.',
    button: 'Preisverlauf ansehen',
    offer: (who: string) => `Am günstigsten heute: ${who}.`,
    offerExpected: (who: string, e: string) =>
      `Am günstigsten heute: ${who}. Nach unseren Tests liegt der Preis an der Kasse dort oft etwa ${e} höher.`,
    direct: 'direkt beim Hotel',
    linkTo: (who: string) => `Zu ${who}`,
    linkDirect: 'Zur Website des Hotels',
    partner: ' (Partnerlink)',
    eyebrow: 'Preisalarm',
    preheader: (h: string) => `${h}. Höchstens eine E-Mail pro Tag.`,
    why: 'Du bekommst diese E-Mail, weil du auf tidaq.com einen Preisalarm für diesen Aufenthalt bestätigt hast. Höchstens eine E-Mail pro Tag und Alarm.',
    manage: (u: string) => `Alarme ändern oder abbestellen: ${u}`,
  },
  en: {
    subject: {
      target: (h: string) => `${h}: your target price is reached`,
      new_low: (h: string) => `${h}: new low`,
      drop: (h: string, p: string | null) => (p ? `${h}: price down ${p}` : `${h}: price dropped`),
      near_low: (h: string) => `${h}: price near its low`,
    },
    heading: {
      target: 'Your target price is reached',
      new_low: 'New low',
      drop: 'The price dropped',
      near_low: 'The price is near its low',
    },
    stay: (h: string, d: string, a: number) => `${h}, ${d}, ${a} ${a === 1 ? 'adult' : 'adults'}`,
    now: (s: string) => `Your stay: ${s}.`,
    since: (p: string) =>
      `Since our last email the total on the cheapest reviewed site has changed by ${p}.`,
    amounts:
      'The exact final price with taxes and fees is on the booking site. Prices often change several times a day.',
    button: 'See the price history',
    offer: (who: string) => `Cheapest today: ${who}.`,
    offerExpected: (who: string, e: string) =>
      `Cheapest today: ${who}. Based on our tests the price at checkout there is often about ${e} higher.`,
    direct: 'directly with the hotel',
    linkTo: (who: string) => `Go to ${who}`,
    linkDirect: "Go to the hotel's website",
    partner: ' (partner link)',
    eyebrow: 'Price alert',
    preheader: (h: string) => `${h}. At most one email a day.`,
    why: "You're getting this email because you confirmed a price alert for this stay on tidaq.com. At most one email a day per alert.",
    manage: (u: string) => `Change or cancel alerts: ${u}`,
  },
} as const;

/**
 * Subject and content of an alert email (rendered with `renderMail`). No euro amounts: the
 * prices are base rates without taxes and fees (D-52, C-149), so changes are in percent.
 */
export function alertMail(d: AlertMailData): { subject: string; content: MailContent } {
  const t = TEXT[d.locale];
  const change = (from: number, to: number) =>
    from > 0
      ? formatPercent(Math.round((to / from - 1) * 100) / 100, d.locale, { signed: true })
      : null;
  const fell =
    d.lastAlertCents !== null && d.lastAlertCents > d.nowCents
      ? formatPercent(Math.round((1 - d.nowCents / d.lastAlertCents) * 100) / 100, d.locale)
      : null;
  const since = d.lastAlertCents !== null ? change(d.lastAlertCents, d.nowCents) : null;
  const stay = t.stay(d.hotel, formatDateRange(d.checkIn, d.checkOut, d.locale), d.adults);
  const o = d.offer ?? null;
  return {
    subject: d.kind === 'drop' ? t.subject.drop(d.hotel, fell) : t.subject[d.kind](d.hotel),
    content: {
      preheader: t.preheader(t.heading[d.kind]),
      eyebrow: t.eyebrow,
      heading: t.heading[d.kind],
      paragraphs: [
        t.now(stay),
        ...(since !== null ? [t.since(since)] : []),
        ...(o ? [offerLine(t, o, d.locale)] : []),
        t.amounts,
      ],
      button: { label: t.button, url: d.stayUrl },
      ...(o && {
        link: {
          label: (o.isDirect ? t.linkDirect : t.linkTo(o.name)) + (o.partner ? t.partner : ''),
          url: o.url,
        },
      }),
      footer: [t.why, t.manage(d.manageUrl)],
    },
  };
}

function offerLine(t: (typeof TEXT)[Locale], o: AlertMailOffer, locale: Locale): string {
  const who = o.isDirect ? t.direct : o.name;
  const markup =
    o.expectedCents !== null && o.totalCents > 0 && o.expectedCents > o.totalCents
      ? formatPercent(Math.round((o.expectedCents / o.totalCents - 1) * 100) / 100, locale)
      : null;
  return markup === null ? t.offer(who) : t.offerExpected(who, markup);
}
