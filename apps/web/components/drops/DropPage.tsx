import { getTranslations } from 'next-intl/server';
import { TrendingDown } from 'lucide-react';
import {
  addDays,
  dropPath,
  dropStay,
  formatPrice,
  formatWeekdayDayMonth,
  localizedPath,
  stayPath,
  updatedAtParts,
  type DailyPrice,
  type Locale,
  type PriceDrop,
} from '@tidaq/core';
import { PriceChart } from '@/components/chart/PriceChart';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import { DROP_HISTORY_DAYS, type HotelDropsWithPhoto } from '@/lib/data/drops';
import { routes } from '@/lib/routes';
import { dropPercent } from './DropCard';
import { DropShare } from './DropShare';
import { DropsTeaser, dropsHref } from './DropsTeaser';
import type { StoryText } from './storyImage';

/** Everything the page, its metadata and the share texts say about one drop. */
export async function dropFacts(g: HotelDropsWithPhoto, d: PriceDrop, locale: Locale, now: Date) {
  const t = await getTranslations({ locale, namespace: 'drop' });
  const td = await getTranslations({ locale, namespace: 'drops' });
  const pct = dropPercent(d.drop, locale);
  const date = formatWeekdayDayMonth(d.night, locale);
  const nowP = formatPrice(d.nowCents, locale);
  const was = formatPrice(d.prevCents, locale);
  const site = d.provider.direct ? t('atDirect') : t('atSite', { provider: d.provider.name });
  const low = d.priorDays >= 2 ? td('newLow', { days: d.priorDays + 1 }) : td('firstLow');
  const seen = updatedAtParts(d.seenAt, now, locale);
  const saved = d.provider.direct
    ? td('savedDirect', { amount: formatPrice(d.savedCents, locale) })
    : td('saved', { amount: formatPrice(d.savedCents, locale), provider: d.provider.name });
  const vars = { hotel: g.hotel.name, city: g.city.name[locale], date, pct, now: nowP, was };
  const story: StoryText = {
    pct,
    hotel: g.hotel.name,
    place: `${g.city.name[locale]} · ${date}`,
    now: nowP,
    was: td('was', { price: was }),
    saved,
    low,
    asOf: t('storyAsOf', { date: seen.date, time: seen.time }),
    url: t('storyUrl'),
  };
  return {
    pct,
    date,
    site,
    low,
    seen,
    saved,
    story,
    title: t('metaTitle', vars),
    description: t('metaDescription', { ...vars, site, low }),
    shareText: t('shareText', vars),
  };
}

const nightStay = (slug: string, night: string, locale: Locale) => {
  const s = dropStay(night);
  return localizedPath(stayPath(slug, s.checkIn, s.checkOut, 2), locale);
};

/**
 * `/preissturz/[hotel]/[night]` (C-080b): one drop as a page worth sharing. Photo with the drop,
 * both prices, the site and the new-low line, the night's price history, "Als Story teilen" and
 * "Link teilen", then the hotel's other cheaper nights and today's other drops.
 */
export async function DropPage({
  group: g,
  drop: d,
  series,
  others,
  locale,
  today,
  now,
}: {
  group: HotelDropsWithPhoto;
  drop: PriceDrop;
  series: DailyPrice[];
  others: HotelDropsWithPhoto[];
  locale: Locale;
  today: string;
  now: Date;
}) {
  const t = await getTranslations({ locale, namespace: 'drop' });
  const td = await getTranslations({ locale, namespace: 'drops' });
  const f = await dropFacts(g, d, locale, now);
  const when =
    f.seen.day === 'today'
      ? td('today', { time: f.seen.time })
      : f.seen.day === 'yesterday'
        ? td('yesterday', { time: f.seen.time })
        : `${f.seen.date}, ${f.seen.time}`;
  const nights = [g.top, ...g.more]
    .filter((n) => n.night !== d.night)
    .sort((a, b) => a.night.localeCompare(b.night));

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <div className="relative overflow-hidden rounded-card bg-placeholder">
          {g.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted (C-011c), already sized
            <img
              src={g.image.src}
              alt=""
              width={g.image.width}
              height={g.image.height}
              fetchPriority="high"
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="aspect-[4/3] w-full" />
          )}
          <span
            aria-hidden="true"
            className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-drop px-4 py-2 text-[28px] leading-none font-extrabold text-white tabular-nums shadow-float"
          >
            <Icon icon={TrendingDown} size={24} />
            {f.pct}
          </span>
        </div>

        <div>
          <p className="text-eyebrow text-accent">
            <a href={dropsHref(locale, g.city.slug)} className="underline-offset-2 hover:underline">
              {t('eyebrow', { city: g.city.name[locale] })}
            </a>
          </p>
          <h1 className="text-h2 mt-2">{g.hotel.name}</h1>
          <p className="text-meta mt-2 text-muted-ink">
            {g.city.name[locale]} · {td('night', { date: f.date })}
          </p>
          <p className="sr-only">{td('dropLabel', { pct: f.pct })}</p>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Price cents={d.nowCents} size="xl" />
            <span className="text-[16px] text-muted-ink tabular-nums">
              {td('was', { price: formatPrice(d.prevCents, locale) })}
            </span>
          </div>
          <p className="mt-2 text-[16px] font-semibold text-good-ink">{f.saved}</p>
          <p className="text-meta mt-1 text-muted-ink">{f.low}</p>
          <p className="text-meta mt-1 text-muted-ink">{t('seen', { when, site: f.site })}</p>

          <a
            href={nightStay(g.hotel.slug, d.night, locale)}
            className={cn(buttonClasses({ size: 'lg', block: true }), 'mt-7 sm:w-auto')}
          >
            {t('ctaStay')}
          </a>
          <div className="mt-4">
            <DropShare
              path={localizedPath(dropPath(g.hotel.slug, d.night), locale)}
              photo={g.image?.src ?? null}
              story={f.story}
              title={f.title}
              text={f.shareText}
              fileName={`tidaq-${g.hotel.slug}-${d.night}`}
              labels={{
                shareStory: t('shareStory'),
                storyWorking: t('storyWorking'),
                shareLink: t('shareLink'),
                linkCopied: t('linkCopied'),
                imageSaved: t('imageSaved'),
                shareFailed: t('shareFailed'),
                close: t('close'),
              }}
            />
          </div>
          <p className="text-meta mt-6 text-muted-ink">{td('how.check')}</p>
        </div>
      </div>

      {series.length >= 2 && (
        <section aria-labelledby="drop-history" className="mt-14 lg:mt-[88px]">
          <h2 id="drop-history" className="text-h3">
            {t('historyTitle')}
          </h2>
          <p className="text-meta mt-1 max-w-[44em] text-muted-ink">{t('historyText')}</p>
          <PriceChart
            series={series}
            from={addDays(today, -(DROP_HISTORY_DAYS - 1))}
            to={today}
            className="mt-5"
          />
        </section>
      )}

      {nights.length > 0 && (
        <section aria-labelledby="drop-nights" className="mt-14">
          <h2 id="drop-nights" className="text-h3">
            {t('moreTitle', { hotel: g.hotel.name })}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {nights.map((n) => (
              <li key={n.night}>
                <a
                  href={localizedPath(dropPath(g.hotel.slug, n.night), locale)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold hover:border-line-strong"
                >
                  {formatWeekdayDayMonth(n.night, locale)}
                  <span className="text-good-ink tabular-nums">{dropPercent(n.drop, locale)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <div className="mt-14 lg:mt-[88px]">
          <DropsTeaser
            drops={others}
            locale={locale}
            title={t('othersTitle')}
            href={dropsHref(locale)}
            id="drop-others"
          />
        </div>
      )}
    </div>
  );
}

/** A shared link whose drop is gone (price back up, or the night started): say so, show the way on. */
export async function DropOver({
  hotel,
  night,
  locale,
  today,
}: {
  hotel: { slug: string; name: string };
  night: string;
  locale: Locale;
  today: string;
}) {
  const t = await getTranslations({ locale, namespace: 'drop' });
  const upcoming = night > today;
  return (
    <StatusPage
      eyebrow={t('overEyebrow')}
      title={t('overTitle')}
      text={t('overText', {
        date: formatWeekdayDayMonth(night, locale),
        hotel: hotel.name,
      })}
    >
      <div className="flex flex-wrap justify-center gap-3">
        {upcoming && (
          <a href={nightStay(hotel.slug, night, locale)} className={buttonClasses({ size: 'lg' })}>
            {t('overStay')}
          </a>
        )}
        <a
          href={localizedPath(routes.drops, locale)}
          className={buttonClasses({ size: 'lg', variant: upcoming ? 'ghost' : 'primary' })}
        >
          {t('overAll')}
        </a>
      </div>
    </StatusPage>
  );
}
