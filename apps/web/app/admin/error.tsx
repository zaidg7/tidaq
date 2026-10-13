'use client';

import { Button } from '@/components/ui/Button';
import { AdminFrame } from './AdminFrame';

/** Supabase Auth unreachable or another server error on an admin page. */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <AdminFrame>
      <h1 className="text-h3">Das hat nicht geklappt.</h1>
      <p className="text-muted-ink">
        Die Seite konnte gerade nicht geladen werden (Supabase nicht erreichbar?). Versuch es in
        einer Minute noch mal.
      </p>
      <Button variant="subtle" onClick={reset}>
        Noch mal versuchen
      </Button>
    </AdminFrame>
  );
}
