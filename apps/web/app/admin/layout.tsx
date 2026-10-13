import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { jakarta } from '@/lib/fonts';
import '../globals.css';

/**
 * Root layout of the admin area: outside `[locale]` (Zaid only, German, no public shell),
 * never indexed. Admin copy is German and lives here, not in next-intl (not user-facing).
 */
// Every admin page reads the session cookies per request; never prerender one.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tidaq Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <main id="inhalt" className="flex flex-1 flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
