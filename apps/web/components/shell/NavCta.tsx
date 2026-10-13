'use client';

import { useEffect, useState } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * The navbar's "Preise ansehen". While the search card (`#suche`) or another primary CTA marked
 * `data-hides-nav-cta` is on screen it stays hidden, so two primary buttons are never in view
 * (CRAFT.md §1).
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
