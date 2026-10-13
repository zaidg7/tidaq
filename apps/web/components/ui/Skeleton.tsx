import { cn } from '@/lib/cn';

/**
 * Loading placeholder (CRAFT.md §3 Skeleton): `--neutral-soft` blocks in the final geometry,
 * a calm 1.4 s pulse, static under reduced motion. Decorative: the page announces loading.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('skeleton block rounded-[8px] bg-neutral-soft', className)}
    />
  );
}

/** The verdict block while its data loads: same rhythm as `VerdictBlock`. */
export function VerdictSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col gap-4', className)}>
      <Skeleton className="h-7 w-32 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-44 lg:h-11" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

/** The chart while loading: never a fake line, only the axis and a dashed baseline. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('relative h-[256px] pt-9 md:h-[296px]', className)}>
      <div className="relative h-full">
        <span className="absolute inset-x-0 bottom-[14%] border-t-[1.5px] border-dashed border-line-strong" />
        <div className="absolute inset-x-0 bottom-0 flex justify-between">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
      </div>
    </div>
  );
}
