import Link from 'next/link';

/** Title and house rules of the creator kit (C-080c), also on its dev preview. */
export function KitHeader() {
  return (
    <div className="flex flex-col gap-1">
      <Link href="/admin" className="text-meta font-semibold text-accent">
        ← Übersicht
      </Link>
      <h1 className="text-h2">Preisstürze für Social Media</h1>
      <p className="text-muted-ink">
        Die größten Preisstürze von heute als Story-Bild mit fertigem Text. Auf dem Handy öffnet
        „Story-Bild“ direkt das Teilen-Menü (Instagram, TikTok), am Computer wird das Bild
        gespeichert. Alle Zahlen sind echte Abfragen mit Datum: nichts dazuschreiben, was nicht
        stimmt, und keine „nur heute“-Sprüche.
      </p>
    </div>
  );
}
