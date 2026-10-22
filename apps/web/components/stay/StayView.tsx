import type { ReactNode } from 'react';
import { ArrowUpRight, BellRing, CalendarClock, CalendarOff, CalendarX2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  addDays,
  cityPath,
  computeStayStats,
  daysBetween,
  formatPrice,
  goPath,
  hotelPath,
  localizedPath,
  NIGHT_GRID,
  rankOffers,
  STATS,
  stayPath,
  type DailyPrice,
  type Locale,
  type StayOffer,
  type StayParams,
} from '@tidaq/core';
import { ChartRanges, type ChartRange } from '@/components/chart/ChartRanges';
import { PriceChart } from '@/components/chart/PriceChart';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/components/ui/Photo';
import type { StayHotel } from '@/lib/data/stay';
import { cn } from '@/lib/cn';
import { cardPhoto } from '@/lib/photos';
import { routes } from '@/lib/routes';
import { ProviderTable } from './ProviderTable';
import { VerdictBlock } from './VerdictBlock';
import { WatchForm, type WatchFormLabels } from './WatchForm';

/**
 * What the page can say about this stay:
 * - `tracked`: we have prices (a verdict from 7 days, collecting before that);
 * - `no_data`: tracked, but no reviewed price yet;
 * - `untracked`: we don't track these dates and guests (C-022c will create them on demand);
 * - `past`: check-in is before today;
 * - `inactive`: the hotel is no longer tracked.
 */
export type StayStatus = 'tracked' | 'no_data' | 'untracked' | 'past' | 'inactive';

export function stayStatus(
  hotelActive: boolean,
  tracked: boolean,
  series: readonly DailyPrice[],
  checkIn: string,
  today: string,
): StayStatus {
  if (!hotelActive) return 'inactive';
  if (checkIn < today) return 'past';
  if (!tracked) return 'untracked';
  return series.length ? 'tracked' : 'no_data';
}

type Props = {
  hotel: StayHotel;
  params: StayParams;
  status: StayStatus;
  series: DailyPrice[];
  providerByDay: Record<string, string>;
  updatedAt: string | null;
  /** Where the history comes from (C-070b): summed single nights or real checks of the stay. */
  history?: 'nights' | 'stay' | null;
  /** Today's real price differs from the nights' sum by more than 3 % (shown as a note). */
  realVsNights?: { realCents: number; nightsCents: number } | null;
  /** Single nights mislead at this hotel (C-070d): only real checks of the stay count. */
  nightsUnreliable?: boolean;
  /** The latest day's reviewed providers (C-022b); `unreviewed` counts the hidden ones. */
  offers: { day: string | null; list: StayOffer[]; unreviewed: number };
  /** `YYYY-MM-DD` in German time. */
  today: string;
  /** The dates line that opens the prefilled search card (client, `EditStay`). */
  edit: ReactNode;
  /** For the dev page and tests; defaults to the request time. */
  now?: Date;
  /** This stay dropped since yesterday (C-080i): the callout under the header. */
  drop?: ReactNode;
  /**
   * What `request_stay` answered for these dates (C-132a), so an untracked stay says what really
   * happens: checked from now on, no room today, or nothing (bots, past the 365-day limit).
   */
  request?: 'created' | 'tracked' | 'full' | 'invalid' | null;
};

/**
 * Stay page (C-022a, rebuilt in C-174 after the page blueprint): compact header (small photo,
 * name, the dates line as the change button) → price panel (verdict once, main booking button,
 * chart) → today's prices by site, full width → the Price Alert band. Every state has its own
 * screen.
 */
export function StayView({
  hotel,
  params,
  status,
  series,
  providerByDay,
  updatedAt,
  history = null,
  realVsNights = null,
  nightsUnreliable = false,
  offers,
  today,
  edit,
  now,
  drop = null,
  request = null,
}: Props) {
  const t = useTranslations('stay');
  const tp = useTranslations('photo');
  const locale = useLocale() as Locale;
  const credit = hotel.image?.credit.replace(/^(Foto|Photo):\s*/i, '') ?? '';
  const pic = cardPhoto(hotel.slug, hotel.city.slug);
  const main = status === 'tracked' ? mainOffer(offers.list, params.checkIn >= today) : null;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-6 pb-16 md:px-10 md:pt-10 md:pb-24">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Photo
            photo={pic?.photo ?? null}
            alt=""
            sizes="72px"
            priority
            className="size-14 shrink-0 rounded-[14px] md:size-[72px] md:rounded-[18px]"
          />
          <div className="min-w-0">
            <p className="text-[14px] text-muted md:text-[15px]">
              <a
                href={localizedPath(cityPath(hotel.city.slug), locale)}
                className="underline-offset-2 hover:text-ink hover:underline"
              >
                {hotel.city.name[locale]}
              </a>{' '}
              ·{' '}
              <a
                href={localizedPath(hotelPath(hotel.slug), locale)}
                className="underline-offset-2 hover:text-ink hover:underline"
              >
                {t('aboutHotel')}
              </a>
            </p>
            <h1 className="mt-0.5 text-[26px] leading-[1.12] font-semibold tracking-[-0.03em] md:text-[38px] md:leading-[1.08]">
              {hotel.name}
            </h1>
          </div>
        </div>
        {edit}
      </header>

      {drop && <div className="mt-6">{drop}</div>}

      {status === 'tracked' ? (
        <TrackedPanel
          series={series}
          params={params}
          today={today}
          providerByDay={providerByDay}
          updatedAt={updatedAt}
          now={now}
          action={
            main && (
              <a
                href={goPath(main.link.slug, hotel.slug, params, locale)}
                target="_blank"
                rel="sponsored nofollow noopener"
                className={cn(
                  buttonClasses({ size: 'lg', block: true }),
                  'scrub-fade max-sm:px-4 max-sm:text-[16px]',
                )}
              >
                <span className="min-w-0 truncate">
                  {main.isDirect ? t('bookDirect') : t('book', { provider: main.name })} ·{' '}
                  <span className="tabular-nums">{formatPrice(main.totalCents, locale)}</span>
                </span>
                <Icon icon={ArrowUpRight} size={18} className="shrink-0 max-[379px]:hidden" />
              </a>
            )
          }
          updatedNote={main?.link.partner ? t('partnerLink') : undefined}
          note={
            <HistoryNote
              history={history}
              realVsNights={realVsNights}
              nightsUnreliable={nightsUnreliable}
            />
          }
        />
      ) : status === 'no_data' ? (
        <Card variant="float" radius="search" className="mt-6 lg:mt-8 lg:p-8">
          <Notice title={t('noDataTitle')} text={t('noDataText')} />
        </Card>
      ) : (
        <Card variant="float" radius="search" className="mt-6 lg:mt-8 lg:p-8">
          {status === 'untracked' && (
            <Notice
              icon={CalendarClock}
              title={
                nightsUnreliable
                  ? t('realOnlyTitle')
                  : params.adults === NIGHT_GRID.adults
                    ? t('untrackedTitle')
                    : t('untrackedGuestsTitle', { adults: params.adults })
              }
              text={
                nightsUnreliable
                  ? t('realOnlyText')
                  : params.adults === NIGHT_GRID.adults
                    ? t('untrackedText', { days: NIGHT_GRID.windowDays })
                    : t('untrackedGuestsText', { adults: NIGHT_GRID.adults })
              }
            >
              {(request === 'created' || request === 'tracked') && (
                <>
                  <p className="max-w-[34em] text-[15px] font-semibold text-ink">
                    {t('requestCreated')}
                  </p>
                  <a
                    href={localizedPath(
                      stayPath(hotel.slug, params.checkIn, params.checkOut, params.adults),
                      locale,
                    )}
                    className={cn(buttonClasses({ variant: 'ghost' }), 'mt-4')}
                  >
                    {t('retry')}
                  </a>
                </>
              )}
              {request === 'full' && (
                <p className="max-w-[34em] text-[15px] font-semibold text-ink">
                  {t('requestFull')}
                </p>
              )}
            </Notice>
          )}
          {status === 'past' && (
            <Notice icon={CalendarX2} title={t('pastTitle')} text={t('pastText')} />
          )}
          {status === 'inactive' && (
            <Notice icon={CalendarOff} title={t('inactiveTitle')} text={t('inactiveText')}>
              <a
                href={localizedPath(routes.home, locale)}
                className={buttonClasses({ variant: 'ghost' })}
              >
                {t('home')}
              </a>
            </Notice>
          )}
        </Card>
      )}

      {status === 'tracked' && (
        <>
          <ProviderTable
            className="mt-12"
            offers={offers.list}
            unreviewed={offers.unreviewed}
            day={offers.day}
            today={today}
            hotelSlug={hotel.slug}
            stay={{ checkIn: params.checkIn, checkOut: params.checkOut, adults: params.adults }}
          />
          <AlertBand hotel={hotel} params={params} locale={locale} />
        </>
      )}

      {(pic?.city || hotel.image) && (
        <p className="mt-12 text-[12px] text-muted">
          {pic?.city
            ? tp('cityTag')
            : hotel.image &&
              (hotel.image.sourceUrl ? (
                <a
                  href={hotel.image.sourceUrl}
                  className="underline-offset-2 hover:underline"
                  rel="noopener"
                >
                  {t('photoCredit', { credit })}
                </a>
              ) : (
                t('photoCredit', { credit })
              ))}
        </p>
      )}
    </div>
  );
}

/**
 * The main button (blueprint rule 1): the cheapest partner we can link to for these dates (only
 * partners get links, D-54). Null for past stays or when no partner has a price.
 */
function mainOffer(offers: StayOffer[], bookable: boolean) {
  if (!bookable) return null;
  const linked = rankOffers(offers).filter(
    (o): o is typeof o & { link: NonNullable<StayOffer['link']> } => o.link !== undefined,
  );
  return linked[0] ?? null;
}

function TrackedPanel({
  series,
  params,
  today,
  providerByDay,
  updatedAt,
  now,
  action,
  updatedNote,
  note,
}: {
  series: DailyPrice[];
  params: StayParams;
  today: string;
  providerByDay: Record<string, string>;
  updatedAt: string | null;
  now?: Date;
  action?: ReactNode;
  updatedNote?: string;
  note?: ReactNode;
}) {
  const tc = useTranslations('chart');
  const stats = computeStayStats(series, today, params.checkIn);
  const tone =
    stats.state === 'near_low' || stats.state === 'good'
      ? 'good'
      : stats.state === 'high'
        ? 'high'
        : 'normal';
  // Only ranges that show more than the shorter one: 30 T and Alles look the same with 20 days.
  const span = series[0] ? daysBetween(series[0].day, today) + 1 : 0;
  const ranges = (
    [
      ['14', 14, tc('range14')],
      ['30', 30, tc('range30')],
      ['all', STATS.windowDays, tc('rangeAll')],
    ] as const
  ).filter((_, i, all) => i === 0 || span > (all[i - 1]?.[1] ?? Infinity));
  const chart = (days: number) => (
    <PriceChart
      series={series}
      from={addDays(today, -(days - 1))}
      to={today}
      providerByDay={providerByDay}
      todayTone={tone}
    />
  );
  const initial: ChartRange = ranges.some(([v]) => v === '30') ? '30' : '14';

  return (
    <Card
      variant="float"
      radius="search"
      padded={false}
      className="mt-6 lg:mt-8"
      data-scrub-scope=""
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 lg:p-8">
        <VerdictBlock
          stats={stats}
          series={series}
          today={today}
          nights={params.nights}
          adults={params.adults}
          updatedAt={updatedAt}
          now={now}
          action={action}
          updatedNote={updatedNote}
        />
        <div className="flex min-w-0 flex-col">
          {ranges.length > 1 ? (
            <ChartRanges
              label={tc('range')}
              initial={initial}
              panels={ranges.map(([value, days, label]) => ({
                value,
                label,
                content: chart(days),
              }))}
            />
          ) : (
            chart(STATS.windowDays)
          )}
          {note}
        </div>
      </div>
    </Card>
  );
}

/**
 * The Price Alert band (blueprint rule 6): full width at the end of the main content, one
 * sentence, email, button. Never a sidebar next to the prices.
 */
function AlertBand({
  hotel,
  params,
  locale,
}: {
  hotel: { slug: string; name: string };
  params: StayParams;
  locale: Locale;
}) {
  const t = useTranslations('stay');
  const results: WatchFormLabels['results'] = {
    sent: t('watchResults.sent'),
    added: t('watchResults.added'),
    invalid: t('watchResults.invalid'),
    too_many: t('watchResults.too_many'),
    too_soon: t('watchResults.too_soon'),
    rate_limited: t('watchResults.rate_limited'),
    bot: t('watchResults.bot'),
    bad_price: t('watchResults.bad_price'),
    error: t('watchResults.error'),
  };
  return (
    <section
      aria-labelledby="watch-title"
      className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-5 rounded-card bg-accent-soft p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:p-8"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent">
          <Icon icon={BellRing} size={20} />
        </span>
        <div className="min-w-0">
          <h2 id="watch-title" className="text-h3">
            {t('alertTitle')}
          </h2>
          <p className="mt-1 text-[15px] text-muted-ink">{t('alertText')}</p>
        </div>
      </div>
      <WatchForm
        hotel={hotel}
        checkIn={params.checkIn}
        checkOut={params.checkOut}
        adults={params.adults}
        locale={locale}
        labels={{
          email: t('watchEmail'),
          target: t('watchTarget'),
          targetHint: t('watchTargetHint'),
          consent: t('watchConsent'),
          privacy: t('watchPrivacy'),
          privacyHref: localizedPath(routes.privacy, locale),
          submit: t('watchSubmit'),
          results,
          preview: t('watchPreview'),
        }}
      />
    </section>
  );
}

/**
 * Under the chart (C-070b, D-42): where the history comes from and, when today's real price for
 * these exact dates differs from the sum of the nights, both numbers. Facts only, no adjustment.
 */
function HistoryNote({
  history,
  realVsNights,
  nightsUnreliable,
}: {
  history: 'nights' | 'stay' | null;
  realVsNights: { realCents: number; nightsCents: number } | null;
  nightsUnreliable: boolean;
}) {
  const t = useTranslations('stay');
  const locale = useLocale() as Locale;
  // One line, only when it says something about this stay (C-174): the generic "how the history
  // is built" lives on the method page.
  const fact =
    history === 'nights' && realVsNights
      ? t('realVsNights', {
          real: formatPrice(realVsNights.realCents, locale),
          nights: formatPrice(realVsNights.nightsCents, locale),
        })
      : history !== 'nights' && nightsUnreliable
        ? t('historyRealOnly')
        : null;
  if (!fact) return null;
  return (
    <p className="text-meta mt-1 text-muted-ink">
      {fact}{' '}
      <a
        href={localizedPath(routes.method, locale)}
        className="font-semibold text-accent underline-offset-2 hover:underline"
      >
        {t('historyHow')}
      </a>
    </p>
  );
}

function Notice({
  icon = CalendarClock,
  title,
  text,
  className,
  children,
}: {
  icon?: typeof CalendarClock;
  title: string;
  text: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={className}>
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon icon={icon} size={24} />
      </span>
      <h2 className="text-h3 mt-4">{title}</h2>
      <p className="mt-1 max-w-[34em] text-[15px] text-muted-ink">{text}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
