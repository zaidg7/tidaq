import { useLocale, useTranslations } from 'next-intl';
import { formatDateRange, formatPrice, localizedPath, stayPath, type Locale } from '@tidaq/core';
import { newsletterOffAction, removeAction, unsubscribeAction } from '@/app/[locale]/alarm/actions';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ManageData } from '@/lib/watch/watch';

/**
 * The visitor's price alerts (C-030): each with its stay link and a "Beenden" button, the weekly
 * newsletter when it's on (C-054a), then a clearly separated "Alle Alarme abbestellen" that
 * deletes the address. Plain forms (server
 * actions), so it works without JavaScript.
 */
export function ManageView({
  data,
  token,
  notice,
}: {
  data: ManageData;
  token: string;
  notice: string | null;
}) {
  const t = useTranslations('watch');
  const locale = useLocale() as Locale;
  const hidden = (
    <>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <p className="text-eyebrow text-accent">{t('manageEyebrow')}</p>
      <h1 className="text-h2 mt-2">{t('manageTitle')}</h1>
      <p className="text-meta mt-2 text-muted-ink">{t('manageFor', { email: data.email })}</p>
      {notice && (
        <p
          role="status"
          className="mt-6 rounded-cell bg-accent-soft px-4 py-3 text-[14.5px] font-semibold"
        >
          {notice}
        </p>
      )}
      {!data.confirmed && (
        <p className="mt-6 rounded-cell bg-warn-soft px-4 py-3 text-[14.5px] font-semibold text-warn-ink">
          {t('unconfirmedNotice')}
        </p>
      )}

      {data.watches.length === 0 ? (
        <p className="mt-8 text-[15px] text-muted-ink">{t('empty')}</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {data.watches.map((w) => {
            const dates = formatDateRange(w.check_in, w.check_out, locale);
            return (
              <li key={w.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <a
                      href={localizedPath(
                        stayPath(w.hotel_slug, w.check_in, w.check_out, w.adults),
                        locale,
                      )}
                      className="font-bold underline-offset-2 hover:underline"
                    >
                      {w.hotel_name}
                    </a>
                    <p className="text-meta mt-0.5 text-muted-ink">
                      {t('stay', { dates, adults: w.adults })}
                    </p>
                    <p className="text-meta text-muted-ink">
                      {w.target_cents
                        ? t('target', { price: formatPrice(w.target_cents, locale) })
                        : t('noTarget')}
                    </p>
                  </div>
                  <form action={removeAction}>
                    {hidden}
                    <input type="hidden" name="watch" value={w.id} />
                    <button
                      type="submit"
                      aria-label={t('removeLabel', { hotel: w.hotel_name, dates })}
                      className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                    >
                      {t('remove')}
                    </button>
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {data.newsletter && (
        <section aria-labelledby="newsletter-title" className="mt-10">
          <h2 id="newsletter-title" className="text-h3">
            {t('newsletterTitle')}
          </h2>
          <Card className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[30em] text-[15px]">{t('newsletterText')}</p>
            <form action={newsletterOffAction}>
              {hidden}
              <button type="submit" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                {t('newsletterOff')}
              </button>
            </form>
          </Card>
        </section>
      )}

      <section aria-labelledby="unsubscribe-title" className="mt-14 border-t border-line pt-8">
        <h2 id="unsubscribe-title" className="text-h3">
          {t('unsubscribeTitle')}
        </h2>
        <p className="mt-1 max-w-[34em] text-[15px] text-muted-ink">{t('unsubscribeText')}</p>
        <form action={unsubscribeAction} className="mt-4">
          {hidden}
          <button type="submit" className={buttonClasses({ variant: 'ghost' })}>
            {t('unsubscribeButton')}
          </button>
        </form>
      </section>
    </div>
  );
}
