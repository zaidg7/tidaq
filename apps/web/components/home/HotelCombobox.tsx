'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, X } from 'lucide-react';
import { foldText, matchHotels } from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { SearchHotel } from './SearchCard';

export type ComboboxLabels = {
  placeholder: string;
  noMatch: string;
  /** With `{n}`. */
  resultsOne: string;
  resultsOther: string;
  clear: string;
  listLabel: string;
};

type Props = {
  id: string;
  hotels: SearchHotel[];
  /** Selected hotel slug, '' for none. */
  value: string;
  onChange: (slug: string) => void;
  labels: ComboboxLabels;
  invalid?: boolean;
  describedBy?: string;
  /** Called when the list opens or closes, so the segment can raise itself above the next one. */
  onOpenChange?: (open: boolean) => void;
};

/**
 * Hotel autocomplete (C-021a), the ARIA 1.2 combobox pattern: the input keeps focus, the list
 * follows with aria-activedescendant. Accent-insensitive ("zurich" finds Zürich), grouped by
 * city. ↓/↑ move, Enter picks, Esc closes (or clears), a click picks without losing focus.
 */
export function HotelCombobox({
  id,
  hotels,
  value,
  onChange,
  labels,
  invalid,
  describedBy,
  onOpenChange,
}: Props) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const selected = hotels.find((h) => h.slug === value);
  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpenState] = useState(false);
  const [active, setActive] = useState(-1);

  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };

  // While a hotel is chosen and its name unchanged, show the full list (to switch hotels).
  const matches = useMemo(
    () => matchHotels(selected && query === selected.name ? '' : query, hotels),
    [query, hotels, selected],
  );
  const groups = useMemo(() => {
    const byCity = new Map<string, { hotel: SearchHotel; index: number }[]>();
    matches.forEach((hotel, index) => {
      byCity.set(hotel.city, [...(byCity.get(hotel.city) ?? []), { hotel, index }]);
    });
    return [...byCity];
  }, [matches]);

  const optionId = (i: number) => `${listId}-o${i}`;

  const pick = (hotel: SearchHotel) => {
    onChange(hotel.slug);
    setQuery(hotel.name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(e.key === 'ArrowDown' ? 0 : matches.length - 1);
          return;
        }
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActive((i) => (matches.length ? (i + step + matches.length) % matches.length : -1));
        return;
      }
      case 'Enter': {
        const hotel = open ? matches[active] : undefined;
        if (hotel) {
          e.preventDefault();
          pick(hotel);
        }
        return;
      }
      case 'Escape':
        if (open) {
          e.preventDefault();
          setOpen(false);
        } else if (query) {
          e.preventDefault();
          setQuery('');
          onChange('');
        }
        return;
    }
  };

  // Leaving the field: an exact name match counts as picked, so typing "Hotel Adlon" + Tab works.
  const onBlur = () => {
    setOpen(false);
    if (value) return;
    const exact = hotels.find((h) => foldText(h.name) === foldText(query));
    if (exact) pick(exact);
  };

  const count = matches.length;
  const status =
    open && query && !(selected && query === selected.name)
      ? count === 0
        ? labels.noMatch
        : (count === 1 ? labels.resultsOne : labels.resultsOther).replace('{n}', String(count))
      : '';

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <input
          ref={input}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={labels.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange('');
            setOpen(true);
            setActive(e.target.value ? 0 : -1);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 truncate bg-transparent text-[16px] leading-snug font-bold text-fg placeholder:font-semibold placeholder:text-muted focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label={labels.clear}
            // Keep focus in the input, so the list stays open for a new search.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery('');
              onChange('');
              setOpen(true);
              setActive(-1);
              input.current?.focus();
            }}
            className="-my-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Icon icon={X} size={16} />
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
      <ul
        id={listId}
        role="listbox"
        aria-label={labels.listLabel}
        hidden={!open}
        // The list hangs below the segment, across the whole search group (see SearchCard).
        className="combobox-list absolute top-[calc(100%+14px)] -right-3.5 -left-[46px] z-30 max-h-[min(360px,55vh)] overflow-y-auto overscroll-contain rounded-card border border-line bg-surface p-1.5 shadow-float max-[399px]:-left-3.5"
      >
        {count === 0 ? (
          <li role="presentation" className="px-3 py-3 text-[14px] text-muted-ink">
            {labels.noMatch}
          </li>
        ) : (
          groups.map(([city, items]) => (
            <li key={city} role="presentation">
              <ul role="group" aria-label={city}>
                <li
                  role="presentation"
                  aria-hidden="true"
                  className="px-3 pt-2.5 pb-1 text-[12px] font-semibold tracking-[0.04em] text-muted-ink uppercase"
                >
                  {city}
                </li>
                {items.map(({ hotel, index }) => (
                  <li
                    key={hotel.slug}
                    id={optionId(index)}
                    role="option"
                    aria-selected={hotel.slug === value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(hotel)}
                    onMouseMove={() => setActive(index)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-cell px-3 py-2 text-[15px] font-semibold text-fg',
                      index === active && 'bg-accent-soft',
                    )}
                  >
                    <span className="min-w-0 truncate">{hotel.name}</span>
                    {hotel.slug === value && (
                      <Icon icon={Check} size={16} className="shrink-0 text-accent" />
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
