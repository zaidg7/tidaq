import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { getCatalog } from '@/lib/data/catalog';
import { berlinToday } from '@/lib/today';
import { SearchCard } from './SearchCard';

/** The soft falling hairline under the accent word (CRAFT.md §4.1): the price going down. */
function Hairline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className="absolute inset-x-0 -bottom-[0.14em] h-[0.26em] w-full overflow-visible"
    >
      <path
        d="M2 3.5C18 2.5 30 3 44 6.5S72 11 98 9.5"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Homepage hero (DESIGN.md §4, CRAFT.md §5): eyebrow, H1 with the accent word, lead with real
 * numbers from the catalog, proof row, and the search card. Lavender blobs sit behind it.
 */
export async function Hero({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const ts = await getTranslations({ locale, namespace: 'search' });
  const catalog = await getCatalog();
  const hotels = catalog?.hotels.length ?? 0;
  const cities = catalog?.cityCount ?? 0;

  const proof = [
    ...(catalog ? [t('proofHotels', { hotels }), t('proofCities', { cities })] : []),
    t('proofDaily'),
    t('proofFree'),
  ];

  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="hero-blobs" />
      <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center px-5 pt-10 pb-14 text-center md:px-7 lg:pt-16 lg:pb-[88px]">
        <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
        <h1 className="text-display mt-4 max-w-[16ch]">
          {t.rich('title', {
            hi: (chunks) => (
              <span className="relative inline-block text-accent">
                {chunks}
                <Hairline />
              </span>
            ),
          })}
        </h1>
        <p className="text-lead mt-5 max-w-[34em] text-muted-ink">
          {catalog ? t('lead', { hotels, cities }) : t('leadNoData')}
        </p>
        <ul className="text-meta mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 font-semibold text-muted-ink">
          {proof.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Icon icon={Check} size={14} className="text-good-ink" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-9 w-full max-w-[560px] text-left">
          <SearchCard
            hotels={(catalog?.hotels ?? []).map((h) => ({
              slug: h.slug,
              name: h.name,
              city: h.city.name[locale],
            }))}
            guestOptions={[1, 2, 3, 4].map((n) => ts('adults', { n }))}
            today={berlinToday()}
            locale={locale}
            labels={{
              label: ts('label'),
              hotel: ts('hotel'),
              hotelPlaceholder: ts('hotelPlaceholder'),
              checkIn: ts('checkIn'),
              checkOut: ts('checkOut'),
              guests: ts('guests'),
              submit: ts('submit'),
              note: ts('note'),
              nightsOne: ts('nightsOne'),
              nightsOther: ts('nightsOther', { n: '{n}' }),
              hotelMissing: ts('hotelMissing'),
              datesMissing: ts('datesMissing'),
              order: ts('order'),
              tooLong: ts('tooLong'),
              past: ts('past'),
            }}
          />
        </div>
      </div>
    </section>
  );
}
