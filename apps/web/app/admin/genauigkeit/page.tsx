import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { bySite, getAccuracy, type AccuracyRow } from '@/lib/admin/accuracy';
import { hasServiceRole } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';
import { AdminFrame } from '../AdminFrame';

export const dynamic = 'force-dynamic';

const pct = (v: number | null) =>
  v === null ? '–' : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(v)} %`;
const share = (k: number, n: number) => (n > 0 ? pct((k / n) * 100) : '–');
const day = (iso: string) =>
  new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));

function Rows({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 lg:-mx-6 lg:px-6" tabIndex={0}>
      <table className="w-full text-left text-[14px] tabular-nums">
        <thead className="text-meta whitespace-nowrap text-muted-ink">
          <tr className="border-b border-line">
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`py-2 pr-3 font-semibold ${i > 0 ? 'text-right' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {r.map((c, j) => (
                <td key={j} className={`py-2 pr-3 ${j > 0 ? 'text-right' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Report({ rows }: { rows: AccuracyRow[] }) {
  if (rows.length === 0)
    return (
      <p className="text-muted-ink">
        Noch keine Paare: es braucht exakte Preise (DataForSEO) und einen Live-Check derselben Reise
        innerhalb von 6 Stunden.
      </p>
    );
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3">Je Buchungsseite, 14 Tage</h2>
        <Rows
          head={['Seite', 'Paare', 'bis 5 % daneben', 'bis 10 % daneben']}
          rows={bySite(rows).map((s) => [
            s.provider,
            String(s.pairs),
            share(s.within5, s.pairs),
            share(s.within10, s.pairs),
          ])}
        />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3">Pro Tag und Seite</h2>
        <p className="text-meta text-muted-ink">
          Faktor = exakter Preis ÷ unser berechneter Preis (1,00 = genau). Abweichung = Median des
          Abstands.
        </p>
        <Rows
          head={['Tag', 'Seite', 'Paare', 'Faktor', 'Abweichung', 'bis 5 %']}
          rows={rows.map((r) => [
            day(r.day),
            r.provider,
            String(r.pairs),
            r.median_ratio === null
              ? '–'
              : new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(r.median_ratio),
            pct(r.median_abs_pct),
            share(r.within_5, r.pairs),
          ])}
        />
      </Card>
    </div>
  );
}

/** How close our calculated prices are to the sites' exact prices (C-182). */
export default async function AccuracyPage() {
  await requireAdmin('/admin/genauigkeit');
  const load = hasServiceRole() ? await getAccuracy(14) : null;
  return (
    <AdminFrame wide>
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-meta font-semibold text-accent">
          ← Übersicht
        </Link>
        <h1 className="text-h2">Genauigkeit</h1>
        <p className="text-muted-ink">
          Unser berechneter Preis (Grundpreis × Steuerfaktor des Hotels) gegen den exakten Preis der
          Seite für dieselbe Reise.
        </p>
      </div>
      {load === null && (
        <p className="text-muted-ink">
          Hier fehlt der Service-Schlüssel (SUPABASE_SERVICE_ROLE_KEY).
        </p>
      )}
      {load?.kind === 'missing' && (
        <p className="text-muted-ink">
          Die Datenbank kennt die Auswertung noch nicht (Migration C-182).
        </p>
      )}
      {load?.kind === 'error' && (
        <p className="text-muted-ink">
          Die Werte ließen sich gerade nicht laden. Lad die Seite neu.
        </p>
      )}
      {load?.kind === 'ok' && <Report rows={load.rows} />}
    </AdminFrame>
  );
}
