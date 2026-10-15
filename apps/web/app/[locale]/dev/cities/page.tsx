import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { CityDirectory } from '@/components/city/CityDirectory';
import { cityPhoto, cityPhotoAsHotelPhoto } from '@/lib/cityPhotos';
import type { CityCard } from '@/lib/data/cityCards';

// Dev pages exist on staging and locally only; APP_ENV is read per request.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

const card = (slug: string, name: string, country: string, drops = 0): CityCard => {
  const p = cityPhoto(slug);
  return {
    slug,
    name,
    country,
    hotels: 3,
    drops,
    photo: p ? cityPhotoAsHotelPhoto(p) : null,
    alt: p?.alt ?? '',
  };
};

/** Sample cities for `/staedte` (C-134): region sizes 4, 6, 2, 1 test every bento shape. */
const CARDS: CityCard[] = [
  card('berlin', 'Berlin', 'DE', 1),
  card('muenchen', 'München', 'DE'),
  card('hamburg', 'Hamburg', 'DE'),
  card('frankfurt', 'Frankfurt am Main', 'DE'),
  card('paris', 'Paris', 'FR', 2),
  card('london', 'London', 'GB'),
  card('rom', 'Rom', 'IT'),
  card('wien', 'Wien', 'AT'),
  card('amsterdam', 'Amsterdam', 'NL'),
  card('lissabon', 'Lissabon', 'PT'),
  card('dubai', 'Dubai', 'AE'),
  card('abu-dhabi', 'Abu Dhabi', 'AE'),
  card('hongkong', 'Hongkong', 'HK'),
];

export default async function DevCitiesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <CityDirectory cards={CARDS} />;
}
