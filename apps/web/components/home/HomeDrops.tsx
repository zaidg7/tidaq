import { getTranslations } from 'next-intl/server';
import { formatPercent, localizedPath, type Locale } from '@tidaq/core';
import { DropTile } from '@/components/drops/DropTile';
import { DROP_ALERT_ID } from '@/components/drops/alertId';
import { getDrops } from '@/lib/data/drops';
import { routes } from '@/lib/routes';
import { berlinToday } from '@/lib/today';
import { PillLink, SectionHead } from './SectionHead';

/** Four tiles: one row on desktop, two by two on phones. */
const SHOWN = 4;

/**
 * "Price Drops heute" (mockup B): today's four biggest drops as photo tiles, badge coloured by
 * size. Without data (no database, read error) the section is left out; with data but no drop
 * today it says so and offers the Price Alert instead of an empty grid.
 */
export async function HomeDrops({ locale }: { locale: Locale }) {
  const load = await getDrops(berlinToday());
  if (load.kind !== 'ok') return null;
  const t = await getTranslations({ locale, namespace: 'home' });
  const drops = load.drops;
  const all = localizedPath(routes.drops, locale);
  const top = drops[0];

  return (
    <section
      aria-labelledby="home-drops"
      className="mx-auto w-full max-w-[1240px] px-3.5 pt-[52px] md:px-10 md:pt-[110px]"
    >
      <SectionHead
        id="home-drops"
        title={t('dropsTitle')}
        lead={
          top
            ? {
                short: t('dropsLeadShort', { pct: formatPercent(top.top.drop, locale) }),
                long: t('dropsLead', { pct: formatPercent(top.top.drop, locale) }),
              }
            : undefined
        }
        link={
          drops.length > 0
            ? {
                href: all,
                long: t('dropsAll', { n: drops.length }),
                short: t('dropsAllShort', { n: drops.length }),
              }
            : undefined
        }
      />
      {top ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-[22px] md:grid-cols-4 md:gap-7">
          {drops.slice(0, SHOWN).map((g, i) => (
            <DropTile key={g.hotel.slug} group={g} priority={i < 2} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-panel border border-line bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="text-[19px] font-semibold tracking-[-0.01em]">{t('dropsEmptyTitle')}</p>
            <p className="mt-1 max-w-[40em] text-[15px] text-muted">{t('dropsEmptyText')}</p>
          </div>
          <PillLink href={`${all}#${DROP_ALERT_ID}`}>{t('dropsEmptyCta')}</PillLink>
        </div>
      )}
    </section>
  );
}
