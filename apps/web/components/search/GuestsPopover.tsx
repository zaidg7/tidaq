'use client';

import type { KeyboardEvent } from 'react';
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-ink">{labels.adults}</p>
          <p className="text-small text-muted-ink">{labels.adultsHint}</p>
        </div>
        <div className="flex items-center gap-3">
          <IconButton
            label={labels.fewer}
            onClick={() => onChange(Math.max(MIN_ADULTS, adults - 1))}
            disabled={adults <= MIN_ADULTS}
            autoFocus={adults >= MAX_ADULTS}
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
            label={labels.more}
            onClick={() => onChange(Math.min(MAX_ADULTS, adults + 1))}
            disabled={adults >= MAX_ADULTS}
            // The popover was just opened from its segment: focus the button that can act.
            autoFocus={adults < MAX_ADULTS}
            className="border border-line-strong disabled:opacity-30"
          >
            <Icon icon={Plus} size={16} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
