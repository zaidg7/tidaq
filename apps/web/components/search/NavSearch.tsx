'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Locale } from '@tidaq/core';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
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
/** Marks a page's own search (hero bar, hero pill); while one is on screen the button leaves. */
const HERO_SEARCH = '[data-hero-search]';
const DESKTOP = '(min-width: 768px)';

type Props = {
  locale: Locale;
  today: string;
  guestOptions: string[];
  labels: SearchBarLabels & {
    /** Visible text of the desktop button: "Suchen". */
    pillShort: string;
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
 * Navbar search (PREMIUM.md §12, C-107b). Desktop: a compact "Suchen" pill that opens the full
 * search bar in a panel dropping from the top (no jump to the homepage). Phones: an icon that opens
 * the full-screen search (C-109). On pages with their own search (`data-hero-search`) the button
 * is taken out of the bar while that search is on screen and fades in once it scrolls away.
 */
export function NavSearch({ locale, today, guestOptions, labels }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  // 'unknown' until measured: CSS hides it on pages with a hero search, so it never flashes in.
  const [heroSearch, setHeroSearch] = useState<'unknown' | 'visible' | 'gone'>('unknown');
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState<SearchIndex>(EMPTY);
  const [phoneKey, setPhoneKey] = useState(0);

  useEffect(() => {
    const targets = [...document.querySelectorAll(HERO_SEARCH)];
    if (targets.length === 0) {
      setHeroSearch('gone');
      return;
    }
    // Hidden copies (the bar on phones, the pill on desktop) never intersect.
    const seen = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        }
        setHeroSearch(seen.size > 0 ? 'visible' : 'gone');
      },
      // The part under the sticky navbar doesn't count as on screen.
      { rootMargin: '-76px 0px 0px 0px' },
    );
    for (const t of targets) observer.observe(t);
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
      <div data-hero-search={heroSearch} className="nav-search">
        {/* `cn` doesn't merge conflicting classes: wrappers own visibility per breakpoint. */}
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={open}
            onPointerEnter={prefetch}
            onFocus={prefetch}
            aria-haspopup="dialog"
            aria-label={labels.open}
            className="nav-pill inline-flex h-11 items-center gap-2 rounded-full pr-4 pl-3.5 text-[15px] font-semibold"
          >
            <Icon icon={Search} size={16} />
            <span aria-hidden="true">{labels.pillShort}</span>
          </button>
        </div>
        <div className="lg:hidden">
          <IconButton
            label={labels.open}
            aria-haspopup="dialog"
            onClick={open}
            onPointerEnter={prefetch}
            variant="nav"
          >
            <Icon icon={Search} />
          </IconButton>
        </div>
      </div>
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
