import type { ReactNode } from 'react';
import { ChartSpline } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatWeekdayDayMonth, STATS, type Locale } from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

type Props = {
  daysTracked: number;
  /** The day the first verdict is due (`verdictFacts().verdictOn`). */
  verdictOn: string | null;
  /** One action, e.g. "Preis beobachten". */
  children?: ReactNode;
  className?: string;
};

/**
 * Empty / collecting state (CRAFT.md §3): an icon, one headline, one sentence, a 7-segment bar
 * with the day the first verdict is due, one action. No illustration, no promise of a price.
 */
export function CollectingState({ daysTracked, verdictOn, children, className }: Props) {
  const t = useTranslations('collecting');
  const locale = useLocale() as Locale;
  const needed = STATS.minDays;
  const days = Math.max(0, Math.min(daysTracked, needed));

  return (
    <div className={cn('flex flex-col items-start', className)}>
      <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon icon={ChartSpline} size={24} />
      </span>
      <h3 className="text-h3 mt-4">{t('title')}</h3>
      <p className="mt-1 max-w-[34em] text-[15px] text-muted-ink">{t('text')}</p>
      <div className="mt-5 flex w-full max-w-[34em] flex-col gap-2">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={needed}
          aria-valuenow={days}
          aria-label={t('progressLabel', { days, needed })}
          className="flex gap-1"
        >
          {Array.from({ length: needed }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                i < days ? 'bg-accent' : 'bg-neutral-soft',
              )}
            />
          ))}
        </div>
        {verdictOn && (
          <p className="text-meta text-muted-ink tabular-nums">
            {t('progress', { days, needed, date: formatWeekdayDayMonth(verdictOn, locale) })}
          </p>
        )}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
