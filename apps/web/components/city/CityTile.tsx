import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Photo } from '@/components/ui/Photo';
import type { CityCard } from '@/lib/data/cityCards';
import { cn } from '@/lib/cn';

/**
 * A city as a photo tile (mockup B "Beliebte Ziele"): full-bleed photo, a scrim from the middle
 * down, the name and "3 Hotels · 2 Price Drops heute" in white at the bottom left. `big` is the
 * 2×2 lead tile of the bento grid. The whole tile is one link.
 */
export function CityTile({
  city,
  href,
  big = false,
  eyebrow,
  sizes,
  className,
  style,
}: {
  city: CityCard;
  href: string;
  big?: boolean;
  /** A small line above the name (the country on /staedte). */
  eyebrow?: string;
  sizes: string;
  className?: string;
  style?: CSSProperties;
}) {
  const t = useTranslations('home');
  const facts = [
    t('cityHotels', { n: city.hotels }),
    city.drops > 0 &&
      (big ? t('cityDropsToday', { n: city.drops }) : t('cityDrops', { n: city.drops })),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <a
      href={href}
      style={style}
      className={cn(
        'tile-zoom group relative block overflow-hidden rounded-card bg-[#2a2620] text-white',
        className,
      )}
    >
      <Photo photo={city.photo} alt={city.alt} sizes={sizes} className="size-full">
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,12,18,0)_42%,rgba(14,12,18,0.72)_100%)]"
        />
      </Photo>
      <span
        className={cn(
          'absolute flex flex-col',
          big
            ? 'bottom-[18px] left-[18px] md:bottom-[26px] md:left-7'
            : 'bottom-4 left-[18px] md:bottom-[18px] md:left-5',
        )}
      >
        {eyebrow && (
          <span className="mb-1 text-[12px] font-semibold tracking-[0.08em] text-white/80 uppercase">
            {eyebrow}
          </span>
        )}
        <span
          className={cn(
            'leading-[1.1] font-[650]',
            big
              ? 'text-[24px] tracking-[-0.02em] md:text-[34px] md:tracking-[-0.03em]'
              : 'text-[22px] tracking-[-0.02em]',
          )}
        >
          {city.name}
        </span>
        <span
          className={cn(
            'mt-0.5 text-white/88',
            big ? 'text-[14px] md:mt-1 md:text-[16px]' : 'text-[14px]',
          )}
        >
          {facts}
        </span>
      </span>
    </a>
  );
}
