import { CreatorKit } from '@/components/admin/CreatorKit';
import { KitHeader } from '@/components/admin/KitHeader';
import { Card } from '@/components/ui/Card';
import { creatorKit } from '@/lib/admin/creatorKit';
import { postedMarks } from '@/lib/admin/posted';
import { requireAdmin } from '@/lib/admin/session';
import { getDrops, getWeek } from '@/lib/data/drops';
import { berlinToday } from '@/lib/today';
import { AdminFrame } from '../AdminFrame';

type Props = { searchParams: Promise<{ zeitraum?: string; ok?: string; fail?: string }> };

/**
 * Creator kit (C-080c): today's drops, or the week's (`?zeitraum=woche`, C-080h), as story images
 * and captions for TikTok and Instagram.
 */
export default async function DropsKitPage({ searchParams }: Props) {
  await requireAdmin('/admin/preisstuerze');
  const q = await searchParams;
  const week = q.zeitraum === 'woche';
  const today = berlinToday();
  const marks = await postedMarks(today);
  let kit: Awaited<ReturnType<typeof creatorKit>> | null = null;
  if (week) {
    const load = await getWeek(today);
    if (load.kind === 'ok') kit = await creatorKit(load.groups, new Date(), 'week', marks);
  } else {
    const load = await getDrops(today);
    if (load.kind === 'ok') kit = await creatorKit(load.drops, new Date(), 'day', marks);
  }
  return (
    <AdminFrame wide>
      <KitHeader period={week ? 'week' : 'day'} />
      {(q.ok === 'posted' || q.fail === 'posted') && (
        <p role="status" className="text-[15px] font-semibold">
          {q.ok === 'posted'
            ? 'Gespeichert. Gepostete Price Drops stehen eine Woche lang unter „Aus unseren Videos“ auf tidaq.com/tiktok, /instagram und /youtube.'
            : 'Das hat nicht geklappt. Der Price Drop ist vielleicht nicht mehr auf dem Radar. Lad die Seite neu.'}
        </p>
      )}
      {kit === null ? (
        <Card>Die Price Drops lassen sich gerade nicht laden. Lad die Seite gleich neu.</Card>
      ) : kit.items.length === 0 ? (
        <Card>
          Heute gibt es noch keinen Price Drop. Die Preise werden über den Tag abgefragt, schau
          später noch mal rein.
        </Card>
      ) : (
        <CreatorKit items={kit.items} top={kit.top} />
      )}
    </AdminFrame>
  );
}
