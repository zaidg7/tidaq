import { getTranslations } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { PhoneSearch } from '@/components/search/PhoneSearch';
import { SearchBar } from '@/components/search/SearchBar';
import { Photo } from '@/components/ui/Photo';
import { cityPhoto, cityPhotoAsHotelPhoto } from '@/lib/cityPhotos';
import { getCatalog } from '@/lib/data/catalog';
import { getDrops } from '@/lib/data/drops';
import { searchBarProps } from '@/lib/searchCardProps';
import { searchIndex } from '@/lib/searchIndex';
import { berlinToday } from '@/lib/today';

/** Booking sites we compare (Xotelo's set, D-41): the number in the proof row. */
const SITES = 4;
/** The "Live" pill only while the last check is fresh. */
const LIVE_MAX_MS = 36 * 60 * 60 * 1000;

/** "heute 07:08" / "gestern 07:08" in German time, or null when older than 36 h. */
function liveWhen(seenAt: string | null, today: string, locale: Locale, now = Date.now()) {
  if (!seenAt) return null;
  const at = new Date(seenAt);
  if (Number.isNaN(at.getTime()) || now - at.getTime() > LIVE_MAX_MS) return null;
  const tz = { timeZone: 'Europe/Berlin' } as const;
  const day = new Intl.DateTimeFormat('en-CA', tz).format(at);
  const time = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    ...tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
  return { time, today: day === today };
}

/**
 * Homepage hero (PREMIUM.md §10.1, mockup B): full-bleed rooftop photo with top and bottom
 * scrims, the navbar white on top of it, bottom-left the live pill, "Ist dein Hotel gerade
 * günstig?" and one sentence. Desktop: the search bar overlaps the photo's bottom edge by 46 px,
 * the proof row sits under it. Phones: the "Wohin?" pill sits in the photo.
 */
export async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const today = berlinToday();
  const [catalog, barProps, drops] = await Promise.all([
    getCatalog(),
    searchBarProps(locale),
    getDrops(today),
  ]);
  const index = searchIndex(catalog?.hotels ?? [], drops.kind === 'ok' ? drops.drops : [], locale);
  const hotels = catalog?.hotels.length ?? 0;
  const cities = catalog?.cityCount ?? 0;
  const photo = cityPhoto('home-hero');
  const live = liveWhen(drops.kind === 'ok' ? drops.seenAt : null, today, locale);

  return (
    // Never clip: the search popovers hang below the hero.
    <section data-photo-hero className="relative z-10 -mt-16 lg:-mt-[76px]">
      <Photo
        photo={photo ? { ...cityPhotoAsHotelPhoto(photo), focus: '50% 70%' } : null}
        alt={photo?.alt ?? ''}
        sizes="100vw"
        priority
        className="h-[620px] bg-[#2a2620] lg:h-[760px]"
      >
        <div aria-hidden="true" className="hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-[104px] md:bottom-[120px]">
          <div className="mx-auto max-w-[1240px] px-[18px] text-white md:px-10">
            {live && (
              <p className="hero-rise mb-4 inline-flex items-center gap-2 rounded-full border border-white/28 bg-white/16 px-3 py-1.5 text-[13px] font-medium backdrop-blur-sm md:mb-[22px] md:gap-2.5 md:px-3.5 md:py-2 md:text-[14px]">
                <span
                  aria-hidden="true"
                  className={
                    live.today
                      ? 'live-dot size-2 rounded-full bg-good-bright'
                      : 'size-2 rounded-full bg-white/60'
                  }
                />
                {live.today
                  ? t('liveToday', { time: live.time })
                  : t('liveYesterday', { time: live.time })}
              </p>
            )}
            <h1 className="hero-rise max-w-[820px] text-[44px] leading-[1.04] font-[650] tracking-[-0.04em] md:text-[64px] lg:text-[76px] lg:leading-[1.02]">
              {t('heroTitle')}
            </h1>
            <p className="hero-rise-2 mt-3.5 max-w-[540px] text-[17px] leading-[1.45] text-white/92 md:mt-[22px] md:text-[20px] md:leading-[1.5]">
              <span className="md:hidden">
                {catalog ? t('heroLeadShort', { hotels }) : t('heroLeadNoData')}
              </span>
              <span className="hidden md:inline">
                {catalog ? t('heroLead', { hotels }) : t('heroLeadNoData')}
              </span>
            </p>
          </div>
        </div>
        {/* `cn` doesn't merge conflicting classes: the wrapper owns position and visibility. */}
        <div
          data-hero-search
          className="hero-rise-3 absolute right-3.5 bottom-6 left-3.5 md:hidden"
        >
          <PhoneSearch index={index} today={today} locale={locale} labels={barProps.labels} pill />
        </div>
      </Photo>

      <div
        id="suche"
        className="relative mx-auto max-w-[1240px] scroll-mt-28 px-[18px] md:-mt-[46px] md:px-10"
      >
        <div data-hero-search className="hidden md:block">
          <SearchBar index={index} today={today} locale={locale} {...barProps} />
        </div>
        <ul className="mt-4 hidden flex-wrap justify-center gap-x-9 gap-y-1 text-center text-[15px] text-muted md:mt-6 md:flex">
          {catalog ? (
            <>
              <li>{t('proofHotels', { n: hotels })}</li>
              <li>{t('proofCities', { n: cities })}</li>
              <li>{t('proofSites', { n: SITES })}</li>
              <li>{t('proofFree')}</li>
            </>
          ) : (
            <li>{t('proofFree')}</li>
          )}
        </ul>
        <p className="mt-4 text-center text-[14px] text-muted md:hidden">{t('proofPhone')}</p>
      </div>
    </section>
  );
}
