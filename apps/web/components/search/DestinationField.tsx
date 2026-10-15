'use client';

import { forwardRef, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Building2, X } from 'lucide-react';
import { foldText, highlightRange, matchCities, matchHotels } from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { PhotoSize } from '@/lib/hotelPhotos';
import type { Destination, SearchCity, SearchDestHotel, SearchIndex } from './types';

export type DestinationLabels = {
  placeholder: string;
  listLabel: string;
  popular: string;
  cheap: string;
  cities: string;
  hotels: string;
  /** With `{n}`, per count: [one, other]. */
  cityHotels: [string, string];
  dropBadge: string;
  /** With `{pct}`. */
  dropPct: string;
  /** Live status, per count: [none, one, other] with `{n}`. */
  results: [string, string, string];
  noMatch: string;
  clear: string;
};

type Option =
  | { kind: 'city'; city: SearchCity; chip?: true }
  | { kind: 'hotel'; hotel: SearchDestHotel; cheap?: true };

type Props = {
  id: string;
  index: SearchIndex;
  value: Destination;
  onChange: (next: Destination) => void;
  /** After a pick: the bar moves on to the dates. */
  onPicked: (next: NonNullable<Destination>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: DestinationLabels;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
};

const MAX_CITIES = 3;
const MAX_HOTELS = 8;

const pct = (drop: number) => Math.round(drop * 100);

function count(n: number, [one, other]: [string, string]): string {
  return (n === 1 ? one : other).replace('{n}', String(n));
}

/** The query marked in the name (accent-insensitive, core `highlightRange`). */
function Marked({ text, query }: { text: string; query: string }) {
  const range = query ? highlightRange(text, query) : null;
  if (!range) return <>{text}</>;
  const [start, end] = range;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-transparent font-bold text-ink">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

/** A 48 px rounded photo, or a neutral tile with a building for hotels without their own photo. */
function Thumb({
  photo,
  round,
  size = 48,
}: {
  photo: PhotoSize | null;
  round?: boolean;
  size?: number;
}) {
  const shape = round ? 'rounded-full' : 'rounded-input';
  if (!photo) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={cn('grid shrink-0 place-items-center bg-surface-2 text-muted', shape)}
      >
        <Icon icon={Building2} size={size > 40 ? 20 : 16} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- self-hosted thumbnail, sized by its box
    <img
      src={photo.src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={cn('shrink-0 bg-surface-2 object-cover', shape)}
    />
  );
}

/**
 * "Hotel oder Stadt" (PREMIUM.md §9.1): an ARIA 1.2 combobox whose list is the destination
 * panel. Empty, it shows "Beliebte Städte" as photo chips and "Gerade günstig" with today's
 * biggest drops; typing filters cities and hotels live, accent-insensitive, with the match
 * marked. ↑/↓ move, Enter picks, Esc closes (then clears). The input keeps focus throughout.
 */
export const DestinationField = forwardRef<HTMLInputElement, Props>(function DestinationField(
  {
    id,
    index,
    value,
    onChange,
    onPicked,
    open,
    onOpenChange,
    labels,
    invalid,
    describedBy,
    autoFocus,
  },
  ref,
) {
  const listId = useId();
  const cityBy = useMemo(() => new Map(index.cities.map((c) => [c.slug, c])), [index.cities]);
  const hotelBy = useMemo(() => new Map(index.hotels.map((h) => [h.slug, h])), [index.hotels]);
  const nameOf = (d: Destination) =>
    d ? ((d.kind === 'city' ? cityBy.get(d.slug)?.name : hotelBy.get(d.slug)?.name) ?? '') : '';
  const [query, setQuery] = useState(() => nameOf(value));
  const [active, setActive] = useState(-1);

  // A picked destination with its name unchanged shows the start view again (to switch).
  const search = value && query === nameOf(value) ? '' : query.trim();

  const sections = useMemo(() => {
    if (!search) {
      const chips = index.popular.flatMap((slug) => {
        const city = cityBy.get(slug);
        return city ? [{ kind: 'city' as const, city, chip: true as const }] : [];
      });
      const cheap = index.cheap.flatMap((slug) => {
        const hotel = hotelBy.get(slug);
        return hotel ? [{ kind: 'hotel' as const, hotel, cheap: true as const }] : [];
      });
      return [
        { key: 'popular', title: labels.popular, options: chips as Option[] },
        { key: 'cheap', title: labels.cheap, options: cheap as Option[] },
      ].filter((s) => s.options.length > 0);
    }
    const cities = matchCities(search, index.cities)
      .slice(0, MAX_CITIES)
      .map((city): Option => ({ kind: 'city', city }));
    const hotels = matchHotels(search, index.hotels)
      .slice(0, MAX_HOTELS)
      .map((hotel): Option => ({ kind: 'hotel', hotel }));
    return [
      { key: 'cities', title: labels.cities, options: cities },
      { key: 'hotels', title: labels.hotels, options: hotels },
    ].filter((s) => s.options.length > 0);
  }, [search, index, cityBy, hotelBy, labels]);

  const options = sections.flatMap((s) => s.options);
  const optionId = (i: number) => `${listId}-o${i}`;

  const pick = (option: Option) => {
    const next =
      option.kind === 'city'
        ? { kind: 'city' as const, slug: option.city.slug }
        : { kind: 'hotel' as const, slug: option.hotel.slug };
    onChange(next);
    setQuery(option.kind === 'city' ? option.city.name : option.hotel.name);
    setActive(-1);
    onOpenChange(false);
    onPicked(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!open) onOpenChange(true);
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActive((i) => {
          if (!options.length) return -1;
          if (i < 0) return step > 0 ? 0 : options.length - 1;
          return (i + step + options.length) % options.length;
        });
        return;
      }
      case 'Enter': {
        const option = open ? options[active] : undefined;
        if (option) {
          e.preventDefault();
          pick(option);
        }
        return;
      }
      case 'Escape':
        if (open) {
          e.preventDefault();
          onOpenChange(false);
        } else if (query) {
          e.preventDefault();
          setQuery('');
          onChange(null);
        }
        return;
    }
  };

  // Leaving the field with an exact name typed counts as a pick ("Berlin" + Tab works).
  const onBlur = () => {
    onOpenChange(false);
    if (value || !query.trim()) return;
    const q = foldText(query);
    const city = index.cities.find((c) => foldText(c.name) === q);
    const hotel = index.hotels.find((h) => foldText(h.name) === q);
    if (city) onChange({ kind: 'city', slug: city.slug });
    else if (hotel) onChange({ kind: 'hotel', slug: hotel.slug });
  };

  const total = search ? options.length : -1;
  const status =
    open && total >= 0
      ? (total === 0
          ? labels.results[0]
          : total === 1
            ? labels.results[1]
            : labels.results[2]
        ).replace('{n}', String(total))
      : '';

  let i = -1;
  const row = (option: Option, children: ReactNode, className?: string) => {
    i += 1;
    const pos = i;
    const key = option.kind === 'city' ? `c:${option.city.slug}` : `h:${option.hotel.slug}`;
    return (
      <li
        key={key}
        id={optionId(pos)}
        role="option"
        aria-selected={pos === active}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => pick(option)}
        onMouseMove={() => setActive(pos)}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-card px-2.5 py-2 transition-colors duration-[var(--t-fast)]',
          pos === active && 'bg-surface-2',
          className,
        )}
      >
        {children}
      </li>
    );
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <input
          ref={ref}
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
          autoFocus={autoFocus}
          placeholder={labels.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
            onOpenChange(true);
            setActive(e.target.value.trim() ? 0 : -1);
          }}
          onFocus={() => onOpenChange(true)}
          onClick={() => onOpenChange(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 truncate bg-transparent text-[15px] leading-snug font-semibold text-ink placeholder:font-medium placeholder:text-muted focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label={labels.clear}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery('');
              onChange(null);
              onOpenChange(true);
              setActive(-1);
              document.getElementById(id)?.focus();
            }}
            className="-my-2 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Icon icon={X} size={16} />
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
      <div
        // Nothing to show before typing (no catalog): no empty panel.
        hidden={!open || (!search && sections.length === 0)}
        className="search-panel absolute top-[calc(100%+12px)] left-0 z-30 w-[480px] max-w-[calc(100vw-32px)] overflow-hidden rounded-panel border border-line bg-surface shadow-3"
      >
        <ul
          id={listId}
          role="listbox"
          aria-label={labels.listLabel}
          className="max-h-[min(520px,65vh)] overflow-y-auto overscroll-contain p-3"
        >
          {sections.length === 0 ? (
            <li role="presentation" className="px-3 py-4 text-small text-muted-ink">
              {labels.noMatch}
            </li>
          ) : (
            sections.map((section) => (
              <li key={section.key} role="presentation" className="not-first:mt-2">
                <ul
                  role="group"
                  aria-label={section.title}
                  className={cn(section.key === 'popular' && 'grid grid-cols-2 gap-x-1')}
                >
                  <li
                    role="presentation"
                    aria-hidden="true"
                    className="col-span-2 px-2.5 pt-1.5 pb-2 text-label text-muted-ink"
                  >
                    {section.title}
                  </li>
                  {section.options.map((option) =>
                    option.kind === 'city'
                      ? option.chip
                        ? row(
                            option,
                            <>
                              <Thumb photo={option.city.thumb} round size={40} />
                              <span className="min-w-0 truncate text-[15px] font-semibold text-ink">
                                {option.city.name}
                              </span>
                            </>,
                            'py-1.5',
                          )
                        : row(
                            option,
                            <>
                              <Thumb photo={option.city.thumb} />
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate text-[15px] font-medium text-ink">
                                  <Marked text={option.city.name} query={search} />
                                </span>
                                <span className="text-small text-muted-ink">
                                  {count(option.city.hotels, labels.cityHotels)}
                                </span>
                              </span>
                            </>,
                          )
                      : row(
                          option,
                          <>
                            <Thumb photo={option.hotel.thumb} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-[15px] font-medium text-ink">
                                <Marked text={option.hotel.name} query={search} />
                              </span>
                              <span className="truncate text-small text-muted-ink">
                                {option.hotel.city}
                              </span>
                            </span>
                            {option.hotel.drop !== undefined && (
                              <span className="shrink-0 rounded-badge bg-good-soft px-2 py-0.5 text-[12.5px] font-bold text-good">
                                {option.cheap
                                  ? labels.dropPct.replace('{pct}', String(pct(option.hotel.drop)))
                                  : labels.dropBadge}
                              </span>
                            )}
                          </>,
                        ),
                  )}
                </ul>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
});
