import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hotelJsonLd, hotelPath, jsonLdString, localizedPath, type Locale } from '@tidaq/core';
import { HotelView } from '@/components/hotel/HotelView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { logView } from '@/lib/data/events';
import { getHotelPage } from '@/lib/data/hotel';
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
  return {
    title: t('metaTitle', { hotel: hotel.name }),
    description: t('metaDescription', { hotel: hotel.name, city }),
    alternates: { canonical: localizedPath(hotelPath(slug), locale) },
  };
}

export default async function HotelPageRoute(props: Props) {
  const { locale, slug } = await resolve(props);
  setRequestLocale(locale);
  const today = berlinToday();
  const [result, t, th] = await Promise.all([
    load(slug, today),
    getTranslations({ locale, namespace: 'stay' }),
    getTranslations({ locale, namespace: 'hotel' }),
  ]);
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
      <HotelView data={result.data} today={today} />
    </>
  );
}
