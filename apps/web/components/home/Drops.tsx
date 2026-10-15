import { getTranslations } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { DropsTeaser, dropsHref } from '@/components/drops/DropsTeaser';
import { getDrops } from '@/lib/data/drops';
import { berlinToday } from '@/lib/today';

/** Homepage: today's three biggest drops (C-080a), right under the hero. Nothing without drops. */
export async function Drops({ locale }: { locale: Locale }) {
  const load = await getDrops(berlinToday());
  if (load.kind !== 'ok' || load.drops.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'drops' });
  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-14 md:px-7 lg:pt-[88px]">
      <DropsTeaser
        drops={load.drops}
        locale={locale}
        title={t('homeTitle')}
        href={dropsHref(locale)}
        id="drops-title"
      />
    </div>
  );
}
