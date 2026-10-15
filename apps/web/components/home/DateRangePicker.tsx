'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { dayDiff, type Locale, type RangeDraft } from '@tidaq/core';
import { RangeCalendar } from '@/components/calendar/RangeCalendar';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

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

const WIDE = '(min-width: 768px)';

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
 * sheet on phones and a centred card with two months from 768 px, around the shared
 * `RangeCalendar` (C-108). The footer counts the nights.
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
  const range = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
    [locale],
  );

  const update = (next: RangeDraft) => {
    setDraft(next);
    onChange(next.checkIn, next.checkOut);
  };
  const clear = () => update({ checkIn: '', checkOut: '', phase: 'in' });

  const nights = draft.checkIn && draft.checkOut ? dayDiff(draft.checkIn, draft.checkOut) : 0;
  const nightsText = (n: number) =>
    n === 1 ? labels.nightsOne : labels.nightsOther.replace('{n}', String(n));
  const hint = draft.phase === 'out' && draft.checkIn ? labels.chooseOut : labels.chooseIn;

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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-3 md:px-6">
        <RangeCalendar
          draft={draft}
          onDraft={update}
          today={today}
          locale={locale}
          labels={labels}
          months={months}
          autoFocus
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-6 md:pb-4">
        <p aria-live="polite" className="min-w-0 leading-snug">
          {nights > 0 ? (
            <>
              <span className="block text-[15px] font-semibold text-ink">{nightsText(nights)}</span>
              <span className="block text-[13px] font-medium text-muted-ink">
                {range.formatRange(utc(draft.checkIn), utc(draft.checkOut))}
              </span>
            </>
          ) : (
            <span className="text-[14px] font-medium text-ink">{hint}</span>
          )}
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
