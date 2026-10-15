import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { addDays, type DailyPrice, type Locale } from '@tidaq/core';
import { DropOver, DropPage } from '@/components/drops/DropPage';
import { DropsTeaser, dropsHref } from '@/components/drops/DropsTeaser';
import { applyDropFilters, DROP_SOURCES, DropsView } from '@/components/drops/DropsView';
import { ADLON, sampleDrops as sample } from '@/lib/dropsSample';
import { berlinToday } from '@/lib/today';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** 30 days of a night's price, wobbling around the day before's price, then the drop today. */
function history(prevCents: number, nowCents: number, today: string): DailyPrice[] {
  const wobble = [
    3, -2, 4, 1, -3, 2, 5, 0, -1, 3, 2, -2, 4, 6, 1, -1, 2, 3, 0, 4, 2, -2, 1, 3, 5, 2, 0, 1,
  ];
  return [
    ...wobble.map((w, i) => ({
      day: addDays(today, i - 29),
      bestCents: Math.round((prevCents * (1 + w / 100)) / 100) * 100,
    })),
    { day: addDays(today, -1), bestCents: prevCents },
    { day: today, bestCents: nowCents },
  ];
}

/**
 * `/dev/drops`: the radar with sample data. `?empty`: empty state; `?teaser`: the section;
 * `?share` or `?share=<slug>`: a drop page (C-080b); `?over`: a drop that's gone; `?ref=tiktok`:
 * the welcome for social bio links (C-080d).
 */
export default async function DevDropsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    empty?: string;
    teaser?: string;
    share?: string;
    over?: string;
    stadt?: string;
    wann?: string;
    sort?: string;
    ref?: string;
  }>;
}) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const all = q.empty !== undefined ? [] : sample();
  const today = berlinToday();
  if (q.over !== undefined) {
    return (
      <DropOver
        hotel={{ slug: ADLON[1], name: ADLON[2] }}
        night={addDays(today, 3)}
        locale={locale}
        today={today}
      />
    );
  }
  if (q.share !== undefined) {
    const group = all.find((g) => g.hotel.slug === q.share) ?? all[0];
    if (!group) notFound();
    return (
      <DropPage
        group={group}
        drop={group.top}
        series={history(group.top.prevCents, group.top.nowCents, today)}
        others={all.filter((g) => g !== group)}
        locale={locale}
        today={today}
        now={new Date()}
      />
    );
  }
  if (q.teaser !== undefined) {
    return (
      <div className="mx-auto w-full max-w-[1080px] px-5 py-14 md:px-7">
        <DropsTeaser
          drops={all}
          locale={locale}
          title={(await getTranslations({ locale, namespace: 'drops' }))('homeTitle')}
          href={dropsHref(locale)}
          id="drops-title"
        />
      </div>
    );
  }
  const { filters, shown } = applyDropFilters(all, q, today);
  return (
    <DropsView
      all={all}
      shown={shown}
      filters={filters}
      seenAt={all[0]?.top.seenAt ?? null}
      now={new Date()}
      checked={all.length ? { day: today, nights: 5722, hotels: 82, cities: 27, sites: 4 } : null}
      source={DROP_SOURCES.find((x) => x === q.ref) ?? null}
    />
  );
}
