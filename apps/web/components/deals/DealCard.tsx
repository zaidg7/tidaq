import { formatDateRange, localizedPath, stayPath, type Locale } from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import { PriceDelta } from '@/components/ui/PriceDelta';
import type { Deal } from '@/lib/data/deals';

/**
 * Deal card (DESIGN.md §3): photo, hotel (→ stay page), city and dates and the drop against the
 * stay's own 30-day average. No euro amount: base rates lack taxes and fees (D-52, C-149).
 */
export function DealCard({
  deal: d,
  locale,
  meta,
}: {
  deal: Deal;
  locale: Locale;
  /** "4.–6. Dez. 2026 · 2 Erwachsene", translated by the caller. */
  meta: string;
}) {
  return (
    <Card interactive padded={false} className="h-full overflow-hidden">
      {d.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted (C-011c), already sized
        <img
          src={d.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="bg-placeholder aspect-[16/10] w-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="bg-placeholder aspect-[16/10] w-full" />
      )}
      <div className="p-5">
        <a
          href={localizedPath(stayPath(d.hotelSlug, d.checkIn, d.checkOut, d.adults), locale)}
          className="text-h3 after:absolute after:inset-0"
        >
          {d.hotelName}
        </a>
        <p className="text-meta mt-1 text-muted-ink">
          {d.cityName[locale]} · {meta}
        </p>
        <PriceDelta ratio={d.drop} className="mt-4 text-[15px]" />
      </div>
    </Card>
  );
}

export const dealMetaValues = (d: Deal, locale: Locale) => ({
  dates: formatDateRange(d.checkIn, d.checkOut, locale),
  adults: d.adults,
});
