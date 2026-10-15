import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { CreatorKit } from '@/components/admin/CreatorKit';
import { KitHeader } from '@/components/admin/KitHeader';
import { creatorKit } from '@/lib/admin/creatorKit';
import { sampleDrops } from '@/lib/dropsSample';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Preview of the creator kit (C-080c) with the sample drops. Never on production. */
export default async function DevKitPage({
  searchParams,
}: {
  searchParams: Promise<{ zeitraum?: string }>;
}) {
  await connection();
  if (process.env.APP_ENV === 'production') notFound();
  const week = (await searchParams).zeitraum === 'woche';
  const kit = await creatorKit(sampleDrops(), new Date(), week ? 'week' : 'day');
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-5 py-10 md:px-7">
      <KitHeader period={week ? 'week' : 'day'} base="/dev/admin/drops" />
      <CreatorKit items={kit.items} top={kit.top} />
    </div>
  );
}
