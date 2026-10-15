'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export type GuestsLabels = {
  title: string;
  adults: string;
  adultsHint: string;
  fewer: string;
  more: string;
};

type Props = {
  id: string;
  adults: number;
  onChange: (adults: number) => void;
  onClose: () => void;
  labels: GuestsLabels;
};

export const MIN_ADULTS = 1;
export const MAX_ADULTS = 4;

/** "Gäste" popover (PREMIUM.md §9.1): adults 1–4 with a stepper; children come later. */
export function GuestsPopover({ id, adults, onChange, onClose, labels }: Props) {
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
      className="search-panel absolute top-[calc(100%+12px)] right-0 z-30 w-[340px] rounded-panel border border-line bg-surface p-6 shadow-3"
    >
      <GuestsStepper adults={adults} onChange={onChange} labels={labels} autoFocus />
    </div>
  );
}

/**
 * "Erwachsene − 2 +". When a button reaches its limit and disables itself, focus moves to the
 * other one, so the keyboard never drops to the page.
 */
export function GuestsStepper({
  adults,
  onChange,
  labels,
  autoFocus,
}: {
  adults: number;
  onChange: (adults: number) => void;
  labels: GuestsLabels;
  /** Focus the button that can act (the stepper was just opened). */
  autoFocus?: boolean;
}) {
  const fewer = useRef<HTMLButtonElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const step = (by: number) => {
    const next = Math.min(MAX_ADULTS, Math.max(MIN_ADULTS, adults + by));
    onChange(next);
    if (next === MAX_ADULTS) fewer.current?.focus();
    if (next === MIN_ADULTS) more.current?.focus();
  };
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[15px] font-semibold text-ink">{labels.adults}</p>
        <p className="text-small text-muted-ink">{labels.adultsHint}</p>
      </div>
      <div className="flex items-center gap-3">
        <IconButton
          ref={fewer}
          label={labels.fewer}
          onClick={() => step(-1)}
          disabled={adults <= MIN_ADULTS}
          autoFocus={autoFocus && adults >= MAX_ADULTS}
          className="border border-line-strong disabled:opacity-30"
        >
          <Icon icon={Minus} size={16} />
        </IconButton>
        <output
          aria-live="polite"
          className="w-5 text-center text-[16px] font-semibold tabular-nums"
        >
          {adults}
        </output>
        <IconButton
          ref={more}
          label={labels.more}
          onClick={() => step(1)}
          disabled={adults >= MAX_ADULTS}
          autoFocus={autoFocus && adults < MAX_ADULTS}
          className="border border-line-strong disabled:opacity-30"
        >
          <Icon icon={Plus} size={16} />
        </IconButton>
      </div>
    </div>
  );
}
