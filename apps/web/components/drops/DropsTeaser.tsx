import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { routes } from '@/lib/routes';
import { DropCard } from './DropCard';

/**
 * The top drops as a section (C-080a): homepage ("Preisstürze seit gestern") and city pages.
 * Renders nothing without drops, so no page ever shows filler.
 */
export async function DropsTeaser({
  drops,
  locale,
  title,
  href,
  id,
}: {
  drops: HotelDropsWithPhoto[];
  locale: Locale;
  title: string;
  /** "Alle Preisstürze" target, e.g. the radar filtered to a city. */
  href: string;
  id: string;
}) {
  if (drops.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'drops' });
  return (
    <section aria-labelledby={id}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="text-h2 max-w-[22ch]">
            {title}
          </h2>
        </div>
        <a
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t('homeAll')}
        </a>
      </div>
      <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        {drops.slice(0, 3).map((g) => (
          <li key={g.hotel.id}>
            <DropCard group={g} max={2} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export const dropsHref = (locale: Locale, city?: string) =>
  localizedPath(routes.drops, locale) + (city ? `?stadt=${city}` : '');
