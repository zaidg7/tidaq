import { NextResponse } from 'next/server';
import { checkoutMarkup, toCsv } from '@tidaq/core';
import { AUDIT_EXTRAS, allTests, type AuditExtra } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/session';

/** All checkout tests as CSV for Excel or Sheets (C-032b). */
export async function GET() {
  await requireAdmin('/admin/audit');
  const tests = await allTests();
  const euro = (c: number | null) => (c === null ? null : (c / 100).toFixed(2).replace('.', ','));
  const rows = [
    [
      'ID',
      'Getestet am (UTC)',
      'Anbieter',
      'Hotel',
      'Anreise',
      'Abreise',
      'Erwachsene',
      'Preis bei Google (€)',
      'Preis an der Kasse (€)',
      'Aufschlag (%)',
      'Ergebnis',
      'Extras',
      'Notiz',
      'Screenshot',
    ],
    ...tests.map((t) => {
      const m = checkoutMarkup({ listedCents: t.listed_cents, checkoutCents: t.checkout_cents });
      return [
        t.id,
        t.tested_at,
        t.providers?.name ?? null,
        t.hotels?.name ?? null,
        t.check_in,
        t.check_out,
        t.adults,
        euro(t.listed_cents),
        euro(t.checkout_cents),
        m === null ? null : (Math.round(m * 1000) / 10).toFixed(1).replace('.', ','),
        t.outcome,
        t.extras.map((e) => AUDIT_EXTRAS[e as AuditExtra] ?? e).join(', '),
        t.notes,
        t.screenshot_path ? 'ja' : 'nein',
      ];
    }),
  ];
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="tidaq-kassen-check-${date}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
