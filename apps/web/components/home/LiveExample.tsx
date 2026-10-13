import { getTranslations } from 'next-intl/server';
import {
  addDays,
  daysBetween,
  formatDateRange,
  formatDayMonth,
  formatPrice,
  STATS,
  updatedAtParts,
  type Locale,
} from '@tidaq/core';
import { PriceChart } from '@/components/chart/PriceChart';
import { CollectingDays } from '@/components/home/CollectingDays';
import { VerdictBlock } from '@/components/stay/VerdictBlock';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PriceText } from '@/components/ui/PriceText';
import { getFeaturedStay, type FeaturedOffer } from '@/lib/data/featured';
import { sampleFeaturedStay } from '@/lib/sampleStay';
import { berlinToday } from '@/lib/today';

/** Offers with the same total collapse into one row ("Booking.com, Expedia · je 650 €"). */
function groupOffers(offers: FeaturedOffer[]): { names: FeaturedOffer[]; cents: number }[] {
  const groups: { names: FeaturedOffer[]; cents: number }[] = [];
  for (const o of offers) {
    const last = groups.at(-1);
    if (last && last.cents === o.totalCents) last.names.push(o);
    else groups.push({ names: [o], cents: o.totalCents });
  }
  return groups;
}

/**
 * "Live-Beispiel" (C-020b): a real tracked stay. With a verdict it shows verdict + 60-day chart;
 * while the stay is still collecting it leads with what is already true today (price, change
 * since yesterday, the gap between sites) and the first 7 days, never an empty chart. Without
 * live data a clearly labelled sample takes its place.
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
  const collecting = stay.stats.state === 'collecting';
  const dates = formatDateRange(stay.checkIn, stay.checkOut, locale);
  const updated = stay.updatedAt ? updatedAtParts(stay.updatedAt, new Date(), locale) : null;

  // Facts that are true today, even before a verdict.
  const [prev, last] = stay.series.slice(-2);
  const change =
    prev && last && daysBetween(prev.day, last.day) === 1 ? last.bestCents - prev.bestCents : null;
  const groups = groupOffers(stay.offers);
  const cheapest = groups[0];
  const next = groups[1];
  const gap =
    cheapest && next && cheapest.names.length === 1 && cheapest.names[0]
      ? {
          provider: cheapest.names[0].isDirect ? t('direct') : cheapest.names[0].providerName,
          amount: price(next.cents - cheapest.cents),
        }
      : null;
  const firstDay = stay.series[0]?.day ?? today;

  return (
    <section
      aria-labelledby="live-title"
      className="mx-auto w-full max-w-[1080px] px-5 pt-4 pb-14 md:px-7 lg:pb-[88px]"
    >
      <div className="flex flex-col items-start gap-3">
        <p className="text-eyebrow flex items-center gap-2 text-accent">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          {live && updated
            ? t('liveEyebrow', { time: updated.time })
            : live
              ? t('liveEyebrowNoTime')
              : t('sampleEyebrow')}
        </p>
        <h2 id="live-title" className="text-h2 max-w-[22ch]">
          {collecting ? t('collectingTitle') : t('liveTitle')}
        </h2>
        <p className="text-lead max-w-[34em] text-muted-ink">
          {!live
            ? t('sampleText')
            : collecting
              ? t('collectingText', {
                  hotel: stay.hotel.name,
                  dates,
                  since: formatDayMonth(firstDay, locale),
                })
              : t('liveText')}
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
            // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted 160 px thumbnail (C-011c)
            <img
              src={image.url}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              className="bg-placeholder size-14 shrink-0 rounded-cell object-cover"
            />
          ) : (
            <span aria-hidden="true" className="bg-placeholder size-14 shrink-0 rounded-cell" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-title truncate">{stay.hotel.name}</p>
            <p className="text-meta mt-0.5 text-muted-ink">
              <span className="whitespace-nowrap max-sm:hidden">
                {stay.hotel.cityName[locale]} ·{' '}
              </span>
              <span className="whitespace-nowrap">
                {t('stayMeta', { dates, adults: stay.adults })}
              </span>
            </p>
          </div>
          {!live && <Badge tone="warn">{t('sampleBadge')}</Badge>}
        </header>

        {collecting ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8 lg:p-8">
            <div className="flex flex-col gap-3">
              {stay.stats.nowCents !== null && (
                <PriceText cents={stay.stats.nowCents} size="xl" locale={locale} />
              )}
              {change !== null && (
                <p className="font-semibold text-fg">
                  {change < 0
                    ? t('changeDown', { amount: price(-change) })
                    : change > 0
                      ? t('changeUp', { amount: price(change) })
                      : t('changeSame')}
                </p>
              )}
              {gap && <p className="text-muted-ink">{t('gap', gap)}</p>}
            </div>
            <CollectingDays
              title={t('firstDays')}
              series={stay.series}
              firstDay={firstDay}
              today={today}
              locale={locale}
            />
          </div>
        ) : (
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
        )}

        <div className="border-t border-line bg-surface-2 p-5 lg:px-8">
          <h3 className="text-[15px] font-bold">{t('offersTitle')}</h3>
          {groups.length > 0 ? (
            <ul className="mt-3 divide-y divide-line">
              {groups.map((g, i) => (
                <li
                  key={g.names.map((o) => o.providerSlug).join()}
                  className="flex min-h-12 items-center gap-3 py-2"
                >
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">
                      {g.names.map((o) => (o.isDirect ? t('direct') : o.providerName)).join(', ')}
                    </span>
                    {i === 0 && <Badge tone="good">{t('cheapest')}</Badge>}
                  </span>
                  <span className="shrink-0 text-right text-[16px] font-extrabold whitespace-nowrap tabular-nums">
                    {g.names.length > 1 ? t('same', { price: price(g.cents) }) : price(g.cents)}
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
