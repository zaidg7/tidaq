import { useId, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  areaPath,
  CHART,
  chartGeometry,
  formatDayMonth,
  formatPrice,
  linePath,
  type ChartGeometry,
  type DailyPrice,
  type Locale,
} from '@tidaq/core';
import { cn } from '@/lib/cn';
import { ChartScrub, type ScrubDay } from './ChartScrub';

type Props = {
  series: readonly DailyPrice[];
  /** x axis window, inclusive (`YYYY-MM-DD`). `to` should be today (Europe/Berlin). */
  from: string;
  to: string;
  /** Dashed average line, usually the 30-day average. */
  avgCents?: number | null;
  /** Best provider per day for the readout and the table, if known. */
  providerByDay?: Readonly<Record<string, string>>;
  /** Colour of today's dot: the verdict (PREMIUM.md §8). Default ink. */
  todayTone?: 'good' | 'normal' | 'high';
  className?: string;
};

const TONE = { good: 'var(--good)', normal: 'var(--ink)', high: 'var(--high)' } as const;

const pct = (f: number) => `${Math.round(f * 10_000) / 100}%`;
const LABEL = 'text-[11.5px] leading-none font-medium whitespace-nowrap text-muted tabular-nums';

/**
 * Price chart (CRAFT.md §3 Price chart), rendered on the server. Layout, all at a fixed height
 * (220 / 260 px) and full width:
 * - a left gutter sized to the longest price label, so labels never touch the line;
 * - the plot: lines and area in a stretched 1000 × 1000 SVG with non-scaling strokes, marks in
 *   percent, labels as HTML (text never scales);
 * - a readout row above the plot for the scrub chip, a legend for the average below it.
 * `ChartScrub` (client) adds pointer, touch and keyboard; a table is the non-visual fallback.
 */
export function PriceChart({
  series,
  from,
  to,
  avgCents = null,
  providerByDay,
  todayTone = 'normal',
  className,
}: Props) {
  const t = useTranslations('chart');
  const locale = useLocale() as Locale;
  const g = chartGeometry(series, { from, to, avgCents });
  const price = (cents: number) => formatPrice(cents, locale);
  const day = (d: string) => formatDayMonth(d, locale);

  const tickLabels = g.yTicks.map((tk) => price(tk.cents));
  const gutter = Math.ceil(Math.max(0, ...tickLabels.map((l) => l.length)) * 6.6) + 12;

  const summary =
    g.last && g.points.length > 0
      ? t('summary', {
          days: g.points.length,
          low: price((g.low ?? g.last).cents),
          lowDay: day((g.low ?? g.last).day),
          last: price(g.last.cents),
          lastDay: day(g.last.day),
        })
      : t('empty');

  const lastIndex = g.days.findIndex((d) => d.day === g.last?.day);
  const scrubDays: ScrubDay[] = g.days.map((d) => ({
    x: d.x,
    y: d.point?.y ?? null,
    date: day(d.day),
    cents: d.point?.cents ?? null,
    price: d.point ? price(d.point.cents) : null,
    provider: providerByDay?.[d.day] ?? null,
  }));

  return (
    <figure className={cn('flex flex-col', className)}>
      <div className="relative h-[256px] pt-9 md:h-[296px]">
        <div className="relative h-full" style={{ '--gutter': `${gutter}px` } as CSSProperties}>
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
            {g.yTicks.map((tk) => (
              <line
                key={tk.cents}
                x1={gutter}
                x2="100%"
                y1={pct(tk.y)}
                y2={pct(tk.y)}
                stroke="var(--line)"
                strokeWidth="1"
              />
            ))}
            {g.points.length === 0 && (
              <line
                x1="0"
                x2="100%"
                y1={pct(g.baseY)}
                y2={pct(g.baseY)}
                stroke="var(--line-strong)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )}
          </svg>
          <div aria-hidden="true">
            {g.yTicks.map((tk, i) => (
              <span
                key={tk.cents}
                className={cn(LABEL, 'absolute left-0 -translate-y-1/2')}
                style={{ top: pct(tk.y) }}
              >
                {tickLabels[i]}
              </span>
            ))}
          </div>
          <div className="absolute inset-y-0 right-2 left-[var(--gutter)]">
            <Plot g={g} summary={summary} locale={locale} t={t} todayColor={TONE[todayTone]} />
            {g.points.length > 0 && (
              <ChartScrub
                days={scrubDays}
                restIndex={lastIndex}
                labels={{
                  slider: t('scrub'),
                  noPrice: t('noPrice'),
                  today: g.lastIsCurrent ? t('today') : null,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-6">
        {g.usual && (
          <p className="text-meta flex min-h-11 items-center gap-2 text-muted">
            <span aria-hidden="true" className="h-3 w-[18px] shrink-0 rounded-[3px] bg-surface-2" />
            {t('usualLegend', { low: price(g.usual.lowCents), high: price(g.usual.highCents) })}
          </p>
        )}
        {g.avg && !g.usual && (
          <p className="text-meta flex min-h-11 items-center gap-2 text-muted-ink">
            <svg aria-hidden="true" width="18" height="2" className="shrink-0">
              <line
                x1="0"
                x2="18"
                y1="1"
                y2="1"
                stroke="var(--muted)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </svg>
            {t('avgLegend', { price: price(g.avg.cents) })}
          </p>
        )}

        {g.points.length > 0 && (
          <details className="group text-meta open:basis-full">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full font-semibold text-accent hover:underline [&::-webkit-details-marker]:hidden">
              <svg
                aria-hidden="true"
                viewBox="0 0 12 12"
                className="size-3 transition-transform group-open:rotate-90"
              >
                <path
                  d="M4 2l4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
              <span className="group-open:hidden">{t('table')}</span>
              <span className="hidden group-open:inline">{t('tableHide')}</span>
            </summary>
            <div className="mt-2 max-h-72 overflow-y-auto rounded-cell border border-line">
              <table className="w-full text-left tabular-nums">
                <caption className="sr-only">{summary}</caption>
                <thead className="sticky top-0 bg-surface-2 text-muted-ink">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      {t('date')}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      {t('price')}
                    </th>
                    {providerByDay && (
                      <th scope="col" className="px-3 py-2 font-semibold">
                        {t('provider')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...g.days].reverse().map((d) => (
                    <tr key={d.day} className="border-t border-line">
                      <td className="px-3 py-1.5">{day(d.day)}</td>
                      <td
                        className={cn(
                          'px-3 py-1.5 text-right',
                          d.point ? 'font-semibold' : 'text-muted-ink',
                        )}
                      >
                        {d.point ? price(d.point.cents) : t('noPrice')}
                      </td>
                      {providerByDay && (
                        <td className="px-3 py-1.5 text-muted-ink">{providerByDay[d.day] ?? ''}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </figure>
  );
}

type PlotProps = {
  g: ChartGeometry;
  summary: string;
  locale: Locale;
  t: ReturnType<typeof useTranslations<'chart'>>;
  todayColor: string;
};

function Plot({ g, summary, locale, t, todayColor }: PlotProps) {
  const gradientId = useId();
  const price = (cents: number) => formatPrice(cents, locale);
  const lowAlign = g.low && g.low.x > 0.8 ? '-100%' : g.low && g.low.x < 0.15 ? '0%' : '-50%';
  const singles = g.sparse
    ? g.points.filter((p) => !p.outlier)
    : g.segments.filter((s) => s.length === 1).flat();
  const outliers = g.points.filter((p) => p.outlier);

  return (
    <>
      <svg
        role="img"
        aria-label={summary}
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        {g.band && (
          <rect
            x={pct(g.band.x0)}
            y={pct(CHART.inset.top)}
            width={pct(Math.max(0, g.band.x1 - g.band.x0))}
            height={pct(g.baseY - CHART.inset.top)}
            rx="10"
            fill="var(--surface-2)"
            stroke="var(--line-strong)"
            strokeDasharray="4 4"
          />
        )}
        {g.usual && (
          <rect
            x="0"
            y={pct(g.usual.yTop)}
            width="100%"
            height={pct(g.usual.yBottom - g.usual.yTop)}
            rx="6"
            fill="var(--surface-2)"
          />
        )}
        {g.segments.some((seg) => seg.length > 1) && (
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            overflow="visible"
          >
            <defs>
              <linearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="0"
                y1={CHART.inset.top * 1000}
                y2={g.baseY * 1000}
              >
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.12" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {g.segments
              .filter((seg) => seg.length > 1)
              .map((seg) => (
                <g key={seg[0]?.day}>
                  <path
                    className="chart-area"
                    d={areaPath(seg, 1000, 1000, g.baseY)}
                    fill={`url(#${gradientId})`}
                  />
                  <path
                    className="chart-line"
                    pathLength={1}
                    d={linePath(seg, 1000, 1000)}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            {g.avg && !g.usual && (
              <line
                x1="0"
                x2="1000"
                y1={g.avg.y * 1000}
                y2={g.avg.y * 1000}
                stroke="var(--muted)"
                strokeWidth="1.25"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
        {singles
          .filter((p) => p.day !== g.last?.day || !g.lastIsCurrent)
          .map((p) => (
            <circle key={p.day} cx={pct(p.x)} cy={pct(p.y)} r="3.5" fill="var(--ink)" />
          ))}
        {g.low && !g.sparse && (
          <circle
            cx={pct(g.low.x)}
            cy={pct(g.low.y)}
            r="4.5"
            fill="var(--surface)"
            stroke="var(--good)"
            strokeWidth="2"
          />
        )}
        {g.last && g.lastIsCurrent && !g.last.outlier && (
          <g className="chart-today">
            <circle cx={pct(g.last.x)} cy={pct(g.last.y)} r="9" fill="var(--surface)" />
            <circle cx={pct(g.last.x)} cy={pct(g.last.y)} r="6" fill={todayColor} />
          </g>
        )}
        {g.last && !g.lastIsCurrent && !g.last.outlier && (
          <circle cx={pct(g.last.x)} cy={pct(g.last.y)} r="3.5" fill="var(--ink)" />
        )}
      </svg>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {g.points.length > 0 &&
          g.xTicks.map((tk, i) => (
            <span
              key={tk.day}
              // At phone width two middle dates would touch: the first one hides.
              className={cn(LABEL, 'absolute bottom-0.5', i === 1 && 'max-md:hidden')}
              style={{
                left: pct(tk.x),
                transform: `translateX(${i === 0 ? '0%' : i === g.xTicks.length - 1 ? '-100%' : '-50%'})`,
              }}
            >
              {formatDayMonth(tk.day, locale)}
            </span>
          ))}
        {g.usual && (
          <span
            className="chart-halo absolute left-1.5 text-[11px] leading-none font-semibold text-muted"
            style={{ top: pct(g.usual.yTop), transform: 'translateY(5px)' }}
          >
            {t('usual')}
          </span>
        )}
        {g.points.length === 0 && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center text-[13.5px] font-semibold text-muted-ink">
            {t('empty')}
          </span>
        )}
        {g.band &&
          (() => {
            const band = g.band;
            const text = t('stale', { since: formatDayMonth(band.since, locale) });
            // A wide band holds its label; a narrow one (a few stale days) gets it above, on one line.
            const wide = band.x1 - band.x0 >= 0.3;
            return (
              <span
                className={cn(
                  'absolute px-2 text-center text-[12.5px] leading-snug font-semibold text-muted-ink',
                  wide ? 'top-1/2' : 'whitespace-nowrap',
                )}
                style={
                  wide
                    ? {
                        left: pct((band.x0 + band.x1) / 2),
                        maxWidth: pct(band.x1 - band.x0),
                        transform: 'translate(-50%, -50%)',
                      }
                    : {
                        right: pct(1 - band.x1),
                        top: pct(CHART.inset.top),
                        transform: 'translate(8px, calc(-100% - 4px))',
                      }
                }
              >
                {text}
              </span>
            );
          })()}
        {outliers.map((p) => (
          <span
            key={p.day}
            className="chart-halo absolute flex items-center gap-0.5 text-[11.5px] leading-none font-bold whitespace-nowrap text-muted-ink tabular-nums"
            style={{
              left: pct(p.x),
              top: pct(p.y),
              transform: `translate(${p.x > 0.85 ? '-100%' : '-50%'}, ${p.outlier === 'high' ? '-100%' : '4px'})`,
            }}
          >
            {p.outlier === 'high' ? '↑' : '↓'} {price(p.cents)}
          </span>
        ))}
        {g.low && !g.sparse && (
          <span
            className="chart-halo absolute text-[12px] leading-none font-bold whitespace-nowrap text-good-ink tabular-nums"
            style={{
              left: pct(g.low.x),
              top: pct(g.low.y),
              transform: `translate(${lowAlign}, 12px)`,
            }}
          >
            {t('low', { price: price(g.low.cents) })}
          </span>
        )}
      </div>
    </>
  );
}
