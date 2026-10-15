import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  alternatesFor,
  daysBetween,
  findDrop,
  formatDateRange,
  localizedPath,
  parseStayParams,
  stayPath,
  type Locale,
  type StayParams,
} from '@tidaq/core';
import { PageSkeleton } from '@/components/shell/PageSkeleton';
import { StatusPage } from '@/components/shell/StatusPage';
import { EditStay } from '@/components/stay/EditStay';
import { DropCallout } from '@/components/drops/DropCallout';
import { StayView, stayStatus } from '@/components/stay/StayView';
import { buttonClasses } from '@/components/ui/Button';
import { getCatalog } from '@/lib/data/catalog';
import { getDrops } from '@/lib/data/drops';
import { logView } from '@/lib/data/events';
import { requestStayOnView } from '@/lib/data/requestStay';
import { getStay, type StayLoad } from '@/lib/data/stay';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { openGraphFor } from '@/lib/og';
import { searchCardProps, searchHotels } from '@/lib/searchCardProps';
import { berlinToday } from '@/lib/today';

// Prices change every morning: render per request.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; slug: string; range: string }>;
  searchParams: Promise<{ adults?: string | string[] }>;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Valid params or a 404; an invalid `adults` redirects to the canonical URL. */
async function resolve({ params, searchParams }: Props) {
  const [{ locale, slug, range }, { adults }] = await Promise.all([params, searchParams]);
  const parsed = parseStayParams(range, adults);
  if (!SLUG.test(slug) || !parsed.ok) notFound();
  const p = parsed.params;
  if (!parsed.canonical) {
    redirect(localizedPath(stayPath(slug, p.checkIn, p.checkOut, p.adults), locale));
  }
  return { locale, slug, p };
}

// generateMetadata and the page both need the stay: one load per request (primitive args, so
// React's cache can match them).
const load = cache(
  (
    slug: string,
    checkIn: string,
    checkOut: string,
    nights: number,
    adults: number,
    today: string,
  ) => getStay(slug, { checkIn, checkOut, nights, adults }, today),
);
const loadFor = (slug: string, p: StayParams, today: string): Promise<StayLoad> =>
  load(slug, p.checkIn, p.checkOut, p.nights, p.adults, today);

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug, p } = await resolve(props);
  const t = await getTranslations({ locale, namespace: 'stay' });
  const result = await loadFor(slug, p, berlinToday());
  if (result.kind === 'missing') notFound();
  if (result.kind !== 'ok') return { title: t('metaUnavailable') };
  const title = t('metaTitle', {
    hotel: result.data.hotel.name,
    dates: formatDateRange(p.checkIn, p.checkOut, locale),
  });
  return {
    title,
    // The page shows a thumbnail; share the 960 px version of the same licensed photo.
    openGraph: openGraphFor(locale, {
      title,
      photo: result.data.hotel.image ? (hotelPhoto(slug)?.[960] ?? null) : null,
      alt: result.data.hotel.name,
    }),
    alternates: alternatesFor(stayPath(slug, p.checkIn, p.checkOut, p.adults), locale),
  };
}

/**
 * Validates the URL first (a 404 must be decided before anything is sent), then streams the
 * skeleton while the data loads (PREMIUM.md §10.17).
 */
export default async function StayPage(props: Props) {
  await resolve(props);
  return (
    <Suspense fallback={<PageSkeleton kind="stay" />}>
      <StayPageBody {...props} />
    </Suspense>
  );
}

async function StayPageBody(props: Props) {
  const { locale, slug, p } = await resolve(props);
  setRequestLocale(locale);
  const today = berlinToday();
  const [result, t, drops] = await Promise.all([
    loadFor(slug, p, today),
    getTranslations({ locale, namespace: 'stay' }),
    getDrops(today),
  ]);

  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') {
    return (
      <StatusPage
        eyebrow={t('unavailableEyebrow')}
        title={t('unavailableTitle')}
        text={t('unavailableText')}
      >
        <a
          href={localizedPath(stayPath(slug, p.checkIn, p.checkOut, p.adults), locale)}
          className={buttonClasses({ size: 'lg' })}
        >
          {t('retry')}
        </a>
      </StatusPage>
    );
  }

  const {
    hotel,
    stay,
    series,
    providerByDay,
    others,
    offers,
    history,
    updatedAt,
    realVsNights,
    nightsUnreliable,
  } = result.data;
  const userAgent = (await headers()).get('user-agent');
  // No real check of these exact dates yet: ask for one after the response (C-070b).
  if (hotel.active && stay === null && p.checkIn >= today) {
    after(() => requestStayOnView(slug, p, userAgent));
  }
  // Anonymous view count (C-029): which stay, never who.
  after(() =>
    logView(
      {
        name: 'stay_view',
        props: {
          hotel: slug,
          nights: p.nights,
          adults: p.adults,
          daysAhead: daysBetween(today, p.checkIn),
        },
      },
      userAgent,
    ),
  );
  const [catalog, card] = await Promise.all([getCatalog(), searchCardProps(locale)]);
  const hotels = await searchHotels(catalog?.hotels ?? [], locale);
  // An inactive hotel isn't in the catalog: keep it selectable so "Ändern" starts from here.
  if (!hotels.some((h) => h.slug === hotel.slug)) {
    hotels.push({ slug: hotel.slug, name: hotel.name, city: hotel.city.name[locale] });
  }

  // This exact stay dropped since yesterday (C-080i): night or weekend, 2 adults like the grid.
  const dropped =
    drops.kind === 'ok' && p.adults === 2
      ? findDrop(drops.drops, slug, { night: p.checkIn, checkOut: p.checkOut })
      : null;
  return (
    <StayView
      drop={dropped && <DropCallout group={dropped.group} drop={dropped.drop} />}
      hotel={hotel}
      params={p}
      status={stayStatus(
        hotel.active,
        stay !== null || result.data.inNightGrid,
        series,
        p.checkIn,
        today,
      )}
      series={series}
      providerByDay={providerByDay}
      updatedAt={updatedAt}
      history={history}
      realVsNights={realVsNights}
      nightsUnreliable={nightsUnreliable}
      others={others}
      offers={offers}
      today={today}
      edit={
        <EditStay
          hotels={hotels}
          today={today}
          locale={locale}
          guestOptions={card.guestOptions}
          labels={{
            ...card.labels,
            edit: t('edit'),
            close: t('editClose'),
            editTitle: t('editTitle'),
          }}
          initial={{
            hotel: hotel.slug,
            checkIn: p.checkIn,
            checkOut: p.checkOut,
            adults: p.adults,
          }}
        />
      }
    />
  );
}
