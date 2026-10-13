import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { AuditForm } from '@/components/admin/AuditForm';
import { AuditList } from '@/components/admin/AuditList';
import { Dashboard } from '@/components/admin/Dashboard';
import { Card } from '@/components/ui/Card';
import { adminHealthFixture, auditOptionsFixture, auditTestsFixture } from '@/lib/admin/fixture';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Preview of the admin dashboard (C-016) and the Kassen-Check form (C-032) with made-up data, for screenshots and design review.
 * Never on production; the buttons still need an admin session to do anything.
 */
export default async function DevAdminPage() {
  await connection();
  if (process.env.APP_ENV === 'production') notFound();
  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10 md:px-7">
      <Dashboard
        health={adminHealthFixture}
        monthlyBudgetUsd={12}
        now={new Date('2026-10-13T12:00:00Z')}
        flash="ok:provider"
      />
      <section
        id="kassen-check"
        className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
      >
        <Card variant="float">
          <h2 className="text-h3 mb-4">Neuer Test</h2>
          <AuditForm {...auditOptionsFixture} today="2026-10-13" />
        </Card>
        <Card>
          <h2 className="text-h3">Letzte Tests</h2>
          <AuditList tests={auditTestsFixture} />
        </Card>
      </section>
    </div>
  );
}
