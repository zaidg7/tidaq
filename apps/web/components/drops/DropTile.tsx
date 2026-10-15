import { useLocale, useTranslations } from 'next-intl';
import {
  dropDates,
  dropPath,
  formatDrop,
  formatPrice,
  localizedPath,
  type Locale,
} from '@tidaq/core';
import { Photo } from '@/components/ui/Photo';
import { DropBadge } from './DropBadge';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { cardPhoto } from '@/lib/photos';

/**
 * A Price Drop as a photo tile (PREMIUM.md §11 DropCard, mockup B): 4:5 photo with the drop
 * badge (coloured by size) and the trip length, then name, "Stadt · Sa, 31. Okt" and "995 € statt 3.345 €".
 * No card box: the photo is the card. The whole tile is one link to the drop's page.
 */
export function DropTile({
  group: g,
  priority = false,
}: {
  group: HotelDropsWithPhoto;
  priority?: boolean;
}) {
  const t = useTranslations('drops');
  const tp = useTranslations('photo');
  const locale = useLocale() as Locale;
  const d = g.top;
  const pct = formatDrop(d.drop, locale);
  const pic = cardPhoto(g.hotel.slug, g.city.slug);
  return (
    <a
      href={localizedPath(dropPath(g.hotel.slug, d), locale)}
      className="drop-tile tile-zoom group flex flex-col gap-2.5 text-ink md:gap-3.5"
    >
      <Photo
        photo={pic?.photo ?? null}
        alt=""
        sizes="(min-width: 1240px) 290px, (min-width: 768px) 25vw, 50vw"
        priority={priority}
        className="aspect-[4/5] rounded-[18px] md:rounded-card"
        tag={pic?.city ? tp('cityTag') : undefined}
      >
        <DropBadge
          drop={d.drop}
          locale={locale}
          label={t('dropLabel', { pct })}
          size="sm"
          className="absolute top-2.5 left-2.5 z-10 md:top-3.5 md:left-3.5 md:h-8 md:px-3 md:text-[16px]"
        />
        {d.nights > 1 && (
          <span className="absolute top-2.5 right-2.5 z-10 inline-flex h-7 items-center rounded-full bg-white/92 px-2.5 text-[12px] leading-none font-semibold text-ink md:top-3.5 md:right-3.5 md:h-8 md:px-3 md:text-[13px]">
            {t('stayBadge', { n: d.nights })}
          </span>
        )}
      </Photo>
      <div>
        <h3 className="truncate text-[15px] leading-[1.3] font-semibold tracking-[-0.01em] transition-colors group-hover:text-accent md:text-[18px]">
          {g.hotel.name}
        </h3>
        <p className="mt-px truncate text-[13px] text-muted md:mt-0.5 md:text-[15px]">
          {g.city.name[locale]} · {dropDates(d, locale)}
        </p>
        <p className="mt-1 text-[13px] text-muted md:mt-2 md:text-[15px]">
          <strong className="text-[17px] font-bold tracking-[-0.02em] text-ink tabular-nums md:text-[20px]">
            {formatPrice(d.nowCents, locale)}
          </strong>{' '}
          {t('instead', { price: formatPrice(d.prevCents, locale) })}
        </p>
      </div>
    </a>
  );
}
