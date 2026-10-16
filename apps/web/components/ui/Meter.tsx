import { useLocale, useTranslations } from 'next-intl';
import { formatPrice, meter, type Locale, type MeterZone } from '@tidaq/core';
import { cn } from '@/lib/cn';

type Props = {
  /** Today's rank among the window's prices (core `stayStats().percentile`). */
  percentile: number;
  lowCents: number;
  highCents: number;
  nowCents: number;
  /** First day of the window ("15. Aug."), already formatted. */
  since: string;
  /** `lg` for result cards on wide screens (14 px track, 24 px knob). */
  size?: 'md' | 'lg';
  className?: string;
};

const ZONES: readonly MeterZone[] = ['cheap', 'normal', 'dear'];
const ZONE_FILL: Record<MeterZone, string> = {
  cheap: 'bg-good rounded-l-full',
  normal: 'bg-[#e4e1ea]',
  dear: 'bg-high-fill rounded-r-full',
};
const ZONE_TEXT: Record<MeterZone, string> = {
  cheap: 'text-good',
  normal: 'text-ink',
  dear: 'text-high',
};

/**
 * Verdict meter (PREMIUM.md §8, mockup B): Günstig · Normal · Teuer as three equal, solid zones
 * (green, grey, apricot) and a white knob with an ink ring at today's price, which slides in from
 * the left. The zone it sits in is named in its colour and bold. Screen readers get one sentence
 * with the zone, today's price and the range it is measured against.
 */
export function Meter({
  percentile,
  lowCents,
  highCents,
  nowCents,
  since,
  size = 'md',
  className,
}: Props) {
  const t = useTranslations('verdict');
  const locale = useLocale() as Locale;
  const m = meter(percentile);
  if (!m) return null;
  const price = (c: number) => formatPrice(c, locale);
  const lg = size === 'lg';

  return (
    <div
      role="img"
      aria-label={t('meterLabel', {
        zone: t(`zone_${m.zone}`),
        now: price(nowCents),
        low: price(lowCents),
        high: price(highCents),
        since,
      })}
      className={className}
    >
      <div className={cn('relative grid grid-cols-3', lg ? 'h-3.5 gap-1' : 'h-3 gap-[3px]')}>
        {ZONES.map((z) => (
          <span key={z} className={ZONE_FILL[z]} />
        ))}
        <span
          className={cn(
            'meter-knob absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ink bg-white',
            lg ? 'size-6' : 'size-[22px]',
          )}
          style={{ left: `${m.knob * 100}%` }}
        />
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'grid grid-cols-3 text-muted',
          lg ? 'mt-2.5 text-[14px]' : 'mt-2 text-[13px]',
        )}
      >
        {ZONES.map((z, i) => (
          <span
            key={z}
            className={cn(
              i === 1 ? 'text-center' : i === 2 ? 'text-right' : undefined,
              z === m.zone && cn('font-semibold', ZONE_TEXT[z]),
            )}
          >
            {t(`zone_${z}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
