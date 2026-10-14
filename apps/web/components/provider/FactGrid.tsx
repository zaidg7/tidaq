import { cn } from '@/lib/cn';

export interface Fact {
  label: string;
  value: string;
  hint?: string;
}

/**
 * Key numbers as a definition list (C-034): label, large tabular value, an optional hint that
 * says what was counted. Two columns on phones, `cols` from `sm` up.
 */
export function FactGrid({
  facts,
  label,
  cols = 2,
  className,
}: {
  facts: Fact[];
  /** Accessible name of the list. */
  label?: string;
  cols?: 2 | 4;
  className?: string;
}) {
  return (
    <dl
      aria-label={label}
      className={cn('grid grid-cols-2 gap-x-5 gap-y-6', cols === 4 && 'lg:grid-cols-4', className)}
    >
      {facts.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-[12.5px] font-semibold text-muted-ink">{f.label}</dt>
          <dd className="flex flex-col gap-0.5">
            <span className="text-[24px] leading-tight font-extrabold tracking-[-0.01em] tabular-nums">
              {f.value}
            </span>
            {f.hint && <span className="text-[12.5px] leading-snug text-muted-ink">{f.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
