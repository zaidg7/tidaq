import { useLocale, useTranslations } from 'next-intl';
import {
  formatDayMonth,
  formatPrice,
  goPath,
  localizedPath,
  providerPath,
  rankOffers,
  type Locale,
  type OutboundStay,
  type StayOffer,
} from '@tidaq/core';
import { ArrowUpRight } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { TrustScore } from '@/components/ui/TrustScore';
import { routes } from '@/lib/routes';

type Props = {
  offers: StayOffer[];
  /** Providers with a price that we haven't reviewed yet (their names aren't public). */
  unreviewed: number;
  /** The day these prices are from (the latest collected day), and today (Berlin). */
  day: string | null;
  today: string;
  /** The stay these prices are for: "Zum Angebot" opens it on the provider's site (C-026). */
  hotelSlug: string;
  stay: OutboundStay;
  className?: string;
};

/** Checkout tests a site needs before the Preistreue column shows. */
const TRUST_MIN_TESTS = 5;

// Phones: box and note side by side under the name, so rows stay short.
const TRUST_CLASSES =
  'max-sm:max-w-none max-sm:flex-row max-sm:items-center max-sm:gap-2 sm:max-w-[176px]';

function trustProps(o: StayOffer) {
  return {
    score: o.trust?.score ?? null,
    tests: o.trust?.tests ?? 0,
    matches: o.trust?.matches ?? 0,
  };
}

/**
 * Provider table (CRAFT.md §3 Provider row, PLAN §8.3): every reviewed provider's latest stay
 * total, sorted by the price you can expect at checkout, with its Preistreue score and, when tests
 * show a markup, "an der Kasse ≈ …"; the score links to the provider page (C-034b). Commission
 * never affects the order. "Zum Angebot ↗" goes
 * through `/go/…` (C-026: click counted, provider search for these dates, new tab); on phones the
 * whole row is the link. Past stays get no links.
 */
export function ProviderTable({
  offers,
  unreviewed,
  day,
  today,
  hotelSlug,
  stay,
  className,
}: Props) {
  const t = useTranslations('stay');
  const locale = useLocale() as Locale;
  const price = (c: number) => formatPrice(c, locale);
  const ranked = rankOffers(offers);
  const bookable = stay.checkIn >= today;
  const hasLinks = bookable && ranked.some((o) => o.link);
  // Preistreue only once a site has enough checkout tests to mean something (C-174): until then
  // a column of "noch nicht getestet" is noise.
  const showTrust = ranked.some((o) => (o.trust?.tests ?? 0) >= TRUST_MIN_TESTS);
  const [first, second] = ranked;
  // Each row's gap to the cheapest (C-179): "+29 €" and a bar from short (cheapest) to long.
  const totals = ranked.map((o) => o.totalCents);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);
  const barWidth = (cents: number) =>
    maxTotal > minTotal
      ? `${Math.round(20 + (75 * (cents - minTotal)) / (maxTotal - minTotal))}%`
      : '50%';
  const cheapestId =
    first && (!second || first.trustedCents < second.trustedCents) ? first.providerId : null;

  return (
    <section aria-labelledby="offers-title" className={className}>
      <h2 id="offers-title" className="text-h3">
        {day && day !== today
          ? t('offersTitleDay', { date: formatDayMonth(day, locale) })
          : t('offersTitle')}
      </h2>

      {ranked.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted-ink">{t('offersEmpty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {ranked.map((o) => (
            <li
              key={o.providerId}
              className={cn(
                'relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 pt-3 pb-3.5 sm:px-5',
                showTrust
                  ? hasLinks
                    ? 'sm:grid-cols-[minmax(0,1fr)_120px_160px_auto]'
                    : 'sm:grid-cols-[minmax(0,1fr)_120px_176px]'
                  : hasLinks
                    ? 'sm:grid-cols-[minmax(0,1fr)_120px_auto]'
                    : 'sm:grid-cols-[minmax(0,1fr)_120px]',
                bookable && o.link && 'max-sm:hover:bg-surface-2',
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 text-[15px] leading-tight font-semibold">
                    {o.isDirect ? t('direct') : o.name}
                  </span>
                  {bookable && o.link && (
                    <Icon
                      icon={ArrowUpRight}
                      size={16}
                      className="-ml-1 shrink-0 text-muted-ink sm:hidden"
                    />
                  )}
                  {o.providerId === cheapestId && <Badge tone="good">{t('cheapest')}</Badge>}
                </span>
                {(o.isDirect || o.link?.partner) && (
                  <span className="text-[12.5px] text-muted-ink">
                    {[o.isDirect && t('directNote'), o.link?.partner && t('partnerLink')]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </span>
              <span className="flex flex-col items-end text-right">
                <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">
                  {o.totalCents > minTotal && (
                    <span className="mr-1.5 text-[12px] font-medium text-muted-ink">
                      +{price(o.totalCents - minTotal)}
                    </span>
                  )}
                  {price(o.totalCents)}
                </span>
                {o.expectedCents !== null && (
                  <span className="text-[12.5px] font-semibold whitespace-nowrap text-bad-ink tabular-nums">
                    {t('expected', { price: price(o.expectedCents) })}
                  </span>
                )}
              </span>
              {!showTrust ? null : o.slug ? (
                // The provider page (C-034b): what our tests found. Above the phone row link.
                <a
                  href={localizedPath(providerPath(o.slug), locale)}
                  className="relative z-[2] col-span-2 col-start-1 justify-self-start rounded-badge underline-offset-2 hover:[&_span]:underline sm:col-span-1 sm:col-start-auto"
                >
                  <TrustScore {...trustProps(o)} className={TRUST_CLASSES} />
                  <span className="sr-only">
                    {t('trustDetails', { provider: o.isDirect ? t('direct') : o.name })}
                  </span>
                </a>
              ) : (
                <TrustScore
                  {...trustProps(o)}
                  className={cn(
                    TRUST_CLASSES,
                    'col-span-2 col-start-1 sm:col-span-1 sm:col-start-auto',
                  )}
                />
              )}
              {bookable && o.link && (
                <a
                  href={goPath(o.link.slug, hotelSlug, stay, locale)}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  aria-label={t('toOfferLabel', { provider: o.isDirect ? t('direct') : o.name })}
                  className={cn(
                    buttonClasses({ variant: 'ghost', size: 'sm' }),
                    // Phones: no button, the whole row is the link (CRAFT.md §3 Provider row).
                    'max-sm:absolute max-sm:inset-0 max-sm:h-auto max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:z-[1] max-sm:p-0 max-sm:after:hidden',
                  )}
                >
                  <span className="max-sm:sr-only">{t('toOffer')}</span>
                  <Icon icon={ArrowUpRight} size={16} className="max-sm:hidden" />
                </a>
              )}
              {/* No link for this row: keep the button column, so prices stay in one line. */}
              {hasLinks && !(bookable && o.link) && (
                <span aria-hidden="true" className="hidden sm:block" />
              )}
              <span aria-hidden="true" className="col-span-full h-1.5 rounded-full bg-neutral-soft">
                <span
                  className={cn(
                    'block h-full rounded-full',
                    o.totalCents === minTotal ? 'bg-good' : 'bg-line-strong',
                  )}
                  style={{ width: barWidth(o.totalCents) }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-meta mt-3 text-muted-ink">
        {t('offersNote')}
        {unreviewed > 0 && <> {t('offersUnreviewed', { n: unreviewed })}</>}{' '}
        <a
          href={localizedPath(routes.ranking, locale)}
          className="font-semibold text-accent underline-offset-2 hover:underline"
        >
          {t('offersRanking')}
        </a>
      </p>
    </section>
  );
}
