import type { ReactNode } from 'react';
import { BellRing, CalendarClock, CalendarOff, CalendarX2, Lightbulb } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  addDays,
  computeStayStats,
  dayDiff,
  formatDateRange,
  formatDayMonth,
  formatPrice,
  hotelPath,
  localizedPath,
  NIGHT_GRID,
  STATS,
  stayPath,
  verdictFacts,
  type DailyPrice,
  type Locale,
  type StayOffer,
  type StayParams,
  type StayStatsResult,
} from '@tidaq/core';
import { PriceChart } from '@/components/chart/PriceChart';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PriceText } from '@/components/ui/PriceText';
import { StateChip } from '@/components/ui/StateChip';
import type { OtherStay, StayHotel } from '@/lib/data/stay';
import { routes } from '@/lib/routes';
import { CollectingState } from './CollectingState';
import { ProviderTable } from './ProviderTable';
import { VerdictBlock } from './VerdictBlock';

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
}: Props) {
  const t = useTranslations('stay');
  const locale = useLocale() as Locale;
  const dates = formatDateRange(params.checkIn, params.checkOut, locale);
  const credit = hotel.image?.credit.replace(/^(Foto|Photo):\s*/i, '') ?? '';

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-6 pb-16 md:px-7 lg:pt-10 lg:pb-[88px]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-3 sm:gap-x-4">
        {hotel.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted 160 px thumbnail (C-011c)
          <img
            src={hotel.image.src}
            alt=""
            width={64}
            height={64}
            decoding="async"
            className="bg-placeholder size-14 shrink-0 rounded-cell object-cover lg:size-16"
          />
        ) : (
          <span
            aria-hidden="true"
            className="bg-placeholder size-14 shrink-0 rounded-cell lg:size-16"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow text-accent">{hotel.city.name[locale]}</p>
          <h1 className="text-title mt-1">{hotel.name}</h1>
          <p className="text-meta mt-1 text-muted-ink">
            {dates} · {t('stayFacts', { nights: params.nights, adults: params.adults })}
          </p>
          <a
            href={localizedPath(hotelPath(hotel.slug), locale)}
            className="text-meta mt-1.5 inline-block font-semibold text-accent underline-offset-2 hover:underline"
          >
            {t('allNights')}
          </a>
        </div>
        {edit}
      </header>

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
          {status === 'untracked' && nightsUnreliable && (
            <Notice icon={CalendarClock} title={t('realOnlyTitle')} text={t('realOnlyText')} />
          )}
          {status === 'untracked' && !nightsUnreliable && (
            <Notice
              icon={CalendarClock}
              title={
                params.adults === NIGHT_GRID.adults
                  ? t('untrackedTitle')
                  : t('untrackedGuestsTitle', { adults: params.adults })
              }
              text={
                params.adults === NIGHT_GRID.adults
                  ? t('untrackedText', { days: NIGHT_GRID.windowDays })
                  : t('untrackedGuestsText', { adults: NIGHT_GRID.adults })
              }
            />
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
          />
          <WatchCard />
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
        {hotel.image && (
          <p className="mt-3 text-[12px] text-muted-ink">
            {hotel.image.sourceUrl ? (
              <a
                href={hotel.image.sourceUrl}
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
      </section>
    </div>
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
  const stats = computeStayStats(series, today, params.checkIn);
  const collecting = stats.state === 'collecting';
  const facts = verdictFacts(series, today, stats.nowCents);

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
        <PriceChart
          series={series}
          from={addDays(today, -(STATS.windowDays - 1))}
          to={today}
          avgCents={collecting ? null : stats.avg30Cents}
          providerByDay={providerByDay}
        />
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

/** Tief / Ø 30 Tage / Hoch, each with the day it was seen (the latest such day). */
function StatsRow({ stats, series }: { stats: StayStatsResult; series: DailyPrice[] }) {
  const t = useTranslations('stay');
  const locale = useLocale() as Locale;
  if (stats.lowCents === null || stats.highCents === null || stats.avg30Cents === null) return null;
  const lastDayWith = (cents: number | null) =>
    series.filter((p) => p.bestCents === cents).at(-1)?.day ?? null;
  const lowDay = lastDayWith(stats.lowCents);
  const highDay = lastDayWith(stats.highCents);
  const avgDays = Math.min(stats.daysTracked, 30);

  const items = [
    {
      label: t('low'),
      cents: stats.lowCents,
      sub: lowDay && t('on', { date: formatDayMonth(lowDay, locale) }),
    },
    { label: t('avg'), cents: stats.avg30Cents, sub: t('avgDays', { n: avgDays }) },
    {
      label: t('high'),
      cents: stats.highCents,
      sub: highDay && t('on', { date: formatDayMonth(highDay, locale) }),
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
            <PriceText cents={it.cents} locale={locale} size="md" />
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
function WatchCard() {
  const t = useTranslations('stay');
  return (
    <Card variant="float" className="flex flex-col gap-3 lg:mt-10">
      <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon icon={BellRing} size={20} />
      </span>
      <h2 className="text-h3">{t('watchTitle')}</h2>
      <p className="text-[15px] text-muted-ink">{t('watchText')}</p>
      <Button disabled block className="mt-1">
        {t('watchSoon')}
      </Button>
    </Card>
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
  // Real checks need no note, unless the hotel's nights were left out on purpose (C-070d).
  if (history !== 'nights' && !nightsUnreliable) return null;
  return (
    <p className="text-meta mt-3 max-w-[44em] text-muted-ink">
      {history === 'nights' ? t('historyNights') : t('historyRealOnly')}{' '}
      {realVsNights && (
        <>
          {t('realVsNights', {
            real: formatPrice(realVsNights.realCents, locale),
            nights: formatPrice(realVsNights.nightsCents, locale),
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
        {stay.bestCents !== null ? (
          <PriceText cents={stay.bestCents} locale={locale} size="md" />
        ) : (
          <span className="text-meta text-muted-ink">{t('othersNoPrice')}</span>
        )}
        {/* No day count here, so a collecting stay gets no "0/7" chip. */}
        {stay.state && stay.state !== 'collecting' && <StateChip state={stay.state} size="sm" />}
      </div>
    </Card>
  );
}
