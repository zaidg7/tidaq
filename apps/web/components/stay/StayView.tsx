import type { ReactNode } from 'react';
import { BellRing, CalendarClock, CalendarOff, CalendarX2, Lightbulb } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  addDays,
  cityPath,
  computeStayStats,
  dayDiff,
  formatDateRange,
  formatDayMonth,
  formatPercent,
  hotelPath,
  localizedPath,
  NIGHT_GRID,
  STATS,
  stayPath,
  verdictFacts,
  vsTypical,
  type DailyPrice,
  type Locale,
  type StayOffer,
  type StayParams,
  type StayStatsResult,
} from '@tidaq/core';
import { ChartRanges } from '@/components/chart/ChartRanges';
import { PhotoSheet } from '@/components/shell/PhotoSheet';
import { PriceChart } from '@/components/chart/PriceChart';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { StateChip } from '@/components/ui/StateChip';
import type { OtherStay, StayHotel } from '@/lib/data/stay';
import { cn } from '@/lib/cn';
import { cardPhoto } from '@/lib/photos';
import { routes } from '@/lib/routes';
import { CollectingState } from './CollectingState';
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
  others: OtherStay[];
  /** The latest day's reviewed providers (C-022b); `unreviewed` counts the hidden ones. */
  offers: { day: string | null; list: StayOffer[]; unreviewed: number };
  /** `YYYY-MM-DD` in German time. */
  today: string;
  /** The "Ändern" control with the prefilled search card (client). */
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
 * Stay page (C-022a, DESIGN.md §5): compact header → panel (verdict, 60-day chart, low/avg/high,
 * advice) → today's prices by provider → watch card → other dates at this hotel → how the verdict is
 * made. Every state has its own screen.
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
  others,
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
  const dates = formatDateRange(params.checkIn, params.checkOut, locale);
  const credit = hotel.image?.credit.replace(/^(Foto|Photo):\s*/i, '') ?? '';

  const pic = cardPhoto(hotel.slug, hotel.city.slug);
  const tag = pic?.city
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
      ));

  return (
    <PhotoSheet photo={pic?.photo ?? null} alt={hotel.name} tag={tag}>
      <div className="mx-auto w-full max-w-[1240px] px-[18px] pt-[26px] pb-16 md:px-10 md:pt-10 md:pb-24">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
                {t('allNights')}
              </a>
            </p>
            <h1 className="mt-1 text-[30px] leading-[1.12] font-semibold tracking-[-0.03em] md:text-[44px] md:leading-[1.06]">
              {hotel.name}
            </h1>
            {/* The stay as one line of text, not pills (C-137). */}
            <p className="mt-2.5 flex flex-wrap gap-x-2 text-[16px] text-muted-ink md:text-[17px]">
              <span className="font-semibold text-ink">{dates}</span>
              <span aria-hidden="true">·</span>
              <span>{t('stayFacts', { nights: params.nights, adults: params.adults })}</span>
            </p>
          </div>
          <div className="shrink-0">{edit}</div>
        </header>

        {drop && <div className="mt-6">{drop}</div>}

        {status === 'tracked' ? (
          <>
            <TrackedPanel
              series={series}
              params={params}
              today={today}
              providerByDay={providerByDay}
              updatedAt={updatedAt}
              now={now}
            />
            <HistoryNote
              history={history}
              realVsNights={realVsNights}
              nightsUnreliable={nightsUnreliable}
            />
          </>
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
          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
            <ProviderTable
              offers={offers.list}
              unreviewed={offers.unreviewed}
              day={offers.day}
              today={today}
              hotelSlug={hotel.slug}
              stay={{ checkIn: params.checkIn, checkOut: params.checkOut, adults: params.adults }}
            />
            <WatchCard hotel={hotel} params={params} locale={locale} />
          </div>
        )}

        {others.length > 0 && (
          <section aria-labelledby="others-title" className="mt-12">
            <h2 id="others-title" className="text-h3">
              {t('othersTitle')}
            </h2>
            <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o) => (
                <li key={`${o.checkIn}-${o.checkOut}-${o.adults}`}>
                  <OtherStayCard hotelSlug={hotel.slug} stay={o} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="method-title" className="mt-12 max-w-[40em]">
          <h2 id="method-title" className="text-[15px] font-bold">
            {t('methodTitle')}
          </h2>
          <p className="text-meta mt-1.5 text-muted-ink">{t('methodText')}</p>
        </section>
      </div>
    </PhotoSheet>
  );
}

function TrackedPanel({
  series,
  params,
  today,
  providerByDay,
  updatedAt,
  now,
}: {
  series: DailyPrice[];
  params: StayParams;
  today: string;
  providerByDay: Record<string, string>;
  updatedAt: string | null;
  now?: Date;
}) {
  const t = useTranslations('stay');
  const tAdvice = useTranslations('advice');
  const tc = useTranslations('chart');
  const stats = computeStayStats(series, today, params.checkIn);
  const collecting = stats.state === 'collecting';
  const facts = verdictFacts(series, today, stats.nowCents);
  // No euros from base rates (D-52, C-149): the chart reads in percent against the average.
  const base =
    stats.avg30Cents !== null && stats.avg30Cents > 0 ? stats.avg30Cents : stats.nowCents;

  return (
    <Card
      variant="float"
      radius="search"
      padded={false}
      className="mt-6 overflow-hidden lg:mt-8"
      data-scrub-scope=""
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8 lg:p-8">
        <VerdictBlock
          stats={stats}
          series={series}
          today={today}
          nights={params.nights}
          adults={params.adults}
          updatedAt={updatedAt}
          now={now}
        />
        {collecting ? (
          <PriceChart
            series={series}
            from={addDays(today, -(STATS.windowDays - 1))}
            to={today}
            base={base}
            providerByDay={providerByDay}
          />
        ) : (
          <ChartRanges
            label={tc('range')}
            panels={(
              [
                ['14', 14, tc('range14')],
                ['30', 30, tc('range30')],
                ['all', STATS.windowDays, tc('rangeAll')],
              ] as const
            ).map(([value, days, label]) => ({
              value,
              label,
              content: (
                <PriceChart
                  series={series}
                  from={addDays(today, -(days - 1))}
                  to={today}
                  avgCents={stats.avg30Cents}
                  base={base}
                  providerByDay={providerByDay}
                  todayTone={
                    stats.state === 'near_low' || stats.state === 'good'
                      ? 'good'
                      : stats.state === 'high'
                        ? 'high'
                        : 'normal'
                  }
                />
              ),
            }))}
          />
        )}
      </div>

      {collecting ? (
        <div className="border-t border-line bg-surface-2 p-5 lg:px-8">
          <CollectingState daysTracked={stats.daysTracked} verdictOn={facts.verdictOn} />
        </div>
      ) : (
        <>
          <StatsRow stats={stats} series={series} />
          <div className="flex gap-3 border-t border-line bg-surface-2 p-5 lg:px-8">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Icon icon={Lightbulb} size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold">{t('adviceTitle')}</h2>
              <p className="mt-0.5 text-fg">
                {tAdvice(stats.advice, { days: stats.daysTracked })}
                {stats.soon && <> {tAdvice('soon')}</>}
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

/**
 * Tief / Hoch against the 30-day average, each with the day it was seen (the latest such day),
 * and how many days we have prices for. Percent, not euros (D-52, C-149).
 */
function StatsRow({ stats, series }: { stats: StayStatsResult; series: DailyPrice[] }) {
  const t = useTranslations('stay');
  const locale = useLocale() as Locale;
  if (stats.lowCents === null || stats.highCents === null || stats.avg30Cents === null) return null;
  const lastDayWith = (cents: number | null) =>
    series.filter((p) => p.bestCents === cents).at(-1)?.day ?? null;
  const lowDay = lastDayWith(stats.lowCents);
  const highDay = lastDayWith(stats.highCents);
  const avg = stats.avg30Cents;
  const vs = (cents: number) =>
    formatPercent(vsTypical(cents, 1, avg) ?? 0, locale, { signed: true });

  const items = [
    {
      label: t('low'),
      value: vs(stats.lowCents),
      sub: lowDay && t('on', { date: formatDayMonth(lowDay, locale) }),
    },
    {
      label: t('high'),
      value: vs(stats.highCents),
      sub: highDay && t('on', { date: formatDayMonth(highDay, locale) }),
    },
    {
      label: t('tracked'),
      value: t('trackedDays', { n: stats.daysTracked }),
      sub: t('vsAvgNote'),
    },
  ];
  return (
    <dl
      aria-label={t('statsTitle', { days: stats.daysTracked })}
      className="grid grid-cols-3 divide-x divide-line border-t border-line"
    >
      {items.map((it) => (
        <div key={it.label} className="flex min-w-0 flex-col gap-0.5 px-3 py-4 sm:px-5 lg:px-8">
          <dt className="text-[12.5px] font-semibold text-muted-ink">{it.label}</dt>
          <dd className="flex flex-col gap-0.5">
            <span className="text-[16px] font-extrabold tracking-[-0.01em] whitespace-nowrap tabular-nums">
              {it.value}
            </span>
            {it.sub && <span className="text-[12px] text-muted-ink">{it.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * "Preis beobachten" (C-022b step 7): the alert sign-up comes with C-030 (double opt-in), so
 * until then the button is disabled and says so. No sticky mobile bar while it can't do anything.
 */
function WatchCard({
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
    <Card
      variant="float"
      className="flex flex-col gap-3 lg:mt-10"
      role="region"
      aria-labelledby="watch-title"
    >
      <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon icon={BellRing} size={20} />
      </span>
      <h2 id="watch-title" className="text-h3">
        {t('watchTitle')}
      </h2>
      <p className="text-[15px] text-muted-ink">{t('watchText')}</p>
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
    </Card>
  );
}

/**
 * Under the chart (C-070b, D-42): where the history comes from and, when today's real price for
 * these exact dates differs from the sum of the nights, by how much (percent, D-52). Facts only,
 * no adjustment.
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
  // Real checks need no note, unless the hotel's nights were left out on purpose (C-070d).
  if (history !== 'nights' && !nightsUnreliable) return null;
  return (
    <p className="text-meta mt-3 max-w-[44em] text-muted-ink">
      {history === 'nights' ? t('historyNights') : t('historyRealOnly')}{' '}
      {realVsNights && (
        <>
          {t('realVsNights', {
            pct: formatPercent(
              vsTypical(realVsNights.realCents, 1, realVsNights.nightsCents) ?? 0,
              locale,
              { signed: true },
            ),
          })}{' '}
        </>
      )}
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

function OtherStayCard({
  hotelSlug,
  stay,
  locale,
}: {
  hotelSlug: string;
  stay: OtherStay;
  locale: Locale;
}) {
  const t = useTranslations('stay');
  return (
    <Card interactive className="flex h-full flex-col gap-2">
      <a
        href={localizedPath(stayPath(hotelSlug, stay.checkIn, stay.checkOut, stay.adults), locale)}
        className="font-bold after:absolute after:inset-0"
      >
        {formatDateRange(stay.checkIn, stay.checkOut, locale)}
      </a>
      <p className="text-meta text-muted-ink">
        {t('stayFacts', { nights: dayDiff(stay.checkIn, stay.checkOut), adults: stay.adults })}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {/* No euros from base rates (D-52): the chip says how the price stands. */}
        {stay.bestCents === null && (
          <span className="text-meta text-muted-ink">{t('othersNoPrice')}</span>
        )}
        {/* No day count here, so a collecting stay gets no "0/7" chip. */}
        {stay.state && stay.state !== 'collecting' && <StateChip state={stay.state} size="sm" />}
      </div>
    </Card>
  );
}
