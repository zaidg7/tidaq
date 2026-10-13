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
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  dayDiff,
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
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export type PickerLabels = {
  title: string;
  close: string;
  prevMonth: string;
  nextMonth: string;
  /** Hints in the footer while a date is missing. */
  chooseIn: string;
  chooseOut: string;
  done: string;
  clear: string;
  checkIn: string;
  checkOut: string;
  today: string;
  nightsOne: string;
  /** With `{n}`. */
  nightsOther: string;
};

type Props = {
  /** Which end the picker opens on; null = closed. */
  openOn: 'in' | 'out' | null;
  onClose: () => void;
  checkIn: string;
  checkOut: string;
  /** Called on every click, so the search card always shows the current choice. */
  onChange: (checkIn: string, checkOut: string) => void;
  today: string;
  locale: Locale;
  labels: PickerLabels;
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
const WIDE = '(min-width: 768px)';

const intlLocale = (locale: Locale) => (locale === 'de' ? 'de-DE' : 'en-GB');
const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/** Two months side by side from 768 px, one month below. */
function useMonthCount(): 1 | 2 {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide ? 2 : 1;
}

/**
 * Date range picker (C-021b): a modal <dialog> (focus trap, Esc, inert page), shown as a bottom
 * sheet on phones and a centred card with two months from 768 px. Weeks start on Monday, past
 * days and stays over 30 nights can't be picked, the footer counts the nights. Keyboard: the
 * WAI-ARIA date grid (arrows, Home/End, PageUp/PageDown, Enter or Space picks).
 */
export function DateRangePicker({
  openOn,
  onClose,
  checkIn,
  checkOut,
  onChange,
  today,
  locale,
  labels,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // A layout effect: it runs before the body's effects, so the day it focuses is already shown.
  useLayoutEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (openOn && !el.open) el.showModal();
    if (!openOn && el.open) el.close();
  }, [openOn]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="date-sheet"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself, not on its content.
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
    >
      {openOn && (
        <PickerBody
          titleId={titleId}
          initial={{
            checkIn,
            checkOut,
            phase: openOn === 'out' && checkIn ? 'out' : 'in',
          }}
          onChange={onChange}
          onDone={() => dialog.current?.close()}
          today={today}
          locale={locale}
          labels={labels}
        />
      )}
    </dialog>
  );
}

type BodyProps = {
  titleId: string;
  initial: RangeDraft;
  onChange: (checkIn: string, checkOut: string) => void;
  onDone: () => void;
  today: string;
  locale: Locale;
  labels: PickerLabels;
};

function PickerBody({ titleId, initial, onChange, onDone, today, locale, labels }: BodyProps) {
  const months = useMonthCount();
  const [draft, setDraft] = useState<RangeDraft>(initial);
  const [focusDay, setFocusDay] = useState(() => {
    const start =
      initial.phase === 'out'
        ? initial.checkOut || shiftDays(initial.checkIn, 1)
        : initial.checkIn || today;
    return start < today ? today : start > lastDay(today) ? lastDay(today) : start;
  });
  const [view, setView] = useState(() => monthOf(focusDay));
  const [pointer, setPointer] = useState<string>();
  const grids = useRef<HTMLDivElement>(null);
  const moveDomFocus = useRef(true);

  // Keep the focused day on screen: page the view when keyboard focus leaves it.
  const viewEnd = shiftMonths(view, months);
  useLayoutEffect(() => {
    if (focusDay < view) setView(monthOf(focusDay));
    else if (focusDay >= viewEnd) setView(shiftMonths(focusDay, 1 - months));
  }, [focusDay, view, viewEnd, months]);

  // Focus follows the focused day after opening and keyboard moves (not after mouse paging).
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
      short: new Intl.DateTimeFormat(l, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
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
    const next = pickDay(draft, day);
    setDraft(next);
    onChange(next.checkIn, next.checkOut);
  };

  const clear = () => {
    setDraft({ checkIn: '', checkOut: '', phase: 'in' });
    onChange('', '');
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
    const candidate = focusDay < next || focusDay >= end ? (next < today ? today : next) : focusDay;
    setFocusDay(candidate);
  };

  const nights = draft.checkIn && draft.checkOut ? dayDiff(draft.checkIn, draft.checkOut) : 0;
  const nightsText = (n: number) =>
    n === 1 ? labels.nightsOne : labels.nightsOther.replace('{n}', String(n));
  const summary =
    nights > 0
      ? `${fmt.short.format(utc(draft.checkIn))} – ${fmt.short.format(utc(draft.checkOut))} · ${nightsText(nights)}`
      : draft.phase === 'out' && draft.checkIn
        ? labels.chooseOut
        : labels.chooseIn;

  const canPrev = view > monthOf(today);
  const canNext = viewEnd <= lastDay(today);
  const shown = Array.from({ length: months }, (_, i) => shiftMonths(view, i));

  return (
    <div className="flex max-h-[inherit] flex-col">
      <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" />
      <div className="flex items-center justify-between gap-3 px-5 pt-3 md:px-6 md:pt-5">
        <h2 id={titleId} className="text-h3">
          {labels.title}
        </h2>
        <IconButton label={labels.close} onClick={onDone} className="-mr-2">
          <Icon icon={X} />
        </IconButton>
      </div>

      <div
        ref={grids}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-3 md:px-6"
      >
        <div className="pointer-events-none absolute inset-x-2 top-1 flex justify-between md:inset-x-4">
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
        <div className="grid gap-8 md:grid-cols-2">
          {shown.map((month) => (
            <MonthGrid
              key={month}
              month={month}
              heading={fmt.month.format(utc(month))}
              weekdays={weekdays}
              draft={draft}
              pointer={pointer}
              focusDay={focusDay}
              today={today}
              label={(day, role) => {
                const parts = [fmt.full.format(utc(day))];
                if (day === today) parts.push(labels.today);
                if (role === 'start') parts.push(labels.checkIn);
                if (role === 'end') parts.push(labels.checkOut);
                return parts.join(', ');
              }}
              onPick={pick}
              onKey={onGridKey}
              onPointer={setPointer}
              onFocusDay={setFocusDay}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-6 md:pb-4">
        <p aria-live="polite" className="min-w-0 text-[14px] leading-snug font-semibold text-fg">
          {summary}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {(draft.checkIn || draft.checkOut) && (
            <Button variant="subtle" size="sm" onClick={clear}>
              {labels.clear}
            </Button>
          )}
          <Button size="sm" onClick={onDone}>
            {labels.done}
          </Button>
        </div>
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
  label: (day: string, role: ReturnType<typeof dayRole>) => string;
  onPick: (day: string) => void;
  onKey: (e: KeyboardEvent<HTMLElement>, day: string) => void;
  onPointer: (day: string | undefined) => void;
  onFocusDay: (day: string) => void;
};

/**
 * One month as an ARIA grid. The nights between check-in and check-out form one soft band; the
 * two ends are filled accent circles. Past and out-of-range days stay focusable (so arrow keys
 * can cross them) but can't be picked.
 */
function MonthGrid({
  month,
  heading,
  weekdays,
  draft,
  pointer,
  focusDay,
  today,
  label,
  onPick,
  onKey,
  onPointer,
  onFocusDay,
}: GridProps) {
  const headingId = useId();
  const weeks = monthWeeks(month);
  const hasEnd =
    Boolean(draft.checkOut) || (draft.phase === 'out' && !!pointer && pointer > draft.checkIn);

  return (
    <div>
      <h3 id={headingId} className="flex h-11 items-center justify-center text-[15px] font-bold">
        {heading}
      </h3>
      <table
        role="grid"
        aria-labelledby={headingId}
        className="mt-1 w-full table-fixed border-collapse"
        onMouseLeave={() => onPointer(undefined)}
      >
        <thead>
          <tr>
            {weekdays.map((w) => (
              <th
                key={w.long}
                scope="col"
                abbr={w.long}
                className="h-8 text-[12px] font-semibold text-muted-ink"
              >
                {w.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, row) => (
            <tr key={row}>
              {week.map((day, col) => {
                if (!day) return <td key={col} role="gridcell" aria-hidden="true" />;
                const role = dayRole(day, draft, pointer);
                const selectable = isSelectable(day, today, draft);
                const end = role === 'start' || role === 'end';
                // The band runs from the start's centre to the end's centre.
                const band =
                  role === 'between' || role === 'preview'
                    ? 'inset-x-0'
                    : role === 'start' && hasEnd
                      ? 'left-1/2 right-0'
                      : role === 'end'
                        ? 'left-0 right-1/2'
                        : null;
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
                      'group relative h-11 p-0 text-center outline-none',
                      selectable ? 'cursor-pointer' : 'cursor-default',
                    )}
                  >
                    {band && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute inset-y-1',
                          band,
                          role === 'preview' ? 'bg-accent-soft/60' : 'bg-accent-soft',
                        )}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'relative mx-auto grid size-10 place-items-center rounded-full text-[15px] font-semibold tabular-nums',
                        'transition-colors duration-[120ms] ease-soft',
                        'group-focus-visible:outline-2 group-focus-visible:outline-offset-1 group-focus-visible:outline-accent',
                        end
                          ? 'bg-accent font-bold text-accent-ink'
                          : selectable
                            ? 'text-fg group-hover:bg-accent-soft group-hover:shadow-[inset_0_0_0_1.5px_var(--accent)]'
                            : 'text-disabled-ink line-through decoration-1',
                      )}
                    >
                      {Number(day.slice(8))}
                      {day === today && !end && (
                        <span className="absolute bottom-1 size-1 rounded-full bg-accent" />
                      )}
                    </span>
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
