'use client';

import { useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { localizedPath, locales, type Locale } from '@tidaq/core';
import { buttonClasses, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import type { NavItem } from './NavLinks';

type Props = {
  items: NavItem[];
  locale: Locale;
  labels: { open: string; close: string; title: string; language: string; alert: string };
  localeNames: Record<Locale, string>;
  /** Where "Price Alert aktivieren" leads (the alert form on the Price Drops page). */
  alertHref: string;
};

/**
 * Mobile menu (PREMIUM.md §12): a full-screen modal <dialog> that slides in from the right
 * (320 ms). The browser traps focus, Esc closes it, the page behind is inert. Big links (28 px),
 * the Price Alert button, language pills at the bottom.
 */
export function MobileMenu({ items, locale, labels, localeNames, alertHref }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const close = () => dialog.current?.close();

  return (
    <>
      <IconButton
        label={labels.open}
        aria-haspopup="dialog"
        variant="nav"
        className="lg:hidden"
        onClick={() => dialog.current?.showModal()}
      >
        <Icon icon={Menu} />
      </IconButton>
      <dialog ref={dialog} aria-label={labels.title} className="menu-sheet">
        <div className="flex min-h-full flex-col">
          <div className="flex h-16 items-center justify-between">
            <Logo label={null} />
            <IconButton label={labels.close} onClick={close} autoFocus>
              <Icon icon={X} />
            </IconButton>
          </div>
          <ul className="mt-6 flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={localizedPath(item.href, locale)}
                  onClick={close}
                  className="flex min-h-16 items-center text-[28px] font-semibold tracking-[-0.03em] text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={alertHref}
            onClick={close}
            className={cn(buttonClasses({ size: 'lg', block: true }), 'mt-8')}
          >
            {labels.alert}
          </a>
          <nav aria-label={labels.language} className="mt-auto flex gap-2 pt-10">
            {locales.map((l) => (
              <a
                key={l}
                href={localizedPath(pathname, l)}
                hrefLang={l}
                lang={l}
                aria-current={l === locale ? 'true' : undefined}
                className={cn(
                  'inline-flex h-11 items-center rounded-full border px-4 text-[15px] font-semibold',
                  l === locale ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2',
                )}
              >
                {localeNames[l]}
              </a>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}
