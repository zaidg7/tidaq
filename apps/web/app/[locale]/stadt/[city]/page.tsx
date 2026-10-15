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
import { AlertBand } from '@/components/drops/AlertBand';
import { DropTile } from '@/components/drops/DropTile';
import { SectionHead } from '@/components/home/SectionHead';
import { dropsHref } from '@/components/drops/DropsTeaser';
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
  const cityDrops = drops.kind === 'ok' ? filterDrops(drops.drops, { city: slug }) : [];
  const name = result.city.name[locale];
  const tc = await getTranslations({ locale, namespace: 'city' });
  return (
    <CityView city={result.city} hotels={result.hotels} dates={dates} drops={cityDrops.length}>
      {cityDrops.length > 0 && (
        <section
          aria-labelledby="city-drops"
          className="mx-auto w-full max-w-[1240px] px-3.5 pt-14 md:px-10 md:pt-24"
        >
          <SectionHead
            id="city-drops"
            title={tc('dropsTitle', { where: cityIn(slug, name, locale) })}
            lead={{ short: td('intro'), long: td('intro') }}
            link={{ href: dropsHref(locale, slug), long: tc('dropsAll'), short: tc('dropsAll') }}
          />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-[22px] md:grid-cols-4 md:gap-7">
            {cityDrops.slice(0, 4).map((g) => (
              <li key={g.hotel.slug}>
                <DropTile group={g} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-16 md:mt-[110px]">
        <AlertBand locale={locale} previews={cityDrops} city={{ slug, name }} />
      </div>
    </CityView>
  );
}
