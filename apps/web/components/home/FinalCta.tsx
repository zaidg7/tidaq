import { getTranslations } from 'next-intl/server';
import { localizedPath, type Locale } from '@tidaq/core';
import { buttonClasses } from '@/components/ui/Button';
import { routes } from '@/lib/routes';

/** Closing call to action: one primary button back to the search (the navbar CTA hides meanwhile). */
export async function FinalCta({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'cta' });
  return (
    <section className="mx-auto w-full max-w-[1080px] px-5 pb-14 md:px-7 lg:pb-[88px]">
      <div
        data-hides-nav-cta=""
        className="flex flex-col items-center rounded-search bg-accent-soft px-6 py-12 text-center lg:py-16"
      >
        <h2 className="text-h2 max-w-[20ch]">{t('title')}</h2>
        <p className="text-lead mt-4 max-w-[34em] text-muted-ink">{t('text')}</p>
        <a
          href={localizedPath(routes.search, locale)}
          className={`${buttonClasses({ size: 'lg' })} mt-7`}
        >
          {t('button')}
        </a>
      </div>
    </section>
  );
}
