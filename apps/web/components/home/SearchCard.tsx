'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, ChevronDown, CircleAlert, MapPin, Users } from 'lucide-react';
import { localizedPath, type Locale } from '@tidaq/core';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { DateRangePicker, type PickerLabels } from './DateRangePicker';
import { HotelCombobox, type ComboboxLabels } from './HotelCombobox';

export type SearchHotel = { slug: string; name: string; city: string };

type Labels = {
  label: string;
  hotel: string;
  checkIn: string;
  checkOut: string;
  datePlaceholder: string;
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
  combobox: ComboboxLabels;
  picker: PickerLabels;
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

type Field = 'hotel' | 'dates';

const MAX_NIGHTS = 30;
const DAY_MS = 86_400_000;

/** Nights between two `YYYY-MM-DD` values. Local on purpose: core's date helpers pull in Zod. */
function nightsBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** "Di., 1. Dez." / "Tue, 1 Dec" for the date segments. */
function shortDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

/**
 * Homepage search (CRAFT.md §3 search card): one segmented group, hotel on top, dates below,
 * guests, a full-width "Preise ansehen". Real controls underneath (a button per date, a native
 * select) for keyboard, screen readers and every phone, with our own display on top. The hotel
 * field is an autocomplete (C-021a), the dates open a range picker (C-021b). Opens the stay page
 * (C-022).
 */
export function SearchCard({ hotels, guestOptions, today, locale, labels }: Props) {
  const id = useId();
  const [hotel, setHotel] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [submitted, setSubmitted] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [picker, setPicker] = useState<'in' | 'out' | null>(null);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : null;

  const problem = (): { field: Field; text: string } | null => {
    if (!hotel) return { field: 'hotel', text: labels.hotelMissing };
    if (!checkIn || !checkOut) return { field: 'dates', text: labels.datesMissing };
    if (checkIn < today) return { field: 'dates', text: labels.past };
    if (checkOut <= checkIn) return { field: 'dates', text: labels.order };
    if ((nights ?? 0) > MAX_NIGHTS) return { field: 'dates', text: labels.tooLong };
    return null;
  };
  // Errors appear on submit, then follow the input live, so a fixed field clears at once.
  const error = submitted ? problem() : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const p = problem();
    if (p) {
      document.getElementById(p.field === 'hotel' ? `${id}-hotel` : `${id}-in`)?.focus();
      return;
    }
    window.location.assign(
      `${localizedPath(`/hotel/${hotel}/${checkIn}--${checkOut}`, locale)}?adults=${adults}`,
    );
  };

  const errorId = `${id}-error`;
  const aria = (field: Field) =>
    error?.field === field ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};
  const nightsLabel =
    nights !== null && nights > 0
      ? nights === 1
        ? labels.nightsOne
        : labels.nightsOther.replace('{n}', String(nights))
      : null;

  return (
    <form
      id="suche"
      onSubmit={onSubmit}
      noValidate
      aria-label={labels.label}
      className="scroll-mt-24 rounded-search border border-accent/10 bg-surface p-4 shadow-float md:p-5"
    >
      <div className="rounded-card border border-line bg-field">
        <Segment
          icon={MapPin}
          label={labels.hotel}
          htmlFor={`${id}-hotel`}
          invalid={error?.field === 'hotel'}
          className={cn('rounded-t-card', listOpen && 'z-20')}
        >
          <HotelCombobox
            id={`${id}-hotel`}
            hotels={hotels}
            value={hotel}
            onChange={setHotel}
            labels={labels.combobox}
            invalid={error?.field === 'hotel'}
            describedBy={error?.field === 'hotel' ? errorId : undefined}
            onOpenChange={setListOpen}
          />
        </Segment>
        <div className="grid grid-cols-2 border-t border-line">
          <Segment
            icon={CalendarDays}
            label={labels.checkIn}
            htmlFor={`${id}-in`}
            labelId={`${id}-in-label`}
            invalid={error?.field === 'dates'}
          >
            <Display
              id={`${id}-in-value`}
              value={checkIn ? shortDate(checkIn, locale) : undefined}
              placeholder={labels.datePlaceholder}
            />
            <button
              id={`${id}-in`}
              type="button"
              aria-haspopup="dialog"
              aria-labelledby={`${id}-in-label ${id}-in-value`}
              onClick={() => setPicker('in')}
              className="control"
              {...aria('dates')}
            />
          </Segment>
          <Segment
            label={nightsLabel ? `${labels.checkOut} · ${nightsLabel}` : labels.checkOut}
            htmlFor={`${id}-out`}
            labelId={`${id}-out-label`}
            invalid={error?.field === 'dates'}
            className="border-l border-line"
          >
            <Display
              id={`${id}-out-value`}
              value={checkOut ? shortDate(checkOut, locale) : undefined}
              placeholder={labels.datePlaceholder}
            />
            <button
              id={`${id}-out`}
              type="button"
              aria-haspopup="dialog"
              aria-labelledby={`${id}-out-label ${id}-out-value`}
              onClick={() => setPicker('out')}
              className="control"
              {...aria('dates')}
            />
          </Segment>
        </div>
        <div className="border-t border-line">
          <Segment
            className="rounded-b-card"
            icon={Users}
            label={labels.guests}
            htmlFor={`${id}-guests`}
          >
            <Display value={guestOptions[adults - 1]} placeholder="" chevron />
            <select
              id={`${id}-guests`}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="control"
            >
              {guestOptions.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
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
      <DateRangePicker
        openOn={picker}
        onClose={() => setPicker(null)}
        checkIn={checkIn}
        checkOut={checkOut}
        onChange={(nextIn, nextOut) => {
          setCheckIn(nextIn);
          setCheckOut(nextOut);
        }}
        today={today}
        locale={locale}
        labels={labels.picker}
      />
    </form>
  );
}

/** What the segment shows: the chosen value in 16 px 700, or a muted placeholder. */
function Display({
  id,
  value,
  placeholder,
  chevron,
}: {
  id?: string;
  value?: string;
  placeholder: string;
  chevron?: boolean;
}) {
  return (
    <span id={id} aria-hidden="true" className="flex items-center justify-between gap-2">
      <span
        className={cn(
          'truncate text-[16px] font-bold',
          value ? 'text-fg' : 'font-semibold text-muted',
        )}
      >
        {value ?? placeholder}
      </span>
      {chevron && <Icon icon={ChevronDown} size={16} className="shrink-0 text-muted" />}
    </span>
  );
}

type SegmentProps = {
  icon?: typeof MapPin;
  label: string;
  htmlFor: string;
  /** Lets a button name itself from the label plus its value (aria-labelledby). */
  labelId?: string;
  invalid?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * One segment of the group. The real control (`.control`) covers the whole segment invisibly, so
 * any tap opens it; focus shows an inset accent ring, an error a red one (also while focused).
 */
function Segment({ icon, label, htmlFor, labelId, invalid, className, children }: SegmentProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-[60px] items-center gap-3 px-3.5 py-2.5 transition-[background-color,box-shadow] duration-[180ms] ease-soft',
        'focus-within:bg-surface',
        invalid
          ? 'bg-surface shadow-[inset_0_0_0_2px_var(--bad)] focus-within:shadow-[inset_0_0_0_2px_var(--bad),0_0_0_4px_rgba(209,67,91,0.14)]'
          : 'focus-within:shadow-[inset_0_0_0_2px_var(--accent)]',
        className,
      )}
    >
      {icon && <Icon icon={icon} size={18} className="text-muted max-[399px]:hidden" />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label
          id={labelId}
          htmlFor={htmlFor}
          className="text-[12.5px] leading-tight font-semibold whitespace-nowrap text-muted-ink"
        >
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}
