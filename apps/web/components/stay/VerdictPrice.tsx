'use client';

import { useEffect, useRef, useState } from 'react';
import { CHART_SCRUB_EVENT, type ChartScrubDetail } from '@/components/chart/ChartScrub';
import { Price } from '@/components/ui/Price';

type Props = {
  cents: number;
  /** "gesamt · 592 € pro Nacht · 2 Nächte, 2 Erwachsene" */
  restLine: string;
  /** Templates with `{date}`, already translated on the server. */
  scrubbedLine: string;
  noPriceLine: string;
};

/**
 * The XL price of the verdict block. While the chart in the same `[data-scrub-scope]` is
 * scrubbed it shows that day's price, and snaps back on release (CRAFT.md §3 Interaction).
 */
export function VerdictPrice({ cents, restLine, scrubbedLine, noPriceLine }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<ChartScrubDetail>(null);

  useEffect(() => {
    const scope = root.current?.closest('[data-scrub-scope]');
    if (!scope) return;
    const onScrub = (e: Event) => setScrub((e as CustomEvent<ChartScrubDetail>).detail);
    scope.addEventListener(CHART_SCRUB_EVENT, onScrub);
    return () => scope.removeEventListener(CHART_SCRUB_EVENT, onScrub);
  }, []);

  const shown = scrub?.cents ?? cents;
  const line = scrub
    ? (scrub.cents === null ? noPriceLine : scrubbedLine).replace('{date}', scrub.date)
    : restLine;

  return (
    <div ref={root} className="flex flex-col gap-1">
      <Price cents={shown} size="xl" className={scrub ? 'text-accent' : undefined} />
      <p className="text-meta text-muted-ink">{line}</p>
    </div>
  );
}
