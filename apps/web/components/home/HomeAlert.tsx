import { getTranslations } from 'next-intl/server';
import { dropDates, formatDrop, formatPrice, type Locale } from '@tidaq/core';
import { alertCities, dropAlertLabels } from '@/components/drops/DropAlertSection';
import { DropAlertForm } from '@/components/drops/DropAlertForm';
import { Photo } from '@/components/ui/Photo';
import { getDrops } from '@/lib/data/drops';
import { cardPhoto } from '@/lib/photos';
import { berlinToday } from '@/lib/today';
import { cn } from '@/lib/cn';

/** Each preview a step further in and a step quieter, like older notifications (mockup B). */
const STACK = [
  { box: 'bg-white/10 border-white/14', indent: '' },
  { box: 'bg-white/7 border-white/10', indent: 'mx-2.5 md:mx-0 md:ml-7' },
  { box: 'bg-white/4 border-white/8 opacity-75', indent: 'max-md:hidden md:ml-14' },
] as const;

/**
 * The Price Alert block (mockup B): a dark band with "Verpass keinen Price Drop.", the sign-up as
 * one white line (fields stacked on phones), and on the right what an alert looks like, made from
 * today's real drops (time = when we saw them). Without drops the previews are left out and the
 * form stands alone.
 */
export async function HomeAlert({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const [labels, cities, drops] = await Promise.all([
    dropAlertLabels(locale),
    alertCities(locale),
    getDrops(berlinToday()),
  ]);
  const previews = drops.kind === 'ok' ? drops.drops.slice(0, STACK.length) : [];
  const time = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
  });

  const list = (
    <ul aria-label={t('alertPreviews')} className="flex flex-col gap-2.5 md:gap-3.5">
      {previews.map((g, i) => {
        const d = g.top;
        const pic = cardPhoto(g.hotel.slug, g.city.slug);
        const step = STACK[i]!;
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
      id="price-alert"
      aria-labelledby="home-alert"
      className="mt-16 scroll-mt-20 bg-night text-night-ink md:mt-[130px]"
    >
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-[18px] pt-[52px] pb-12 md:flex-row md:flex-wrap md:items-center md:gap-x-24 md:gap-y-14 md:px-10 md:py-[110px]">
        <div className="md:max-w-[500px] md:flex-[1_1_420px]">
          <p className="mb-3.5 inline-flex h-7 items-center gap-2 rounded-full bg-white/8 px-3 text-[13px] font-semibold md:mb-[18px] md:h-8 md:text-[14px]">
            <span aria-hidden="true" className="live-dot size-[7px] rounded-full bg-good-bright" />
            {t('alertPill')}
          </p>
          <h2
            id="home-alert"
            className="text-[30px] leading-[1.1] font-[650] tracking-[-0.03em] md:text-[44px] md:leading-[1.08]"
          >
            {t('alertTitle')}
          </h2>
          <p className="mt-2.5 text-[16px] text-night-ink/78 md:mt-4 md:text-[18px]">
            <span className="md:hidden">{t('alertLeadShort')}</span>
            <span className="hidden md:inline">{t('alertLead')}</span>
          </p>
          {/* Phones: previews between text and form (mockup B); desktop: the right column. */}
          {previews.length > 0 && <div className="mt-6 md:hidden">{list}</div>}
          <div className="mt-6 md:mt-[30px]">
            <DropAlertForm
              locale={locale}
              cities={cities}
              defaultCity={null}
              labels={labels}
              variant="bar"
            />
          </div>
          <p className="mt-3 hidden text-[14px] text-night-ink/65 md:block">{t('alertFoot')}</p>
        </div>
        {previews.length > 0 && (
          <div className="hidden md:block md:max-w-[520px] md:flex-[1_1_420px]">{list}</div>
        )}
      </div>
    </section>
  );
}
