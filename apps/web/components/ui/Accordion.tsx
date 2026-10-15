import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export type AccordionItem = { id: string; title: ReactNode; content: ReactNode };

/**
 * Accordion (PREMIUM.md §11): native <details> rows, 56 px tall, chevron turns, content opens
 * with a short height transition where the browser supports it (instant elsewhere). Works
 * without JavaScript; for explanations we keep one tap away instead of on the first screen.
 */
export function Accordion({
  items,
  className,
}: {
  items: readonly AccordionItem[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col border-t border-line', className)}>
      {items.map((item) => (
        <details key={item.id} className="accordion group border-b border-line">
          <summary
            className={cn(
              'flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3',
              'text-[16px] font-semibold text-ink [&::-webkit-details-marker]:hidden',
              'rounded-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          >
            {item.title}
            <Icon
              icon={ChevronDown}
              size={20}
              className="shrink-0 text-muted transition-transform duration-[var(--t-base)] ease-out group-open:rotate-180"
            />
          </summary>
          <div className="pb-5 text-[16px] leading-relaxed text-ink-2">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
