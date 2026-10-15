import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, Clapperboard } from 'lucide-react';
import {
  dropDates,
  dropKey,
  dropPath,
  formatPrice,
  formatWeekdayDayMonth,
  localizedPath,
  postedStatus,
  type HotelDrops,
  type Locale,
  type PostedDrop,
  type PriceDrop,
} from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { hotelPhoto, type PhotoSize } from '@/lib/hotelPhotos';
import { dropPercent } from './DropCard';

export interface VideoItem {
  posted: PostedDrop;
  /** The drop on today's radar, or null when it's over. */
  live: PriceDrop | null;
  thumb: PhotoSize | null;
}

/** Each post with its status on today's radar and a thumbnail. */
export function videoItems(
  posted: readonly PostedDrop[],
  today: readonly HotelDrops[],
): VideoItem[] {
  return posted.map((p) => {
    const s = postedStatus(p, today);
    return {
      posted: p,
      live: s.live ? s.drop : null,
      thumb: hotelPhoto(p.group.hotel.slug)?.[160] ?? null,
    };
  });
}

/**
 * "Aus unseren Videos" (C-080j): on the bio-link landing, the drops from our latest posts come
 * first, so a viewer finds the hotel from the video in one tap. Each says what the post showed
 * and, honestly, whether the drop is still on the radar today (then with today's prices) or over
 * (the drop page then shows today's price). Renders nothing without posts.
 */
export function FromVideos({ items }: { items: VideoItem[] }) {
  const t = useTranslations('fromVideos');
  const td = useTranslations('drops');
  const locale = useLocale() as Locale;
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="from-videos" className="mt-6">
      <h2 id="from-videos" className="flex items-center gap-2 text-[17px] font-bold">
        <Icon icon={Clapperboard} size={18} className="text-accent" />
        {t('title')}
      </h2>
      <p className="text-meta mt-0.5 text-muted-ink">{t('text')}</p>
      <ul
        aria-label={t('label')}
        className="-mx-5 mt-3 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0"
      >
        {items.map(({ posted, live, thumb }) => {
          const g = posted.group;
          const shown = posted.group.top;
          return (
            <li
              key={`${g.hotel.slug}-${dropKey(shown)}`}
              className="w-[min(82vw,300px)] shrink-0 snap-start md:w-auto"
            >
              <a
                href={localizedPath(dropPath(g.hotel.slug, shown), locale)}
                className="group flex h-full gap-3 rounded-card border border-line bg-surface p-3 hover:border-line-strong"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted (C-011c), already sized
                  <img
                    src={thumb.src}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    className="bg-placeholder size-16 shrink-0 rounded-cell object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-placeholder size-16 shrink-0 rounded-cell"
                  />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] leading-snug font-bold">{g.hotel.name}</span>
                  <span className="text-meta text-muted-ink">
                    {g.city.name[locale]} · {shown.nights > 1 && `${td('weekendBadge')} `}
                    {dropDates(shown, locale)}
                  </span>
                  <span className="text-meta mt-1">
                    {t('posted', {
                      date: formatWeekdayDayMonth(posted.postedOn, locale),
                      pct: dropPercent(shown.drop, locale),
                    })}
                  </span>
                  {live ? (
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
                      <span className="rounded-full bg-good-soft px-2 py-0.5 font-semibold text-good-ink">
                        {t('live')}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {t('livePrices', {
                          now: formatPrice(live.nowCents, locale),
                          was: formatPrice(live.prevCents, locale),
                        })}
                      </span>
                    </span>
                  ) : (
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
                      <span className="rounded-full bg-neutral-soft px-2 py-0.5 font-semibold text-muted-ink">
                        {t('over')}
                      </span>
                      <span className="font-semibold text-accent group-hover:underline">
                        {t('overText')}
                      </span>
                    </span>
                  )}
                </span>
                <Icon
                  icon={ChevronRight}
                  size={18}
                  className="mt-0.5 shrink-0 self-center text-muted-ink"
                />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
