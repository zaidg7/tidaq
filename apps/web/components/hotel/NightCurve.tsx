import { useLocale, useTranslations } from 'next-intl';
import {
  formatDayMonth,
  formatPrice,
  priceLevels,
  type Locale,
  type NightPrice,
} from '@tidaq/core';

/** Bar colours by price level (0 cheapest … 4 dearest): green, neutral, warm. */
const LEVEL_FILL = [
  'var(--good)',
  'color-mix(in srgb, var(--good) 55%, var(--line-strong))',
  'var(--line-strong)',
  'color-mix(in srgb, var(--high-fill) 70%, var(--line-strong))',
  'var(--high-fill)',
];
const MONTH = { de: 'de-DE', en: 'en-GB' } as const;

/**
 * "So ändert sich der Preis" on the hotel page (C-132b): one bar per upcoming night, its height
 * the cheapest price that night, coloured like the calendar (green = cheap). The cheapest and
 * the dearest night are named in the lead; month names run under the bars. A picture of when
 * the hotel is cheap; the calendar below is where you pick dates. Bars are decorative, the
 * lead says the same in words. Needs at least 7 priced nights.
 */
export function NightCurve({ nights }: { nights: readonly NightPrice[] }) {
  const t = useTranslations('hotel');
  const locale = useLocale() as Locale;
  const priced = nights.filter(
    (n): n is NightPrice & { bestCents: number } => n.bestCents !== null,
  );
  if (priced.length < 7) return null;

  const low = priced.reduce((a, b) => (b.bestCents < a.bestCents ? b : a));
  const high = priced.reduce((a, b) => (b.bestCents > a.bestCents ? b : a));
  // Bars start at 70 % of the cheapest night, so differences show without exaggerating them,
  // and top out at the 95th percentile: a few event nights (trade fairs) don't flatten the rest.
  const sorted = priced.map((n) => n.bestCents).sort((a, b) => a - b);
  const top =
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? high.bestCents;
  const floor = low.bestCents * 0.7;
  const span = Math.max(1, top - floor);
  const levels = priceLevels(nights.map((n) => n.bestCents));
  const monthName = new Intl.DateTimeFormat(MONTH[locale], { month: 'short', timeZone: 'UTC' });
  const months = nights.flatMap((n, i) =>
    i === 0 || n.night.endsWith('-01')
      ? [{ i, label: monthName.format(new Date(`${n.night}T00:00:00Z`)) }]
      : [],
  );

  return (
    <section aria-labelledby="curve-title" className="mt-10 md:mt-14">
      <h2 id="curve-title" className="text-[22px] font-semibold tracking-[-0.02em] md:text-[28px]">
        {t('curveTitle')}
      </h2>
      <p className="mt-1 max-w-[46em] text-[15px] text-muted md:text-[16px]">
        {t('curveText', {
          low: formatPrice(low.bestCents, locale),
          lowDay: formatDayMonth(low.night, locale),
          high: formatPrice(high.bestCents, locale),
          highDay: formatDayMonth(high.night, locale),
        })}
      </p>
      <div
        aria-hidden="true"
        className="mt-5 rounded-panel border border-[#ece9f1] bg-surface px-4 pt-8 pb-4 shadow-[0_16px_40px_rgba(21,19,28,0.06)] md:px-8 md:pt-10"
      >
        <div className="flex h-[140px] items-end gap-px md:h-[180px] md:gap-[2px]">
          {nights.map((n, i) => (
            <div key={n.night} className="relative flex h-full min-w-0 flex-1 items-end">
              {n.bestCents !== null && (
                <div
                  title={`${formatDayMonth(n.night, locale)}: ${formatPrice(n.bestCents, locale)}`}
                  className="relative w-full rounded-t-[3px]"
                  style={{
                    height: `${Math.min(100, Math.max(4, ((n.bestCents - floor) / span) * 100))}%`,
                    background: LEVEL_FILL[levels[i] ?? 2],
                  }}
                >
                  {n.night === low.night && (
                    <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-full bg-good px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap text-white tabular-nums">
                      {formatPrice(low.bestCents, locale)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="relative mt-2 h-4 border-t border-line text-[12px] font-medium text-muted">
          {months.map((m) => (
            <span
              key={m.i}
              className="absolute top-1.5 whitespace-nowrap"
              style={{ left: `${(m.i / nights.length) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
