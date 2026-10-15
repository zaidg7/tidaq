import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The quiet secondary link of a section (mockup B): white pill, hairline border, arrow. */
export function PillLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'group inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-[15px] font-semibold whitespace-nowrap text-ink',
        'transition-[border-color,box-shadow] duration-[var(--t-base)] ease-out hover:border-ink hover:shadow-1',
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-[var(--t-base)] ease-out group-hover:translate-x-0.5"
      >
        →
      </span>
    </a>
  );
}

/**
 * A homepage section heading (mockup B): 40 px title (28 px on phones), an optional muted lead,
 * and the "see all" link on the right: a pill on desktop, a violet text link on phones.
 */
export function SectionHead({
  id,
  title,
  lead,
  link,
}: {
  id: string;
  title: string;
  /** Phones get the short line, wider screens the long one. */
  lead?: { short: string; long: string };
  link?: { href: string; long: string; short: string };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 px-1 md:mb-9 md:px-0">
      <div className="min-w-0">
        <h2
          id={id}
          className="text-[28px] leading-[1.1] font-[650] tracking-[-0.03em] md:text-[40px] md:leading-[1.12]"
        >
          {title}
        </h2>
        {lead && (
          <p className="mt-1.5 text-[15px] text-muted md:mt-2.5 md:text-[17px]">
            <span className="md:hidden">{lead.short}</span>
            <span className="hidden md:inline">{lead.long}</span>
          </p>
        )}
      </div>
      {link && (
        <>
          <a
            href={link.href}
            className="inline-flex h-11 shrink-0 items-center text-[15px] font-semibold text-accent md:hidden"
          >
            {link.short}
          </a>
          <div className="hidden md:block">
            <PillLink href={link.href}>{link.long}</PillLink>
          </div>
        </>
      )}
    </div>
  );
}
