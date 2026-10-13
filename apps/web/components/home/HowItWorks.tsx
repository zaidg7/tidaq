import { getTranslations } from 'next-intl/server';
import { BellRing, CalendarCheck, Search } from 'lucide-react';
import type { Locale } from '@tidaq/core';
import { Icon } from '@/components/ui/Icon';

const STEPS = [
  { icon: Search, title: 's1Title', text: 's1Text' },
  { icon: CalendarCheck, title: 's2Title', text: 's2Text' },
  { icon: BellRing, title: 's3Title', text: 's3Text' },
] as const;

/** "So funktioniert's" (DESIGN.md §4): three numbered steps, flat cards, no illustrations. */
export async function HowItWorks({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'how' });
  return (
    <section
      aria-labelledby="how-title"
      className="mx-auto w-full max-w-[1080px] px-5 pb-14 md:px-7 lg:pb-[88px]"
    >
      <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
      <h2 id="how-title" className="text-h2 mt-3 max-w-[22ch]">
        {t('title')}
      </h2>
      <ol className="mt-8 grid gap-3 md:grid-cols-3 md:gap-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-card border border-line bg-surface p-5 lg:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon icon={step.icon} />
              </span>
              <span
                aria-hidden="true"
                className="text-[13px] font-extrabold text-muted tabular-nums"
              >
                0{i + 1}
              </span>
            </div>
            <h3 className="text-h3 mt-4">{t(step.title)}</h3>
            <p className="mt-1.5 text-[15px] text-muted-ink">{t(step.text)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
