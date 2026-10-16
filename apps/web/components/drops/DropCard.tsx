import { useLocale, useTranslations } from 'next-intl';
import {
  distinctTrips,
  dropKey,
  dropPath,
  formatDrop,
  formatPrice,
  dropDates,
  formatWeekdayDayMonth,
  localizedPath,
  type Locale,
  type PriceDrop,
} from '@tidaq/core';
import { Photo } from '@/components/ui/Photo';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { cn } from '@/lib/cn';
import { cardPhoto } from '@/lib/photos';
import { DropBadge, dropTextClass } from './DropBadge';

/** "−28 %" with the typographic minus. */
export const dropPercent = formatDrop;

/** Each night opens its own drop page (C-080b), which links on to the stay. */
const nightHref = (slug: string, d: PriceDrop, locale: Locale) =>
  localizedPath(dropPath(slug, d), locale);

/**
 * One hotel on the Preissturz-Radar (C-080a, mockup B language): the photo is the card, with the
 * drop badge (stronger red for bigger drops) and the trip length ("5 Nächte"); below it the hotel (→ the drop's own page,
 * C-080b), city and night, today's price against the day before, the saving at which site, and
 * whether it's the lowest price we've seen. Its other dropped nights follow as small links.
 * Both prices are real checks (CLAUDE.md rule 8); the old one is labelled, not just struck out.
 */
export function DropCard({ group: g, max = 3 }: { group: HotelDropsWithPhoto; max?: number }) {
  const t = useTranslations('drops');
  const tp = useTranslations('photo');
  const locale = useLocale() as Locale;
  const d = g.top;
  const pct = dropPercent(d.drop, locale);
  // Different dates, not the same holiday a day later (C-125).
  const more = distinctTrips(d, g.more, max);
  const pic = cardPhoto(g.hotel.slug, g.city.slug);
  return (
    <article className="tile-zoom group relative flex h-full flex-col gap-3 md:gap-4">
      <Photo
        photo={pic?.photo ?? null}
        alt=""
        sizes="(min-width: 1240px) 390px, (min-width: 768px) 33vw, 100vw"
        className="aspect-[4/3] rounded-card"
        tag={pic?.city ? tp('cityTag') : undefined}
      >
        <DropBadge
          drop={d.drop}
          locale={locale}
          label={t('dropLabel', { pct })}
          className="absolute top-3.5 left-3.5 z-10"
        />
        {d.nights > 1 && (
          <span className="absolute top-3.5 right-3.5 z-10 inline-flex h-8 items-center photo-chip rounded-full px-3 text-[13px] font-semibold text-ink">
            {t('stayBadge', { n: d.nights })}
          </span>
        )}
      </Photo>
      <div className="flex flex-1 flex-col px-0.5">
        <h3 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.01em]">
          <a
            href={nightHref(g.hotel.slug, d, locale)}
            className="after:absolute after:inset-0 group-hover:text-accent"
          >
            {g.hotel.name}
          </a>
        </h3>
        <p className="mt-0.5 text-[15px] text-muted">
          {/* The badge on the photo names the length; the drop page has the full stay. */}
          {g.city.name[locale]} · {dropDates(d, locale)}
        </p>
        {/* Exact quote only (D-52): nightly as the site shows it, then the stay total. */}
        <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2">
          <strong className="text-[22px] font-bold tracking-[-0.02em] tabular-nums">
            {t('perNight', { price: formatPrice(d.nightlyCents, locale) })}
          </strong>
        </p>
        <p className="text-[14px] text-muted tabular-nums">
          {t('totalFor', { price: formatPrice(d.nowCents, locale), n: d.nights })} ·{' '}
          {t('inclTaxes')}
        </p>
        <p className={cn('mt-1 text-[14px] font-semibold', dropTextClass(d.drop))}>
          {d.provider.direct
            ? t('sinceDirect', { pct })
            : t('sinceAt', { pct, provider: d.provider.name })}
        </p>
        <p className="mt-0.5 text-[14px] text-muted">
          {d.priorDays >= 2 ? t('newLow', { days: d.priorDays + 1 }) : t('firstLow')}
        </p>
        {more.length > 0 && (
          // Above the card link: each night opens its own drop page.
          <div className="relative z-[1] pt-3.5">
            <p className="text-[13px] text-muted">{t('more')}</p>
            {/* Rows, not pills (C-137): date and length left, the drop right. */}
            {/* Divs, not a list: the card already sits in the drops list. */}
            <div className="mt-1 divide-y divide-line border-y border-line">
              {more.map((m: PriceDrop) => (
                <a
                  key={dropKey(m)}
                  href={nightHref(g.hotel.slug, m, locale)}
                  className="flex min-h-10 items-center justify-between gap-3 text-[14px] font-medium text-ink hover:text-accent"
                >
                  <span>
                    {formatWeekdayDayMonth(m.night, locale)}
                    {m.nights > 1 && (
                      <span className="text-muted"> · {t('stayBadge', { n: m.nights })}</span>
                    )}
                  </span>
                  <span className={cn('font-bold tabular-nums', dropTextClass(m.drop))}>
                    {dropPercent(m.drop, locale)}
                  </span>
                </a>
              ))}
            </div>
            {g.more.length > more.length && (
              <p className="pt-1.5 text-[13px] text-muted">
                {t('moreCount', { n: g.more.length - more.length })}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
