import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  alternatesFor,
  cityIn,
  cityPath,
  filterDrops,
  localizedPath,
  parseStayParams,
  type Locale,
} from '@tidaq/core';
import { PageSkeleton } from '@/components/shell/PageSkeleton';
import { CityView } from '@/components/city/CityView';
import { DropAlertSection } from '@/components/drops/DropAlertSection';
import { DropsTeaser, dropsHref } from '@/components/drops/DropsTeaser';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { logView } from '@/lib/data/events';
import { getCityPage } from '@/lib/data/city';
import { getDrops } from '@/lib/data/drops';
import { openGraphFor } from '@/lib/og';
import { berlinToday } from '@/lib/today';

// Weekend prices change every day: render per request.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: Locale; city: string }>;
  searchParams: Promise<{ daten?: string | string[]; adults?: string | string[] }>;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// generateMetadata and the page both need the city: one load per request.
const load = cache((slug: string, today: string, checkIn?: string, checkOut?: string) =>
  getCityPage(slug, today, checkIn && checkOut ? { checkIn, checkOut } : undefined),
);

/** `?daten=<in>--<out>&adults=n` from the search (C-110); past or broken dates are ignored. */
async function datesOf(props: Props, today: string) {
  const { daten, adults } = await props.searchParams;
  const raw = Array.isArray(daten) ? daten[0] : daten;
  if (!raw) return null;
  const parsed = parseStayParams(raw, adults);
  return parsed.ok && parsed.params.checkIn >= today ? parsed.params : null;
}

async function resolve({ params }: Props) {
  const { locale, city } = await params;
  if (!SLUG.test(city)) notFound();
  return { locale, slug: city };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug } = await resolve(props);
  const today = berlinToday();
  const dates = await datesOf(props, today);
  const result = await load(slug, today, dates?.checkIn, dates?.checkOut);
  if (result.kind === 'missing') notFound();
  if (result.kind !== 'ok') return {};
  const t = await getTranslations({ locale, namespace: 'city' });
  const where = cityIn(slug, result.city.name[locale], locale);
  const title = t('metaTitle', { where });
  const description = t('metaDescription', { where });
  const withPhoto = result.hotels.find((h) => h.image);
  return {
    title,
    description,
    openGraph: openGraphFor(locale, {
      title,
      description,
      photo: withPhoto?.image ?? null,
      alt: withPhoto?.name,
    }),
    alternates: alternatesFor(cityPath(slug), locale),
  };
}

/**
 * Validates the URL first (a 404 must be decided before anything is sent), then streams the
 * skeleton while the data loads (PREMIUM.md §10.17).
 */
export default async function CityPageRoute(props: Props) {
  await resolve(props);
  return (
    <Suspense fallback={<PageSkeleton kind="list" />}>
      <CityPageRouteBody {...props} />
    </Suspense>
  );
}

async function CityPageRouteBody(props: Props) {
  const { locale, slug } = await resolve(props);
  setRequestLocale(locale);
  const today = berlinToday();
  const dates = await datesOf(props, today);
  const [result, t, drops, td] = await Promise.all([
    load(slug, today, dates?.checkIn, dates?.checkOut),
    getTranslations({ locale, namespace: 'stay' }),
    getDrops(today),
    getTranslations({ locale, namespace: 'drops' }),
  ]);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') {
    return (
      <StatusPage
        eyebrow={t('unavailableEyebrow')}
        title={t('unavailableTitle')}
        text={t('unavailableText')}
      >
        <a href={localizedPath(cityPath(slug), locale)} className={buttonClasses({ size: 'lg' })}>
          {t('retry')}
        </a>
      </StatusPage>
    );
  }
  // Anonymous view count (C-029): which page, never who.
  const userAgent = (await headers()).get('user-agent');
  after(() => logView({ name: 'city_view', props: { city: slug } }, userAgent));
  // The city's sudden drops (C-080a); the teaser renders nothing without any.
  const cityDrops =
    drops.kind === 'ok' ? filterDrops(drops.drops, { city: slug, when: null, today }) : [];
  return (
    <CityView city={result.city} hotels={result.hotels} dates={dates}>
      {cityDrops.length > 0 && (
        <div className="mb-14 lg:mb-[88px]">
          <DropsTeaser
            drops={cityDrops}
            locale={locale}
            title={td('cityTitle', { where: cityIn(slug, result.city.name[locale], locale) })}
            href={dropsHref(locale, slug)}
            id="city-drops"
          />
        </div>
      )}
      <DropAlertSection locale={locale} defaultCity={{ slug, name: result.city.name[locale] }} />
    </CityView>
  );
}
