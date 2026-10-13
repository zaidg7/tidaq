'use client';

import { useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { localizedPath, locales, type Locale } from '@tidaq/core';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { NavItem } from './NavLinks';

type Props = {
  items: NavItem[];
  locale: Locale;
  labels: { open: string; close: string; title: string; language: string };
  localeNames: Record<Locale, string>;
};

/**
 * Mobile menu as a top sheet (CRAFT.md §3 Navbar): a modal <dialog>, so the browser traps focus,
 * closes on Esc and makes the page behind it inert. 56 px rows at 20 px 700.
 */
export function MobileMenu({ items, locale, labels, localeNames }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const close = () => dialog.current?.close();

  return (
    <>
      <IconButton
        label={labels.open}
        aria-haspopup="dialog"
        className="lg:hidden"
        onClick={() => dialog.current?.showModal()}
      >
        <Icon icon={Menu} />
      </IconButton>
      <dialog
        ref={dialog}
        aria-label={labels.title}
        className="menu-sheet"
        // A click on the backdrop lands on the <dialog> itself, not on its content.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="flex items-center justify-between">
          <p className="text-eyebrow text-muted-ink">{labels.title}</p>
          <IconButton label={labels.close} onClick={close} autoFocus>
            <Icon icon={X} />
          </IconButton>
        </div>
        <ul className="mt-2 flex flex-col">
          {items.map((item) => (
            <li key={item.href} className="border-b border-line last:border-b-0">
              <a
                href={localizedPath(item.href, locale)}
                onClick={close}
                className="flex min-h-14 items-center text-[20px] font-bold tracking-[-0.015em] text-fg"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <nav aria-label={labels.language} className="mt-4 flex gap-2">
          {locales.map((l) => (
            <a
              key={l}
              href={localizedPath(pathname, l)}
              hrefLang={l}
              lang={l}
              aria-current={l === locale ? 'true' : undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-full border px-4 text-[15px] font-semibold',
                l === locale
                  ? 'border-accent bg-accent-soft text-fg'
                  : 'border-line text-muted-ink',
              )}
            >
              {localeNames[l]}
            </a>
          ))}
        </nav>
      </dialog>
    </>
  );
}
