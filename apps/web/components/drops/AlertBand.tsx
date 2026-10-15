import { getTranslations } from 'next-intl/server';
import { dropDates, formatDrop, formatPrice, type Locale } from '@tidaq/core';
import { Photo } from '@/components/ui/Photo';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { cardPhoto } from '@/lib/photos';
import { cn } from '@/lib/cn';
import { DROP_ALERT_ID } from './alertId';
import { DropAlertForm } from './DropAlertForm';
import { alertCities, dropAlertLabels } from './DropAlertSection';

/** Each preview a step further in and a step quieter, like older notifications (mockup B). */
const STACK = [
  { box: 'bg-white/10 border-white/14', indent: '' },
  { box: 'bg-white/7 border-white/10', indent: 'mx-2.5 md:mx-0 md:ml-7' },
  // No opacity on the text: the oldest only gets a quieter box, its text stays AA.
  { box: 'bg-white/4 border-white/8', indent: 'max-md:hidden md:ml-14' },
] as const;

/**
 * The Price Alert band (mockup B): a dark full-width band with "Verpass keinen Price Drop.", the
 * sign-up as one white line (fields stacked on phones), and on the right what an alert looks like,
 * made from real drops (time = when we saw them). The same band on every page that offers the
 * alert; `city` preselects the city (city pages, a filtered radar). Without previews the form
 * stands alone. It carries the `#price-alert` anchor the navbar's Price Alert links to.
 */
export async function AlertBand({
  locale,
  previews = [],
  city = null,
  cities: given,
  title,
  lead,
}: {
  locale: Locale;
  /** Real drops for the notification previews (up to three are shown). */
  previews?: HotelDropsWithPhoto[];
  /** Preselected city; always offered, even when the catalog can't be read. */
  city?: { slug: string; name: string } | null;
  /** Pass when the page already has the list (dev pages); otherwise read from the catalog. */
  cities?: { slug: string; name: string }[];
  title?: string;
  lead?: string;
}) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const [labels, listed] = await Promise.all([
    dropAlertLabels(locale),
    given ? Promise.resolve(given) : alertCities(locale),
  ]);
  const cities =
    city && !listed.some((c) => c.slug === city.slug)
      ? [...listed, city].sort((a, b) => a.name.localeCompare(b.name, locale))
      : listed;
  const shown = previews.slice(0, STACK.length);
  const time = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
  });

  const list = (
    <ul aria-label={t('alertPreviews')} className="flex flex-col gap-2.5 md:gap-3.5">
      {shown.map((g, i) => {
        const d = g.top;
        const pic = cardPhoto(g.hotel.slug, g.city.slug);
        const step = STACK[i] ?? STACK[0];
        return (
          <li
            key={g.hotel.slug}
            className={cn(
              'flex items-center gap-3 rounded-[20px] border p-3.5 md:gap-3.5 md:rounded-card md:px-[18px] md:py-4',
              step.box,
              step.indent,
            )}
          >
            <Photo
              photo={pic?.photo ?? null}
              alt=""
              sizes="52px"
              className="size-11 shrink-0 rounded-[12px] md:size-[52px] md:rounded-[14px]"
            />
            <div className="min-w-0 flex-1">
              <p className="flex justify-between gap-2 text-[12px] text-night-ink/65 md:text-[13px]">
                <span>{t('alertFrom')}</span>
                <span>{time.format(new Date(d.seenAt))}</span>
              </p>
              <p className="mt-px truncate text-[15px] font-semibold md:text-[16px]">
                {t('alertLine', { hotel: g.hotel.name, pct: formatDrop(d.drop, locale) })}
              </p>
              <p className="truncate text-[13px] text-night-ink/78 md:text-[14px]">
                {t('alertSub', {
                  now: formatPrice(d.nowCents, locale),
                  prev: formatPrice(d.prevCents, locale),
                  date: dropDates(d, locale),
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section
      id={DROP_ALERT_ID}
      aria-labelledby={`${DROP_ALERT_ID}-title`}
      className="scroll-mt-16 bg-night text-night-ink"
    >
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-[18px] pt-[52px] pb-12 md:flex-row md:flex-wrap md:items-center md:gap-x-24 md:gap-y-14 md:px-10 md:py-[110px]">
        <div className="md:max-w-[500px] md:flex-[1_1_420px]">
          <p className="mb-3.5 inline-flex h-7 items-center rounded-full bg-white/8 px-3 text-[13px] font-semibold md:mb-[18px] md:h-8 md:text-[14px]">
            {t('alertPill')}
          </p>
          <h2
            id={`${DROP_ALERT_ID}-title`}
            className="text-[30px] leading-[1.1] font-[650] tracking-[-0.03em] md:text-[44px] md:leading-[1.08]"
          >
            {title ?? t('alertTitle')}
          </h2>
          <p className="mt-2.5 text-[16px] text-night-ink/78 md:mt-4 md:text-[18px]">
            {lead ?? (
              <>
                <span className="md:hidden">{t('alertLeadShort')}</span>
                <span className="hidden md:inline">{t('alertLead')}</span>
              </>
            )}
          </p>
          {/* Phones: previews between text and form (mockup B); desktop: the right column. */}
          {shown.length > 0 && <div className="mt-6 md:hidden">{list}</div>}
          <div className="mt-6 md:mt-[30px]">
            <DropAlertForm
              locale={locale}
              cities={cities}
              defaultCity={city?.slug ?? null}
              labels={labels}
              variant="bar"
            />
          </div>
          <p className="mt-3 hidden text-[14px] text-night-ink/65 md:block">{t('alertFoot')}</p>
        </div>
        {shown.length > 0 && (
          <div className="hidden md:block md:max-w-[520px] md:flex-[1_1_420px]">{list}</div>
        )}
      </div>
    </section>
  );
}

/** The `{ slug, name }` of a city on today's radar, for preselecting it in the band. */
export function cityOf(
  drops: readonly HotelDropsWithPhoto[],
  slug: string | null,
  locale: Locale,
): { slug: string; name: string } | null {
  const g = slug ? drops.find((d) => d.city.slug === slug) : undefined;
  return g ? { slug: g.city.slug, name: g.city.name[locale] } : null;
}
