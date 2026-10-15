'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * In-page navigation for long pages (C-137, instead of a row of pills): plain text links that stick
 * under the navbar, the section in view underlined. Phones scroll the row sideways. The links are
 * ordinary anchors, so it works without JavaScript; the script only moves the underline.
 */
export function SectionNav({
  label,
  items,
  className,
}: {
  /** Names the navigation for screen readers ("Regionen"). */
  label: string;
  items: { id: string; label: string }[];
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    // A section counts as "in view" once its top passes the upper third of the screen.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={label}
      className={cn(
        'sticky top-16 z-30 -mx-[18px] border-b border-line bg-bg/92 backdrop-blur-md md:-mx-10 lg:top-[76px]',
        className,
      )}
    >
      <ul className="flex gap-6 overflow-x-auto px-[18px] [scrollbar-width:none] md:gap-9 md:px-10 [&::-webkit-scrollbar]:hidden">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? 'location' : undefined}
              className={cn(
                'relative flex h-12 items-center text-[15px] font-semibold whitespace-nowrap transition-colors',
                active === i.id ? 'text-ink' : 'text-muted hover:text-ink',
                'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:transition-colors',
                active === i.id ? 'after:bg-ink' : 'after:bg-transparent',
              )}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
