'use client';

import { useId, useState, type ComponentProps } from 'react';
import { CalendarDays, Pencil, X } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { SearchCard } from '@/components/home/SearchCard';
import { cn } from '@/lib/cn';

type Props = ComponentProps<typeof SearchCard> & {
  /** The stay as one line: "4.–6. Dez. 2026" and "2 Nächte · 2 Erwachsene". */
  summary: { dates: string; facts: string };
  labels: ComponentProps<typeof SearchCard>['labels'] & {
    edit: string;
    close: string;
    editTitle: string;
  };
};

/**
 * The dates line of the stay page header is the button to change them (blueprint rule 7): it
 * opens the search card below, prefilled with this stay, so new dates or guests are one step
 * away. The card is rendered only while open.
 */
export function EditStay({ summary, labels, ...card }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-[14px] border border-line-strong bg-surface px-3.5 py-2 text-left text-[15px] transition-colors hover:border-ink md:text-[16px]',
          open && 'border-ink',
        )}
      >
        <Icon icon={CalendarDays} size={18} className="shrink-0 text-muted-ink" />
        {/* Phones: dates over guests, no dangling dot when the line breaks. */}
        <span className="flex min-w-0 flex-col sm:flex-row sm:flex-wrap sm:gap-x-2">
          <span className="font-semibold text-ink">{summary.dates}</span>
          <span aria-hidden="true" className="text-muted max-sm:hidden">
            ·
          </span>
          <span className="text-muted-ink">{summary.facts}</span>
        </span>
        <Icon icon={open ? X : Pencil} size={16} className="shrink-0 text-accent" />
        <span className="sr-only">{open ? labels.close : labels.edit}</span>
      </button>
      <div id={panelId} hidden={!open}>
        {open && (
          <section aria-label={labels.editTitle} className="mt-3 max-w-[560px]">
            <SearchCard {...card} labels={labels} formId="aendern" />
          </section>
        )}
      </div>
    </div>
  );
}
