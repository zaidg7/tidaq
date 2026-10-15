'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { photoSrcSet, type HotelPhoto } from '@/lib/hotelPhotos';

type Props = {
  /** The self-hosted photo; null renders the quiet placeholder (never a colour wash). */
  photo: HotelPhoto | null;
  /** "<Hotel> in <Stadt>: <what's in it>" (PREMIUM.md §7.3). Empty only for decorative copies. */
  alt: string;
  /** `sizes` for the srcset, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string;
  /** The page's main image: loads first (no lazy loading, high fetch priority). */
  priority?: boolean;
  /** Wrapper classes: aspect ratio, radius, size. The image always covers the wrapper. */
  className?: string;
  /** Small tag in the bottom corner: the photo credit or "Stadtbild". */
  tag?: ReactNode;
  /** Which bottom corner the tag sits in (cards: left, headers: right). */
  tagSide?: 'left' | 'right';
  /** Overlays on top of the photo (badges, buttons, scrims). */
  children?: ReactNode;
};

/**
 * Every hotel and city photo goes through this (PREMIUM.md §7.3, §11): right size from the srcset,
 * blurred preview first, then the real image fades in (400 ms), cropped around its focal point.
 * Without JavaScript the image just shows: it starts hidden only when scripts run (globals.css).
 */
export function Photo({
  photo,
  alt,
  sizes,
  priority,
  className,
  tag,
  tagSide = 'left',
  children,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const base = photo ? (photo[960] ?? photo[160]) : null;

  return (
    <div
      className={cn('relative isolate overflow-hidden bg-placeholder', className)}
      style={
        photo?.lqip
          ? { backgroundImage: `url("${photo.lqip}")`, backgroundSize: 'cover' }
          : undefined
      }
    >
      {photo && base && (
        // eslint-disable-next-line @next/next/no-img-element -- self-hosted WebP with our own srcset
        <img
          src={base.src}
          srcSet={photoSrcSet(photo)}
          sizes={sizes}
          alt={alt}
          width={base.width}
          height={base.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          ref={(img) => {
            // Cached images can finish before React attaches onLoad.
            if (img?.complete && !loaded) setLoaded(true);
          }}
          onLoad={() => setLoaded(true)}
          data-loaded={loaded || undefined}
          className="photo-img absolute inset-0 -z-10 size-full object-cover"
          style={photo.focus ? { objectPosition: photo.focus } : undefined}
        />
      )}
      {children}
      {tag && (
        <span
          className={cn(
            'absolute bottom-3 z-10 inline-flex h-5 max-w-[calc(100%-24px)] items-center truncate rounded-tag bg-[rgba(21,19,28,0.5)] px-2 text-[11px] text-white',
            tagSide === 'left' ? 'left-3.5' : 'right-3.5',
          )}
        >
          {tag}
        </span>
      )}
    </div>
  );
}
