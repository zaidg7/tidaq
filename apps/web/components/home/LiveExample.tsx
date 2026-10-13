import { getTranslations } from 'next-intl/server';
import { addDays, formatDateRange, formatPrice, STATS, type Locale } from '@tidaq/core';
import { PriceChart } from '@/components/chart/PriceChart';
import { VerdictBlock } from '@/components/stay/VerdictBlock';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getFeaturedStay } from '@/lib/data/featured';
import { sampleFeaturedStay } from '@/lib/sampleStay';
import { berlinToday } from '@/lib/today';

/**
 * "Live-Beispiel" (C-020b): a real tracked stay with verdict, 60-day chart and today's prices by
 * site. Without live data it shows a clearly labelled sample instead (never unlabelled fakes).
 */
export async function LiveExample({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const today = berlinToday();
  const live = await getFeaturedStay();
  const stay = live ?? sampleFeaturedStay(today);
  const price = (c: number) => formatPrice(c, locale);
  const image = stay.hotel.image;
  // Stored credits read "Foto: Name, Lizenz, via Wikimedia Commons"; the label adds its own prefix.
  const credit = image?.credit.replace(/^(Foto|Photo):\s*/i, '') ?? '';

  return (
    <section
      aria-labelledby="live-title"
      className="mx-auto w-full max-w-[1080px] px-5 py-14 md:px-7 lg:py-[88px]"
    >
      <div className="flex flex-col items-start gap-3">
        <p className="text-eyebrow flex items-center gap-2 text-accent">
          {!live ? null : (
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-good" />
          )}
          {t('liveEyebrow')}
        </p>
        <h2 id="live-title" className="text-h2 max-w-[22ch]">
          {t('liveTitle')}
        </h2>
        <p className="text-lead max-w-[34em] text-muted-ink">
          {live ? t('liveText') : t('sampleText')}
        </p>
      </div>

      <Card
        variant="float"
        radius="search"
        padded={false}
        className="mt-8 overflow-hidden"
        data-scrub-scope=""
      >
        <header className="flex items-center gap-4 border-b border-line p-5 lg:px-8">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- licensed Wikimedia photo, tiny thumbnail
            <img
              src={image.url}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              // No cookies and no referrer to the third-party image host (D-15); C-011c self-hosts.
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className="bg-placeholder size-14 shrink-0 rounded-cell object-cover"
            />
          ) : (
            <span aria-hidden="true" className="bg-placeholder size-14 shrink-0 rounded-cell" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-title truncate">{stay.hotel.name}</p>
            <p className="text-meta mt-0.5 text-muted-ink">
              {stay.hotel.cityName[locale]} ·{' '}
              {t('stayMeta', {
                dates: formatDateRange(stay.checkIn, stay.checkOut, locale),
                adults: stay.adults,
              })}
            </p>
          </div>
          {!live && <Badge tone="warn">{t('sampleBadge')}</Badge>}
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8 lg:p-8">
          <VerdictBlock
            stats={stay.stats}
            series={stay.series}
            today={today}
            nights={stay.nights}
            adults={stay.adults}
            updatedAt={stay.updatedAt}
          />
          <PriceChart
            series={stay.series}
            from={addDays(today, -(STATS.windowDays - 1))}
            to={today}
            avgCents={stay.stats.avg30Cents}
          />
        </div>

        <div className="border-t border-line bg-surface-2 p-5 lg:px-8">
          <h3 className="text-[15px] font-bold">{t('offersTitle')}</h3>
          {stay.offers.length > 0 ? (
            <ul className="mt-3 divide-y divide-line">
              {stay.offers.map((o, i) => (
                <li key={o.providerSlug} className="flex min-h-12 items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {o.isDirect ? t('direct') : o.providerName}
                  </span>
                  {i === 0 && <Badge tone="good">{t('cheapest')}</Badge>}
                  <span className="w-24 text-right text-[16px] font-extrabold tabular-nums">
                    {price(o.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-meta mt-2 text-muted-ink">{t('offersEmpty')}</p>
          )}
          <p className="text-meta mt-3 text-muted-ink">{t('offersNote')}</p>
          {image && (
            <p className="mt-2 text-[12px] text-muted-ink">
              {image.sourceUrl ? (
                <a
                  href={image.sourceUrl}
                  className="underline-offset-2 hover:underline"
                  rel="noopener"
                >
                  {t('photoCredit', { credit })}
                </a>
              ) : (
                t('photoCredit', { credit })
              )}
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}
