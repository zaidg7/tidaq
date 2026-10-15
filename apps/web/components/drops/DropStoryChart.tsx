import { formatDayMonth, formatPrice, storyChart, type DailyPrice, type Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';

type Labels = {
  /** Over the line's start: "sonst um 2.500 €" or "gestern 2.500 €". */
  start: string;
  /** At today's dot: "heute 1.139 €". */
  today: string;
  /** Right end of the axis: "heute". */
  axisToday: string;
  /** The whole story in one sentence for screen readers. */
  label: string;
};

/**
 * The drop page's story chart (mockup B "So hat sich der Preis bewegt"): the night's price from
 * the first check to today, the earlier days as a calm ink line, the drop as one green step down
 * to a green dot, a soft violet area underneath. Two labels say everything: where it started and
 * where it is today. The line is drawn in a stretched SVG (non-scaling stroke), labels and the
 * dot are HTML on top, so text keeps its size at every width. It reveals left to right once.
 */
export function DropStoryChart({
  series,
  today,
  locale,
  labels,
}: {
  series: readonly DailyPrice[];
  today: string;
  locale: Locale;
  labels: Labels;
}) {
  const chart = storyChart(series, today);
  if (!chart) return null;
  const pts = chart.points;
  const last = pts.at(-1);
  const prev = pts.at(-2);
  const first = pts[0];
  if (!last || !prev || !first) return null;
  const X = (x: number) => (x * 1000).toFixed(1);
  const Y = (y: number) => (y * 1000).toFixed(1);
  const ink = pts
    .slice(0, -1)
    .map((p, i) => `${i ? 'L' : 'M'}${X(p.x)} ${Y(p.y)}`)
    .join(' ');
  const area = `${pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x)} ${Y(p.y)}`).join(' ')} L1000 1000 L0 1000 Z`;
  // The start label sits above the line's first stretch, the today label above the dot.
  const startTop = Math.min(first.y, pts[1]?.y ?? first.y);

  return (
    <figure className="rounded-card border border-[#ece9f1] bg-surface px-3.5 pt-[18px] pb-2.5 md:px-6 md:pt-6 md:pb-4">
      <div
        role="img"
        aria-label={labels.label}
        className="story-reveal relative h-[150px] md:h-[220px]"
      >
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
        >
          <path d={area} fill="var(--surface-accent)" />
          {pts.length > 2 && (
            <path
              d={ink}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={`M${X(prev.x)} ${Y(prev.y)} L${X(last.x)} ${Y(last.y)}`}
            fill="none"
            stroke="var(--good)"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden="true"
          className="story-dot absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-good shadow-1"
          style={{ left: `${last.x * 100}%`, top: `${last.y * 100}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 -translate-y-full pb-2 text-[13px] whitespace-nowrap text-muted"
          style={{ top: `${startTop * 100}%` }}
        >
          {labels.start}
        </span>
        {/* Under the dot when the line comes down into it, above it when it comes up. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-0 text-[14px] font-bold whitespace-nowrap text-good',
            prev.y <= last.y ? 'pt-3' : '-translate-y-full pb-3',
          )}
          style={{ top: `${last.y * 100}%` }}
        >
          {labels.today}
        </span>
      </div>
      <figcaption
        aria-hidden="true"
        className="mt-2 flex justify-between text-[12px] text-muted md:text-[13px]"
      >
        <span>{formatDayMonth(chart.from, locale)}</span>
        <span>{labels.axisToday}</span>
      </figcaption>
    </figure>
  );
}

/** "sonst um 2.500 €" when the usual price is known, else yesterday's: the chart's start label. */
export function storyStart(
  usual: number | null,
  prevCents: number,
  locale: Locale,
  t: (key: 'chartUsual' | 'chartYesterday', v: { price: string }) => string,
): string {
  return usual !== null
    ? t('chartUsual', { price: formatPrice(usual, locale) })
    : t('chartYesterday', { price: formatPrice(prevCents, locale) });
}
