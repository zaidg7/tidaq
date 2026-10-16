'use client';

import { useEffect, useRef, useState } from 'react';
import { CHART_SCRUB_EVENT, type ChartScrubDetail } from '@/components/chart/ChartScrub';
import { formatPercent, vsTypical, type Locale } from '@tidaq/core';
import { PriceText } from '@/components/ui/PriceText';
import { cn } from '@/lib/cn';

type Props = {
  cents: number;
  locale: Locale;
  /** Show the price against this one in percent, no euros (C-149, D-52). */
  base?: number | null;
  /** ["gesamt · 592 € pro Nacht", "2 Nächte, 2 Erwachsene"]: breaks only between the parts. */
  restLine: [string, string];
  /** Templates with `{date}`, already translated on the server. */
  scrubbedLine: string;
  noPriceLine: string;
};

/**
 * The XL price of the verdict block. While the chart in the same `[data-scrub-scope]` is
 * scrubbed it shows that day's price, and snaps back on release (CRAFT.md §3 Interaction).
 * With a `base` it shows the percent against it instead of euros.
 */
export function VerdictPrice({
  cents,
  locale,
  base = null,
  restLine,
  scrubbedLine,
  noPriceLine,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<ChartScrubDetail>(null);

  useEffect(() => {
    const scope = root.current?.closest('[data-scrub-scope]');
    if (!scope) return;
    const onScrub = (e: Event) => {
      const detail = (e as CustomEvent<ChartScrubDetail>).detail;
      setScrub(detail);
      // The rest of the block describes today: it fades while another day is shown.
      scope.toggleAttribute('data-scrubbing', detail !== null);
    };
    scope.addEventListener(CHART_SCRUB_EVENT, onScrub);
    return () => scope.removeEventListener(CHART_SCRUB_EVENT, onScrub);
  }, []);

  return (
    <div ref={root} className="flex flex-col gap-1">
      {scrub && scrub.cents === null ? (
        // A day without a price never borrows today's price.
        <span className="text-price-xl text-muted-ink">–</span>
      ) : base !== null ? (
        <span className={cn('text-price-xl whitespace-nowrap', scrub && 'text-accent')}>
          {formatPercent(vsTypical(scrub?.cents ?? cents, 1, base) ?? 0, locale, { signed: true })}
        </span>
      ) : (
        <PriceText
          locale={locale}
          cents={scrub?.cents ?? cents}
          size="xl"
          className={scrub ? 'text-accent' : undefined}
        />
      )}
      <p className="text-meta text-muted-ink">
        {scrub ? (
          (scrub.cents === null ? noPriceLine : scrubbedLine).replace('{date}', scrub.date)
        ) : (
          <>
            <span className="whitespace-nowrap">{restLine[0]}</span> ·{' '}
            <span className="whitespace-nowrap">{restLine[1]}</span>
          </>
        )}
      </p>
    </div>
  );
}
