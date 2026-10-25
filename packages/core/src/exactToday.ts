/**
 * Today's point of the series becomes the cheapest of today's offers once an exact quote changed
 * some of them (C-182), so the headline, the verdict and the price table agree. Earlier days keep
 * the calculated prices.
 */
export function withExactToday(
  series: { day: string; bestCents: number }[],
  today: string,
  todayOffers: number[],
): { day: string; bestCents: number }[] {
  const last = series.at(-1);
  if (!last || last.day !== today || todayOffers.length === 0) return series;
  return [...series.slice(0, -1), { day: today, bestCents: Math.min(...todayOffers) }];
}
