import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { requireAdmin } from '@/lib/admin/session';
import { AdminFrame } from './AdminFrame';

/** Admin start page. C-016 adds data health and budget, C-032 the checkout audit. */
export default async function AdminHome() {
  const { email } = await requireAdmin('/admin');

  return (
    <AdminFrame wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2">Übersicht</h1>
          <p className="text-meta text-muted-ink">Angemeldet als {email}</p>
        </div>
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
      <Card className="flex flex-col gap-2">
        <h2 className="text-title">Kommt als Nächstes</h2>
        <p className="text-muted-ink">
          Datenqualität und Budget (C-016), Kassen-Check (C-032), Hotelkatalog.
        </p>
      </Card>
    </AdminFrame>
  );
}
