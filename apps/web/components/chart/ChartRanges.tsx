'use client';

import { useState, type ReactNode } from 'react';
import { Segmented } from '@/components/ui/Segmented';

export type ChartRange = '14' | '30' | 'all';

type Props = {
  /** Accessible name of the switch, e.g. "Zeitraum". */
  label: string;
  /** One server-rendered chart per range; the first one listed with `value === initial` shows. */
  panels: readonly { value: ChartRange; label: string; content: ReactNode }[];
  initial?: ChartRange;
};

/**
 * Range switch for the price history (PREMIUM.md §8: 14 T · 30 T · Alles). The charts are rendered
 * on the server for every range; this only shows one, so switching is instant and the scrub keeps
 * working. Hidden panels are `hidden`, so they are out of the tab order and the scrub's reach.
 */
export function ChartRanges({ label, panels, initial = '30' }: Props) {
  const [range, setRange] = useState<ChartRange>(initial);
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label={label}
        options={panels.map((p) => ({ value: p.value, label: p.label }))}
        value={range}
        onChange={setRange}
        className="w-[216px] self-end"
      />
      {panels.map((p) => (
        <div key={p.value} hidden={p.value !== range}>
          {p.content}
        </div>
      ))}
    </div>
  );
}
