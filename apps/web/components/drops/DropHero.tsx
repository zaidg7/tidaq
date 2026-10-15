import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  dropDates,
  dropPath,
  formatPrice,
  localizedPath,
  usualCents,
  type Locale,
} from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/components/ui/Photo';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { cn } from '@/lib/cn';
import { cardPhoto } from '@/lib/photos';
import { DropBadge, dropTextClass } from './DropBadge';
import { dropPercent } from './DropCard';

/**
 * The biggest drop, big, right under the radar's title (C-080d, mockup B language): what someone
 * who arrives from a TikTok video should see without scrolling. A large photo with the drop badge,
 * then the hotel, the night, today's price against yesterday's, the saving and the new low, and
 * the way to its page. No box: the photo is the frame. The whole feature is one link.
 */
export function DropHero({ group: g }: { group: HotelDropsWithPhoto }) {
  const t = useTranslations('drops');
  const tp = useTranslations('photo');
  const locale = useLocale() as Locale;
  const d = g.top;
  const pct = dropPercent(d.drop, locale);
  const usual = usualCents(d);
  const href = localizedPath(dropPath(g.hotel.slug, d), locale);
  const pic = cardPhoto(g.hotel.slug, g.city.slug);
  return (
    <article
      aria-labelledby="drop-hero"
      className="tile-zoom group relative grid gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center md:gap-12"
    >
      <Photo
        photo={pic?.photo ?? null}
        alt=""
        sizes="(min-width: 1240px) 680px, (min-width: 768px) 56vw, 100vw"
        priority
        className="aspect-[4/3] rounded-card md:rounded-panel"
        tag={pic?.city ? tp('cityTag') : undefined}
      >
        <DropBadge
          drop={d.drop}
          locale={locale}
          label={t('dropLabel', { pct })}
          size="lg"
          className="absolute top-4 left-4 z-10 md:top-5 md:left-5 md:h-12 md:px-5 md:text-[26px]"
        />
        {d.nights > 1 && (
          <span className="absolute top-4 right-4 z-10 inline-flex h-8 items-center photo-chip rounded-full px-3 text-[13px] font-semibold text-ink md:top-5 md:right-5">
            {t('stayBadge', { n: d.nights })}
          </span>
        )}
      </Photo>
      <div className="px-1 md:px-0">
        <p className={cn('text-[14px] font-semibold md:text-[15px]', dropTextClass(d.drop))}>
          {t('heroEyebrow')}
        </p>
        <h2
          id="drop-hero"
          className="mt-2 text-[28px] leading-[1.08] font-[650] tracking-[-0.03em] md:text-[44px]"
        >
          <a href={href} className="after:absolute after:inset-0 group-hover:text-accent">
            {g.hotel.name}
          </a>
        </h2>
        <p className="mt-1.5 text-[15px] text-muted md:text-[17px]">
          {g.city.name[locale]} · {t('night', { date: dropDates(d, locale), n: d.nights })}
        </p>
        <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 md:mt-7">
          <strong className="text-[40px] leading-none font-bold tracking-[-0.04em] tabular-nums md:text-[56px]">
            {formatPrice(d.nowCents, locale)}
          </strong>
          <span className="text-[16px] text-muted tabular-nums md:text-[17px]">
            {t('was', { price: formatPrice(d.prevCents, locale) })}
          </span>
        </p>
        <p className={cn('mt-2.5 text-[16px] font-semibold', dropTextClass(d.drop))}>
          {d.provider.direct
            ? t('savedDirect', { amount: formatPrice(d.savedCents, locale) })
            : t('saved', { amount: formatPrice(d.savedCents, locale), provider: d.provider.name })}
        </p>
        <p className="mt-0.5 text-[15px] text-muted">
          {usual !== null && <>{t('usual', { price: formatPrice(usual, locale) })} · </>}
          {d.priorDays >= 2 ? t('newLow', { days: d.priorDays + 1 }) : t('firstLow')}
        </p>
        <span
          aria-hidden="true"
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-button bg-accent px-6 text-[16px] font-semibold text-white transition-colors group-hover:bg-accent-hover md:mt-8 md:h-14"
        >
          {t('heroCta')}
          <Icon icon={ArrowRight} size={18} />
        </span>
      </div>
    </article>
  );
}
