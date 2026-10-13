import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { formatPrice, localizedPath, type Locale } from '@tidaq/core';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { routes } from '@/lib/routes';

// An illustration of the method, labelled "Beispiel" on the receipt. Never presented as a result.
const SHOWN = 102_000;
const AT_CHECKOUT = 121_200;

/**
 * Kassen-Check teaser (CRAFT.md §4.2): the method in words, next to a white "Kassenbon" with a
 * zig-zag edge, dashed dividers and tabular figures. No test numbers until L-033 has real ones.
 */
export async function CheckoutTeaser({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'checkout' });
  const price = (c: number) => formatPrice(c, locale);
  const row = 'flex items-baseline justify-between gap-4 py-2.5';

  return (
    <section
      aria-labelledby="checkout-title"
      className="mx-auto grid w-full max-w-[1080px] grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 pb-14 md:grid-cols-2 md:px-7 lg:gap-16 lg:pb-[88px]"
    >
      <div>
        <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
        <h2 id="checkout-title" className="text-h2 mt-3 max-w-[20ch]">
          {t('title')}
        </h2>
        <p className="text-lead mt-4 text-muted-ink">{t('text')}</p>
        <a
          href={localizedPath(routes.checkoutCheck, locale)}
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t('link')}
          <Icon icon={ArrowRight} size={16} />
        </a>
      </div>

      <div className="mx-auto w-full max-w-[360px] drop-shadow-[0_16px_32px_rgba(106,73,224,0.14)] md:rotate-[1.5deg]">
        <div className="receipt bg-surface px-6 pt-6 text-[14.5px]">
          <div className="flex items-center justify-between">
            <p className="text-eyebrow text-muted-ink">{t('receiptTitle')}</p>
            <Badge tone="warn">{t('receiptSite')}</Badge>
          </div>
          <div className="mt-4 border-t border-dashed border-line-strong tabular-nums">
            <p className={row}>
              <span className="text-muted-ink">{t('shown')}</span>
              <span className="font-bold">{price(SHOWN)}</span>
            </p>
            <p className={row}>
              <span className="text-muted-ink">{t('checkout')}</span>
              <span className="font-bold">{price(AT_CHECKOUT)}</span>
            </p>
          </div>
          <p className={`${row} border-t border-dashed border-line-strong tabular-nums`}>
            <span className="font-semibold">{t('diff')}</span>
            <span className="text-[17px] font-extrabold text-bad-ink">
              +{price(AT_CHECKOUT - SHOWN)}
            </span>
          </p>
          <p className="border-t border-dashed border-line-strong pt-3 text-[12.5px] text-muted-ink">
            {t('receiptNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
