import { addDays, daysBetween } from './dates';
import type { StayState } from './db';
import { formatDateRange, formatPrice, type Locale } from './format';
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
      target: (h: string, p: string) => `${h}: jetzt ${p}, dein Wunschpreis ist erreicht`,
      new_low: (h: string, p: string) => `${h}: neuer Tiefpunkt, ${p}`,
      drop: (h: string, p: string) => `${h}: Preis gefallen, jetzt ${p}`,
      near_low: (h: string, p: string) => `${h}: ${p}, nah am Tiefpunkt`,
    },
    heading: {
      target: 'Dein Wunschpreis ist erreicht',
      new_low: 'Neuer Tiefpunkt',
      drop: 'Der Preis ist gefallen',
      near_low: 'Der Preis ist nah am Tiefpunkt',
    },
    stay: (h: string, d: string, a: number) =>
      `${h}, ${d}, ${a} ${a === 1 ? 'Erwachsener' : 'Erwachsene'}`,
    now: (s: string, p: string) =>
      `${s} kostet heute ${p} (Gesamtpreis, günstigste geprüfte Seite).`,
    target: (p: string) => `Dein Wunschpreis: ${p}.`,
    since: (p: string) => `Bei unserer letzten E-Mail waren es ${p}.`,
    hint: 'Preise ändern sich oft mehrmals am Tag. Prüf den Preis auf der Buchungsseite, bevor du buchst.',
    button: 'Preisverlauf ansehen',
    offer: (who: string, p: string) => `Am günstigsten heute: ${who}, ${p}.`,
    offerExpected: (who: string, p: string, e: string) =>
      `Am günstigsten heute: ${who}, ${p} angezeigt. An der Kasse erwarten wir nach unseren Tests etwa ${e}.`,
    direct: 'direkt beim Hotel',
    linkTo: (who: string) => `Zu ${who}`,
    linkDirect: 'Zur Website des Hotels',
    partner: ' (Partnerlink)',
    eyebrow: 'Preisalarm',
    preheader: (p: string) => `Jetzt ${p}. Höchstens eine E-Mail pro Tag.`,
    why: 'Du bekommst diese E-Mail, weil du auf tidaq.com einen Preisalarm für diesen Aufenthalt bestätigt hast. Höchstens eine E-Mail pro Tag und Alarm.',
    manage: (u: string) => `Alarme ändern oder abbestellen: ${u}`,
  },
  en: {
    subject: {
      target: (h: string, p: string) => `${h}: now ${p}, your target price is reached`,
      new_low: (h: string, p: string) => `${h}: new low, ${p}`,
      drop: (h: string, p: string) => `${h}: price dropped, now ${p}`,
      near_low: (h: string, p: string) => `${h}: ${p}, near the low`,
    },
    heading: {
      target: 'Your target price is reached',
      new_low: 'New low',
      drop: 'The price dropped',
      near_low: 'The price is near its low',
    },
    stay: (h: string, d: string, a: number) => `${h}, ${d}, ${a} ${a === 1 ? 'adult' : 'adults'}`,
    now: (s: string, p: string) => `${s} costs ${p} today (total, cheapest reviewed site).`,
    target: (p: string) => `Your target price: ${p}.`,
    since: (p: string) => `In our last email it was ${p}.`,
    hint: 'Prices often change several times a day. Check the price on the booking site before you book.',
    button: 'See the price history',
    offer: (who: string, p: string) => `Cheapest today: ${who}, ${p}.`,
    offerExpected: (who: string, p: string, e: string) =>
      `Cheapest today: ${who}, ${p} listed. Based on our tests we expect about ${e} at checkout.`,
    direct: 'directly with the hotel',
    linkTo: (who: string) => `Go to ${who}`,
    linkDirect: "Go to the hotel's website",
    partner: ' (partner link)',
    eyebrow: 'Price alert',
    preheader: (p: string) => `Now ${p}. At most one email a day.`,
    why: "You're getting this email because you confirmed a price alert for this stay on tidaq.com. At most one email a day per alert.",
    manage: (u: string) => `Change or cancel alerts: ${u}`,
  },
} as const;

/** Subject and content of an alert email (rendered with `renderMail`). */
export function alertMail(d: AlertMailData): { subject: string; content: MailContent } {
  const t = TEXT[d.locale];
  const price = (c: number) => formatPrice(c, d.locale);
  const now = price(d.nowCents);
  const stay = t.stay(d.hotel, formatDateRange(d.checkIn, d.checkOut, d.locale), d.adults);
  const o = d.offer ?? null;
  return {
    subject: t.subject[d.kind](d.hotel, now),
    content: {
      preheader: t.preheader(now),
      eyebrow: t.eyebrow,
      heading: t.heading[d.kind],
      paragraphs: [
        t.now(stay, now),
        ...(d.targetCents !== null ? [t.target(price(d.targetCents))] : []),
        ...(d.lastAlertCents !== null ? [t.since(price(d.lastAlertCents))] : []),
        ...(o ? [offerLine(t, o, price)] : []),
        t.hint,
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

function offerLine(
  t: (typeof TEXT)[Locale],
  o: AlertMailOffer,
  price: (c: number) => string,
): string {
  const who = o.isDirect ? t.direct : o.name;
  return o.expectedCents === null
    ? t.offer(who, price(o.totalCents))
    : t.offerExpected(who, price(o.totalCents), price(o.expectedCents));
}
