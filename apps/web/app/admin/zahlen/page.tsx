import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { hasServiceRole } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';
import { getTraffic, totals, type Traffic } from '@/lib/admin/traffic';
import { AdminFrame } from '../AdminFrame';

export const dynamic = 'force-dynamic';

const PLATFORM: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram' };
const SOURCE: Record<string, string> = {
  none: 'Direkt / Suche',
  tiktok: 'TikTok (Bio-Link)',
  instagram: 'Instagram (Bio-Link)',
  youtube: 'YouTube (Bio-Link)',
};

const int = new Intl.NumberFormat('de-DE');
const pct = (v: number | null) =>
  v === null
    ? '–'
    : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(v * 100)} %`;
const day = (iso: string) =>
  new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));

function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-muted-ink">{empty}</p>;
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

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-meta text-muted-ink">{label}</span>
      <span className="text-h2 tabular-nums">{value}</span>
      {note && <span className="text-meta text-muted-ink">{note}</span>}
    </Card>
  );
}

function Numbers({ t }: { t: Traffic }) {
  const week = totals(t, 7);
  const all = totals(t, t.days.length);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Seitenaufrufe, 7 Tage" value={int.format(week.visits)} />
        <Stat label="Klicks zu Partnern, 7 Tage" value={int.format(week.clicks)} />
        <Stat label="Klickrate, 7 Tage" value={pct(week.rate)} note="Klicks je Seitenaufruf" />
        <Stat label="Klicks, 14 Tage" value={int.format(all.clicks)} />
      </div>
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3">Gepostete Videos</h2>
        <p className="text-meta text-muted-ink">
          Aufrufe und Klicks für das Hotel des Videos am Tag des Posts und den 2 Tagen danach.
          Markiere Posts unter „Price Drops für Social Media“ als gepostet.
        </p>
        <Table
          head={['Gepostet', 'Plattform', 'Hotel', 'Drop', 'Aufrufe', 'Klicks']}
          empty="Noch kein Video als gepostet markiert."
          rows={t.posted.map((p) => [
            day(p.posted_on),
            PLATFORM[p.platform] ?? p.platform,
            p.name,
            `−${Math.round(p.drop_pct * 100)} %`,
            int.format(p.views_3d),
            int.format(p.clicks_3d),
          ])}
        />
      </Card>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3">Quellen</h2>
          <Table
            head={['Quelle', 'Besuche', 'Klicks']}
            empty="Noch keine Besuche gezählt."
            rows={t.refs.map((r) => [
              SOURCE[r.ref] ?? r.ref,
              int.format(r.visits),
              int.format(r.clicks),
            ])}
          />
          <p className="text-meta text-muted-ink">Besuche = Aufrufe der Price-Drop-Seiten.</p>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3">Klicks je Buchungsseite</h2>
          <Table
            head={['Seite', 'Klicks']}
            empty="Noch keine Klicks."
            rows={t.providers.map((p) => [p.provider ?? '–', int.format(p.clicks)])}
          />
        </Card>
      </div>
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3">Pro Tag</h2>
        <Table
          head={['Tag', 'Aufrufe', 'Radar', 'Drop-Seiten', 'Aufenthalte', 'Klicks']}
          empty="Noch keine Aufrufe."
          rows={t.days.map((d) => [
            day(d.day),
            int.format(d.views),
            int.format(d.radar),
            int.format(d.drop_pages),
            int.format(d.stays),
            int.format(d.clicks),
          ])}
        />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3">Hotels mit den meisten Klicks</h2>
        <Table
          head={['Hotel', 'Aufrufe', 'Klicks']}
          empty="Noch keine Klicks."
          rows={t.hotels.map((h) => [
            h.name ?? h.slug ?? '–',
            int.format(h.views),
            int.format(h.clicks),
          ])}
        />
      </Card>
    </div>
  );
}

/** Visits, partner clicks and posted videos of the last 14 days (C-180). */
export default async function NumbersPage() {
  await requireAdmin('/admin/zahlen');
  const load = hasServiceRole() ? await getTraffic(14) : null;
  return (
    <AdminFrame wide>
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-meta font-semibold text-accent">
          ← Übersicht
        </Link>
        <h1 className="text-h2">Zahlen</h1>
        <p className="text-muted-ink">
          Letzte 14 Tage. Alles anonym gezählt: welche Seite, welche Quelle, welcher Partner, nie
          wer.
        </p>
      </div>
      {load === null && (
        <p className="text-muted-ink">
          Hier fehlt der Service-Schlüssel (SUPABASE_SERVICE_ROLE_KEY).
        </p>
      )}
      {load?.kind === 'missing' && (
        <p className="text-muted-ink">
          Die Datenbank kennt die Auswertung noch nicht (Migration C-180).
        </p>
      )}
      {load?.kind === 'error' && (
        <p className="text-muted-ink">
          Die Zahlen ließen sich gerade nicht laden. Lad die Seite neu.
        </p>
      )}
      {load?.kind === 'ok' && <Numbers t={load.data} />}
    </AdminFrame>
  );
}
