import Link from 'next/link';
import { AuditForm } from '@/components/admin/AuditForm';
import { AuditList } from '@/components/admin/AuditList';
import { Card } from '@/components/ui/Card';
import { auditOptions, getTest, recentTests } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/session';
import { berlinToday } from '@/lib/today';
import { AdminFrame } from '../AdminFrame';

const FLASH: Record<string, { ok: boolean; text: string }> = {
  'ok:audit': { ok: true, text: 'Test gespeichert. Der Score des Anbieters ist aktualisiert.' },
  'ok:auditDelete': { ok: true, text: 'Test gelöscht. Der Score ist neu berechnet.' },
  'ok:auditEdit': { ok: true, text: 'Änderung gespeichert. Der Score ist neu berechnet.' },
  'fail:auditEdit': {
    ok: false,
    text: 'Änderung nicht gespeichert. Prüf die Preise und den Screenshot (höchstens 5 MB).',
  },
  'fail:audit': {
    ok: false,
    text: 'Nicht gespeichert. Prüf die Preise (z. B. 1.184 oder 1.184,50), die Daten und den Screenshot (höchstens 5 MB).',
  },
  'fail:auditDelete': { ok: false, text: 'Löschen hat nicht geklappt. Versuch es noch mal.' },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Kassen-Check entry (C-032): one test per form, the latest 20 below. */
export default async function AuditPage({ searchParams }: Props) {
  await requireAdmin('/admin/audit');
  const params = await searchParams;
  const flag = (k: 'ok' | 'fail') => (typeof params[k] === 'string' ? `${k}:${params[k]}` : null);
  const notice = FLASH[flag('fail') ?? flag('ok') ?? ''];
  const editId = typeof params.edit === 'string' ? Number(params.edit) : NaN;
  const [{ hotels, providers }, tests, editing] = await Promise.all([
    auditOptions(),
    recentTests(),
    Number.isSafeInteger(editId) && editId > 0 ? getTest(editId) : Promise.resolve(null),
  ]);

  return (
    <AdminFrame wide>
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-meta font-semibold text-accent">
          ← Übersicht
        </Link>
        <h1 className="text-h2">Kassen-Check</h1>
        <p className="text-muted-ink">
          Preis bei Google Hotels und Endpreis an der Kasse, kurz vor dem Bezahlen. Nie buchen, nie
          Zahldaten eingeben.
        </p>
      </div>
      {notice && (
        <p
          role="status"
          className={
            notice.ok
              ? 'rounded-cell bg-good-soft px-4 py-3 text-[14px] font-semibold text-good-ink'
              : 'rounded-cell bg-bad-soft px-4 py-3 text-[14px] font-semibold text-bad-ink'
          }
        >
          {notice.text}
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card variant="float">
          <h2 className="text-h3 mb-4">
            {editing ? `Test ${editing.id} bearbeiten` : 'Neuer Test'}
          </h2>
          <AuditForm
            key={editing?.id ?? 'new'}
            hotels={hotels}
            providers={providers}
            today={berlinToday()}
            initial={editing ?? undefined}
          />
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h3">Letzte Tests</h2>
            <a href="/admin/audit/export" className="text-meta font-semibold text-accent" download>
              Alle als CSV
            </a>
          </div>
          <AuditList tests={tests} />
        </Card>
      </div>
    </AdminFrame>
  );
}
