'use client';

import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { ArrowLeft, ArrowRight, CircleAlert, Search, X } from 'lucide-react';
import { formatPercent, type Locale, type RangeDraft } from '@tidaq/core';
import { RangeCalendar, PriceLegend, type CellPrice } from '@/components/calendar/RangeCalendar';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { DestinationField } from './DestinationField';
import { GuestsStepper } from './GuestsPopover';
import type { SearchBarLabels } from './SearchBar';
import type { SearchIndex } from './types';
import { dateRange, useSearch } from './useSearch';

export type PhoneSearchLabels = {
  pillTitle: string;
  pillText: string;
  dialog: string;
  stepWhere: string;
  stepWhen: string;
  stepWho: string;
  close: string;
  back: string;
  skip: string;
  clearAll: string;
  submit: string;
};

export type PhoneSearchHandle = { open: () => void };

type Props = {
  index: SearchIndex;
  today: string;
  locale: Locale;
  labels: SearchBarLabels;
  /** Render the hero pill that opens it (the navbar opens it through `ref` instead). */
  pill?: boolean;
  /** Opens the sheet whenever it changes to a new number above 0 (the navbar's icon). */
  openKey?: number;
  className?: string;
  ref?: Ref<PhoneSearchHandle>;
};

type Step = 1 | 2 | 3;
/** Our entries in the browser history: Android back / swipe-back steps back, not off the page. */
const KEY = 'tidaqSearch';

function stepOf(state: unknown): Step | null {
  const s = (state as Record<string, unknown> | null)?.[KEY];
  return s === 1 || s === 2 || s === 3 ? s : null;
}

/**
 * Phone search (PREMIUM.md §9.2, C-109): a pill "Wohin?" opens a full-screen sheet with three
 * steps. 1 Wohin? (field + list, popular cities as a photo row), 2 Wann? (all months scrolling,
 * nightly prices once a hotel is picked), 3 Wer? (stepper). A sticky bar at the bottom: "Alles
 * löschen" + "Preise ansehen" (on step 2 "Überspringen" + "Weiter"). ✕ closes, ← goes back a
 * step, and so does the phone's back gesture. What was picked stays when it's closed.
 */
export function PhoneSearch({
  index,
  today,
  locale,
  labels,
  pill,
  openKey,
  className,
  ref,
}: Props) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [shaking, setShaking] = useState(false);
  // "Alles löschen" also empties the typed text (the field keeps its own).
  const [resets, setResets] = useState(0);
  const search = useSearch({ index, today, locale, errors: labels });
  const { dest, checkIn, checkOut, error } = search;
  const t = labels.phone;

  const open = () => {
    const el = dialog.current;
    if (!el || el.open) return;
    setStep(1);
    el.showModal();
    // showModal focuses the first button (✕); the keyboard should come up for the field.
    el.querySelector<HTMLInputElement>('input')?.focus();
    window.history.pushState({ ...(window.history.state as object), [KEY]: 1 }, '');
  };
  useImperativeHandle(ref, () => ({ open }));
  useEffect(() => {
    if (openKey) open();
    // Only a new key opens it (`open` itself changes every render).
  }, [openKey]);

  const forward = (next: Step) => {
    setStep(next);
    window.history.pushState({ ...(window.history.state as object), [KEY]: next }, '');
  };
  // Back and close both go through the history, so the back gesture and the buttons agree.
  const back = () => window.history.back();
  const close = () => {
    const depth = stepOf(window.history.state);
    if (depth) window.history.go(-depth);
    else dialog.current?.close();
  };

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (!dialog.current?.open) return;
      const s = stepOf(e.state);
      if (s) setStep(s);
      else dialog.current.close();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const submit = () => {
    const p = search.submit();
    if (p?.field === 'where') {
      if (step !== 1) window.history.go(1 - step);
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
    } else if (p?.field === 'dates' && step === 3) {
      back();
    }
  };

  const byNight = useMemo(
    () => new Map((search.hotel?.nights ?? []).map((n) => [n.night, n])),
    [search.hotel],
  );
  const price = (day: string): CellPrice | null => {
    const n = byNight.get(day);
    if (!n || n.vs === null) return null;
    const text = formatPercent(n.vs, locale, { signed: true });
    return { text, spoken: text, level: n.level };
  };
  const draft: RangeDraft = {
    checkIn,
    checkOut,
    phase: checkIn && !checkOut ? 'out' : 'in',
  };
  const nightsText =
    search.nights && search.nights > 0
      ? search.nights === 1
        ? labels.nightsOne
        : labels.nightsOther.replace('{n}', String(search.nights))
      : null;
  const destName = dest
    ? dest.kind === 'city'
      ? index.cities.find((c) => c.slug === dest.slug)?.name
      : index.hotels.find((h) => h.slug === dest.slug)?.name
    : undefined;
  const title = step === 1 ? t.stepWhere : step === 2 ? t.stepWhen : t.stepWho;
  const errorId = `${id}-error`;

  return (
    <>
      {pill && (
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          className={cn(
            'flex h-[60px] w-full items-center gap-3 rounded-full bg-surface pr-2 pl-5 text-left text-ink',
            'shadow-[0_16px_40px_rgba(14,12,18,0.3)] transition-transform duration-[var(--t-fast)] ease-out active:scale-[0.98]',
            className,
          )}
        >
          <Icon icon={Search} size={20} className="shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-[16px] font-semibold">{t.pillTitle}</span>
            <span className="mt-0.5 truncate text-[13px] text-muted">{t.pillText}</span>
          </span>
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white"
          >
            <Icon icon={ArrowRight} size={18} />
          </span>
        </button>
      )}
      <dialog
        ref={dialog}
        aria-label={t.dialog}
        className="phone-search"
        onCancel={(e) => {
          // Esc (and some Android back buttons): one step back, like the ← button.
          e.preventDefault();
          if (step > 1) back();
          else close();
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 px-2">
            {step === 1 ? (
              <IconButton label={t.close} onClick={close}>
                <Icon icon={X} />
              </IconButton>
            ) : (
              <IconButton label={t.back} onClick={back}>
                <Icon icon={ArrowLeft} />
              </IconButton>
            )}
            {step > 1 && destName && (
              <span className="min-w-0 truncate text-[14px] font-semibold text-muted-ink">
                {destName}
                {step === 3 && checkIn && checkOut && ` · ${dateRange(checkIn, checkOut, locale)}`}
              </span>
            )}
          </header>

          <div
            key={`${step}-${resets}`}
            className="phone-step min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6"
          >
            <h2 className="text-h2 mt-2 mb-4">{title}</h2>
            {step === 1 && (
              <div className={cn(shaking && 'shake')} onAnimationEnd={() => setShaking(false)}>
                <label htmlFor={`${id}-where`} className="sr-only">
                  {labels.where}
                </label>
                <DestinationField
                  id={`${id}-where`}
                  index={index}
                  value={dest}
                  onChange={search.setDest}
                  onPicked={() => forward(2)}
                  open
                  onOpenChange={() => {}}
                  labels={labels.destination}
                  invalid={error?.field === 'where'}
                  describedBy={error?.field === 'where' ? errorId : undefined}
                  autoFocus
                  inline
                />
              </div>
            )}
            {step === 2 && (
              <>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p aria-live="polite" className="text-[15px] font-semibold text-ink">
                    {nightsText && checkIn && checkOut
                      ? `${nightsText} · ${dateRange(checkIn, checkOut, locale)}`
                      : checkIn
                        ? labels.datePopover.chooseOut
                        : labels.datePopover.chooseIn}
                  </p>
                  {byNight.size > 0 && (
                    <PriceLegend
                      cheap={labels.datePopover.legendCheap}
                      dear={labels.datePopover.legendDear}
                    />
                  )}
                </div>
                <RangeCalendar
                  draft={draft}
                  onDraft={(d) => search.setDates(d.checkIn, d.checkOut)}
                  today={today}
                  locale={locale}
                  labels={labels.datePopover}
                  months={1}
                  stacked
                  price={byNight.size > 0 ? price : undefined}
                  autoFocus
                />
              </>
            )}
            {step === 3 && (
              <GuestsStepper
                adults={search.adults}
                onChange={search.setAdults}
                labels={labels.guestsPopover}
                autoFocus
              />
            )}
            {error && (
              <p
                id={errorId}
                role="alert"
                className="mt-4 flex items-start gap-1.5 text-[13.5px] font-semibold text-high"
              >
                <Icon icon={CircleAlert} size={16} className="mt-[1px]" />
                {error.text}
              </p>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            {step === 2 ? (
              <>
                <Button variant="subtle" size="md" onClick={() => forward(3)}>
                  {t.skip}
                </Button>
                <Button size="md" onClick={() => forward(3)}>
                  {labels.datePopover.next}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="subtle"
                  size="md"
                  disabled={!dest && !checkIn && !checkOut && search.adults === 2}
                  onClick={() => {
                    search.reset();
                    setResets((n) => n + 1);
                  }}
                >
                  {t.clearAll}
                </Button>
                <Button size="md" loading={search.going} onClick={submit}>
                  <Icon icon={Search} size={18} />
                  {t.submit}
                </Button>
              </>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}
