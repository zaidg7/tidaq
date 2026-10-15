import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  alternatesFor,
  hotelJsonLd,
  hotelPath,
  jsonLdString,
  localizedPath,
  type Locale,
} from '@tidaq/core';
import { PageSkeleton } from '@/components/shell/PageSkeleton';
import { HotelAlertBox } from '@/components/drops/HotelAlertBox';
import { DropCallout } from '@/components/drops/DropCallout';
import { HotelView } from '@/components/hotel/HotelView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { logView } from '@/lib/data/events';
import { getDrops } from '@/lib/data/drops';
import { getHotelPage } from '@/lib/data/hotel';
import { openGraphFor } from '@/lib/og';
import { berlinToday } from '@/lib/today';

// Prices change every day: render per request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// generateMetadata and the page both need the hotel: one load per request.
const load = cache((slug: string, today: string) => getHotelPage(slug, today));

async function resolve({ params }: Props) {
  const { locale, slug } = await params;
  if (!SLUG.test(slug)) notFound();
  return { locale, slug };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug } = await resolve(props);
  const t = await getTranslations({ locale, namespace: 'hotel' });
  const result = await load(slug, berlinToday());
  if (result.kind === 'missing') notFound();
  if (result.kind !== 'ok') return { title: t('metaUnavailable') };
  const { hotel } = result.data;
  const city = hotel.city.name[locale];
  const title = t('metaTitle', { hotel: hotel.name });
  const description = t('metaDescription', { hotel: hotel.name, city });
  return {
    title,
    description,
    openGraph: openGraphFor(locale, { title, description, photo: hotel.image, alt: hotel.name }),
    alternates: alternatesFor(hotelPath(slug), locale),
  };
}

/**
 * Validates the URL first (a 404 must be decided before anything is sent), then streams the
 * skeleton while the data loads (PREMIUM.md §10.17).
 */
export default async function HotelPageRoute(props: Props) {
  await resolve(props);
  return (
    <Suspense fallback={<PageSkeleton kind="hotel" />}>
      <HotelPageRouteBody {...props} />
    </Suspense>
  );
}

async function HotelPageRouteBody(props: Props) {
  const { locale, slug } = await resolve(props);
  setRequestLocale(locale);
  const today = berlinToday();
  const [result, t, th, drops] = await Promise.all([
    load(slug, today),
    getTranslations({ locale, namespace: 'stay' }),
    getTranslations({ locale, namespace: 'hotel' }),
    getDrops(today),
  ]);
  // Today's drops at this hotel (C-080i), if any.
  const dropGroup =
    drops.kind === 'ok' ? drops.drops.find((g) => g.hotel.slug === slug) : undefined;
  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') {
    return (
      <StatusPage
        eyebrow={t('unavailableEyebrow')}
        title={t('unavailableTitle')}
        text={t('unavailableText')}
      >
        <a href={localizedPath(hotelPath(slug), locale)} className={buttonClasses({ size: 'lg' })}>
          {t('retry')}
        </a>
      </StatusPage>
    );
  }
  // Anonymous view count (C-029): which page, never who.
  const userAgent = (await headers()).get('user-agent');
  after(() => logView({ name: 'hotel_view', props: { hotel: slug } }, userAgent));
  const { hotel } = result.data;
  const city = hotel.city.name[locale];
  const jsonLd = hotelJsonLd({
    name: hotel.name,
    path: localizedPath(hotelPath(slug), locale),
    description: th('jsonLdDescription', { city }),
    stars: hotel.stars,
    city,
    country: hotel.city.country,
    imagePath: hotel.image?.src ?? null,
  });
  return (
    <>
      <script
        type="application/ld+json"
        // Escaped by jsonLdString: no `<` can end the script early.
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <HotelView
        data={result.data}
        today={today}
        drops={dropGroup && <DropCallout group={dropGroup} />}
        alert={
          <HotelAlertBox
            locale={locale}
            hotel={{ slug: hotel.slug, name: hotel.name }}
            citySlug={hotel.city.slug}
          />
        }
      />
    </>
  );
}
