import type { ReactNode } from 'react';
import { Photo } from '@/components/ui/Photo';
import type { HotelPhoto } from '@/lib/hotelPhotos';

/**
 * A page header on a full-bleed photo (mockup B, the homepage hero's language for city and other
 * landing pages): the navbar turns white on it (`data-photo-hero`), a scrim darkens top and
 * bottom, and the eyebrow, the title and one line sit bottom-left in white. `tag` is the photo
 * credit or "Stadtbild", bottom-right.
 */
export function PhotoHero({
  photo,
  alt,
  eyebrow,
  title,
  lead,
  tag,
  children,
}: {
  photo: HotelPhoto | null;
  alt: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  tag?: ReactNode;
  /** Under the lead, still on the photo (chips, a link). */
  children?: ReactNode;
}) {
  return (
    <section data-photo-hero className="relative -mt-16 lg:-mt-[76px]">
      <Photo
        photo={photo}
        alt={alt}
        sizes="100vw"
        priority
        className="h-[440px] bg-[#2a2620] md:h-[520px] lg:h-[560px]"
        tag={tag}
        tagSide="right"
      >
        <div aria-hidden="true" className="hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-9 md:bottom-16">
          <div className="photo-text mx-auto max-w-[1240px] px-[18px] text-white md:px-10">
            {eyebrow && (
              <p className="hero-rise mb-3 text-[14px] font-medium text-white/85 md:mb-4 md:text-[15px]">
                {eyebrow}
              </p>
            )}
            <h1 className="hero-rise max-w-[900px] text-[40px] leading-[1.04] font-[650] tracking-[-0.04em] md:text-[60px] lg:text-[68px] lg:leading-[1.02]">
              {title}
            </h1>
            {lead && (
              <p className="hero-rise-2 mt-3 max-w-[620px] text-[17px] leading-[1.45] text-white/92 md:mt-4 md:text-[20px]">
                {lead}
              </p>
            )}
            {children && <div className="hero-rise-3 mt-5">{children}</div>}
          </div>
        </div>
      </Photo>
    </section>
  );
}
