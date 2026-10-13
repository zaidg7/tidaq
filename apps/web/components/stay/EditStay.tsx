'use client';

import { useId, useState, type ComponentProps } from 'react';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SearchCard } from '@/components/home/SearchCard';

type Props = ComponentProps<typeof SearchCard> & {
  labels: ComponentProps<typeof SearchCard>['labels'] & {
    edit: string;
    close: string;
    editTitle: string;
  };
};

/**
 * "Ändern" on the stay page header: opens the search card below the header, prefilled with this
 * stay, so a new date or hotel is one step away. The card is rendered only while open.
 */
export function EditStay({ labels, ...card }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        leading={<Icon icon={open ? X : Pencil} size={16} />}
        // Icon only below 640 px, so it fits beside the hotel name; the label stays for readers.
        className="shrink-0 max-sm:size-11 max-sm:px-0"
      >
        <span className="max-sm:sr-only">{open ? labels.close : labels.edit}</span>
      </Button>
      <div id={panelId} hidden={!open} className="w-full basis-full">
        {open && (
          <section aria-label={labels.editTitle} className="mt-2 max-w-[560px]">
            <SearchCard {...card} labels={labels} formId="aendern" />
          </section>
        )}
      </div>
    </>
  );
}
