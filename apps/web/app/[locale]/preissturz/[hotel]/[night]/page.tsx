import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  alternatesFor,
  dropKey,
  dropPath,
  localizedPath,
  parseDropKey,
  type Locale,
} from '@tidaq/core';
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
    return {
      title: f.title,
      description: f.description,
      alternates,
      openGraph: openGraphFor(locale, {
        title: f.title,
        description: f.description,
        photo: load.group.image,
        alt: load.group.hotel.name,
      }),
    };
  }
  // Over or unavailable: still a valid link, but nothing to index.
  const t = await getTranslations({ locale, namespace: 'drop' });
  return { title: t('overTitle'), alternates, robots: { index: false, follow: true } };
}

export default async function DropRoute(props: Props) {
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
