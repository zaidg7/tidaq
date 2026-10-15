import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  alternatesFor,
  dropKey,
  dropOgImageUrl,
  OG_IMAGE,
  dropPath,
  localizedPath,
  parseDropKey,
  type Locale,
} from '@tidaq/core';
import { PageSkeleton } from '@/components/shell/PageSkeleton';
import { DropOver, DropPage, dropFacts } from '@/components/drops/DropPage';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getDropPage } from '@/lib/data/drops';
import { openGraphFor } from '@/lib/og';
import { berlinToday } from '@/lib/today';

// A drop lives for a day: render per request.
export const dynamic = 'force-dynamic';

/** `night`: one night (`2026-10-18`) or a weekend (`2026-10-23--2026-10-25`, C-080f). */
type Props = { params: Promise<{ locale: Locale; hotel: string; night: string }> };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
async function resolve({ params }: Props) {
  const { locale, hotel, night } = await params;
  const stay = parseDropKey(night);
  if (!SLUG.test(hotel) || !stay) notFound();
  return { locale, slug: hotel, stay, key: dropKey(stay) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug, stay, key } = await resolve(props);
  const load = await getDropPage(slug, key, berlinToday());
  if (load.kind === 'missing') notFound();
  const alternates = alternatesFor(dropPath(slug, stay), locale);
  if (load.kind === 'ok') {
    const f = await dropFacts(load.group, load.drop, locale, new Date());
    // The "−31 %" card with both prices (C-028c); the hotel photo when it can't be made.
    const card = dropOgImageUrl(process.env.SUPABASE_URL, slug, stay, locale);
    return {
      title: f.title,
      description: f.description,
      alternates,
      openGraph: openGraphFor(locale, {
        title: f.title,
        description: f.description,
        photo: load.group.image,
        image: card ? { url: card, ...OG_IMAGE } : null,
        alt: load.group.hotel.name,
      }),
    };
  }
  // Over or unavailable: still a valid link, but nothing to index.
  const t = await getTranslations({ locale, namespace: 'drop' });
  return { title: t('overTitle'), alternates, robots: { index: false, follow: true } };
}

/**
 * Validates the URL first (a 404 must be decided before anything is sent), then streams the
 * skeleton while the data loads (PREMIUM.md §10.17).
 */
export default async function DropRoute(props: Props) {
  await resolve(props);
  return (
    <Suspense fallback={<PageSkeleton kind="drop" />}>
      <DropRouteBody {...props} />
    </Suspense>
  );
}

async function DropRouteBody(props: Props) {
  const { locale, slug, stay, key } = await resolve(props);
  setRequestLocale(locale);
  const today = berlinToday();
  const load = await getDropPage(slug, key, today);
  if (load.kind === 'missing') notFound();
  if (load.kind === 'ok') {
    return (
      <DropPage
        group={load.group}
        drop={load.drop}
        series={load.series}
        others={load.others}
        offer={load.offer}
        locale={locale}
        today={today}
        now={new Date()}
      />
    );
  }
  if (load.kind === 'unavailable') {
    const td = await getTranslations({ locale, namespace: 'drops' });
    return (
      <StatusPage eyebrow={td('eyebrow')} title={td('title')} text={td('unavailable')}>
        <a
          href={localizedPath(dropPath(slug, stay), locale)}
          className={buttonClasses({ size: 'lg' })}
        >
          {td('retry')}
        </a>
      </StatusPage>
    );
  }
  return <DropOver hotel={load.hotel} stay={stay} locale={locale} today={today} />;
}
