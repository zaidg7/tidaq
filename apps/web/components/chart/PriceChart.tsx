import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  areaPath,
  chartGeometry,
  formatDayMonth,
  formatPrice,
  linePath,
  type ChartGeometry,
  type DailyPrice,
  type Locale,
} from '@tidaq/core';
import { cn } from '@/lib/cn';
import { ChartScrub, type ScrubPoint } from './ChartScrub';

type Props = {
  series: readonly DailyPrice[];
  /** x axis window, inclusive (`YYYY-MM-DD`). */
  from: string;
  to: string;
  /** Dashed average line, usually the 30-day average. */
  avgCents?: number | null;
  /** Best provider per day for the tooltip, if known. */
  providerByDay?: Readonly<Record<string, string>>;
  className?: string;
};

/**
 * 60-day price chart (CRAFT.md §3 Price chart), rendered on the server as SVG. Accent line,
 * guarded y-domain, low and today markers, dashed average, gaps for missing days, dots only
 * below 7 points. A small client layer adds scrub, keyboard and tooltip; a table is the fallback.
 */
export function PriceChart({ series, from, to, avgCents = null, providerByDay, className }: Props) {
  const t = useTranslations('chart');
  const locale = useLocale() as Locale;
  const g = chartGeometry(series, { from, to, avgCents });
  const price = (cents: number) => formatPrice(cents, locale);

  const summary =
    g.low && g.last
      ? t('summary', {
          days: g.points.length,
          low: price(g.low.cents),
          lowDay: formatDayMonth(g.low.day, locale),
          last: price(g.last.cents),
          lastDay: formatDayMonth(g.last.day, locale),
        })
      : t('empty');

  const scrubPoints: ScrubPoint[] = g.points.map((p) => ({
    x: p.x,
    y: p.y,
    date: formatDayMonth(p.day, locale),
    price: price(p.cents),
    provider: providerByDay?.[p.day] ?? null,
  }));

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <div className="relative select-none">
        <ChartSvg
          g={g}
          summary={summary}
          locale={locale}
          labels={{
            low: g.low ? t('low', { price: price(g.low.cents) }) : '',
            avg: g.avg ? t('avg', { price: price(g.avg.cents) }) : '',
            building: t('building'),
          }}
        />
        {g.points.length > 0 && (
          <ChartScrub points={scrubPoints} label={t('scrub')} lastIndex={scrubPoints.length - 1} />
        )}
      </div>
      {g.points.length > 0 && (
        <details className="group text-meta">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full font-semibold text-accent hover:underline">
            {t('table')}
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
                </tr>
              </thead>
              <tbody>
                {[...g.points].reverse().map((p) => (
                  <tr key={p.day} className="border-t border-line">
                    <td className="px-3 py-1.5">{formatDayMonth(p.day, locale)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{price(p.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}

type SvgProps = {
  g: ChartGeometry;
  summary: string;
  locale: Locale;
  labels: { low: string; avg: string; building: string };
};

/** Percent string for SVG attributes and CSS. */
const pct = (f: number) => `${Math.round(f * 10_000) / 100}%`;

/**
 * One SVG at a fixed pixel height (220 / 260) and full width. Lines and area live in an inner
 * 1000 × 1000 layer stretched to the box (`preserveAspectRatio="none"`, non-scaling strokes);
 * markers and grid use percent coordinates and labels are HTML, so text and dots keep their
 * exact size at every width.
 */
function ChartSvg({ g, summary, locale, labels }: SvgProps) {
  const gradientId = useId();
  const price = (cents: number) => formatPrice(cents, locale);
  // The low label goes below the low point: it is the lowest mark, so that space is always free.
  const lowAlign = g.low && g.low.x > 0.8 ? '-100%' : g.low && g.low.x < 0.15 ? '0%' : '-50%';
  // The "Ø" pill sits beside the average line, on the side away from where the line ends, so it
  // never covers today's dot.
  const avgAbove = g.avg && g.last ? g.last.y >= g.avg.y : true;
  const tick =
    'chart-halo absolute text-[11.5px] leading-none font-semibold whitespace-nowrap text-muted-ink tabular-nums';

  return (
    <div className="relative h-[220px] md:h-[260px]">
      <svg
        role="img"
        aria-label={summary}
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {g.yTicks.map((t) => (
          <line
            key={t.cents}
            x1="0"
            x2="100%"
            y1={pct(t.y)}
            y2={pct(t.y)}
            stroke="var(--line)"
            strokeWidth="1"
          />
        ))}
        {g.sparse ? null : (
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            overflow="visible"
          >
            {g.segments.map((seg) =>
              seg.length > 1 ? (
                <g key={seg[0]?.day}>
                  <path d={areaPath(seg, 1000, 1000, g.baseY)} fill={`url(#${gradientId})`} />
                  <path
                    d={linePath(seg, 1000, 1000)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.25"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ) : null,
            )}
            {g.avg && (
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
        {/* Single days between gaps, and every day while sparse, are dots. */}
        {(g.sparse ? g.points : g.segments.filter((s) => s.length === 1).flat()).map((p) => (
          <circle
            key={p.day}
            cx={pct(p.x)}
            cy={pct(p.y)}
            r={g.sparse ? 3.5 : 2.5}
            fill="var(--accent)"
          />
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
        {g.last && (
          <circle
            cx={pct(g.last.x)}
            cy={pct(g.last.y)}
            r="5"
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth="3"
          />
        )}
      </svg>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {g.yTicks.map((t) => (
          <span
            key={t.cents}
            className={tick}
            style={{ left: 2, top: pct(t.y), transform: 'translateY(-150%)' }}
          >
            {price(t.cents)}
          </span>
        ))}
        {g.xTicks.map((t, i) => (
          <span
            key={t.day}
            className={tick}
            style={{
              left: pct(t.x),
              bottom: 2,
              transform: `translateX(${i === 0 ? '0%' : i === g.xTicks.length - 1 ? '-100%' : '-50%'})`,
            }}
          >
            {formatDayMonth(t.day, locale)}
          </span>
        ))}
        {g.sparse && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[13px] font-semibold text-muted-ink">
            {labels.building}
          </span>
        )}
        {g.avg && !g.sparse && (
          <span
            className="absolute right-0 rounded-full border border-line bg-surface px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-muted-ink tabular-nums"
            style={{
              top: pct(g.avg.y),
              transform: avgAbove ? 'translateY(calc(-100% - 4px))' : 'translateY(4px)',
            }}
          >
            {labels.avg}
          </span>
        )}
        {g.low && !g.sparse && (
          <span
            className="chart-halo absolute text-[12px] leading-none font-bold whitespace-nowrap text-good-ink tabular-nums"
            style={{
              left: pct(g.low.x),
              top: pct(g.low.y),
              transform: `translate(${lowAlign}, 12px)`,
            }}
          >
            {labels.low}
          </span>
        )}
      </div>
    </div>
  );
}
