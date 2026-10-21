import { getTranslations } from 'next-intl/server';
import { Check, TrendingDown } from 'lucide-react';
import {
  addDays,
  daysBetween,
  dropDates,
  dropKey,
  dropPath,
  formatDateRange,
  formatPrice,
  goPath,
  localizedPath,
  stayPath,
  updatedAtParts,
  type DailyPrice,
  type Locale,
  type PriceDrop,
} from '@tidaq/core';
import { PriceChart } from '@/components/chart/PriceChart';
import { SectionHead } from '@/components/home/SectionHead';
import { PhotoSheet } from '@/components/shell/PhotoSheet';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { cardPhoto } from '@/lib/photos';
import { routes } from '@/lib/routes';
import { dropTextClass } from './DropBadge';
import { dropPercent } from './DropCard';
import { DropShare } from './DropShare';
import { DropAlertSection } from './DropAlertSection';
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
  const site = d.provider.direct ? t('atDirect') : t('atSite', { provider: d.provider.name });
  const newLow = d.priorDays >= 2 ? td('newLow', { days: d.priorDays + 1 }) : td('firstLow');
  // Base-rate amounts (yesterday, usual) are never shown (D-52): the low is a fact, no amount.
  const low = newLow;
  const seen = updatedAtParts(d.seenAt, now, locale);
  const saved = d.provider.direct
    ? td('sinceDirect', { pct })
    : td('sinceAt', { pct, provider: d.provider.name });
  const vars = {
    hotel: g.hotel.name,
    city: g.city.name[locale],
    date,
    pct,
    now: nowP,
    n: d.nights,
  };
  const story: StoryText = {
    pct,
    hotel: g.hotel.name,
    place: `${g.city.name[locale]} · ${date}`,
    // Exact quote only (D-52): the nightly price big, the stay total under it.
    now: formatPrice(d.nightlyCents, locale),
    was: `${td('perNight', { price: '' }).trim()} · ${td('totalFor', { price: nowP, n: d.nights })}`,
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

/** Days on the drop page's chart (C-175). */
const DROP_CHART_DAYS = 30;

/** The stay page of a drop's trip (2 adults, like the night grid). */
const stayHref = (slug: string, s: { night: string; checkOut: string }, locale: Locale) =>
  localizedPath(stayPath(slug, s.night, s.checkOut, 2), locale);

/**
 * `/price-drops/[hotel]/[night]` (C-080b, rebuilt in C-175 after the page blueprint): where TikTok
 * visitors land, so it proves the drop and gets them to the site. A short photo band, the hotel and
 * the trip, one deal card (the drop, the exact price, the new low, the main button, "Alle Seiten
 * vergleichen · Link teilen"), the price history on that site as proof, and today's other drops.
 * No other dates, no alert box: the price just dropped. Phones read it top to bottom; from 768 px
 * the deal card stays on the right while the chart scrolls on the left.
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
  /** The trip on the drop's site, taxes included, ending at today's price (C-175). */
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
  const pic = cardPhoto(g.hotel.slug, g.city.slug);
  const newLow = d.priorDays >= 2 ? td('newLow', { days: d.priorDays + 1 }) : td('firstLow');
  const sale = dropTextClass(d.drop);
  const offerLabel = d.provider.direct
    ? t('ctaGoDirect')
    : t('ctaGo', { provider: d.provider.name });

  const stayUrl = stayHref(g.hotel.slug, d, locale);
  const siteName = d.provider.direct ? t('siteDirect') : d.provider.name;

  return (
    <PhotoSheet
      size="compact"
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
          "[grid-template-areas:'head'_'card'_'chart']",
          "md:grid-cols-[minmax(0,1fr)_380px] md:grid-rows-[auto_1fr] md:[grid-template-areas:'head_card'_'chart_card'] lg:grid-cols-[minmax(0,1fr)_420px]",
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
          {/* The trip as one line of text, not pills (C-137). */}
          <p className="mt-2.5 flex flex-wrap gap-x-2 text-[16px] text-muted-ink md:text-[17px]">
            <span className="font-semibold text-ink">
              {d.nights > 1 ? formatDateRange(d.night, d.checkOut, locale) : f.date}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t('chipNights', { n: d.nights })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('chipAdults')}</span>
          </p>
        </header>

        {/* One deal card holds everything about the deal (blueprint): sticky beside the proof. */}
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
            {/* Exact quote (D-52) or the checked price plus measured taxes (D-53). */}
            <p className="mt-3.5">
              <strong className="text-[32px] font-bold tracking-[-0.03em] text-ink tabular-nums">
                {td('perNight', { price: price(d.nightlyCents) })}
              </strong>
            </p>
            <p className="mt-1 text-[15px] text-muted tabular-nums">
              {td('totalFor', { price: price(d.nowCents), n: d.nights })} ·{' '}
              {td(d.exact ? 'inclTaxes' : 'inclTaxesEst')}
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
                aria-label={t('newTab', {
                  label: `${offerLabel} · ${td('perNight', { price: price(d.nightlyCents) })}`,
                })}
                className="mt-5 flex min-h-[60px] items-center justify-between gap-3 rounded-[18px] bg-accent px-[22px] text-[17px] font-semibold text-white transition-colors duration-[var(--t-fast)] hover:bg-accent-hover"
              >
                {/* The price is right above in the card; the button says where it goes. */}
                <span>{offerLabel}</span>
                <span aria-hidden="true">→</span>
              </a>
            ) : (
              <a
                href={stayUrl}
                className="mt-5 flex min-h-[60px] items-center justify-between gap-3 rounded-[18px] bg-accent px-[22px] text-[17px] font-semibold text-white transition-colors duration-[var(--t-fast)] hover:bg-accent-hover"
              >
                <span>{t('stayLink')}</span>
                <span aria-hidden="true">→</span>
              </a>
            )}
            <p className="mt-2 text-[13px] text-muted">
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
            <div className="mt-3 flex flex-wrap items-center gap-x-4 border-t border-[#ece9f1] pt-3">
              {offer && (
                <a
                  href={stayUrl}
                  className="inline-flex min-h-11 items-center text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {t('compareAll')}
                </a>
              )}
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
          </section>
        </div>

        {/* The proof (blueprint): this trip on the drop's site, the line ending at the card. */}
        {series.length > 0 && (
          <section aria-labelledby="drop-history" className="mt-9 [grid-area:chart] md:mt-10">
            <h2
              id="drop-history"
              className="text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]"
            >
              {t('historyTitle', { site: siteName })}
            </h2>
            <p className="text-meta mt-1 text-muted-ink">
              {t('historyNote', { n: d.nights })}{' '}
              <a
                href={localizedPath(routes.method, locale)}
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                {t('method')}
              </a>
            </p>
            <PriceChart
              className="mt-4"
              series={series}
              from={addDays(today, -(DROP_CHART_DAYS - 1))}
              to={today}
              todayTone="good"
              providerByDay={Object.fromEntries(series.map((p) => [p.day, siteName]))}
            />
          </section>
        )}
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
