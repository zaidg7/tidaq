'use client';

import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * The navbar's "Preise ansehen". On a page with the search card (`#suche`) it stays hidden while
 * the card is on screen, so two primary buttons are never in view (CRAFT.md §1).
 */
export function NavCta({ href, label }: { href: string; label: string }) {
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById('suche');
    if (!target) return;
    const io = new IntersectionObserver(([entry]) =>
      setSearchVisible(entry?.isIntersecting ?? false),
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <a
      href={href}
      aria-hidden={searchVisible || undefined}
      tabIndex={searchVisible ? -1 : undefined}
      className={cn(
        buttonClasses({ size: 'sm' }),
        'transition-[opacity,transform] duration-[180ms]',
        searchVisible && 'pointer-events-none translate-y-1 opacity-0',
      )}
    >
      {label}
    </a>
  );
}
