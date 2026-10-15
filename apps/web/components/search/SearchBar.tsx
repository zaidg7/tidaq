'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, CircleAlert, Search } from 'lucide-react';
import type { Locale } from '@tidaq/core';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { DatePopover, type DatePopoverLabels } from './DatePopover';
import { DestinationField, type DestinationLabels } from './DestinationField';
import { GuestsPopover, type GuestsLabels } from './GuestsPopover';
import type { PhoneSearchLabels } from './PhoneSearch';
import type { SearchIndex } from './types';
import { dateRange, useSearch } from './useSearch';

export type SearchBarLabels = {
  label: string;
  where: string;
  dates: string;
  datesPlaceholder: string;
  guests: string;
  submit: string;
  missing: string;
  datesMissing: string;
  order: string;
  tooLong: string;
  past: string;
  nightsOne: string;
  /** With `{n}`. */
  nightsOther: string;
  destination: DestinationLabels;
  datePopover: DatePopoverLabels;
  guestsPopover: GuestsLabels;
  /** The phone flow's own words (C-109). */
  phone: PhoneSearchLabels;
};

type Props = {
  index: SearchIndex;
  /** Guest options 1–4, translated ("2 Erwachsene"). */
  guestOptions: string[];
  /** `YYYY-MM-DD` in German time. */
  today: string;
  locale: Locale;
  labels: SearchBarLabels;
  /** Focus "Hotel oder Stadt" on mount (the navbar search opens with it). */
  autoFocus?: boolean;
  className?: string;
};

/**
 * Desktop search bar (PREMIUM.md §9.1): one white bar, three segments and the button,
 * "Hotel oder Stadt · Reisedaten · Gäste · Preis prüfen". The active segment lifts out in white
 * while the bar turns `--surface-2`. Picking a destination moves on to the dates. Submit
 * (§9.3): hotel + dates → stay page, hotel only → hotel page, city → city page, nothing → the
 * panel opens and the field shakes. Dates open a two-month popover that shows the picked
 * hotel's price for every night (C-108); guests a stepper.
 */
export function SearchBar({
  index,
  guestOptions,
  today,
  locale,
  labels,
  autoFocus,
  className,
}: Props) {
  const id = useId();
  const whereRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const datesRef = useRef<HTMLButtonElement>(null);
  const guestsRef = useRef<HTMLButtonElement>(null);
  const search = useSearch({ index, today, locale, errors: labels });
  const { dest, checkIn, checkOut, adults, nights, error } = search;
  const [panel, setPanel] = useState(false);
  const [popover, setPopover] = useState<'dates' | 'guests' | null>(null);
  const [shaking, setShaking] = useState(false);

  // A click outside the bar closes an open popover.
  useEffect(() => {
    if (!popover) return;
    const onDown = (e: PointerEvent) => {
      if (!formRef.current?.contains(e.target as Node)) setPopover(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [popover]);

  const closeTo = (ref: { current: HTMLButtonElement | null }) => {
    setPopover(null);
    ref.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const p = search.submit();
    if (p?.field === 'where') {
      // Restart the shake even when it's already running.
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
      whereRef.current?.focus();
      setPanel(true);
    } else if (p) {
      datesRef.current?.focus();
    }
  };

  const errorId = `${id}-error`;
  const nightsLabel =
    nights !== null && nights > 0
      ? nights === 1
        ? labels.nightsOne
        : labels.nightsOther.replace('{n}', String(nights))
      : null;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-label={labels.label}
      className={cn('relative text-left', className)}
    >
      <div
        className={cn(
          'flex h-[76px] items-stretch rounded-search border border-line bg-surface p-2 shadow-3',
          'transition-colors duration-[var(--t-base)] ease-out',
          'has-[.seg:focus-within]:bg-surface-2 has-[.seg[data-active]]:bg-surface-2',
        )}
      >
        <Segment
          label={labels.where}
          htmlFor={`${id}-where`}
          invalid={error?.field === 'where'}
          error={error?.field === 'where' ? error.text : undefined}
          className="flex-[1.5]"
          shaking={shaking}
          onShakeEnd={() => setShaking(false)}
        >
          <DestinationField
            ref={whereRef}
            id={`${id}-where`}
            index={index}
            value={dest}
            onChange={search.setDest}
            onPicked={(next) => {
              datesRef.current?.focus();
              // A hotel without dates yet: straight on to the calendar.
              if (next.kind === 'hotel' && !checkIn) setPopover('dates');
            }}
            open={panel}
            onOpenChange={(o) => {
              setPanel(o);
              if (o) setPopover(null);
            }}
            labels={labels.destination}
            invalid={error?.field === 'where'}
            describedBy={error?.field === 'where' ? errorId : undefined}
            autoFocus={autoFocus}
          />
        </Segment>
        <Divider />
        <Segment
          label={nightsLabel ? `${labels.dates} · ${nightsLabel}` : labels.dates}
          htmlFor={`${id}-dates`}
          labelId={`${id}-dates-label`}
          invalid={error?.field === 'dates'}
          active={popover === 'dates'}
          className="flex-1"
        >
          <span
            id={`${id}-dates-value`}
            aria-hidden="true"
            className={cn(
              'truncate text-[15px] leading-snug',
              checkIn && checkOut ? 'font-semibold text-ink' : 'font-medium text-muted',
            )}
          >
            {checkIn && checkOut ? dateRange(checkIn, checkOut, locale) : labels.datesPlaceholder}
          </span>
          <button
            ref={datesRef}
            id={`${id}-dates`}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={popover === 'dates'}
            aria-controls={popover === 'dates' ? `${id}-dates-popover` : undefined}
            aria-labelledby={`${id}-dates-label ${id}-dates-value`}
            aria-invalid={error?.field === 'dates' || undefined}
            aria-describedby={error?.field === 'dates' ? errorId : undefined}
            onClick={() => setPopover(popover === 'dates' ? null : 'dates')}
            className="control"
          />
        </Segment>
        <Divider />
        <Segment
          label={labels.guests}
          htmlFor={`${id}-guests`}
          labelId={`${id}-guests-label`}
          active={popover === 'guests'}
          className="flex-[0.85]"
        >
          <span aria-hidden="true" className="flex items-center justify-between gap-2">
            <span
              id={`${id}-guests-value`}
              className="truncate text-[15px] leading-snug font-semibold text-ink"
            >
              {guestOptions[adults - 1]}
            </span>
            <Icon
              icon={ChevronDown}
              size={16}
              className={cn(
                'shrink-0 text-muted transition-transform duration-[var(--t-fast)]',
                popover === 'guests' && 'rotate-180',
              )}
            />
          </span>
          <button
            ref={guestsRef}
            id={`${id}-guests`}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={popover === 'guests'}
            aria-controls={popover === 'guests' ? `${id}-guests-popover` : undefined}
            aria-labelledby={`${id}-guests-label ${id}-guests-value`}
            onClick={() => setPopover(popover === 'guests' ? null : 'guests')}
            className="control"
          />
        </Segment>
        <Button
          type="submit"
          size="lg"
          loading={search.going}
          className="ml-2 h-full shrink-0 rounded-[22px] px-6"
        >
          <Icon icon={Search} size={18} />
          {labels.submit}
        </Button>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          // The destination error shows in the segment itself (the panel covers this line).
          className={cn(
            'mt-3 flex items-start gap-1.5 px-6 text-[13.5px] font-semibold text-high',
            error.field === 'where' && 'sr-only',
          )}
        >
          <Icon icon={CircleAlert} size={16} className="mt-[1px]" />
          {error.text}
        </p>
      )}
      {popover === 'dates' && (
        <DatePopover
          id={`${id}-dates-popover`}
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={search.setDates}
          onClose={() => closeTo(datesRef)}
          onNext={() => {
            setPopover('guests');
            guestsRef.current?.focus();
          }}
          hotel={search.hotel}
          today={today}
          locale={locale}
          labels={labels.datePopover}
        />
      )}
      {popover === 'guests' && (
        <GuestsPopover
          id={`${id}-guests-popover`}
          adults={adults}
          onChange={search.setAdults}
          onClose={() => closeTo(guestsRef)}
          labels={labels.guestsPopover}
        />
      )}
    </form>
  );
}

function Divider() {
  return <span aria-hidden="true" className="seg-divider my-4 w-px shrink-0 bg-line" />;
}

type SegmentProps = {
  label: string;
  htmlFor: string;
  labelId?: string;
  invalid?: boolean;
  /** Shown in place of the label (which stays for screen readers). */
  error?: string;
  /** Its popover is open: stays lifted while focus is inside the popover. */
  active?: boolean;
  className?: string;
  /** A failed submit shakes the segment (6 px, twice). */
  shaking?: boolean;
  onShakeEnd?: () => void;
  children: ReactNode;
};

/**
 * One segment: label (12 px, ink) over the value. Hover tints it; focus lifts it out in white
 * with `--shadow-2`. The real control covers the segment, so any click opens it.
 */
function Segment({
  label,
  htmlFor,
  labelId,
  invalid,
  error,
  active,
  className,
  shaking,
  onShakeEnd,
  children,
}: SegmentProps) {
  return (
    <div
      onAnimationEnd={(e) => e.animationName === 'shake' && onShakeEnd?.()}
      data-active={active || undefined}
      className={cn(
        'seg relative flex min-w-0 flex-col justify-center gap-0.5 rounded-card px-5',
        'transition-[background-color,box-shadow] duration-[var(--t-fast)] ease-out',
        'hover:bg-surface-2 focus-within:bg-surface focus-within:shadow-2 focus-within:hover:bg-surface',
        active && 'bg-surface shadow-2 hover:bg-surface',
        invalid && 'shadow-[inset_0_0_0_2px_var(--high)]',
        shaking && 'shake',
        className,
      )}
    >
      <label
        id={labelId}
        htmlFor={htmlFor}
        className={cn(
          'text-[12.5px] leading-tight font-semibold whitespace-nowrap text-ink',
          error && 'sr-only',
        )}
      >
        {label}
      </label>
      {error && (
        <span
          aria-hidden="true"
          className="truncate text-[12.5px] leading-tight font-semibold text-high"
        >
          {error}
        </span>
      )}
      {children}
    </div>
  );
}
