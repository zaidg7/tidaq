import { useTranslations } from 'next-intl';
import type { ImageRef } from '@/lib/photos';

/**
 * "Stadtbild" on a city photo that stands in for a hotel without its own (PREMIUM.md §7.1), so
 * nobody takes it for the hotel. Renders nothing for the hotel's own photo. Put it inside the
 * photo's `relative` wrapper.
 */
export function CityPhotoTag({ image }: { image: ImageRef | null }) {
  const t = useTranslations('photo');
  if (!image?.city) return null;
  return (
    <span className="absolute bottom-2.5 left-2.5 inline-flex h-5 items-center rounded-tag bg-[rgba(21,19,28,0.55)] px-2 text-[11px] font-medium text-white">
      {t('cityTag')}
    </span>
  );
}
