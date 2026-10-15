import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, TrendingDown } from 'lucide-react';
import {
  dropPath,
  formatPrice,
  formatWeekdayDayMonth,
  localizedPath,
  usualCents,
  type Locale,
} from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { dropPercent } from './DropCard';

/**
 * The biggest drop, big, right under the radar's title (C-080d): what someone who arrives from a
 * TikTok video should see without scrolling. Photo with the drop, hotel, night, today's price
 * against yesterday's and the usual price, and the way to its price history. Facts only.
 */
export function DropHero({ group: g }: { group: HotelDropsWithPhoto }) {
  const t = useTranslations('drops');
  const locale = useLocale() as Locale;
  const d = g.top;
  const pct = dropPercent(d.drop, locale);
  const usual = usualCents(d);
  const href = localizedPath(dropPath(g.hotel.slug, d.night), locale);
  return (
    <article
      aria-labelledby="drop-hero"
      className="relative grid overflow-hidden rounded-card border border-line bg-surface shadow-float md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <div className="relative">
        {g.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted (C-011c), already sized
          <img
            src={g.image.src}
            alt=""
            width={g.image.width}
            height={g.image.height}
            fetchPriority="high"
            className="bg-placeholder aspect-[16/11] h-full w-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="bg-placeholder aspect-[16/11] h-full w-full" />
        )}
        <span
          aria-hidden="true"
          className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-drop px-4 py-2 text-[30px] leading-none font-extrabold text-white tabular-nums shadow-float"
        >
          <Icon icon={TrendingDown} size={24} />
          {pct}
        </span>
      </div>
      <div className="flex flex-col p-5 md:p-7">
        <p className="text-eyebrow text-good-ink">{t('heroEyebrow')}</p>
        <h2 id="drop-hero" className="text-h2 mt-2">
          <a href={href} className="after:absolute after:inset-0">
            {g.hotel.name}
          </a>
        </h2>
        <p className="text-meta mt-1 text-muted-ink">
          {g.city.name[locale]} · {t('night', { date: formatWeekdayDayMonth(d.night, locale) })}
        </p>
        <p className="sr-only">{t('dropLabel', { pct })}</p>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Price cents={d.nowCents} size="xl" />
          <span className="text-[16px] text-muted-ink tabular-nums">
            {t('was', { price: formatPrice(d.prevCents, locale) })}
          </span>
        </div>
        <p className="mt-2 text-[16px] font-semibold text-good-ink">
          {d.provider.direct
            ? t('savedDirect', { amount: formatPrice(d.savedCents, locale) })
            : t('saved', { amount: formatPrice(d.savedCents, locale), provider: d.provider.name })}
        </p>
        <p className="text-meta mt-1 text-muted-ink">
          {usual !== null && <>{t('usual', { price: formatPrice(usual, locale) })} · </>}
          {d.priorDays >= 2 ? t('newLow', { days: d.priorDays + 1 }) : t('firstLow')}
        </p>
        <span
          aria-hidden="true"
          className={cn(buttonClasses({ size: 'lg' }), 'mt-6 gap-2 self-start md:mt-auto')}
        >
          {t('heroCta')}
          <Icon icon={ArrowRight} size={18} />
        </span>
      </div>
    </article>
  );
}
