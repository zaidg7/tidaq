import { notFound } from 'next/navigation';

/** Unknown admin paths render the admin 404, not the public one. */
export default function AdminCatchAll() {
  notFound();
}
