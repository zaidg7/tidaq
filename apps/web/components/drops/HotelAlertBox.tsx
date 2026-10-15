import { getTranslations } from 'next-intl/server';
import type { Locale } from '@tidaq/core';
import { cn } from '@/lib/cn';
import { DROP_ALERT_ID } from './alertId';
import { DropAlertForm } from './DropAlertForm';
import { dropAlertLabels } from './DropAlertSection';

/**
 * "Price Alert für dieses Hotel" (mockup B drop page): a soft violet box with one line on what it
 * does, the address and a dark button. On the drop and hotel pages; carries the
 * `#price-alert` anchor there.
 */
export async function HotelAlertBox({
  locale,
  hotel,
  citySlug,
  className,
}: {
  locale: Locale;
  hotel: { slug: string; name: string };
  citySlug: string;
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: 'drop' });
  return (
    <section
      id={DROP_ALERT_ID}
      aria-labelledby="hotel-alert"
      className={cn(
        'scroll-mt-24 rounded-[24px] bg-surface-accent px-5 py-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-10 md:px-10 md:py-10',
        className,
      )}
    >
      <div>
        <h2
          id="hotel-alert"
          className="text-[22px] font-semibold tracking-[-0.02em] md:text-[28px]"
        >
          {t('alertTitle')}
        </h2>
        <p className="mt-1.5 mb-4 text-[15px] text-muted md:mt-2 md:text-[16px]">
          {t('alertText', { hotel: hotel.name })}
        </p>
      </div>
      <DropAlertForm
        locale={locale}
        cities={[]}
        defaultCity={citySlug}
        hotel={hotel}
        labels={await dropAlertLabels(locale, hotel)}
        variant="hotel"
      />
    </section>
  );
}
