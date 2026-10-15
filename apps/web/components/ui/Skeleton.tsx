import { cn } from '@/lib/cn';

/**
 * Loading placeholder (PREMIUM.md §6, §10.17): `--surface-2` blocks in the final geometry with a
 * soft shimmer sweep (1.4 s), static under reduced motion. Decorative: the page announces loading.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('skeleton block rounded-input', className)} />;
}

/** The verdict block while its data loads: same geometry as `VerdictBlock`. */
export function VerdictSkeleton({ className, label }: { className?: string; label: string }) {
  return (
    <div aria-busy="true" className={cn('flex flex-col gap-4', className)}>
      <span role="status" className="sr-only">
        {label}
      </span>
      <Skeleton className="h-7 w-32 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[38px] w-44 lg:h-11" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-3.5 w-60 max-w-full" />
    </div>
  );
}

/**
 * The chart while loading, in its final geometry (readout row, gutter labels, plot, legend row).
 * Never a fake line: the plot is an empty field with a dashed baseline.
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col', className)}>
      <div className="relative h-[256px] pt-9 md:h-[296px]">
        <div className="relative flex h-full gap-3">
          <div className="flex w-10 flex-col justify-around pb-[14%]">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-x-0 top-[8%] bottom-[14%] rounded-cell border-b-[1.5px] border-dashed border-line-strong bg-surface-2" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-between">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>
  );
}
