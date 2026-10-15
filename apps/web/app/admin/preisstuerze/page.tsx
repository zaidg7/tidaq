import { CreatorKit } from '@/components/admin/CreatorKit';
import { KitHeader } from '@/components/admin/KitHeader';
import { Card } from '@/components/ui/Card';
import { creatorKit } from '@/lib/admin/creatorKit';
import { requireAdmin } from '@/lib/admin/session';
import { getDrops, getWeek } from '@/lib/data/drops';
import { berlinToday } from '@/lib/today';
import { AdminFrame } from '../AdminFrame';

type Props = { searchParams: Promise<{ zeitraum?: string }> };

/**
 * Creator kit (C-080c): today's drops, or the week's (`?zeitraum=woche`, C-080h), as story images
 * and captions for TikTok and Instagram.
 */
export default async function DropsKitPage({ searchParams }: Props) {
  await requireAdmin('/admin/preisstuerze');
  const week = (await searchParams).zeitraum === 'woche';
  const today = berlinToday();
  let kit: Awaited<ReturnType<typeof creatorKit>> | null = null;
  if (week) {
    const load = await getWeek(today);
    if (load.kind === 'ok') kit = await creatorKit(load.groups, new Date(), 'week');
  } else {
    const load = await getDrops(today);
    if (load.kind === 'ok') kit = await creatorKit(load.drops, new Date());
  }
  return (
    <AdminFrame wide>
      <KitHeader period={week ? 'week' : 'day'} />
      {kit === null ? (
        <Card>Die Preisstürze lassen sich gerade nicht laden. Lad die Seite gleich neu.</Card>
      ) : kit.items.length === 0 ? (
        <Card>
          Heute gibt es noch keinen Preissturz. Die Preise werden über den Tag abgefragt, schau
          später noch mal rein.
        </Card>
      ) : (
        <CreatorKit items={kit.items} top={kit.top} />
      )}
    </AdminFrame>
  );
}
