import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import {
  addDays,
  formatDayMonth,
  formatPrice,
  formatWeekdayDayMonth,
  localizedPath,
  stayPath,
  type Locale,
} from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Meter } from '@/components/ui/Meter';
import { Photo } from '@/components/ui/Photo';
import { cityPhoto, cityPhotoAsHotelPhoto } from '@/lib/cityPhotos';
import { getFeaturedStay } from '@/lib/data/featured';
import type { HotelPhoto } from '@/lib/hotelPhotos';
import { cardPhoto } from '@/lib/photos';
import { berlinToday } from '@/lib/today';
import { cn } from '@/lib/cn';

/** What the card shows: a real stay with a cheap verdict, or the labelled example. */
type Example = {
  name: string;
  /** Desktop meta starts with the place; phones leave it out. */
  place: string;
  date: string;
  nights: number;
  photo: HotelPhoto | null;
  nowCents: number;
  usualCents: number;
  percentile: number;
  lowCents: number;
  highCents: number;
  since: string;
  site: string | null;
  near: boolean;
  /** The stay page; null for the example. */
  href: string | null;
};

/**
 * "Grün heißt: jetzt buchen." (mockup B): what an answer looks like, on a violet panel. A real
 * stay whose verdict says cheap today when we have one (`getFeaturedStay(…, 'cheap')`), with a
 * link to its price history. Until a stay has 7 days of prices, an example with made-up prices,
 * marked "Beispiel" on the card and in a note under it (CLAUDE.md rule 8: no fake facts).
 */
export async function HomeResult({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const today = berlinToday();
  const live = await getFeaturedStay(new Date(), 'cheap');
  const s = live?.stats;
  const real =
    live &&
    s &&
    (s.state === 'good' || s.state === 'near_low') &&
    s.nowCents !== null &&
    s.avg30Cents !== null &&
    s.percentile !== null &&
    s.lowCents !== null &&
    s.highCents !== null;

  let ex: Example;
  if (real && live && s) {
    const pic = cardPhoto(live.hotel.slug, live.hotel.citySlug);
    ex = {
      name: live.hotel.name,
      place: live.hotel.cityName[locale],
      date: formatWeekdayDayMonth(live.checkIn, locale),
      nights: live.nights,
      photo: pic?.photo ?? null,
      nowCents: s.nowCents!,
      usualCents: s.avg30Cents!,
      percentile: s.percentile!,
      lowCents: s.lowCents!,
      highCents: s.highCents!,
      since: formatDayMonth(live.series[0]?.day ?? today, locale),
      site: live.offers[0]?.providerName ?? null,
      near: s.state === 'near_low',
      href: localizedPath(
        stayPath(live.hotel.slug, live.checkIn, live.checkOut, live.adults),
        locale,
      ),
    };
  } else {
    const hero = cityPhoto('home-hero');
    ex = {
      name: t('resultSampleHotel'),
      place: t('resultSamplePlace'),
      date: formatWeekdayDayMonth(addDays(today, 14), locale),
      // A holiday, not a single night (C-125): 5 nights, total for 2 adults.
      nights: 5,
      photo: hero ? cityPhotoAsHotelPhoto(hero) : null,
      nowCents: 317_000,
      usualCents: 476_500,
      percentile: 0.12,
      lowCents: 306_000,
      highCents: 590_000,
      since: formatDayMonth(addDays(today, -59), locale),
      site: 'Booking.com',
      near: false,
      href: null,
    };
  }
  const sample = ex.href === null;
  const b = (chunks: ReactNode) => <strong className="text-ink">{chunks}</strong>;
  const meta = t('resultMeta', { dates: ex.date, nights: ex.nights });

  return (
    <section
      aria-labelledby="home-result"
      className="mx-3.5 mt-16 md:mx-auto md:mt-[130px] md:w-full md:max-w-[1240px] md:px-10"
    >
      <div className="flex flex-col gap-5 rounded-panel bg-surface-accent px-4 pt-7 pb-[18px] md:flex-row md:flex-wrap md:items-center md:gap-x-20 md:gap-y-12 md:rounded-[36px] md:p-16">
        <div className="px-1 md:flex-[1_1_360px] md:px-0">
          <p className="mb-3 hidden text-[15px] font-semibold text-accent md:block">
            {t('resultEyebrow')}
          </p>
          <h2
            id="home-result"
            className="text-[26px] leading-[1.12] font-[650] tracking-[-0.03em] md:text-[40px]"
          >
            {t('resultTitle')}
          </h2>
          <p className="mt-1.5 max-w-[420px] text-[15px] text-muted md:mt-[18px] md:text-[17px]">
            <span className="md:hidden">{t('resultLeadShort')}</span>
            <span className="hidden md:inline">{t('resultLead')}</span>
          </p>
        </div>

        <article className="relative rounded-card bg-surface p-5 shadow-[0_20px_40px_rgba(48,30,120,0.1)] md:flex-[1_1_460px] md:rounded-panel md:p-7 md:shadow-[0_1px_2px_rgba(21,19,28,0.05),0_30px_60px_rgba(48,30,120,0.12)]">
          {sample && (
            <span className="absolute top-4 right-4 inline-flex h-6 items-center rounded-full bg-warn-soft px-2.5 text-[12px] font-semibold text-warn md:top-6 md:right-6">
              {t('resultSample')}
            </span>
          )}
          <div className="flex items-center gap-3 md:gap-4">
            <Photo
              photo={ex.photo}
              alt=""
              sizes="64px"
              className="size-[52px] shrink-0 rounded-[14px] md:size-16 md:rounded-[16px]"
            />
            <div className={cn('min-w-0', sample && 'pr-20')}>
              <h3 className="truncate text-[16px] font-semibold tracking-[-0.01em] md:text-[19px]">
                {ex.name}
              </h3>
              <p className="text-[13px] text-muted md:mt-0.5 md:text-[15px]">
                <span className="hidden md:inline">{ex.place} · </span>
                {meta}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-3 gap-y-2.5 md:mt-[26px]">
            <div>
              <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-good-soft px-3 text-[14px] font-bold text-good md:h-8 md:text-[15px]">
                <span aria-hidden="true" className="size-2 rounded-full bg-good" />
                {ex.near ? t('resultChipLow') : t('resultChipGood')}
              </span>
              <p className="mt-2.5 text-[40px] leading-none font-bold tracking-[-0.04em] tabular-nums md:mt-3 md:text-[48px]">
                {formatPrice(ex.nowCents, locale)}
              </p>
            </div>
            <p className="mb-1 text-[15px] text-muted md:text-[16px]">
              {t.rich('resultUsual', { price: formatPrice(ex.usualCents, locale), b })}
            </p>
          </div>

          <Meter
            percentile={ex.percentile}
            lowCents={ex.lowCents}
            highCents={ex.highCents}
            nowCents={ex.nowCents}
            since={ex.since}
            size="lg"
            className="mt-5 md:mt-7"
          />

          <div className="mt-5 flex flex-col gap-3 border-t border-[#ece9f1] pt-4 md:mt-[26px] md:flex-row md:items-center md:justify-between md:pt-[22px]">
            {ex.site && (
              <p className="text-[15px] text-muted">
                {t.rich('resultCheapest', { site: ex.site, b })}
              </p>
            )}
            {ex.href ? (
              <a
                href={ex.href}
                className={cn(buttonClasses({ size: 'md', block: true }), 'md:w-auto')}
              >
                {t('resultCta')}
              </a>
            ) : (
              <p className="text-[13px] text-faint md:max-w-[17em] md:text-right">
                {t('resultSampleNote')}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
