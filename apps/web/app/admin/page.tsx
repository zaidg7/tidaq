import { LogOut } from 'lucide-react';
import { Dashboard } from '@/components/admin/Dashboard';
import Link from 'next/link';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { getAdminHealth, hasServiceRole } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';
import { AdminFrame } from './AdminFrame';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Admin start page: data health and budget (C-016). C-032 adds the checkout audit. */
export default async function AdminHome({ searchParams }: Props) {
  const { email } = await requireAdmin('/admin');
  const params = await searchParams;
  const flag = (k: 'ok' | 'fail') => (typeof params[k] === 'string' ? `${k}:${params[k]}` : null);
  const budget = Number(process.env.MONTHLY_BUDGET_USD ?? 12);

  return (
    <AdminFrame wide>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto flex flex-col gap-1">
          <h1 className="text-h2">Übersicht</h1>
          <p className="text-meta text-muted-ink">Angemeldet als {email}</p>
        </div>
        <Link href="/admin/zahlen" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          Zahlen
        </Link>
        <Link href="/admin/genauigkeit" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          Genauigkeit
        </Link>
        <Link
          href="/admin/preisstuerze"
          className={buttonClasses({ variant: 'ghost', size: 'sm' })}
        >
          Price Drops für Social Media
        </Link>
        <Link href="/admin/audit" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
          Kassen-Check eintragen
        </Link>
        <form method="post" action="/admin/auth/logout">
          <Button
            type="submit"
            variant="subtle"
            size="sm"
            leading={<Icon icon={LogOut} size={16} />}
          >
            Abmelden
          </Button>
        </form>
      </div>
      {hasServiceRole() ? (
        <Dashboard
          health={await getAdminHealth()}
          monthlyBudgetUsd={Number.isFinite(budget) ? budget : 12}
          now={new Date()}
          flash={flag('fail') ?? flag('ok') ?? undefined}
        />
      ) : (
        <p className="text-muted-ink">
          Für die Übersicht fehlt hier der Service-Schlüssel (SUPABASE_SERVICE_ROLE_KEY).
        </p>
      )}
    </AdminFrame>
  );
}
