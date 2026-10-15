'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';

/** One hotel on the radar, reduced to what the filters look at: city and its trips. */
export type DropFacet = {
  city: string;
  trips: readonly (readonly [month: string, nights: number])[];
};

export type DropFilterValues = { city: string; month: string; nights: string; sort: string };

type Option = { value: string; label: string };

type Labels = {
  button: string;
  title: string;
  close: string;
  city: string;
  cityAll: string;
  month: string;
  monthAll: string;
  nights: string;
  sort: string;
  reset: string;
  /** "{n} Hotels anzeigen" with the count already replaced for 1 and many; none for 0. */
  showOne: string;
  showMany: string;
  showNone: string;
};

/**
 * The Price Drops filter (C-125, Zaid: "put all of these in one filter button"): one button
 * opens a sheet (bottom sheet on phones, panel from 768 px) with city, travel month, length and
 * sort. The main button counts the hotels that match while you choose, so a choice never leads to
 * an empty page; applying it navigates to the shareable URL (`?stadt=&monat=&dauer=&sort=`).
 */
export function DropFilterSheet({
  base,
  current,
  facets,
  cities,
  months,
  nights,
  sorts,
  labels,
}: {
  /** Localized path of the radar, e.g. `/en/price-drops`. */
  base: string;
  current: DropFilterValues;
  facets: readonly DropFacet[];
  cities: readonly Option[];
  months: readonly Option[];
  /** Trip lengths, first option = all. */
  nights: readonly Option[];
  /** Sort orders, first option = the default. */
  sorts: readonly Option[];
  labels: Labels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<DropFilterValues>(current);
  const set = (patch: Partial<DropFilterValues>) => setV((x) => ({ ...x, ...patch }));
  const defaultSort = sorts[0]?.value ?? '';
  const active =
    [current.city, current.month, current.nights].filter(Boolean).length +
    (current.sort && current.sort !== defaultSort ? 1 : 0);

  const count = useMemo(
    () =>
      facets.filter(
        (h) =>
          (!v.city || h.city === v.city) &&
          h.trips.some(
            ([m, n]) => (!v.month || m === v.month) && (!v.nights || String(n) === v.nights),
          ),
      ).length,
    [facets, v.city, v.month, v.nights],
  );

  const apply = () => {
    const q = new URLSearchParams();
    if (v.city) q.set('stadt', v.city);
    if (v.month) q.set('monat', v.month);
    if (v.nights) q.set('dauer', v.nights);
    if (v.sort && v.sort !== defaultSort) q.set('sort', v.sort);
    const s = q.toString();
    setOpen(false);
    router.push(s ? `${base}?${s}` : base, { scroll: false });
  };

  const show =
    count === 0
      ? labels.showNone
      : count === 1
        ? labels.showOne
        : labels.showMany.replace('{n}', String(count));

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setV(current);
          setOpen(true);
        }}
        // A plain control, not a pill (C-137): the count says how many filters are on.
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-input border bg-surface px-4 text-[15px] font-semibold text-ink transition-colors',
          active > 0 ? 'border-ink' : 'border-line-strong hover:border-ink/40',
        )}
      >
        <Icon icon={SlidersHorizontal} size={18} />
        {labels.button}
        {active > 0 && (
          <span className="grid size-5 place-items-center rounded-[6px] bg-ink text-[12px] leading-none font-bold text-white">
            {active}
          </span>
        )}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={labels.title}
        closeLabel={labels.close}
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setV({ city: '', month: '', nights: '', sort: defaultSort })}
              className="min-h-11 px-1 text-[15px] font-semibold text-ink underline underline-offset-4"
            >
              {labels.reset}
            </button>
            <Button size="lg" onClick={apply} disabled={count === 0}>
              {show}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-7 pt-1">
          <div className="flex flex-col gap-2">
            <label htmlFor="drop-filter-city" className="text-[15px] font-semibold">
              {labels.city}
            </label>
            <div className="relative">
              <select
                id="drop-filter-city"
                value={v.city}
                onChange={(e) => set({ city: e.target.value })}
                className="h-[52px] w-full appearance-none rounded-input border border-line-strong bg-field px-4 pr-11 text-[16px] text-ink hover:border-ink/30 focus:border-accent focus:shadow-halo focus:outline-none"
              >
                <option value="">{labels.cityAll}</option>
                {cities.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Icon
                icon={ChevronDown}
                size={18}
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          {months.length > 1 && (
            // A dropdown like the city, not a row of pills (C-137).
            <div className="flex flex-col gap-2">
              <label htmlFor="drop-filter-month" className="text-[15px] font-semibold">
                {labels.month}
              </label>
              <div className="relative">
                <select
                  id="drop-filter-month"
                  value={v.month}
                  onChange={(e) => set({ month: e.target.value })}
                  className="h-[52px] w-full appearance-none rounded-input border border-line-strong bg-field px-4 pr-11 text-[16px] text-ink hover:border-ink/30 focus:border-accent focus:shadow-halo focus:outline-none"
                >
                  <option value="">{labels.monthAll}</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Icon
                  icon={ChevronDown}
                  size={18}
                  className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p id="drop-filter-nights" className="text-[15px] font-semibold">
              {labels.nights}
            </p>
            <Segmented
              label={labels.nights}
              options={nights}
              value={v.nights}
              onChange={(nights) => set({ nights })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[15px] font-semibold">{labels.sort}</p>
            <Segmented
              label={labels.sort}
              options={sorts}
              value={v.sort || defaultSort}
              onChange={(sort) => set({ sort })}
            />
          </div>
        </div>
      </Sheet>
    </>
  );
}
