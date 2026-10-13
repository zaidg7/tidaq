import { formatDateRange, formatPrice } from '@tidaq/core';
import { deleteAuditTestAction } from '@/app/admin/actions';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AUDIT_EXTRAS, type AuditExtra, type AuditTest } from '@/lib/admin/audit';

const OUTCOME: Record<string, { label: string; tone: BadgeTone }> = {
  match: { label: 'Stimmt', tone: 'good' },
  lower: { label: 'Günstiger', tone: 'good' },
  higher: { label: 'Teurer', tone: 'bad' },
  unavailable: { label: 'Nicht buchbar', tone: 'warn' },
};

const price = (c: number) => formatPrice(c, 'de');

/** The latest checkout tests with their result and a delete button (C-032). */
export function AuditList({ tests }: { tests: AuditTest[] }) {
  return (
    <>
      {tests.length === 0 ? (
        <p className="mt-2 text-muted-ink">Noch keine Tests.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {tests.map((t) => {
            const outcome = OUTCOME[t.outcome] ?? {
              label: t.outcome,
              tone: 'neutral' as const,
            };
            return (
              <li key={t.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                    {t.providers?.name ?? `Anbieter ${t.provider_id}`}
                    <Badge tone={outcome.tone}>{outcome.label}</Badge>
                  </p>
                  <p className="text-meta text-muted-ink">
                    {t.hotels?.name} · {formatDateRange(t.check_in, t.check_out, 'de')} · {t.adults}{' '}
                    Erw.
                  </p>
                  <p className="text-meta mt-0.5 tabular-nums">
                    {price(t.listed_cents)} →{' '}
                    {t.checkout_cents === null ? 'nicht buchbar' : price(t.checkout_cents)}
                  </p>
                  {t.extras.length > 0 && (
                    <p className="text-meta text-muted-ink">
                      {t.extras.map((e) => AUDIT_EXTRAS[e as AuditExtra] ?? e).join(' · ')}
                    </p>
                  )}
                </div>
                <form action={deleteAuditTestAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label={`Test ${t.id} löschen`}
                  >
                    Löschen
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
