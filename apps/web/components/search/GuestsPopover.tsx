'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { usePanelSide } from './usePanelSide';

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
      className="search-panel absolute top-[calc(100%+12px)] data-[side=up]:top-auto data-[side=up]:bottom-[calc(100%+12px)] right-0 z-30 w-[340px] rounded-panel border border-line bg-surface p-6 shadow-3"
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
  // Not the autoFocus attribute: that scrolls the page before the popover picks its side (C-130).
  const first = useRef(adults);
  useEffect(() => {
    if (!autoFocus) return;
    const target = first.current >= MAX_ADULTS ? fewer.current : more.current;
    target?.focus({ preventScroll: true });
  }, [autoFocus]);
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
          className="border border-line-strong disabled:opacity-30"
        >
          <Icon icon={Plus} size={16} />
        </IconButton>
      </div>
    </div>
  );
}
