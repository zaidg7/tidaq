'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  dayRole,
  isSelectable,
  lastDay,
  monthOf,
  monthWeeks,
  moveFocus,
  pickDay,
  shiftDays,
  shiftMonths,
  type GridKey,
  type Locale,
  type RangeDraft,
} from '@tidaq/core';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export type RangeCalendarLabels = {
  prevMonth: string;
  nextMonth: string;
  today: string;
  checkIn: string;
  checkOut: string;
  /** With `{price}`; used when the calendar shows prices. */
  perNight?: string;
  /** Level names, cheapest first (5). */
  levels?: string[];
};

/** A night's price as shown in its cell ("412"), with its level 0 (cheap) … 4 (dear). */
export type CellPrice = { text: string; spoken: string; level: number | null };

type Props = {
  draft: RangeDraft;
  onDraft: (next: RangeDraft) => void;
  today: string;
  locale: Locale;
  labels: RangeCalendarLabels;
  /** Months side by side (1 or 2), or all of them stacked with `stacked`. */
  months: number;
  /** Phones: every month from today's on, one below the other, scrolled instead of paged. */
  stacked?: boolean;
  /** The night's price, or null (no price yet / beyond the grid). Without it: plain days. */
  price?: (day: string) => CellPrice | null;
  /** Put keyboard focus on the start day when the calendar mounts (popovers, sheets). */
  autoFocus?: boolean;
  className?: string;
};

const KEYS = new Set<string>([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);
/** Soft tints of the price-level scale until C-112 (PREMIUM.md §3.1). */
const LEVEL_CLASS = ['price-lvl-0', 'price-lvl-1', 'price-lvl-2', 'price-lvl-3', 'price-lvl-4'];
const intlLocale = (locale: Locale) => (locale === 'de' ? 'de-DE' : 'en-GB');
const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * The calendar engine (PREMIUM.md §11 PriceCalendar, C-108): one or two months as WAI-ARIA date
 * grids (arrows, Home/End, PageUp/PageDown, Enter/Space picks), weeks from Monday, past days and
 * stays over 30 nights not pickable. First pick = check-in, hovering previews the stay, second
 * pick = check-out. With `price`, each night shows its price, tinted by level, so the cheap
 * nights stand out (the text carries the price too: colour is never the only signal).
 */
export function RangeCalendar({
  draft,
  onDraft,
  today,
  locale,
  labels,
  months: wanted,
  stacked,
  price,
  autoFocus,
  className,
}: Props) {
  // Stacked: today's month through the last bookable day's month.
  const months = stacked
    ? Number(lastDay(today).slice(0, 4)) * 12 +
      Number(lastDay(today).slice(5, 7)) -
      (Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7))) +
      1
    : wanted;
  const [focusDay, setFocusDay] = useState(() => {
    const start =
      draft.phase === 'out' && draft.checkIn
        ? draft.checkOut || shiftDays(draft.checkIn, 1)
        : draft.checkIn || today;
    return start < today ? today : start > lastDay(today) ? lastDay(today) : start;
  });
  const [view, setView] = useState(() => (stacked ? monthOf(today) : monthOf(focusDay)));
  const [pointer, setPointer] = useState<string>();
  const grids = useRef<HTMLDivElement>(null);
  const moveDomFocus = useRef(Boolean(autoFocus));

  // Keep the focused day on screen: page the view when keyboard focus leaves it.
  const viewEnd = shiftMonths(view, months);
  useLayoutEffect(() => {
    if (focusDay < view) setView(monthOf(focusDay));
    else if (focusDay >= viewEnd) setView(shiftMonths(focusDay, 1 - months));
  }, [focusDay, view, viewEnd, months]);

  // DOM focus follows the focused day after opening and keyboard moves (not mouse paging).
  useEffect(() => {
    if (!moveDomFocus.current) return;
    const cell = grids.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`);
    if (cell) {
      cell.focus();
      moveDomFocus.current = false;
    }
  }, [focusDay, view]);

  const fmt = useMemo(() => {
    const l = intlLocale(locale);
    return {
      month: new Intl.DateTimeFormat(l, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      full: new Intl.DateTimeFormat(l, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      weekdayShort: new Intl.DateTimeFormat(l, { weekday: 'short', timeZone: 'UTC' }),
      weekdayLong: new Intl.DateTimeFormat(l, { weekday: 'long', timeZone: 'UTC' }),
    };
  }, [locale]);

  // Monday 12 Oct 2026 … Sunday 18 Oct 2026 give the weekday names.
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = utc(shiftDays('2026-10-12', i));
        return {
          short: fmt.weekdayShort.format(d).replace('.', '').slice(0, 2),
          long: fmt.weekdayLong.format(d),
        };
      }),
    [fmt],
  );

  const pick = (day: string) => {
    if (!isSelectable(day, today, draft)) return;
    onDraft(pickDay(draft, day));
  };

  const onGridKey = (e: KeyboardEvent<HTMLElement>, day: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(day);
      return;
    }
    if (!KEYS.has(e.key)) return;
    e.preventDefault();
    moveDomFocus.current = true;
    setFocusDay(moveFocus(day, e.key as GridKey, today, e.shiftKey));
  };

  const page = (step: number) => {
    const next = shiftMonths(view, step);
    setView(next);
    // Keep the roving tab stop inside the visible months.
    const end = shiftMonths(next, months);
    setFocusDay(focusDay < next || focusDay >= end ? (next < today ? today : next) : focusDay);
  };

  // The preview follows the pointer only over days that can be the check-out.
  const previewTo =
    pointer &&
    draft.phase === 'out' &&
    draft.checkIn &&
    pointer > draft.checkIn &&
    isSelectable(pointer, today, draft)
      ? pointer
      : undefined;

  const canPrev = view > monthOf(today);
  const canNext = viewEnd <= lastDay(today);
  const shown = Array.from({ length: months }, (_, i) => shiftMonths(view, i));

  const label = (day: string, role: ReturnType<typeof dayRole>) => {
    const parts = [fmt.full.format(utc(day))];
    if (day === today) parts.push(labels.today);
    if (role === 'start') parts.push(labels.checkIn);
    if (role === 'end') parts.push(labels.checkOut);
    const p = price && day >= today ? price(day) : null;
    if (p && labels.perNight) {
      parts.push(labels.perNight.replace('{price}', p.spoken));
      if (p.level !== null && labels.levels?.[p.level]) parts.push(labels.levels[p.level] ?? '');
    }
    return parts.join(', ');
  };

  return (
    <div ref={grids} className={cn('relative', className)}>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 flex justify-between',
          stacked && 'hidden',
        )}
      >
        <IconButton
          label={labels.prevMonth}
          onClick={() => page(-1)}
          disabled={!canPrev}
          className="pointer-events-auto disabled:opacity-30"
        >
          <Icon icon={ChevronLeft} />
        </IconButton>
        <IconButton
          label={labels.nextMonth}
          onClick={() => page(1)}
          disabled={!canNext}
          className="pointer-events-auto disabled:opacity-30"
        >
          <Icon icon={ChevronRight} />
        </IconButton>
      </div>
      <div className={cn('grid gap-8', !stacked && months === 2 && 'grid-cols-2')}>
        {shown.map((month) => (
          <MonthGrid
            key={month}
            month={month}
            heading={fmt.month.format(utc(month))}
            weekdays={weekdays}
            draft={draft}
            pointer={previewTo}
            focusDay={focusDay}
            today={today}
            price={price}
            stacked={stacked}
            label={label}
            onPick={pick}
            onKey={onGridKey}
            onPointer={setPointer}
            onFocusDay={setFocusDay}
          />
        ))}
      </div>
    </div>
  );
}

type GridProps = {
  month: string;
  heading: string;
  weekdays: { short: string; long: string }[];
  draft: RangeDraft;
  pointer?: string;
  focusDay: string;
  today: string;
  price?: (day: string) => CellPrice | null;
  stacked?: boolean;
  label: (day: string, role: ReturnType<typeof dayRole>) => string;
  onPick: (day: string) => void;
  onKey: (e: KeyboardEvent<HTMLElement>, day: string) => void;
  onPointer: (day: string | undefined) => void;
  onFocusDay: (day: string) => void;
};

/**
 * One month. Each day is a rounded tile: check-in and check-out filled `--ink` with white text,
 * the nights between `--surface-2`, a hovered tile gets an ink ring, today a quiet ring. Past
 * and out-of-range days stay focusable (so arrow keys can cross them) but can't be picked.
 */
function MonthGrid({
  month,
  heading,
  weekdays,
  draft,
  pointer,
  focusDay,
  today,
  price,
  stacked,
  label,
  onPick,
  onKey,
  onPointer,
  onFocusDay,
}: GridProps) {
  const headingId = useId();
  return (
    <div>
      <h3
        id={headingId}
        className={cn(
          'flex h-11 items-center text-[15px] font-semibold',
          // Phones: the month name stays on top while its days scroll by.
          stacked ? 'sticky top-0 z-10 bg-surface' : 'justify-center',
        )}
      >
        {heading}
      </h3>
      <table
        role="grid"
        aria-labelledby={headingId}
        className="mt-1 w-full table-fixed border-separate border-spacing-[3px]"
        onMouseLeave={() => onPointer(undefined)}
      >
        <thead>
          <tr>
            {weekdays.map((w) => (
              <th
                key={w.long}
                scope="col"
                abbr={w.long}
                className="h-8 text-[12px] font-medium text-muted-ink"
              >
                {w.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthWeeks(month).map((week, row) => (
            <tr key={row}>
              {week.map((day, col) => {
                if (!day) return <td key={col} role="gridcell" aria-hidden="true" />;
                const role = dayRole(day, draft, pointer);
                const selectable = isSelectable(day, today, draft);
                const end = role === 'start' || role === 'end';
                const inside = role === 'between' || role === 'preview';
                const p = price && day >= today ? price(day) : null;
                return (
                  <td
                    key={day}
                    role="gridcell"
                    data-day={day}
                    tabIndex={day === focusDay ? 0 : -1}
                    aria-selected={end || role === 'between'}
                    aria-disabled={!selectable || undefined}
                    aria-label={label(day, role)}
                    onClick={() => onPick(day)}
                    onKeyDown={(e) => onKey(e, day)}
                    onFocus={() => {
                      onFocusDay(day);
                      onPointer(day);
                    }}
                    onMouseEnter={() => onPointer(day)}
                    className={cn(
                      'rounded-cell p-0 text-center align-middle tabular-nums outline-none',
                      price ? 'h-[52px]' : 'h-11',
                      'transition-[background-color,box-shadow,color] duration-[var(--t-fast)] ease-out',
                      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                      selectable ? 'cursor-pointer' : 'cursor-default',
                      end
                        ? 'bg-ink text-white'
                        : inside
                          ? role === 'preview'
                            ? 'bg-surface-2/70 text-ink'
                            : 'bg-surface-2 text-ink'
                          : p?.level != null
                            ? LEVEL_CLASS[p.level]
                            : 'text-ink',
                      !end && selectable && 'hover:shadow-[inset_0_0_0_1.5px_var(--ink)]',
                      day === today && !end && 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'block text-[14px] leading-tight font-semibold',
                        !selectable && !end && 'font-normal text-disabled-ink',
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                    {price && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-0.5 block text-[11px] leading-tight font-medium',
                          end ? 'text-white/80' : 'text-muted-ink',
                        )}
                      >
                        {p?.text ?? ' '}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "günstiger ▮▮▮▮▮ teurer": the 5-step scale as a legend under a calendar with prices. */
export function PriceLegend({ cheap, dear }: { cheap: string; dear: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-medium text-muted-ink">
      <span>{cheap}</span>
      <span aria-hidden="true" className="flex gap-0.5">
        {LEVEL_CLASS.map((c) => (
          <span key={c} className={cn('h-3 w-5 rounded-[4px]', c)} />
        ))}
      </span>
      <span>{dear}</span>
    </div>
  );
}
