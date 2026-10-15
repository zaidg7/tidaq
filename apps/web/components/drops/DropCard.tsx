import { useLocale, useTranslations } from 'next-intl';
import { TrendingDown } from 'lucide-react';
import {
  dropPath,
  formatDrop,
  formatPrice,
  formatWeekdayDayMonth,
  localizedPath,
  type Locale,
  type PriceDrop,
} from '@tidaq/core';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Price } from '@/components/ui/Price';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';

/** "−28 %" with the typographic minus. */
export const dropPercent = formatDrop;

/** Each night opens its own drop page (C-080b), which links on to the stay. */
const nightHref = (slug: string, night: string, locale: Locale) =>
  localizedPath(dropPath(slug, night), locale);

/**
 * One hotel on the Preissturz-Radar (C-080a): photo with the drop, hotel (→ the drop's own page,
 * C-080b), city and night, today's price against the day before, the site, and
 * whether it's the lowest price we've seen for that night. Its other dropped nights link below.
 * Both prices are real checks (CLAUDE.md rule 8); the old one is labelled, not just struck out.
 */
export function DropCard({ group: g, max = 3 }: { group: HotelDropsWithPhoto; max?: number }) {
  const t = useTranslations('drops');
  const locale = useLocale() as Locale;
  const d = g.top;
  const pct = dropPercent(d.drop, locale);
  const more = g.more.slice(0, max);
  return (
    <Card interactive padded={false} className="flex h-full flex-col overflow-hidden">
      <div className="relative">
        {g.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted (C-011c), already sized
          <img
            src={g.image.src}
            alt=""
            width={g.image.width}
            height={g.image.height}
            loading="lazy"
            decoding="async"
            className="bg-placeholder aspect-[16/10] w-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="bg-placeholder aspect-[16/10] w-full" />
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-drop px-3 py-1.5 text-[17px] leading-none font-extrabold text-white tabular-nums shadow-float">
          <Icon icon={TrendingDown} size={16} />
          <span aria-hidden="true">{pct}</span>
          <span className="sr-only">{t('dropLabel', { pct })}</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <a
          href={nightHref(g.hotel.slug, d.night, locale)}
          className="text-h3 after:absolute after:inset-0"
        >
          {g.hotel.name}
        </a>
        <p className="text-meta mt-1 text-muted-ink">
          {g.city.name[locale]} · {t('night', { date: formatWeekdayDayMonth(d.night, locale) })}
        </p>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Price cents={d.nowCents} size="lg" />
          <span className="text-[14px] text-muted-ink tabular-nums">
            {t('was', { price: formatPrice(d.prevCents, locale) })}
          </span>
        </div>
        <p className="text-meta mt-1 font-semibold text-good-ink">
          {d.provider.direct
            ? t('savedDirect', { amount: formatPrice(d.savedCents, locale) })
            : t('saved', { amount: formatPrice(d.savedCents, locale), provider: d.provider.name })}
        </p>
        <p className="text-meta mt-0.5 text-muted-ink">
          {d.priorDays >= 2 ? t('newLow', { days: d.priorDays + 1 }) : t('firstLow')}
        </p>
        {more.length > 0 && (
          // Above the card link: each night opens its own stay page.
          <p className="text-meta relative z-[1] mt-auto flex flex-wrap gap-x-2 gap-y-1 pt-4 text-muted-ink">
            <span>{t('more')}</span>
            {more.map((m: PriceDrop) => (
              <a
                key={m.night}
                href={nightHref(g.hotel.slug, m.night, locale)}
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                {formatWeekdayDayMonth(m.night, locale)} {dropPercent(m.drop, locale)}
              </a>
            ))}
            {g.more.length > more.length && (
              <span>{t('moreCount', { n: g.more.length - more.length })}</span>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}
