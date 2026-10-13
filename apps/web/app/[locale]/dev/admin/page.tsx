import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Dashboard } from '@/components/admin/Dashboard';
import { adminHealthFixture } from '@/lib/admin/fixture';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Preview of the admin dashboard (C-016) with made-up data, for screenshots and design review.
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
    </div>
  );
}
