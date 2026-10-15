import Link from 'next/link';
import { ChipLink } from '@/components/ui/Chip';

/** Title and house rules of the creator kit (C-080c), also on its dev preview. */
export function KitHeader({
  period = 'day',
  base = '/admin/preisstuerze',
}: {
  period?: 'day' | 'week';
  /** The page these tabs belong to (the dev preview has its own path). */
  base?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Link href="/admin" className="text-meta font-semibold text-accent">
        ← Übersicht
      </Link>
      <h1 className="text-h2">Price Drops für Social Media</h1>
      <p className="text-muted-ink">
        Die größten Price Drops von heute als Story-Bild mit fertigem Text. Auf dem Handy öffnet
        „Story-Bild“ direkt das Teilen-Menü (Instagram, TikTok), am Computer wird das Bild
        gespeichert. Alle Zahlen sind echte Abfragen mit Datum: nichts dazuschreiben, was nicht
        stimmt, und keine „nur heute“-Sprüche.
      </p>
      {/* Today's drops, or the week's recap as a weekly post (C-080h). */}
      <nav aria-label="Zeitraum" className="mt-3">
        <ul className="flex gap-2">
          {(
            [
              ['day', 'Heute', base],
              ['week', 'Diese Woche', `${base}?zeitraum=woche`],
            ] as const
          ).map(([key, label, href]) => (
            <li key={key}>
              <ChipLink href={href} selected={period === key}>
                {label}
              </ChipLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
