import { getTranslations } from 'next-intl/server';
import { BellRing } from 'lucide-react';
import { localizedPath, type Locale } from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';
import { getCatalog } from '@/lib/data/catalog';
import { routes } from '@/lib/routes';
import { DROP_ALERT_ID } from './alertId';
import { DropAlertForm, type DropAlertFormLabels } from './DropAlertForm';

/**
 * Preissturz-Alarm (C-080e1): "Schick mir Preisstürze in Paris", the step that turns a visitor
 * from a TikTok video into someone who comes back. On the radar, drop pages and city pages.
 * Cities come from the catalog (every city we track, not only today's drops).
 */
export async function DropAlertSection({
  locale,
  defaultCity,
  cities: given,
  hotel = null,
}: {
  locale: Locale;
  /** Preselected city; always offered, even if the catalog can't be read. */
  defaultCity: { slug: string; name: string } | string | null;
  /** Pass when the page already has the list; otherwise it's read from the catalog. */
  cities?: { slug: string; name: string }[];
  /** "Nur dieses Hotel" as the first, preselected choice (C-080k1). */
  hotel?: { slug: string; name: string } | null;
}) {
  const t = await getTranslations({ locale, namespace: 'dropAlert' });
  const preset = typeof defaultCity === 'string' ? null : defaultCity;
  const listed = given ?? (await alertCities(locale));
  const cities =
    preset && !listed.some((c) => c.slug === preset.slug)
      ? [...listed, preset].sort((a, b) => a.name.localeCompare(b.name, locale))
      : listed;
  const labels = await dropAlertLabels(locale, hotel);
  return (
    <section
      id={DROP_ALERT_ID}
      aria-labelledby={`${DROP_ALERT_ID}-title`}
      className="scroll-mt-24 rounded-card bg-accent-soft p-5 md:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
        <div>
          <span className="grid size-11 place-items-center rounded-full bg-surface text-accent">
            <Icon icon={BellRing} size={24} />
          </span>
          <h2 id={`${DROP_ALERT_ID}-title`} className="text-h3 mt-4">
            {t('title')}
          </h2>
          <p className="mt-2 max-w-[30em] text-[15px]">
            {hotel ? t('textHotel', { hotel: hotel.name }) : t('text')}
          </p>
        </div>
        <DropAlertForm
          locale={locale}
          cities={cities}
          defaultCity={typeof defaultCity === 'string' ? defaultCity : (defaultCity?.slug ?? null)}
          hotel={hotel}
          labels={labels}
        />
      </div>
    </section>
  );
}

/** The sign-up form's texts (both layouts), with the privacy link in the right language. */
export async function dropAlertLabels(
  locale: Locale,
  hotel: { slug: string; name: string } | null = null,
): Promise<DropAlertFormLabels> {
  const t = await getTranslations({ locale, namespace: 'dropAlert' });
  const privacy = `${localizedPath(routes.privacy, locale)}#${
    locale === 'de' ? '6-preisalarm-und-deals-per-e-mail' : '6-price-alerts-and-deals-by-email'
  }`;
  return {
    email: t('email'),
    city: t('city'),
    scope: t('scope'),
    ...(hotel && { onlyHotel: t('onlyHotel', { hotel: hotel.name }) }),
    allCities: t('allCities'),
    consent: t('consent'),
    privacy: t('privacy'),
    privacyHref: privacy,
    submit: t('submit'),
    preview: t('preview'),
    results: {
      sent: t('results.sent'),
      added: t('results.added'),
      invalid: t('results.invalid'),
      too_soon: t('results.too_soon'),
      rate_limited: t('results.rate_limited'),
      bot: t('results.bot'),
      error: t('results.error'),
    },
    bar: {
      email: t('emailShort'),
      placeholder: t('emailPlaceholder'),
      submit: t('submitShort'),
      submitPhone: t('submitPhone'),
    },
  };
}

/** Every city we track, A–Z, for the form's select. */
export async function alertCities(locale: Locale): Promise<{ slug: string; name: string }[]> {
  return [
    ...new Map(((await getCatalog())?.hotels ?? []).map((h) => [h.city.slug, h.city.name[locale]])),
  ]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
