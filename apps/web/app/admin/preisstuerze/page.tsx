import { CreatorKit } from '@/components/admin/CreatorKit';
import { KitHeader } from '@/components/admin/KitHeader';
import { Card } from '@/components/ui/Card';
import { creatorKit } from '@/lib/admin/creatorKit';
import { requireAdmin } from '@/lib/admin/session';
import { getDrops } from '@/lib/data/drops';
import { berlinToday } from '@/lib/today';
import { AdminFrame } from '../AdminFrame';

/** Creator kit (C-080c): today's drops as story images and captions for TikTok and Instagram. */
export default async function DropsKitPage() {
  await requireAdmin('/admin/preisstuerze');
  const load = await getDrops(berlinToday());
  const kit = load.kind === 'ok' ? await creatorKit(load.drops, new Date()) : null;
  return (
    <AdminFrame wide>
      <KitHeader />
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
