import { useLocale, useTranslations } from 'next-intl';
import { cityPath, groupByRegion, localizedPath, type Locale } from '@tidaq/core';
import { PhotoHero } from '@/components/shell/PhotoHero';
import { SectionNav } from '@/components/ui/SectionNav';
import type { CityCard } from '@/lib/data/cityCards';
import { cn } from '@/lib/cn';
import { CityTile } from './CityTile';

/** Spans for a 4-column bento with a 2×2 lead tile: every row ends flush, whatever `n` is. */
export function bentoSpans(n: number): string[] {
  const rest = n - 1;
  if (n <= 0) return [];
  const lead = rest === 0 ? 'col-span-2 lg:col-span-4 lg:row-span-2' : 'col-span-2 lg:row-span-2';
  const side: string[] =
    rest === 1
      ? ['lg:col-span-2 lg:row-span-2']
      : rest === 2
        ? ['lg:col-span-2', 'lg:col-span-2']
        : rest === 3
          ? ['', '', 'lg:col-span-2']
          : ['', '', '', ''];
  const after = Math.max(0, rest - 4);
  const tail: string[] = Array.from({ length: after }, () => '');
  // The last row on desktop (4 wide): stretch what's left so it ends flush.
  const left = after % 4;
  if (left === 1) tail[after - 1] = 'lg:col-span-4';
  if (left === 2) {
    tail[after - 1] = 'lg:col-span-2';
    tail[after - 2] = 'lg:col-span-2';
  }
  if (left === 3) tail[after - 1] = 'lg:col-span-2';
  const spans = [lead, ...side.slice(0, Math.min(rest, 4)), ...tail];
  // Phones (2 wide, lead full width): an odd last tile spans both columns.
  if (rest % 2 === 1) spans[n - 1] = cn(spans[n - 1], 'col-span-2');
  return spans;
}

/**
 * `/staedte` (C-134): a photo hero, a sticky text nav of the regions (C-137), then every region as an
 * editorial bento of its cities (the
 * one with most Price Drops today large, the rest around it), country above each name. Same
 * tiles and links as the homepage's "Beliebte Ziele".
 */
export function CityDirectory({ cards }: { cards: CityCard[] }) {
  const t = useTranslations('cities');
  const th = useTranslations('hotels');
  const locale = useLocale() as Locale;
  const countries = new Intl.DisplayNames([locale], { type: 'region' });
  const hotels = cards.reduce((n, c) => n + c.hotels, 0);
  const groups = groupByRegion(
    cards,
    (c) => c.country,
    (c) => c.name,
    locale,
  ).map((g) => ({
    ...g,
    // Lead: most drops today, then the most hotels, then A–Z (the group's order).
    items: [...g.items].sort((a, b) => b.drops - a.drops || b.hotels - a.hotels),
  }));
  // The Maldives: the most "five-star" picture we have (Zaid wanted a more premium destination).
  const cover = cards.find((c) => c.slug === 'malediven' && c.photo) ?? cards.find((c) => c.photo);

  return (
    <>
      <PhotoHero
        photo={cover?.photo ?? null}
        alt={cover?.alt ?? ''}
        eyebrow={t('eyebrow')}
        title={
          // Two lines on purpose: the count, then the promise (Zaid, C-138).
          <>
            <span className="block">{t('heroTitleA', { cities: cards.length })}</span>{' '}
            <span className="block">{t('heroTitleB')}</span>
          </>
        }
        lead={t('lead', { cities: cards.length, hotels })}
      />
      <div className="mx-auto w-full max-w-[1240px] px-[18px] pb-20 md:px-10 md:pb-32">
        <SectionNav
          label={th('regionsLabel')}
          items={groups.map((g) => ({
            id: `region-${g.region}`,
            label: th(`regions.${g.region}`),
          }))}
        />
        {groups.map((g) => {
          const spans = bentoSpans(g.items.length);
          const regionHotels = g.items.reduce((n, c) => n + c.hotels, 0);
          return (
            <section
              key={g.region}
              id={`region-${g.region}`}
              aria-labelledby={`cities-${g.region}`}
              className="mt-12 scroll-mt-32 md:mt-20 lg:scroll-mt-36"
            >
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1 px-1 md:px-0">
                <h2
                  id={`cities-${g.region}`}
                  className="text-[30px] leading-[1.05] font-[650] tracking-[-0.035em] md:text-[48px]"
                >
                  {th(`regions.${g.region}`)}
                </h2>
                <p className="text-[15px] text-muted md:pb-1.5 md:text-[16px]">
                  {t('regionFacts', { cities: g.items.length, hotels: regionHotels })}
                </p>
              </div>
              <ul className="mt-5 grid auto-rows-[190px] grid-cols-2 gap-3 md:mt-8 md:auto-rows-[240px] md:gap-5 lg:grid-cols-4 lg:auto-rows-[250px]">
                {g.items.map((c, i) => {
                  // The country above the name, unless it says nothing new (Deutschland under
                  // "Deutschland", "Malediven", "Sonderverwaltungsregion Hongkong").
                  const country =
                    c.country && g.region !== 'germany'
                      ? countries.of(c.country.toUpperCase())
                      : undefined;
                  return (
                    <li key={c.slug} className={spans[i]}>
                      <CityTile
                        city={c}
                        big={i === 0 || g.items.length === 2}
                        eyebrow={country && !country.includes(c.name) ? country : undefined}
                        href={localizedPath(cityPath(c.slug), locale)}
                        sizes={
                          i === 0
                            ? '(min-width: 1240px) 600px, (min-width: 1024px) 50vw, 100vw'
                            : '(min-width: 1024px) 600px, 50vw'
                        }
                        className="fade-up size-full"
                        style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
