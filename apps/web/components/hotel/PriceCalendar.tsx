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
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  dayDiff,
  dayRole,
  isSelectable,
  localizedPath,
  monthOf,
  monthWeeks,
  moveFocus,
  pickDay,
  shiftDays,
  shiftMonths,
  stayFromNights,
  stayPath,
  type GridKey,
  type Locale,
  type NightPrice,
  type RangeDraft,
} from '@tidaq/core';
import { Button, buttonClasses, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export type CalendarLabels = {
  prevMonth: string;
  nextMonth: string;
  chooseIn: string;
  chooseOut: string;
  /** The three steps above the calendar (C-132b): check-in, check-out, see the history. */
  steps: [string, string, string];
  clear: string;
  checkIn: string;
  checkOut: string;
  today: string;
  /** With `{price}`. */
  perNight: string;
  noPrice: string;
  /** Level names, cheapest first (5). */
  levels: string[];
  nightsOne: string;
  /** With `{n}`. */
  nightsOther: string;
  /** With `{price}` and `{provider}`. */
  total: string;
  missingOne: string;
  /** With `{n}`. */
  missingOther: string;
  none: string;
  unreliable: string;
  show: string;
  legendCheap: string;
  legendDear: string;
};

type Props = {
  slug: string;
  /** Today's price of every night from today on. */
  nights: NightPrice[];
  /** 0–4 per night (same order as `nights`), null without a price. */
  levels: (number | null)[];
  /** Reviewed platforms: id → display name (the hotel's name for its own site). */
  providers: Record<string, string>;
  nightsUnreliable: boolean;
  today: string;
  locale: Locale;
  labels: CalendarLabels;
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
const LEVEL_CLASS = ['price-lvl-0', 'price-lvl-1', 'price-lvl-2', 'price-lvl-3', 'price-lvl-4'];
const utc = (day: string) => new Date(`${day}T00:00:00Z`);

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
 * Price calendar (C-023a, DESIGN.md calendar cell): every night with today's cheapest price and
 * its level (5 tints, the price as text so color is never the only signal). Picking check-in and
 * check-out shows the stay's total on one site and links to the stay page with its history. The
 * grid follows the WAI-ARIA date grid like the search's date picker (C-021b).
 */
export function PriceCalendar({
  slug,
  nights,
  levels,
  providers,
  nightsUnreliable,
  today,
  locale,
  labels,
}: Props) {
  const months = useMonthCount();
  const [draft, setDraft] = useState<RangeDraft>({ checkIn: '', checkOut: '', phase: 'in' });
  const [focusDay, setFocusDay] = useState(today);
  const [view, setView] = useState(() => monthOf(today));
  const [pointer, setPointer] = useState<string>();
  const grids = useRef<HTMLDivElement>(null);
  const moveDomFocus = useRef(false);

  const byNight = useMemo(
    () =>
      new Map(nights.map((n, i) => [n.night, { price: n.bestCents, level: levels[i] ?? null }])),
    [nights, levels],
  );
  const reviewed = useMemo(() => new Set(Object.keys(providers).map(Number)), [providers]);
  const lastMonth = monthOf(nights.at(-1)?.night ?? today);

  const fmt = useMemo(() => {
    const l = locale === 'de' ? 'de-DE' : 'en-GB';
    return {
      month: new Intl.DateTimeFormat(l, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      full: new Intl.DateTimeFormat(l, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      range: new Intl.DateTimeFormat(l, { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      weekdayShort: new Intl.DateTimeFormat(l, { weekday: 'short', timeZone: 'UTC' }),
      weekdayLong: new Intl.DateTimeFormat(l, { weekday: 'long', timeZone: 'UTC' }),
      // In the cell: euros without the sign (the legend says "per night").
      cell: new Intl.NumberFormat(l, { maximumFractionDigits: 0 }),
      price: new Intl.NumberFormat(l, {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
    };
  }, [locale]);

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

  // Keep the focused day on screen when the keyboard moves past the visible months.
  const viewEnd = shiftMonths(view, months);
  useLayoutEffect(() => {
    if (focusDay < view) setView(monthOf(focusDay));
    else if (focusDay >= viewEnd) setView(shiftMonths(focusDay, 1 - months));
  }, [focusDay, view, viewEnd, months]);

  useEffect(() => {
    if (!moveDomFocus.current) return;
    grids.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
    moveDomFocus.current = false;
  }, [focusDay, view]);

  const pick = (day: string) => {
    if (!isSelectable(day, today, draft)) return;
    setDraft(pickDay(draft, day));
  };
  const onKey = (e: KeyboardEvent<HTMLElement>, day: string) => {
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
    const end = shiftMonths(next, months);
    if (focusDay < next || focusDay >= end) setFocusDay(next < today ? today : next);
  };

  const previewTo =
    pointer &&
    draft.phase === 'out' &&
    draft.checkIn &&
    pointer > draft.checkIn &&
    isSelectable(pointer, today, draft)
      ? pointer
      : undefined;
  const shown = Array.from({ length: months }, (_, i) => shiftMonths(view, i));
  const canPrev = view > monthOf(today);
  const canNext = shiftMonths(view, months) <= lastMonth;

  const chosen = draft.checkIn && draft.checkOut ? draft : null;
  const count = chosen ? dayDiff(chosen.checkIn, chosen.checkOut) : 0;
  const total = chosen ? stayFromNights(nights, chosen.checkIn, chosen.checkOut, reviewed) : null;
  const nightsText =
    count === 1 ? labels.nightsOne : labels.nightsOther.replace('{n}', String(count));

  const cellLabel = (day: string, role: ReturnType<typeof dayRole>) => {
    const parts = [fmt.full.format(utc(day))];
    const n = byNight.get(day);
    if (n?.price != null) {
      parts.push(labels.perNight.replace('{price}', fmt.price.format(n.price / 100)));
      if (n.level !== null) parts.push(labels.levels[n.level] ?? '');
    } else if (day >= today) parts.push(labels.noPrice);
    if (day === today) parts.push(labels.today);
    if (role === 'start') parts.push(labels.checkIn);
    if (role === 'end') parts.push(labels.checkOut);
    return parts.filter(Boolean).join(', ');
  };

  // Where the visitor is: 1 check-in, 2 check-out, 3 see the history (C-132b).
  const step = chosen ? 3 : draft.checkIn ? 2 : 1;

  return (
    <div>
      <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-[14px] font-semibold md:mb-8">
        {labels.steps.map((text, i) => {
          const n = i + 1;
          return (
            <li key={text} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-line-strong md:w-8" />}
              <span
                aria-current={n === step ? 'step' : undefined}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1.5',
                  n === step
                    ? 'bg-ink text-white'
                    : n < step
                      ? 'bg-surface-2 text-ink'
                      : 'text-muted',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-[12.5px] tabular-nums',
                    n === step ? 'bg-white text-ink' : 'border border-line-strong',
                  )}
                >
                  {n < step ? '✓' : n}
                </span>
                {text}
              </span>
            </li>
          );
        })}
      </ol>
      <div ref={grids} className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between">
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
            <Month
              key={month}
              month={month}
              heading={fmt.month.format(utc(month))}
              weekdays={weekdays}
              draft={draft}
              pointer={previewTo}
              focusDay={focusDay}
              today={today}
              price={(day) => {
                const n = byNight.get(day);
                return n?.price != null
                  ? { text: fmt.cell.format(Math.round(n.price / 100)), level: n.level }
                  : null;
              }}
              label={cellLabel}
              onPick={pick}
              onKey={onKey}
              onPointer={setPointer}
              onFocusDay={setFocusDay}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[12.5px] font-semibold text-muted-ink">
        <span>{labels.legendCheap}</span>
        <span aria-hidden="true" className="flex gap-1">
          {LEVEL_CLASS.map((c) => (
            <span key={c} className={cn('size-4 rounded-[5px]', c)} />
          ))}
        </span>
        <span>{labels.legendDear}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line pt-4">
        <p aria-live="polite" className="min-w-0 flex-1 leading-snug">
          {chosen ? (
            <>
              <span className="block text-[15px] font-bold text-fg">
                {nightsText} · {fmt.range.formatRange(utc(chosen.checkIn), utc(chosen.checkOut))}
              </span>
              <span className="block text-[13.5px] font-semibold text-muted-ink">
                {nightsUnreliable
                  ? labels.unreliable
                  : total?.kind === 'ok'
                    ? labels.total
                        .replace('{price}', fmt.price.format(total.totalCents / 100))
                        .replace('{provider}', providers[String(total.providerId)] ?? '')
                    : total?.kind === 'missing'
                      ? total.missing === 1
                        ? labels.missingOne
                        : labels.missingOther.replace('{n}', String(total.missing))
                      : labels.none}
              </span>
            </>
          ) : (
            <span className="text-[14px] font-semibold text-fg">
              {draft.checkIn ? labels.chooseOut : labels.chooseIn}
            </span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {draft.checkIn && (
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setDraft({ checkIn: '', checkOut: '', phase: 'in' })}
            >
              {labels.clear}
            </Button>
          )}
          {chosen && (
            <a
              href={localizedPath(stayPath(slug, chosen.checkIn, chosen.checkOut, 2), locale)}
              className={cn(buttonClasses(), 'gap-2')}
            >
              {labels.show}
              <Icon icon={ArrowRight} size={18} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

type MonthProps = {
  month: string;
  heading: string;
  weekdays: { short: string; long: string }[];
  draft: RangeDraft;
  pointer?: string;
  focusDay: string;
  today: string;
  price: (day: string) => { text: string; level: number | null } | null;
  label: (day: string, role: ReturnType<typeof dayRole>) => string;
  onPick: (day: string) => void;
  onKey: (e: KeyboardEvent<HTMLElement>, day: string) => void;
  onPointer: (day: string | undefined) => void;
  onFocusDay: (day: string) => void;
};

/** One month: cells with the day and the night's price, tinted by level; the stay as a band. */
function Month({
  month,
  heading,
  weekdays,
  draft,
  pointer,
  focusDay,
  today,
  price,
  label,
  onPick,
  onKey,
  onPointer,
  onFocusDay,
}: MonthProps) {
  const headingId = useId();
  return (
    <div>
      <h3 id={headingId} className="flex h-11 items-center justify-center text-[15px] font-bold">
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
                className="h-7 text-[12px] font-semibold text-muted-ink"
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
                const p = day >= today ? price(day) : null;
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
                      'h-12 rounded-cell p-0 text-center align-middle outline-none tabular-nums',
                      'transition-colors duration-[120ms] ease-soft',
                      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                      selectable ? 'cursor-pointer' : 'cursor-default',
                      end
                        ? 'bg-accent text-accent-ink'
                        : inside
                          ? 'bg-accent-soft text-fg'
                          : p?.level != null
                            ? LEVEL_CLASS[p.level]
                            : '',
                      !end && selectable && 'hover:shadow-[inset_0_0_0_1.5px_var(--accent)]',
                      day === today && !end && 'shadow-[inset_0_0_0_1.5px_var(--muted)]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'block text-[13px] leading-tight font-semibold',
                        !selectable && !end && 'text-disabled-ink',
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'block text-[11px] leading-tight font-bold',
                        end ? 'text-accent-ink' : 'text-muted-ink',
                      )}
                    >
                      {p?.text ?? ' '}
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
