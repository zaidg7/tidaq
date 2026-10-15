import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The header of a page without a photo (mockup B language): an optional pill above (live state,
 * section), a big title (36 px phones, 60 px desktop) and one muted lead. Same rhythm as the
 * Price Drops page, so every page starts the same way.
 */
export function PageHead({
  pill,
  title,
  lead,
  children,
  className,
}: {
  pill?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Under the lead (facts, links). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('max-w-[820px]', className)}>
      {pill && (
        <p className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-accent md:text-[15px]">
          {pill}
        </p>
      )}
      <h1 className="text-[36px] leading-[1.04] font-[650] tracking-[-0.04em] md:text-[60px] md:leading-[1.02]">
        {title}
      </h1>
      {lead && <p className="mt-3 text-[17px] text-muted md:mt-4 md:text-[20px]">{lead}</p>}
      {children}
    </header>
  );
}
