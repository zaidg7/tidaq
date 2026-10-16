import { useLocale, useTranslations } from 'next-intl';
import {
  formatDayMonth,
  formatPercent,
  goPath,
  localizedPath,
  providerPath,
  rankOffers,
  vsTypical,
  type Locale,
  type OutboundStay,
  type StayOffer,
} from '@tidaq/core';
import { ArrowUpRight, Hotel } from 'lucide-react';
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
 * Provider table (CRAFT.md §3 Provider row, PLAN §8.3): every reviewed provider, sorted by the
 * price you can expect at checkout, each against the cheapest in percent (no euros: base rates
 * lack taxes and fees, D-52, C-149), with its Preistreue score and, when tests show a markup,
 * "an der Kasse ≈ …"; the score links to the provider page (C-034b). Commission
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
  const ranked = rankOffers(offers);
  const floor = ranked.length ? Math.min(...ranked.map((o) => o.totalCents)) : null;
  const vs = (c: number) => formatPercent(vsTypical(c, 1, floor) ?? 0, locale, { signed: true });
  const bookable = stay.checkIn >= today;
  const hasLinks = bookable && ranked.some((o) => o.link);
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
              className={cn(
                'relative grid min-h-[72px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5',
                hasLinks
                  ? 'sm:grid-cols-[32px_minmax(0,1fr)_120px_160px_auto]'
                  : 'sm:grid-cols-[32px_minmax(0,1fr)_120px_176px]',
                bookable && o.link && 'max-sm:hover:bg-surface-2',
              )}
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-[10px] bg-surface-2 text-[12px] font-bold text-muted-ink ring-1 ring-line"
              >
                {o.isDirect ? <Icon icon={Hotel} size={16} /> : monogram(o.name)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 text-[15px] leading-tight font-bold">
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
                  <span className="text-[13px] text-muted-ink">
                    {[o.isDirect && t('directNote'), o.link?.partner && t('partnerLink')]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </span>
              <span className="flex flex-col items-end text-right">
                <span className="text-[16px] font-extrabold whitespace-nowrap tabular-nums">
                  {vs(o.totalCents)}
                </span>
                {o.expectedCents !== null && (
                  <span className="text-[12.5px] font-semibold whitespace-nowrap text-bad-ink tabular-nums">
                    {t('expected', { price: vs(o.expectedCents) })}
                  </span>
                )}
              </span>
              {o.slug ? (
                // The provider page (C-034b): what our tests found. Above the phone row link.
                <a
                  href={localizedPath(providerPath(o.slug), locale)}
                  className="relative z-[2] col-span-2 col-start-2 justify-self-start rounded-badge underline-offset-2 hover:[&_span]:underline sm:col-span-1 sm:col-start-auto"
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
                    'col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto',
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
                    'lg:max-xl:w-9 lg:max-xl:px-0',
                    'max-sm:absolute max-sm:inset-0 max-sm:h-auto max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:z-[1] max-sm:p-0 max-sm:after:hidden',
                  )}
                >
                  {/* 1024–1279 px: the watch card takes the side, so the button is icon-only. */}
                  <span className="max-sm:sr-only lg:max-xl:sr-only">{t('toOffer')}</span>
                  <Icon icon={ArrowUpRight} size={16} className="max-sm:hidden" />
                </a>
              )}
              {/* No link for this row: keep the button column, so prices stay in one line. */}
              {hasLinks && !(bookable && o.link) && (
                <span aria-hidden="true" className="hidden sm:block" />
              )}
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
