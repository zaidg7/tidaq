import { getTranslations } from 'next-intl/server';
import {
  addDays,
  formatPrice,
  formatWeekdayDayMonth,
  STATS,
  verdictFacts,
  type DailyPrice,
  type Locale,
} from '@tidaq/core';
import { cn } from '@/lib/cn';

type Props = {
  title: string;
  series: readonly DailyPrice[];
  firstDay: string;
  today: string;
  locale: Locale;
};

/**
 * The first 7 days of a stay that is still collecting: one slot per day with its real price,
 * the days still to come in outline, and when the first verdict is due. Shows progress instead
 * of an empty chart, and never invents a price.
 */
export async function CollectingDays({ title, series, firstDay, today, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'collecting' });
  const byDay = new Map(series.map((p) => [p.day, p.bestCents]));
  const facts = verdictFacts(series, today, series.at(-1)?.bestCents ?? null);
  const days = Array.from({ length: STATS.minDays }, (_, i) => addDays(firstDay, i));
  const low = Math.min(...series.map((p) => p.bestCents));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-bold">{title}</h3>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const cents = byDay.get(day);
          const future = day > today;
          const [weekday, date] = formatWeekdayDayMonth(day, locale).split(', ');
          return (
            <li
              key={day}
              className={cn(
                'flex min-h-[86px] flex-col items-center justify-between rounded-cell border px-1 py-2 text-center',
                cents !== undefined
                  ? 'border-accent/20 bg-accent-soft'
                  : future
                    ? 'border-dashed border-line-strong bg-surface'
                    : 'border-line bg-surface-2',
                day === today && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
              )}
            >
              <span className="text-[11.5px] leading-tight font-semibold text-muted-ink">
                {weekday}
                <br />
                {/* Day number only: the caption below names the month. */}
                <span className="whitespace-nowrap">{date?.split(' ')[0]}</span>
              </span>
              <span
                className={cn(
                  'text-[12px] leading-tight font-extrabold tabular-nums',
                  cents === undefined ? 'text-muted' : cents === low ? 'text-good-ink' : 'text-fg',
                )}
              >
                {cents !== undefined ? formatPrice(cents, locale).replace(/\s€$/, '') : '–'}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-meta text-muted-ink tabular-nums">
        {t('progress', {
          days: Math.min(facts.n, STATS.minDays),
          needed: STATS.minDays,
          date: facts.verdictOn ? formatWeekdayDayMonth(facts.verdictOn, locale) : '',
        })}
      </p>
    </div>
  );
}
