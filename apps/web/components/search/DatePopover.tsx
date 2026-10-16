'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  dayDiff,
  formatPercent,
  monthOf,
  shiftDays,
  shiftMonths,
  weekdayMonFirst,
  type Locale,
  type RangeDraft,
} from '@tidaq/core';
import {
  PriceLegend,
  RangeCalendar,
  type CellPrice,
  type RangeCalendarLabels,
} from '@/components/calendar/RangeCalendar';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { cn } from '@/lib/cn';
import type { HotelNights } from './types';
import { usePanelSide } from './usePanelSide';

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
  tabs: string;
  tabExact: string;
  tabFlex: string;
  /** "Ein Wochenende im", followed by month chips. */
  flexTitle: string;
  /** With `{n}`: "für 2 Nächte". */
  flexTotal: string;
  flexCheapest: string;
  flexNone: string;
  /** Without a hotel: why there are no prices. */
  flexHint: string;
};

type Props = {
  id: string;
  /** Centre of the panel from the bar's left edge (its segment's centre), px; null: the middle. */
  anchorX: number | null;
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Esc: back to the dates segment. */
  onClose: () => void;
  /** "Weiter": on to the guests. */
  onNext: () => void;
  /** The picked hotel's nights and weekends; null without a hotel or while loading. */
  hotel: HotelNights | null;
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
  anchorX,
  checkIn,
  checkOut,
  onChange,
  onClose,
  onNext,
  hotel,
  today,
  locale,
  labels,
}: Props) {
  const [tab, setTab] = useState<'exact' | 'flex'>('exact');
  const [flexMonth, setFlexMonth] = useState(() => monthOf(today));
  const [draft, setDraft] = useState<RangeDraft>({
    checkIn,
    checkOut,
    phase: checkIn && !checkOut ? 'out' : 'in',
  });
  const intl = locale === 'de' ? 'de-DE' : 'en-GB';
  const fmt = useMemo(
    () => ({
      range: new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      weekend: new Intl.DateTimeFormat(intl, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
      monthName: new Intl.DateTimeFormat(intl, { month: 'long', timeZone: 'UTC' }),
    }),
    [intl],
  );
  const byNight = useMemo(() => new Map((hotel?.nights ?? []).map((n) => [n.night, n])), [hotel]);
  const hasPrices = byNight.size > 0;
  const price = (day: string): CellPrice | null => {
    const n = byNight.get(day);
    if (!n || n.vs === null) return null;
    const text = formatPercent(n.vs, locale, { signed: true });
    return { text, spoken: text, level: n.level };
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

  const side = usePanelSide<HTMLDivElement>(true);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      ref={side.ref}
      id={id}
      role="dialog"
      aria-label={labels.title}
      onKeyDown={onKeyDown}
      data-side={side.up ? 'up' : 'down'}
      style={{ left: anchorX ?? '50%' }}
      className="search-panel absolute top-[calc(100%+12px)] data-[side=up]:top-auto data-[side=up]:bottom-[calc(100%+12px)] z-30 w-[600px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-panel border border-line bg-surface p-5 shadow-3"
    >
      <Segmented
        label={labels.tabs}
        options={[
          { value: 'exact', label: labels.tabExact },
          { value: 'flex', label: labels.tabFlex },
        ]}
        value={tab}
        onChange={setTab}
        className="mx-auto mb-4 w-[240px]"
      />
      {tab === 'exact' ? (
        <>
          <div className="mb-2 flex min-h-6 items-center justify-between gap-4">
            <p aria-live="polite" className="text-[14px] font-semibold text-ink">
              {summary}
            </p>
            {hasPrices && <PriceLegend cheap={labels.legendCheap} dear={labels.legendDear} />}
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
            compact
          />
        </>
      ) : (
        <Flexible
          month={flexMonth}
          onMonth={setFlexMonth}
          hotel={hotel}
          today={today}
          locale={locale}
          fmt={fmt}
          labels={labels}
          onPick={(checkIn, checkOut) => {
            update({ checkIn, checkOut, phase: 'in' });
            onNext();
          }}
        />
      )}
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
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

type FlexProps = {
  month: string;
  onMonth: (month: string) => void;
  hotel: HotelNights | null;
  today: string;
  locale: Locale;
  fmt: {
    weekend: Intl.DateTimeFormat;
    monthName: Intl.DateTimeFormat;
  };
  labels: DatePopoverLabels;
  onPick: (checkIn: string, checkOut: string) => void;
};

const FLEX_MONTHS = 4;

/**
 * "Flexibel" (PREMIUM.md §9.1): "Ein Wochenende im [Okt.] [Nov.] …", then the 3 cheapest
 * Friday → Sunday stays of that month at the picked hotel as cards. Without a hotel: that
 * month's weekends without prices. A card sets the dates and moves on to the guests.
 */
function Flexible({ month, onMonth, hotel, today, locale, fmt, labels, onPick }: FlexProps) {
  const months = Array.from({ length: FLEX_MONTHS }, (_, i) => shiftMonths(monthOf(today), i));
  const at = months.indexOf(month);
  const priced = hotel !== null && hotel.nights.length > 0;
  const cards: { checkIn: string; checkOut: string; vs?: number }[] = priced
    ? hotel.weekends
        .filter((w) => w.checkIn.startsWith(month.slice(0, 7)))
        .sort((a, b) => a.vs - b.vs || a.checkIn.localeCompare(b.checkIn))
        .slice(0, 3)
    : fridays(month, today).map((f) => ({ checkIn: f, checkOut: shiftDays(f, 2) }));

  return (
    <div className="min-h-[200px]">
      {/* A month stepper instead of a row of pills (C-137). */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-[14px] font-semibold text-muted-ink">{labels.flexTitle}</span>
        <IconButton
          label={labels.prevMonth}
          onClick={() => onMonth(months[at - 1] ?? month)}
          disabled={at <= 0}
          className="size-9 disabled:opacity-30"
        >
          <Icon icon={ChevronLeft} size={18} />
        </IconButton>
        <span
          aria-live="polite"
          className="w-[110px] text-center text-[15px] font-semibold text-ink"
        >
          {fmt.monthName.format(utc(month))}
        </span>
        <IconButton
          label={labels.nextMonth}
          onClick={() => onMonth(months[at + 1] ?? month)}
          disabled={at >= months.length - 1}
          className="size-9 disabled:opacity-30"
        >
          <Icon icon={ChevronRight} size={18} />
        </IconButton>
      </div>
      {cards.length === 0 ? (
        <p className="mt-8 text-center text-small text-muted-ink">{labels.flexNone}</p>
      ) : (
        <ul className={cn('mt-4 grid gap-2.5', priced ? 'grid-cols-3' : 'grid-cols-4')}>
          {cards.map((c, i) => (
            <li key={c.checkIn}>
              <button
                type="button"
                onClick={() => onPick(c.checkIn, c.checkOut)}
                className={cn(
                  'flex h-full w-full flex-col items-start gap-1 rounded-card border border-line bg-surface p-3 text-left',
                  'transition-[box-shadow,border-color] duration-[var(--t-fast)] ease-out hover:border-line-strong hover:shadow-2',
                )}
              >
                {priced && i === 0 && (
                  <span className="mb-1 rounded-badge bg-good-soft px-2 py-0.5 text-[12px] font-bold text-good">
                    {labels.flexCheapest}
                  </span>
                )}
                <span className="text-[15px] font-semibold text-ink">
                  {fmt.weekend.formatRange(utc(c.checkIn), utc(c.checkOut))}
                </span>
                {c.vs !== undefined && (
                  <span className="text-small text-muted-ink">
                    <span className="text-[17px] font-semibold text-ink tabular-nums">
                      {formatPercent(c.vs, locale, { signed: true })}
                    </span>{' '}
                    {labels.flexTotal}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!priced && <p className="mt-4 text-center text-small text-muted-ink">{labels.flexHint}</p>}
    </div>
  );
}

/** The Fridays of `month` after `today`. */
function fridays(month: string, today: string): string[] {
  const out: string[] = [];
  for (let d = month; d.slice(0, 7) === month.slice(0, 7); d = shiftDays(d, 1)) {
    if (d > today && weekdayMonFirst(d) === 4) out.push(d);
  }
  return out;
}
