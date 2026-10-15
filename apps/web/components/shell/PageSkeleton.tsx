import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export type SkeletonKind = 'list' | 'stay' | 'hotel' | 'drop' | 'text';

/**
 * Route loading states (PREMIUM.md §10.17): the page's real layout in shimmering blocks, same
 * widths and heights as the content that replaces it, so nothing jumps. One status line for
 * screen readers; the blocks themselves are decorative.
 */
export async function PageSkeleton({ kind }: { kind: SkeletonKind }) {
  const t = await getTranslations('loading');
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14"
    >
      <span role="status" className="sr-only">
        {t('page')}
      </span>
      {kind === 'list' && <ListSkeleton />}
      {kind === 'stay' && <StaySkeleton />}
      {kind === 'hotel' && <HotelSkeleton />}
      {kind === 'drop' && <DropSkeleton />}
      {kind === 'text' && <TextSkeleton />}
    </div>
  );
}

function Heading({ wide }: { wide?: boolean }) {
  return (
    <div className="flex max-w-[40em] flex-col gap-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton
        className={cn('h-9 lg:h-11', wide ? 'w-[min(560px,100%)]' : 'w-[min(420px,100%)]')}
      />
      <Skeleton className="h-5 w-[min(520px,100%)]" />
    </div>
  );
}

function Cards({ n = 6 }: { n?: number }) {
  return (
    <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-card border border-line bg-surface">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-2 flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Price Drops, city, all hotels, deals: heading, a chip row, a card grid. */
function ListSkeleton() {
  return (
    <>
      <Heading wide />
      <div className="mt-8 flex gap-2 overflow-hidden">
        {[88, 72, 96, 80, 64].map((w) => (
          <Skeleton key={w} className="h-10 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <Cards />
    </>
  );
}

/** Stay page: photo band, title, verdict next to the chart frame. */
function StaySkeleton() {
  return (
    <>
      <Skeleton className="aspect-[16/7] w-full rounded-panel" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-9 w-[min(460px,100%)]" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-11 w-44" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-2 h-14 w-full rounded-button" />
        </div>
        <div className="rounded-card border border-line bg-surface p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-[240px] w-full" />
        </div>
      </div>
    </>
  );
}

/** Hotel page: photo, title, a two-month calendar frame. */
function HotelSkeleton() {
  return (
    <>
      <Skeleton className="aspect-[16/7] w-full rounded-panel" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-9 w-[min(460px,100%)]" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="mt-8 grid gap-8 rounded-card border border-line bg-surface p-6 md:grid-cols-2">
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

/** Drop page: big photo, the number, the facts. */
function DropSkeleton() {
  return (
    <div className="mx-auto max-w-[720px]">
      <Skeleton className="aspect-[4/3] w-full rounded-panel" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-14 w-40" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="mt-4 h-14 w-full rounded-button" />
      </div>
    </div>
  );
}

/** Provider and other text pages. */
function TextSkeleton() {
  return (
    <>
      <Heading />
      <div className="mt-10 flex max-w-[40em] flex-col gap-3">
        {[100, 96, 92, 98, 70].map((w) => (
          <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </>
  );
}
