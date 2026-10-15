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
  className?: string;
};

const ZONE_BG: Record<MeterZone, string> = {
  cheap: 'bg-good-soft',
  normal: 'bg-surface-2',
  dear: 'bg-high-soft',
};
const ZONE_TEXT: Record<MeterZone, string> = {
  cheap: 'text-good',
  normal: 'text-ink',
  dear: 'text-high',
};

/**
 * Verdict meter (PREMIUM.md §8, C-112): Günstig · Normal · Teuer as three soft zones, split
 * where the verdict states split; a white knob with an ink ring at today's price; the zone it
 * sits in is named in its colour, the others stay quiet. Low and high are in the label.
 */
export function Meter({ percentile, lowCents, highCents, nowCents, since, className }: Props) {
  const t = useTranslations('verdict');
  const locale = useLocale() as Locale;
  const m = meter(percentile);
  if (!m) return null;
  const price = (c: number) => formatPrice(c, locale);
  const [a, b] = m.bounds;
  const zones: { zone: MeterZone; from: number; to: number }[] = [
    { zone: 'cheap', from: 0, to: a },
    { zone: 'normal', from: a, to: b },
    { zone: 'dear', from: b, to: 1 },
  ];

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
      className={cn('flex flex-col gap-2', className)}
    >
      <div className="relative h-2.5">
        <div className="flex h-full gap-[3px] overflow-hidden rounded-full">
          {zones.map((z) => (
            <span
              key={z.zone}
              className={cn('h-full', ZONE_BG[z.zone])}
              style={{ width: `${(z.to - z.from) * 100}%` }}
            />
          ))}
        </div>
        <span
          className="meter-knob absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-ink bg-white shadow-1"
          style={{ left: `${m.position * 100}%` }}
        />
      </div>
      <div aria-hidden="true" className="relative h-4 text-[12.5px]">
        {zones.map((z) => (
          <span
            key={z.zone}
            className={cn(
              'absolute top-0 -translate-x-1/2 whitespace-nowrap',
              z.zone === m.zone ? cn('font-semibold', ZONE_TEXT[z.zone]) : 'text-muted-ink',
              // Keep the outer labels inside the bar.
              z.zone === 'cheap' && 'translate-x-0',
              z.zone === 'dear' && '-translate-x-full',
            )}
            style={{
              left: `${(z.zone === 'cheap' ? 0 : z.zone === 'dear' ? 1 : (z.from + z.to) / 2) * 100}%`,
            }}
          >
            {t(`zone_${z.zone}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
