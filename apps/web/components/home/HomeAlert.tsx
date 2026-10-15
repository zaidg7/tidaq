import type { Locale } from '@tidaq/core';
import { AlertBand } from '@/components/drops/AlertBand';
import { getDrops } from '@/lib/data/drops';
import { berlinToday } from '@/lib/today';

/** The homepage's Price Alert band (mockup B), with today's biggest drops as previews. */
export async function HomeAlert({ locale }: { locale: Locale }) {
  const drops = await getDrops(berlinToday());
  return (
    <div className="mt-16 md:mt-[130px]">
      <AlertBand locale={locale} previews={drops.kind === 'ok' ? drops.drops : []} />
    </div>
  );
}
