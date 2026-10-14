import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  formatDateRange,
  localizedPath,
  parseStayParams,
  stayPath,
  type Locale,
  type StayParams,
} from '@tidaq/core';
import { StatusPage } from '@/components/shell/StatusPage';
import { EditStay } from '@/components/stay/EditStay';
import { StayView, stayStatus } from '@/components/stay/StayView';
import { buttonClasses } from '@/components/ui/Button';
import { getCatalog } from '@/lib/data/catalog';
import { getStay, type StayLoad } from '@/lib/data/stay';
import { searchCardProps } from '@/lib/searchCardProps';
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
  return {
    title: t('metaTitle', {
      hotel: result.data.hotel.name,
      dates: formatDateRange(p.checkIn, p.checkOut, locale),
    }),
    alternates: {
      canonical: localizedPath(stayPath(slug, p.checkIn, p.checkOut, p.adults), locale),
    },
  };
}

export default async function StayPage(props: Props) {
  const { locale, slug, p } = await resolve(props);
  setRequestLocale(locale);
  const today = berlinToday();
  const [result, t] = await Promise.all([
    loadFor(slug, p, today),
    getTranslations({ locale, namespace: 'stay' }),
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

  const { hotel, stay, series, providerByDay, others, offers } = result.data;
  const [catalog, card] = await Promise.all([getCatalog(), searchCardProps(locale)]);
  const hotels = (catalog?.hotels ?? []).map((h) => ({
    slug: h.slug,
    name: h.name,
    city: h.city.name[locale],
  }));
  // An inactive hotel isn't in the catalog: keep it selectable so "Ändern" starts from here.
  if (!hotels.some((h) => h.slug === hotel.slug)) {
    hotels.push({ slug: hotel.slug, name: hotel.name, city: hotel.city.name[locale] });
  }

  return (
    <StayView
      hotel={hotel}
      params={p}
      status={stayStatus(hotel.active, stay !== null, series, p.checkIn, today)}
      series={series}
      providerByDay={providerByDay}
      updatedAt={stay?.updatedAt ?? null}
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
