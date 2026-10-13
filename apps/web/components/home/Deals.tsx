import { getTranslations } from 'next-intl/server';
import { formatDateRange, localizedPath, type Locale } from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import { Price } from '@/components/ui/Price';
import { PriceDelta } from '@/components/ui/PriceDelta';
import { getDeals } from '@/lib/data/deals';
import { routes } from '@/lib/routes';

/**
 * "Fünf-Sterne-Deals dieser Woche" (DESIGN.md §3 Deal card): only real drops of 8 %+ with 14+
 * days of history. Renders nothing until such deals exist, so the page never shows filler.
 */
export async function Deals({ locale }: { locale: Locale }) {
  const deals = await getDeals();
  if (!deals || deals.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'deals' });

  return (
    <section
      aria-labelledby="deals-title"
      className="mx-auto w-full max-w-[1080px] px-5 pb-14 md:px-7 lg:pb-[88px]"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
          <h2 id="deals-title" className="text-h2 mt-3 max-w-[22ch]">
            {t('title')}
          </h2>
        </div>
        <a
          href={localizedPath(routes.deals, locale)}
          className="inline-flex min-h-11 shrink-0 items-center font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t('all')}
        </a>
      </div>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {deals.map((d) => (
          <li key={d.stayId}>
            <Card interactive padded={false} className="h-full overflow-hidden">
              {d.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- licensed photo; self-hosted in C-011c
                <img
                  src={d.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="bg-placeholder aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div aria-hidden="true" className="bg-placeholder aspect-[16/10] w-full" />
              )}
              <div className="p-5">
                <a
                  href={localizedPath(`/hotel/${d.hotelSlug}/${d.checkIn}--${d.checkOut}`, locale)}
                  className="text-h3 after:absolute after:inset-0"
                >
                  {d.hotelName}
                </a>
                <p className="text-meta mt-1 text-muted-ink">
                  {d.cityName[locale]} ·{' '}
                  {t('meta', {
                    dates: formatDateRange(d.checkIn, d.checkOut, locale),
                    adults: d.adults,
                  })}
                </p>
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Price cents={d.nowCents} size="lg" />
                  <PriceDelta ratio={d.drop} />
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
