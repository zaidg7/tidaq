import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Photo } from '@/components/ui/Photo';
import { cardPhoto } from '@/lib/photos';
import { cn } from '@/lib/cn';

/**
 * A hotel as a photo card (mockup B language, like the drop tiles): the photo is the card (4:3,
 * radius 22, "Stadtbild" when the city's photo stands in), the name below it links to the hotel,
 * and `children` add the facts (cheapest weekend, a stay's total). Nested links in `children`
 * need `relative z-[1]` to sit above the card link.
 */
export function HotelPhotoCard({
  slug,
  name,
  citySlug,
  href,
  sub,
  children,
  sizes = '(min-width: 1240px) 390px, (min-width: 768px) 33vw, 100vw',
  className,
}: {
  slug: string;
  name: string;
  citySlug: string;
  href: string;
  /** One muted line under the name ("Paris"). */
  sub?: ReactNode;
  children?: ReactNode;
  sizes?: string;
  className?: string;
}) {
  const tp = useTranslations('photo');
  const pic = cardPhoto(slug, citySlug);
  return (
    <article
      className={cn('tile-zoom group relative flex h-full flex-col gap-3 md:gap-4', className)}
    >
      <Photo
        photo={pic?.photo ?? null}
        alt=""
        sizes={sizes}
        className="aspect-[4/3] rounded-card"
        tag={pic?.city ? tp('cityTag') : undefined}
      />
      <div className="flex flex-1 flex-col px-0.5">
        <h3 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.01em]">
          <a href={href} className="after:absolute after:inset-0 group-hover:text-accent">
            {name}
          </a>
        </h3>
        {sub && <p className="mt-0.5 text-[15px] text-muted">{sub}</p>}
        {children}
      </div>
    </article>
  );
}
