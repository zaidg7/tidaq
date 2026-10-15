import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Check, TrendingDown } from 'lucide-react';
import {
  distinctTrips,
  daysBetween,
  dropDates,
  dropKey,
  dropPath,
  formatDateRange,
  formatDayMonth,
  formatPrice,
  formatWeekdayDayMonth,
  goPath,
  localizedPath,
  percentileOf,
  stayPath,
  updatedAtParts,
  usualCents,
  type DailyPrice,
  type Locale,
  type PriceDrop,
} from '@tidaq/core';
import { SectionHead } from '@/components/home/SectionHead';
import { PhotoSheet } from '@/components/shell/PhotoSheet';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Meter } from '@/components/ui/Meter';
import { cn } from '@/lib/cn';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { cardPhoto } from '@/lib/photos';
import { routes } from '@/lib/routes';
import { DropBadge, dropTextClass } from './DropBadge';
import { dropPercent } from './DropCard';
import { DropShare } from './DropShare';
import { DropAlertSection } from './DropAlertSection';
import { HotelAlertBox } from './HotelAlertBox';
import { DropStoryChart, storyStart } from './DropStoryChart';
import { DropTile } from './DropTile';
import { dropsHref } from './DropsTeaser';
import type { StoryText } from './storyImage';

/** Everything the page, its metadata and the share texts say about one drop. */
export async function dropFacts(g: HotelDropsWithPhoto, d: PriceDrop, locale: Locale, now: Date) {
  const t = await getTranslations({ locale, namespace: 'drop' });
  const td = await getTranslations({ locale, namespace: 'drops' });
  const pct = dropPercent(d.drop, locale);
  const date = dropDates(d, locale);
  // Trips (C-125) and old weekend links: the total for all nights.
  const trip = d.nights > 1;
  const nowP = formatPrice(d.nowCents, locale);
  const was = formatPrice(d.prevCents, locale);
  const site = d.provider.direct ? t('atDirect') : t('atSite', { provider: d.provider.name });
  const usual = usualCents(d);
  const newLow = d.priorDays >= 2 ? td('newLow', { days: d.priorDays + 1 }) : td('firstLow');
  const low =
    usual !== null ? `${td('usual', { price: formatPrice(usual, locale) })} · ${newLow}` : newLow;
  const seen = updatedAtParts(d.seenAt, now, locale);
  const saved = d.provider.direct
    ? td('savedDirect', { amount: formatPrice(d.savedCents, locale) })
    : td('saved', { amount: formatPrice(d.savedCents, locale), provider: d.provider.name });
  const vars = {
    hotel: g.hotel.name,
    city: g.city.name[locale],
    date,
    pct,
    now: nowP,
    was,
    n: d.nights,
  };
  const story: StoryText = {
    pct,
    hotel: g.hotel.name,
    place: `${g.city.name[locale]} · ${date}`,
    now: nowP,
    was: td('was', { price: was }),
    saved,
    // One short line on the image: the new low only.
    low: newLow,
    asOf: t('storyAsOf', { date: seen.date, time: seen.time, stay: td('stay', { n: d.nights }) }),
    url: t('storyUrl'),
  };
  return {
    pct,
    date,
    trip,
    site,
    low,
    seen,
    saved,
    story,
    title: t('metaTitle', vars),
    description: t(trip ? 'metaDescriptionTrip' : 'metaDescription', { ...vars, site, low }),
    shareText: t(trip ? 'shareTextTrip' : 'shareText', vars),
  };
}

/** The stay page of a drop's trip (2 adults, like the night grid). */
const stayHref = (slug: string, s: { night: string; checkOut: string }, locale: Locale) =>
  localizedPath(stayPath(slug, s.night, s.checkOut, 2), locale);

/** Today's place among the night's prices (0 = lowest seen), plus the range, for the meter. */
function meterFacts(series: readonly DailyPrice[], d: PriceDrop, today: string) {
  const values = series.filter((p) => p.day < today).map((p) => p.bestCents);
  values.push(d.nowCents);
  const percentile = percentileOf(d.nowCents, values);
  if (percentile === null) return null;
  return {
    percentile,
    low: Math.min(...values),
    high: Math.max(...values),
    since: series[0]?.day ?? today,
  };
}

/**
 * `/price-drops/[hotel]/[night]` (C-080b, mockup B drop page; a 5- or 7-night trip, C-125): the
 * hotel's photo, a sheet sliding over it with the hotel, the stay as chips and the drop card
 * (huge "−54 %", both prices, the new low), the way to the site, then how the price moved, where
 * today sits (meter and one sentence), the hotel's other drops, a Price Alert for this hotel and
 * today's other drops. Phones read it top to bottom; from 768 px the drop card and its button
 * stay on the right while the story scrolls on the left.
 */
export async function DropPage({
  group: g,
  drop: d,
  series,
  others,
  offer = null,
  credit = null,
  locale,
  today,
  now,
}: {
  group: HotelDropsWithPhoto;
  drop: PriceDrop;
  series: DailyPrice[];
  others: HotelDropsWithPhoto[];
  /** The drop's site, when we can link to it (C-080g). */
  offer?: { partner: boolean } | null;
  /** Photo credit for the hotel's own photo. */
  credit?: { text: string; href: string | null } | null;
  locale: Locale;
  today: string;
  now: Date;
}) {
  const t = await getTranslations({ locale, namespace: 'drop' });
  const td = await getTranslations({ locale, namespace: 'drops' });
  const tp = await getTranslations({ locale, namespace: 'photo' });
  const f = await dropFacts(g, d, locale, now);
  const price = (c: number) => formatPrice(c, locale);
  const when =
    f.seen.day === 'today'
      ? td('today', { time: f.seen.time })
      : f.seen.day === 'yesterday'
        ? td('yesterday', { time: f.seen.time })
        : `${f.seen.date}, ${f.seen.time}`;
  // Other dates for this hotel, not the same holiday a day later (C-125).
  const nights = distinctTrips(
    d,
    [g.top, ...g.more].filter((n) => dropKey(n) !== dropKey(d)),
    6,
  );
  const pic = cardPhoto(g.hotel.slug, g.city.slug);
  const usual = usualCents(d);
  const saved = (usual ?? d.prevCents) - d.nowCents;
  const m = meterFacts(series, d, today);
  const newLow = d.priorDays >= 2 ? td('newLow', { days: d.priorDays + 1 }) : td('firstLow');
  const b = (c: ReactNode) => <strong className="font-semibold text-ink">{c}</strong>;
  const sale = dropTextClass(d.drop);
  const green = (c: ReactNode) => <strong className={cn('font-semibold', sale)}>{c}</strong>;
  const offerLabel = d.provider.direct
    ? t('ctaGoDirect')
    : t('ctaGo', { provider: d.provider.name });

  return (
    <>
      <PhotoSheet
        photo={pic?.photo ?? null}
        alt={g.hotel.name}
        tag={
          pic?.city ? (
            tp('cityTag')
          ) : credit ? (
            credit.href ? (
              <a href={credit.href} rel="noopener" className="underline-offset-2 hover:underline">
                {t('photoCredit')}: {credit.text}
              </a>
            ) : (
              `${t('photoCredit')}: ${credit.text}`
            )
          ) : undefined
        }
      >
        <div
          className={cn(
            'mx-auto grid max-w-[1240px] gap-y-0 px-[18px] pt-[26px] md:gap-x-12 md:px-10 md:pt-10 lg:gap-x-16',
            "[grid-template-areas:'head'_'card'_'chart'_'meter'_'more'_'alert'_'foot']",
            "md:grid-cols-[minmax(0,1fr)_380px] md:[grid-template-areas:'head_card'_'chart_card'_'meter_card'_'more_card'_'alert_card'_'foot_card'] lg:grid-cols-[minmax(0,1fr)_420px]",
          )}
        >
          <header className="[grid-area:head]">
            <p className="text-[14px] text-muted md:text-[15px]">
              <a
                href={dropsHref(locale, g.city.slug)}
                className="underline-offset-2 hover:text-ink hover:underline"
              >
                {g.city.name[locale]}
              </a>{' '}
              · {t('fiveStars')}
            </p>
            <h1 className="mt-1 text-[30px] leading-[1.12] font-semibold tracking-[-0.03em] md:text-[44px] md:leading-[1.06]">
              {g.hotel.name}
            </h1>
            <ul className="mt-3.5 flex flex-wrap gap-2">
              {[
                d.nights > 1 ? formatDateRange(d.night, d.checkOut, locale) : f.date,
                t('chipNights', { n: d.nights }),
                t('chipAdults'),
              ].map((c) => (
                <li
                  key={c}
                  className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[14px] font-medium"
                >
                  {c}
                </li>
              ))}
            </ul>
          </header>

          <div className="mt-[22px] self-start [grid-area:card] md:sticky md:top-24 md:mt-0">
            <section
              aria-label={td('dropLabel', { pct: f.pct })}
              className="rounded-[26px] border border-[#ece9f1] bg-surface px-[22px] py-6 shadow-[0_16px_40px_rgba(21,19,28,0.06)] md:px-7 md:py-7"
            >
              <span
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-full bg-sale-soft px-3 text-[14px] font-bold',
                  sale,
                )}
              >
                <Icon icon={TrendingDown} size={14} />
                {t('chipSince')}
              </span>
              <p
                className={cn(
                  'mt-3.5 text-[76px] leading-[0.95] font-bold tracking-[-0.05em] tabular-nums',
                  sale,
                )}
              >
                {f.pct}
              </p>
              <p className="mt-3.5 text-[16px] text-muted">
                <strong className="text-[32px] font-bold tracking-[-0.03em] text-ink tabular-nums">
                  {price(d.nowCents)}
                </strong>{' '}
                {t('insteadYesterday', { price: price(d.prevCents) })}
              </p>
              <p className="mt-4 flex items-start gap-2.5 border-t border-[#ece9f1] pt-4 text-[15px]">
                <Icon icon={Check} size={20} className={cn('mt-0.5 shrink-0', sale)} />
                <span>
                  {newLow}.
                  <span className="mt-0.5 block text-[13.5px] text-muted">
                    {t('seenShort', { when, site: f.site })}
                  </span>
                </span>
              </p>
            </section>

            {offer ? (
              // The site that had this price (C-080g): straight there, in a new tab.
              <a
                href={goPath(
                  d.provider.slug,
                  g.hotel.slug,
                  { checkIn: d.night, checkOut: d.checkOut, adults: 2 },
                  locale,
                )}
                target="_blank"
                rel="sponsored nofollow noopener"
                aria-label={t('newTab', { label: `${offerLabel} · ${price(d.nowCents)}` })}
                className="mt-4 flex min-h-[60px] items-center justify-between gap-3 rounded-[18px] bg-accent px-[22px] text-[17px] font-semibold text-white transition-colors duration-[var(--t-fast)] hover:bg-accent-hover"
              >
                <span>{offerLabel}</span>
                <span className="tabular-nums">
                  {price(d.nowCents)} <span aria-hidden="true">→</span>
                </span>
              </a>
            ) : (
              <a
                href={stayHref(g.hotel.slug, d, locale)}
                className="mt-4 flex min-h-[60px] items-center justify-between gap-3 rounded-[18px] bg-accent px-[22px] text-[17px] font-semibold text-white transition-colors duration-[var(--t-fast)] hover:bg-accent-hover"
              >
                <span>{t('stayLink')}</span>
                <span aria-hidden="true">→</span>
              </a>
            )}
            <p className="mt-2 text-center text-[13px] text-muted">
              {offer?.partner ? (
                <>
                  {t('partnerCheck')}{' '}
                  <a
                    href={localizedPath(routes.affiliate, locale)}
                    className="font-semibold text-ink underline-offset-2 hover:underline"
                  >
                    {t('partnerMore')}
                  </a>
                </>
              ) : (
                t('checkNote')
              )}
            </p>
            {offer && (
              <p className="mt-3 text-center">
                <a
                  href={stayHref(g.hotel.slug, d, locale)}
                  className="inline-flex min-h-11 items-center text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {t('stayLink')}
                </a>
              </p>
            )}
            <div className="mt-3 flex justify-center">
              <DropShare
                path={localizedPath(dropPath(g.hotel.slug, d), locale)}
                title={f.title}
                text={f.shareText}
                labels={{
                  shareLink: t('shareLink'),
                  linkCopied: t('linkCopied'),
                  shareFailed: t('shareFailed'),
                  close: t('close'),
                }}
              />
            </div>
          </div>

          {series.length >= 2 && (
            <section aria-labelledby="drop-history" className="mt-10 [grid-area:chart] md:mt-12">
              <h2
                id="drop-history"
                className="text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]"
              >
                {t('chartTitle')}
              </h2>
              <p className="mt-1 mb-4 text-[15px] text-muted">
                {f.trip ? t('chartLeadTrip', { n: d.nights }) : t('chartLead')}
              </p>
              <DropStoryChart
                series={series}
                today={today}
                locale={locale}
                labels={{
                  start: storyStart(usual, d.prevCents, locale, (k, v) => t(k, v)),
                  today: t('chartToday', { price: price(d.nowCents) }),
                  axisToday: t('chartAxisToday'),
                  label: t('chartLabel', {
                    from: formatDayMonth(series[0]?.day ?? today, locale),
                    first: price(series[0]?.bestCents ?? d.prevCents),
                    now: price(d.nowCents),
                  }),
                }}
              />
            </section>
          )}

          <section aria-labelledby="drop-meter" className="mt-9 [grid-area:meter] md:mt-12">
            <h2
              id="drop-meter"
              className="mb-4 text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]"
            >
              {t('meterTitle')}
            </h2>
            {m && (
              <Meter
                percentile={m.percentile}
                lowCents={m.low}
                highCents={m.high}
                nowCents={d.nowCents}
                since={formatDayMonth(m.since, locale)}
                size="lg"
              />
            )}
            <p className="mt-3.5 text-[15px] text-muted md:text-[16px]">
              {usual !== null
                ? t.rich(f.trip ? 'meterUsualTrip' : 'meterUsual', {
                    n: d.nights,
                    usual: price(usual),
                    saved: price(saved),
                    b,
                    g: green,
                  })
                : t.rich(f.trip ? 'meterYesterdayTrip' : 'meterYesterday', {
                    n: d.nights,
                    was: price(d.prevCents),
                    saved: price(saved),
                    b,
                    g: green,
                  })}
            </p>
          </section>

          {nights.length > 0 && (
            <section aria-labelledby="drop-nights" className="mt-9 [grid-area:more] md:mt-12">
              <h2
                id="drop-nights"
                className="mb-3 text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]"
              >
                {t('moreHere')}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {nights.slice(0, 6).map((n) => (
                  <li key={dropKey(n)}>
                    <a
                      href={localizedPath(dropPath(g.hotel.slug, n), locale)}
                      className="flex min-h-16 items-center justify-between gap-3 rounded-[18px] border border-[#ece9f1] bg-surface px-[18px] py-3 transition-[border-color,box-shadow] duration-[var(--t-base)] hover:border-line-strong hover:shadow-1"
                    >
                      <span>
                        <span className="block font-semibold">
                          {n.nights > 1
                            ? formatDateRange(n.night, n.checkOut, locale)
                            : formatWeekdayDayMonth(n.night, locale)}
                        </span>
                        <span className="text-[14px] text-muted">
                          {t('chipNights', { n: n.nights })} · {price(n.nowCents)}
                        </span>
                      </span>
                      <DropBadge
                        drop={n.drop}
                        locale={locale}
                        label={td('dropLabel', { pct: dropPercent(n.drop, locale) })}
                        size="sm"
                        className="drop-badge-outline"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <HotelAlertBox
            locale={locale}
            hotel={{ slug: g.hotel.slug, name: g.hotel.name }}
            citySlug={g.city.slug}
            className="mt-9 [grid-area:alert] md:mt-12 md:block md:px-8 md:py-8"
          />

          <p className="mt-6 px-0.5 text-[13px] text-muted [grid-area:foot]">
            {t('foot')}{' '}
            <a
              href={localizedPath(routes.method, locale)}
              className="text-ink underline underline-offset-2"
            >
              {t('method')}
            </a>
          </p>
        </div>

        {others.length > 0 && (
          <section
            aria-labelledby="drop-others"
            className="mx-auto mt-14 max-w-[1240px] px-3.5 md:mt-24 md:px-10"
          >
            <SectionHead
              id="drop-others"
              title={t('othersTitleNew')}
              link={{
                href: dropsHref(locale),
                long: t('othersAll'),
                short: t('othersAll'),
              }}
            />
            <ul className="grid grid-cols-2 gap-x-3 gap-y-[22px] md:grid-cols-4 md:gap-7">
              {others.slice(0, 4).map((o) => (
                <li key={o.hotel.slug}>
                  <DropTile group={o} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="h-16 md:h-24" />
      </PhotoSheet>
    </>
  );
}

/**
 * A shared link whose drop is gone (price back up, or the stay started): say so, show the way on.
 */
export async function DropOver({
  hotel,
  stay,
  locale,
  today,
}: {
  hotel: { slug: string; name: string; city?: { slug: string; name: { de: string; en: string } } };
  /** The stay of the link. */
  stay: { night: string; checkOut: string };
  locale: Locale;
  today: string;
}) {
  const t = await getTranslations({ locale, namespace: 'drop' });
  const upcoming = stay.night > today;
  return (
    <>
      <StatusPage
        eyebrow={t('overEyebrow')}
        title={t('overTitle')}
        text={t(dropKey(stay) === stay.night ? 'overText' : 'overTextTrip', {
          date: dropDates(stay, locale),
          hotel: hotel.name,
          n: daysBetween(stay.night, stay.checkOut),
        })}
      >
        <div className="flex flex-wrap justify-center gap-3">
          {upcoming && (
            <a href={stayHref(hotel.slug, stay, locale)} className={buttonClasses({ size: 'lg' })}>
              {t('overStay')}
            </a>
          )}
          <a
            href={localizedPath(routes.drops, locale)}
            className={buttonClasses({ size: 'lg', variant: upcoming ? 'ghost' : 'primary' })}
          >
            {t('overAll')}
          </a>
        </div>
      </StatusPage>
      {/* Missed this one: the alert catches the next. */}
      <div className="mx-auto w-full max-w-[1080px] px-5 pb-16 md:px-7 lg:pb-[88px]">
        <DropAlertSection
          locale={locale}
          defaultCity={hotel.city ? { slug: hotel.city.slug, name: hotel.city.name[locale] } : null}
          hotel={{ slug: hotel.slug, name: hotel.name }}
        />
      </div>
    </>
  );
}
