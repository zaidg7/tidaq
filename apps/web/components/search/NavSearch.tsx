'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Locale } from '@tidaq/core';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { SearchBarLabels } from './SearchBar';
import type { SearchIndex } from './types';

// The bar loads with the first open: pages without a search don't ship its code.
const SearchBar = dynamic(() => import('./SearchBar').then((m) => m.SearchBar), {
  ssr: false,
  loading: () => <div className="h-[76px] rounded-search border border-line bg-surface" />,
});

const PhoneSearch = dynamic(() => import('./PhoneSearch').then((m) => m.PhoneSearch), {
  ssr: false,
});

const EMPTY: SearchIndex = { cities: [], hotels: [], popular: [], cheap: [] };
/** The homepage's hero search; while it is on screen the pill hides. */
const HERO_ID = 'suche';
const DESKTOP = '(min-width: 768px)';

type Props = {
  locale: Locale;
  today: string;
  guestOptions: string[];
  labels: SearchBarLabels & {
    /** Pill text: "Hotel oder Stadt", "Daten", "Gäste". */
    pill: [string, string, string];
    open: string;
    close: string;
    dialog: string;
  };
};

let indexRequest: Promise<SearchIndex> | null = null;

function loadIndex(locale: Locale): Promise<SearchIndex> {
  indexRequest ??= fetch(`/api/search-index?locale=${locale}`)
    .then((r) => (r.ok ? (r.json() as Promise<SearchIndex>) : EMPTY))
    .catch(() => {
      indexRequest = null; // try again on the next open
      return EMPTY;
    });
  return indexRequest;
}

/**
 * Navbar search (PREMIUM.md §12, C-107b). From 1280 px a compact pill "Hotel oder Stadt ·
 * Daten · Gäste"; below, an icon. Either opens the full search bar in place, in a panel that
 * drops from the top (no jump to the homepage). On the homepage the pill fades in only once the
 * hero search has scrolled away. On phones the icon opens the full-screen search (C-109).
 */
export function NavSearch({ locale, today, guestOptions, labels }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState<SearchIndex>(EMPTY);
  // Phones: the full-screen search, mounted on first use and reopened by bumping the key.
  const [phoneKey, setPhoneKey] = useState(0);

  useEffect(() => {
    const hero = document.getElementById(HERO_ID);
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(!!entry?.isIntersecting));
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const prefetch = () => {
    void loadIndex(locale).then(setIndex);
  };

  const open = () => {
    if (!window.matchMedia(DESKTOP).matches) {
      prefetch();
      setPhoneKey((k) => k + 1);
      return;
    }
    prefetch();
    // Stays mounted after the first open, so a closed search keeps what was typed.
    setMounted(true);
    dialog.current?.showModal();
  };

  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        aria-haspopup="dialog"
        aria-hidden={heroVisible || undefined}
        tabIndex={heroVisible ? -1 : undefined}
        className={cn(
          'nav-pill hidden h-12 items-center gap-3 rounded-full border border-line bg-surface pr-1.5 pl-5 shadow-1 xl:flex',
          'transition-[opacity,transform,box-shadow] duration-[var(--t-base)] ease-out hover:shadow-2',
          heroVisible && 'pointer-events-none translate-y-1 opacity-0',
        )}
      >
        <span className="sr-only">{labels.open}</span>
        <span
          aria-hidden="true"
          className="flex items-center gap-2.5 text-[14px] whitespace-nowrap"
        >
          <span className="font-semibold text-ink">{labels.pill[0]}</span>
          <span className="h-4 w-px bg-line" />
          <span className="text-muted-ink">{labels.pill[1]}</span>
          <span className="h-4 w-px bg-line" />
          <span className="text-muted-ink">{labels.pill[2]}</span>
        </span>
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-accent text-white"
        >
          <Icon icon={Search} size={16} />
        </span>
      </button>
      <IconButton
        label={labels.open}
        aria-haspopup="dialog"
        onClick={open}
        onPointerEnter={prefetch}
        className="xl:hidden"
      >
        <Icon icon={Search} />
      </IconButton>
      {phoneKey > 0 && (
        <PhoneSearch
          index={index}
          today={today}
          locale={locale}
          labels={labels}
          openKey={phoneKey}
        />
      )}
      <dialog
        ref={dialog}
        aria-label={labels.dialog}
        className="search-dialog"
        // A click on the backdrop (the dialog itself, outside the panel) closes it.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="mx-auto flex max-w-[1240px] items-start gap-4 px-6 pt-4 pb-8 lg:px-10">
          <div className="mx-auto mt-14 w-full max-w-[880px]">
            {mounted && (
              <SearchBar
                index={index}
                today={today}
                locale={locale}
                guestOptions={guestOptions}
                labels={labels}
                autoFocus
              />
            )}
          </div>
          <IconButton label={labels.close} onClick={close} className="absolute top-4 right-4">
            <Icon icon={X} />
          </IconButton>
        </div>
      </dialog>
    </>
  );
}
