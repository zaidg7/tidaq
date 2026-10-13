import { notFound } from 'next/navigation';

/** Unknown paths inside a locale render the branded 404 (`[locale]/not-found.tsx`). */
export default function CatchAll() {
  notFound();
}
