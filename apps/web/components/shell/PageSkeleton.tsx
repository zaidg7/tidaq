import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export type SkeletonKind = 'list' | 'stay' | 'hotel' | 'drop' | 'text';

/**
 * Route loading states (PREMIUM.md §10.17): the page's real layout in shimmering blocks, same
 * widths and heights as the content that replaces it, so nothing jumps. Photo pages (drop, hotel,
 * stay) start with the full-bleed photo block and the sheet over it; lists with the big title and
 * the photo tiles. One status line for screen readers; the blocks themselves are decorative.
 */
export async function PageSkeleton({ kind }: { kind: SkeletonKind }) {
  const t = await getTranslations('loading');
  // The stay page has a compact header since C-174: no photo block.
  const photo = kind === 'hotel' || kind === 'drop';
  return (
    <div aria-busy="true" className="w-full">
      <span role="status" className="sr-only">
        {t('page')}
      </span>
      {photo ? (
        <>
          <Skeleton className="-mt-16 h-[400px] w-full rounded-none md:h-[480px] lg:-mt-[76px] lg:h-[540px]" />
          <div className="photo-sheet relative -mt-7 bg-bg md:-mt-12">
            <div className="mx-auto max-w-[1240px] px-[18px] pt-[26px] pb-16 md:px-10 md:pt-10">
              <SheetHead />
              {kind === 'drop' && <DropBody />}
              {kind === 'hotel' && <HotelBody />}
            </div>
          </div>
        </>
      ) : (
        <div className="mx-auto max-w-[1240px] px-[18px] pt-6 pb-16 md:px-10 md:pt-12">
          {kind === 'stay' && <StayHead />}
          {kind === 'stay' && <StayBody />}
          {kind === 'list' && <ListSkeleton />}
          {kind === 'text' && <TextSkeleton />}
        </div>
      )}
    </div>
  );
}

/** Place line, the name, the chips: the top of every photo page's sheet. */
function SheetHead() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-9 w-[min(480px,100%)] md:h-12" />
      <div className="flex gap-2">
        {[88, 72, 104].map((w) => (
          <Skeleton key={w} className="h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

function PageTitle() {
  return (
    <div className="flex max-w-[820px] flex-col gap-4">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="h-10 w-[min(560px,100%)] md:h-14" />
      <Skeleton className="h-5 w-[min(620px,100%)]" />
    </div>
  );
}

/** Photo tiles: 4:3 photo, name, one line, the price. */
function Tiles({ n = 6 }: { n?: number }) {
  return (
    <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/3] w-full rounded-card" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-28" />
        </li>
      ))}
    </ul>
  );
}

/** Price Drops, city, all hotels, deals: title, a chip row, the tiles. */
function ListSkeleton() {
  return (
    <>
      <PageTitle />
      <div className="mt-8 flex gap-2 overflow-hidden">
        {[96, 80, 104, 88, 72, 92].map((w) => (
          <Skeleton key={w} className="h-10 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <Tiles />
    </>
  );
}

/** The white card with the number, the price and the button (drop card, verdict). */
function NumberCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[26px] border border-[#ece9f1] bg-surface p-6">
      <Skeleton className="h-8 w-44 rounded-full" />
      <Skeleton className="h-16 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-3/4" />
    </div>
  );
}

function DropBody() {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_380px] md:gap-12">
      <div className="order-2 flex flex-col gap-4 md:order-1">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-[220px] w-full rounded-card" />
        <Skeleton className="mt-4 h-3.5 w-full rounded-full" />
      </div>
      <div className="order-1 md:order-2">
        <NumberCard />
        <Skeleton className="mt-4 h-[60px] w-full rounded-[18px]" />
      </div>
    </div>
  );
}

function HotelBody() {
  return (
    <>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 md:gap-5">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[150px] rounded-card" />
        ))}
      </div>
      <div className="mt-10 grid gap-8 rounded-panel border border-[#ece9f1] bg-surface p-6 md:grid-cols-2">
        {[0, 1].map((m) => (
          <div key={m} className={cn(m === 1 && 'hidden md:block')}>
            <Skeleton className="mx-auto h-6 w-36" />
            <div className="mt-4 grid grid-cols-7 gap-[3px]">
              {Array.from({ length: 35 }, (_, i) => (
                <Skeleton key={i} className="h-[52px] rounded-cell" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Small photo, place line and name, the dates line (the stay page's compact header). */
function StayHead() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-[14px] md:size-[72px] md:rounded-[18px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-[min(420px,100%)] md:h-10" />
        </div>
      </div>
      <Skeleton className="h-11 w-[min(340px,100%)] rounded-[14px]" />
    </div>
  );
}

function StayBody() {
  return (
    <div className="mt-8 grid gap-6 rounded-panel border border-[#ece9f1] bg-surface p-6 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-3.5 w-full rounded-full" />
      </div>
      <Skeleton className="h-[240px] w-full" />
    </div>
  );
}

/** Provider and other text pages. */
function TextSkeleton() {
  return (
    <>
      <PageTitle />
      <div className="mt-12 flex max-w-[680px] flex-col gap-3 lg:ml-[320px]">
        {[100, 96, 92, 98, 70].map((w) => (
          <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </>
  );
}
