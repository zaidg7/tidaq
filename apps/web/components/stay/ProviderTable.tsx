import { useLocale, useTranslations } from 'next-intl';
import {
  formatDayMonth,
  formatPrice,
  localizedPath,
  rankOffers,
  type Locale,
  type StayOffer,
} from '@tidaq/core';
import { Badge } from '@/components/ui/Badge';
import { TrustScore } from '@/components/ui/TrustScore';
import { cn } from '@/lib/cn';
import { routes } from '@/lib/routes';

type Props = {
  offers: StayOffer[];
  /** Providers with a price that we haven't reviewed yet (their names aren't public). */
  unreviewed: number;
  /** The day these prices are from (the latest collected day), and today (Berlin). */
  day: string | null;
  today: string;
  className?: string;
};

/** "Booking.com" → "B", "Hotel Adlon" → "HA": a neutral tile instead of third-party logos. */
function monogram(name: string): string {
  const words = name
    .replace(/\.[a-z]{2,}$/i, '')
    .split(/[\s.-]+/)
    .filter(Boolean);
  return (
    words.length > 1 ? `${words[0]?.[0]}${words[1]?.[0]}` : (words[0]?.[0] ?? '?')
  ).toUpperCase();
}

/**
 * Provider table (CRAFT.md §3 Provider row, PLAN §8.3): every reviewed provider's latest stay
 * total, sorted by the price you can expect at checkout, with its Preistreue score and, when tests
 * show a markup, "an der Kasse ≈ …". Commission never affects the order. Outbound buttons come
 * with the click-logged links of C-026.
 */
export function ProviderTable({ offers, unreviewed, day, today, className }: Props) {
  const t = useTranslations('stay');
  const locale = useLocale() as Locale;
  const price = (c: number) => formatPrice(c, locale);
  const ranked = rankOffers(offers);
  const [first, second] = ranked;
  const cheapestId =
    first && (!second || first.trustedCents < second.trustedCents) ? first.providerId : null;

  return (
    <section aria-labelledby="offers-title" className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="offers-title" className="text-h3">
          {day && day !== today
            ? t('offersTitleDay', { date: formatDayMonth(day, locale) })
            : t('offersTitle')}
        </h2>
        {ranked.length > 1 && (
          <p className="text-meta text-muted-ink">
            {t('offersSorted')} ·{' '}
            <a
              href={localizedPath(routes.ranking, locale)}
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              {t('offersRanking')}
            </a>
          </p>
        )}
      </div>

      {ranked.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted-ink">{t('offersEmpty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {ranked.map((o) => (
            <li
              key={o.providerId}
              className="grid min-h-[72px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors duration-[180ms] ease-soft hover:bg-surface-2 sm:grid-cols-[32px_minmax(0,1fr)_120px_132px] sm:px-5"
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-[10px] bg-surface-2 text-[12px] font-bold text-muted-ink ring-1 ring-line"
              >
                {monogram(o.isDirect ? t('direct') : o.name)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-[15px] font-bold">
                    {o.isDirect ? t('direct') : o.name}
                  </span>
                  {o.providerId === cheapestId && <Badge tone="good">{t('cheapest')}</Badge>}
                </span>
                {o.isDirect && (
                  <span className="text-[13px] text-muted-ink">{t('directNote')}</span>
                )}
              </span>
              <span className="flex flex-col items-end text-right">
                <span className="text-[16px] font-extrabold whitespace-nowrap tabular-nums">
                  {price(o.totalCents)}
                </span>
                {o.expectedCents !== null && (
                  <span className="text-[12.5px] font-semibold whitespace-nowrap text-bad-ink tabular-nums">
                    {t('expected', { price: price(o.expectedCents) })}
                  </span>
                )}
              </span>
              <TrustScore
                score={o.trust?.score ?? null}
                tests={o.trust?.tests ?? 0}
                matches={o.trust?.matches ?? 0}
                className={cn('col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto')}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-meta mt-3 max-w-[44em] text-muted-ink">
        {t('offersNote')}
        {unreviewed > 0 && <> {t('offersUnreviewed', { n: unreviewed })}</>}
      </p>
    </section>
  );
}
