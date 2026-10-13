'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, CircleAlert, MapPin, Users } from 'lucide-react';
import { localizedPath, type Locale } from '@tidaq/core';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

export type SearchHotel = { slug: string; name: string; city: string };

type Labels = {
  label: string;
  hotel: string;
  hotelPlaceholder: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  submit: string;
  note: string;
  nightsOne: string;
  /** With `{n}`. */
  nightsOther: string;
  hotelMissing: string;
  datesMissing: string;
  order: string;
  tooLong: string;
  past: string;
};

type Props = {
  hotels: SearchHotel[];
  /** Guest options 1–4, already translated ("2 Erwachsene"). */
  guestOptions: string[];
  /** `YYYY-MM-DD` in German time: no check-in before it. */
  today: string;
  locale: Locale;
  labels: Labels;
};

const MAX_NIGHTS = 30;

/** Nights between two `YYYY-MM-DD` values. Local on purpose: core's date helpers pull in Zod. */
function nightsBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Homepage search (CRAFT.md §3 search card): one segmented group, hotel on top, dates and guests
 * below, a full-width "Preise ansehen". Plain form controls (native date pickers, a grouped
 * select) so it works with keyboard, screen readers and on every phone; C-021 adds autocomplete
 * and a range picker. Opens the stay page (C-022).
 */
export function SearchCard({ hotels, guestOptions, today, locale, labels }: Props) {
  const id = useId();
  const [hotel, setHotel] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [error, setError] = useState<{ field: 'hotel' | 'dates'; text: string } | null>(null);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : null;
  const byCity = new Map<string, SearchHotel[]>();
  for (const h of hotels) byCity.set(h.city, [...(byCity.get(h.city) ?? []), h]);

  const validate = (): typeof error => {
    if (!hotel) return { field: 'hotel', text: labels.hotelMissing };
    if (!checkIn || !checkOut) return { field: 'dates', text: labels.datesMissing };
    if (checkIn < today) return { field: 'dates', text: labels.past };
    if (checkOut <= checkIn) return { field: 'dates', text: labels.order };
    if ((nights ?? 0) > MAX_NIGHTS) return { field: 'dates', text: labels.tooLong };
    return null;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) {
      document.getElementById(problem.field === 'hotel' ? `${id}-hotel` : `${id}-in`)?.focus();
      return;
    }
    window.location.assign(
      `${localizedPath(`/hotel/${hotel}/${checkIn}--${checkOut}`, locale)}?adults=${adults}`,
    );
  };

  const errorId = `${id}-error`;
  const invalid = (field: 'hotel' | 'dates') => (error?.field === field ? true : undefined);

  return (
    <form
      id="suche"
      onSubmit={onSubmit}
      noValidate
      aria-label={labels.label}
      className="scroll-mt-24 rounded-search border border-accent/10 bg-surface p-4 shadow-float md:p-5"
    >
      <div className="overflow-hidden rounded-card border border-line bg-field">
        <Segment
          icon={MapPin}
          label={labels.hotel}
          htmlFor={`${id}-hotel`}
          invalid={invalid('hotel')}
        >
          <select
            id={`${id}-hotel`}
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
            aria-invalid={invalid('hotel')}
            aria-describedby={error?.field === 'hotel' ? errorId : undefined}
            className={cn(
              'w-full min-w-0 appearance-none truncate bg-transparent text-[16px] font-bold focus:outline-none',
              hotel ? 'text-fg' : 'text-muted',
            )}
          >
            <option value="">{labels.hotelPlaceholder}</option>
            {[...byCity].map(([city, list]) => (
              <optgroup key={city} label={city}>
                {list.map((h) => (
                  <option key={h.slug} value={h.slug}>
                    {h.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Segment>
        <div className="grid grid-cols-2 border-t border-line">
          <Segment
            icon={CalendarDays}
            label={labels.checkIn}
            htmlFor={`${id}-in`}
            invalid={invalid('dates')}
          >
            <input
              id={`${id}-in`}
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              aria-invalid={invalid('dates')}
              aria-describedby={error?.field === 'dates' ? errorId : undefined}
              className="w-full min-w-0 bg-transparent text-[16px] font-bold text-fg focus:outline-none"
            />
          </Segment>
          <Segment
            label={labels.checkOut}
            htmlFor={`${id}-out`}
            invalid={invalid('dates')}
            className="border-l border-line"
          >
            <input
              id={`${id}-out`}
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              aria-invalid={invalid('dates')}
              className="w-full min-w-0 bg-transparent text-[16px] font-bold text-fg focus:outline-none"
            />
          </Segment>
        </div>
        <div className="border-t border-line">
          <Segment icon={Users} label={labels.guests} htmlFor={`${id}-guests`}>
            <div className="flex items-baseline justify-between gap-3">
              <select
                id={`${id}-guests`}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="min-w-0 appearance-none bg-transparent text-[16px] font-bold text-fg focus:outline-none"
              >
                {guestOptions.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
              {nights !== null && nights > 0 && (
                <span className="text-meta shrink-0 text-muted-ink tabular-nums" aria-live="polite">
                  {nights === 1
                    ? labels.nightsOne
                    : labels.nightsOther.replace('{n}', String(nights))}
                </span>
              )}
            </div>
          </Segment>
        </div>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-start gap-1.5 px-1 text-[13px] font-semibold text-bad-ink"
        >
          <Icon icon={CircleAlert} size={14} className="mt-[2px]" />
          {error.text}
        </p>
      )}
      <Button type="submit" size="lg" block className="mt-4">
        {labels.submit}
      </Button>
      <p className="mt-2.5 text-center text-[12.5px] text-muted-ink">{labels.note}</p>
    </form>
  );
}

type SegmentProps = {
  icon?: typeof MapPin;
  label: string;
  htmlFor: string;
  invalid?: boolean;
  className?: string;
  children: ReactNode;
};

/** One segment of the group: turns white with an inset accent ring while focused. */
function Segment({ icon, label, htmlFor, invalid, className, children }: SegmentProps) {
  return (
    <div
      className={cn(
        'flex min-h-[60px] items-center gap-3 px-3.5 py-2.5 transition-[background-color,box-shadow] duration-[180ms] ease-soft',
        'focus-within:bg-surface focus-within:shadow-[inset_0_0_0_2px_var(--accent)]',
        invalid && 'shadow-[inset_0_0_0_2px_var(--bad)]',
        className,
      )}
    >
      {icon && <Icon icon={icon} size={18} className="text-muted max-[399px]:hidden" />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label
          htmlFor={htmlFor}
          className="text-[12.5px] leading-tight font-semibold text-muted-ink"
        >
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}
