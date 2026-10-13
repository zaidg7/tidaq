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

/** Two drawing sizes (CRAFT.md: 220 mobile / 260 desktop); geometry is shared as fractions. */
const SIZES = {
  mobile: { w: 350, h: 220, className: 'md:hidden' },
  desktop: { w: 680, h: 260, className: 'hidden md:block' },
} as const;

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
        {(['mobile', 'desktop'] as const).map((size) => (
          <ChartSvg
            key={size}
            g={g}
            size={size}
            summary={summary}
            locale={locale}
            labels={{
              low: g.low ? t('low', { price: price(g.low.cents) }) : '',
              avg: g.avg ? t('avg', { price: price(g.avg.cents) }) : '',
              building: t('building'),
            }}
          />
        ))}
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
  size: keyof typeof SIZES;
  summary: string;
  locale: Locale;
  labels: { low: string; avg: string; building: string };
};

function ChartSvg({ g, size, summary, locale, labels }: SvgProps) {
  const { w, h, className } = SIZES[size];
  const gradientId = `${useId()}-${size}`;
  const X = (f: number) => Math.round(f * w * 100) / 100;
  const Y = (f: number) => Math.round(f * h * 100) / 100;
  const price = (cents: number) => formatPrice(cents, locale);
  // Keep the low label inside the box: anchor it to the side with more room.
  const lowAnchor = g.low && g.low.x > 0.75 ? 'end' : g.low && g.low.x < 0.2 ? 'start' : 'middle';
  const lowBelow = g.low ? g.low.y < 0.5 : true;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={summary}
      className={cn('block h-auto w-full overflow-visible', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {g.yTicks.map((tick) => (
        <g key={tick.cents}>
          <line x1="0" x2={w} y1={Y(tick.y)} y2={Y(tick.y)} stroke="var(--line)" strokeWidth="1" />
          <text
            x="2"
            y={Y(tick.y) - 5}
            className="fill-muted-ink text-[11.5px] font-semibold tabular-nums"
          >
            {price(tick.cents)}
          </text>
        </g>
      ))}

      {g.xTicks.map((tick, i) => (
        <text
          key={tick.day}
          x={X(tick.x)}
          y={h - 4}
          textAnchor={i === 0 ? 'start' : i === g.xTicks.length - 1 ? 'end' : 'middle'}
          className="fill-muted-ink text-[11.5px] font-semibold tabular-nums"
        >
          {formatDayMonth(tick.day, locale)}
        </text>
      ))}

      {g.sparse ? (
        <>
          <rect
            x={X(0.02)}
            y={Y(0.38)}
            width={X(0.96)}
            height={Y(0.3)}
            rx="12"
            fill="none"
            stroke="var(--line-strong)"
            strokeDasharray="4 4"
          />
          <text
            x={X(0.5)}
            y={Y(0.53) + 4}
            textAnchor="middle"
            className="fill-muted-ink text-[13px] font-semibold"
          >
            {labels.building}
          </text>
          {g.points.map((p) => (
            <circle key={p.day} cx={X(p.x)} cy={Y(p.y)} r="3.5" fill="var(--accent)" />
          ))}
        </>
      ) : (
        g.segments.map((seg) => (
          <g key={seg[0]?.day}>
            {seg.length > 1 && (
              <path d={areaPath(seg, w, h, g.baseY)} fill={`url(#${gradientId})`} />
            )}
            {seg.length > 1 ? (
              <path
                d={linePath(seg, w, h)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.25"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : (
              <circle cx={X(seg[0]?.x ?? 0)} cy={Y(seg[0]?.y ?? 0)} r="2.5" fill="var(--accent)" />
            )}
          </g>
        ))
      )}

      {g.avg && !g.sparse && (
        <g>
          <line
            x1="0"
            x2={w}
            y1={Y(g.avg.y)}
            y2={Y(g.avg.y)}
            stroke="var(--muted)"
            strokeWidth="1.25"
            strokeDasharray="4 4"
          />
          <AvgPill x={w - 2} y={Y(g.avg.y)} text={labels.avg} />
        </g>
      )}

      {g.low && !g.sparse && (
        <g>
          <circle
            cx={X(g.low.x)}
            cy={Y(g.low.y)}
            r="4.5"
            fill="var(--surface)"
            stroke="var(--good)"
            strokeWidth="2"
          />
          <text
            x={X(g.low.x)}
            y={Y(g.low.y) + (lowBelow ? 20 : -11)}
            textAnchor={lowAnchor}
            className="fill-good-ink text-[12px] font-bold tabular-nums"
            stroke="var(--surface)"
            strokeWidth="4"
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {labels.low}
          </text>
        </g>
      )}

      {g.last && (
        <circle
          cx={X(g.last.x)}
          cy={Y(g.last.y)}
          r="5"
          fill="var(--accent)"
          stroke="var(--surface)"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}

/** "Ø 1.204 €" in a white pill at the right end of the average line. */
function AvgPill({ x, y, text }: { x: number; y: number; text: string }) {
  const width = text.length * 6.6 + 14;
  return (
    <g>
      <rect
        x={x - width}
        y={y - 10}
        width={width}
        height="20"
        rx="10"
        fill="var(--surface)"
        stroke="var(--line)"
      />
      <text
        x={x - width / 2}
        y={y + 4}
        textAnchor="middle"
        className="fill-muted-ink text-[11.5px] font-semibold tabular-nums"
      >
        {text}
      </text>
    </g>
  );
}
