import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';
import { AdminFrame } from './AdminFrame';

export default function AdminNotFound() {
  return (
    <AdminFrame>
      <h1 className="text-h3">Diese Admin-Seite gibt es nicht.</h1>
      <Link href="/admin" className={buttonClasses({ variant: 'subtle' })}>
        Zur Übersicht
      </Link>
    </AdminFrame>
  );
}
