'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { dayDiff, type Locale, type RangeDraft } from '@tidaq/core';
import {
  PriceLegend,
  RangeCalendar,
  type CellPrice,
  type RangeCalendarLabels,
} from '@/components/calendar/RangeCalendar';
import { Button } from '@/components/ui/Button';
import type { HotelNights } from './types';

export type DatePopoverLabels = RangeCalendarLabels & {
  title: string;
  chooseIn: string;
  chooseOut: string;
  nightsOne: string;
  /** With `{n}`. */
  nightsOther: string;
  clear: string;
  next: string;
  legendCheap: string;
  legendDear: string;
  /** Shown above the calendar when it carries a hotel's prices. */
  pricesNote: string;
};

type Props = {
  id: string;
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Esc: back to the dates segment. */
  onClose: () => void;
  /** "Weiter": on to the guests. */
  onNext: () => void;
  /** The picked hotel's nights; null without a hotel or while loading. */
  nights: HotelNights['nights'] | null;
  today: string;
  locale: Locale;
  labels: DatePopoverLabels;
};

const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * "Reisedaten" popover (PREMIUM.md §9.1, C-108): two months under the bar. With a hotel picked,
 * every night shows its price and level, so the cheap nights are visible at a glance. Header
 * counts the nights, footer "Daten löschen" and "Weiter" (on to the guests).
 */
export function DatePopover({
  id,
  checkIn,
  checkOut,
  onChange,
  onClose,
  onNext,
  nights,
  today,
  locale,
  labels,
}: Props) {
  const [draft, setDraft] = useState<RangeDraft>({
    checkIn,
    checkOut,
    phase: checkIn && !checkOut ? 'out' : 'in',
  });
  const intl = locale === 'de' ? 'de-DE' : 'en-GB';
  const fmt = useMemo(
    () => ({
      cell: new Intl.NumberFormat(intl, { maximumFractionDigits: 0 }),
      money: new Intl.NumberFormat(intl, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
      range: new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    }),
    [intl],
  );
  const byNight = useMemo(() => new Map((nights ?? []).map((n) => [n.night, n])), [nights]);
  const hasPrices = byNight.size > 0;
  const price = (day: string): CellPrice | null => {
    const n = byNight.get(day);
    if (!n || n.cents === null) return null;
    const euros = Math.round(n.cents / 100);
    return { text: fmt.cell.format(euros), spoken: fmt.money.format(euros), level: n.level };
  };

  const update = (next: RangeDraft) => {
    setDraft(next);
    onChange(next.checkIn, next.checkOut);
  };

  const count = draft.checkIn && draft.checkOut ? dayDiff(draft.checkIn, draft.checkOut) : 0;
  const summary =
    count > 0
      ? `${count === 1 ? labels.nightsOne : labels.nightsOther.replace('{n}', String(count))} · ${fmt.range.formatRange(utc(draft.checkIn), utc(draft.checkOut))}`
      : draft.phase === 'out' && draft.checkIn
        ? labels.chooseOut
        : labels.chooseIn;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      id={id}
      role="dialog"
      aria-label={labels.title}
      onKeyDown={onKeyDown}
      className="search-panel absolute top-[calc(100%+12px)] left-1/2 z-30 w-[760px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-panel border border-line bg-surface p-6 shadow-3"
    >
      <div className="mb-3 flex min-h-6 items-center justify-between gap-4">
        <p aria-live="polite" className="text-[15px] font-semibold text-ink">
          {summary}
        </p>
        {hasPrices && (
          <div className="flex items-center gap-4">
            <span className="text-small text-muted-ink">{labels.pricesNote}</span>
            <PriceLegend cheap={labels.legendCheap} dear={labels.legendDear} />
          </div>
        )}
      </div>
      <RangeCalendar
        draft={draft}
        onDraft={update}
        today={today}
        locale={locale}
        labels={labels}
        months={2}
        price={hasPrices ? price : undefined}
        autoFocus
      />
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <Button
          variant="subtle"
          size="sm"
          disabled={!draft.checkIn && !draft.checkOut}
          onClick={() => update({ checkIn: '', checkOut: '', phase: 'in' })}
        >
          {labels.clear}
        </Button>
        <Button size="sm" onClick={onNext}>
          {labels.next}
        </Button>
      </div>
    </div>
  );
}
