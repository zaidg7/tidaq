import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { DealCard, dealMetaValues } from '@/components/deals/DealCard';
import { getDeals } from '@/lib/data/deals';
import { routes } from '@/lib/routes';

/**
 * "Fünf-Sterne-Deals dieser Woche" (DESIGN.md §3 Deal card): only real drops of 8 %+ with 14+
 * days of history. Renders nothing until such deals exist, so the page never shows filler.
 */
export async function Deals({ locale }: { locale: Locale }) {
  const deals = await getDeals();
  if (!deals || deals.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'deals' });

  return (
    <section
      aria-labelledby="deals-title"
      className="mx-auto w-full max-w-[1080px] px-5 pb-14 md:px-7 lg:pb-[88px]"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
          <h2 id="deals-title" className="text-h2 mt-3 max-w-[22ch]">
            {t('title')}
          </h2>
        </div>
        <a
          href={localizedPath(routes.deals, locale)}
          className="inline-flex min-h-11 shrink-0 items-center font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t('all')}
        </a>
      </div>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {deals.map((d) => (
          <li key={d.stayId}>
            <DealCard deal={d} locale={locale} meta={t('meta', dealMetaValues(d, locale))} />
          </li>
        ))}
      </ul>
    </section>
  );
}
