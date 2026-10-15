import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, TrendingDown } from 'lucide-react';
import {
  dropDates,
  dropKey,
  dropPath,
  formatPrice,
  formatWeekdayDayMonth,
  localizedPath,
  type HotelDrops,
  type Locale,
  type PriceDrop,
} from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { dropPercent } from './DropCard';

/** Other dropped nights shown as chips on the hotel page. */
const MORE = 4;

/**
 * Today's drops where people already are (C-080i). On a hotel page: "Preissturz bei diesem Hotel"
 * with the biggest drop and chips for its other nights; on a stay page whose exact stay dropped
 * (`drop`): "Preissturz seit gestern" with both prices. Each links to the drop page with the
 * story image and the alert. Renders nothing without a drop.
 */
export function DropCallout({ group: g, drop }: { group: HotelDrops; drop?: PriceDrop }) {
  const t = useTranslations('dropCallout');
  const td = useTranslations('drops');
  const tp = useTranslations('drop');
  const locale = useLocale() as Locale;
  const d = drop ?? g.top;
  const href = (x: PriceDrop) => localizedPath(dropPath(g.hotel.slug, x), locale);
  const site = d.provider.direct ? tp('atDirect') : tp('atSite', { provider: d.provider.name });
  const others = drop ? [] : [g.top, ...g.more].filter((x) => x !== d).slice(0, MORE);
  return (
    <aside
      aria-labelledby="drop-callout"
      className="relative rounded-card border border-line bg-good-soft p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-drop text-white">
          <Icon icon={TrendingDown} size={20} />
        </span>
        <div className="min-w-0">
          <h2 id="drop-callout" className="text-[16px] leading-snug font-bold">
            {drop ? t('stayTitle') : t('hotelTitle')}
          </h2>
          <p className="mt-0.5 text-[15px]">
            {t(drop ? 'stayText' : 'hotelText', {
              pct: dropPercent(d.drop, locale),
              dates: dropDates(d, locale),
              now: formatPrice(d.nowCents, locale),
              was: formatPrice(d.prevCents, locale),
              site,
              n: d.nights,
            })}
          </p>
          <a
            href={href(d)}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-good-ink underline-offset-4 hover:underline"
          >
            {t('open')}
            <Icon icon={ArrowRight} size={16} />
          </a>
          {others.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-2" aria-label={t('more')}>
              {others.map((x) => (
                <li key={dropKey(x)}>
                  <a
                    href={href(x)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[14px] font-semibold hover:border-line-strong"
                  >
                    {x.nights > 1 && `${td('weekendBadge')} `}
                    {formatWeekdayDayMonth(x.night, locale)}
                    <span className="text-good-ink tabular-nums">
                      {dropPercent(x.drop, locale)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
