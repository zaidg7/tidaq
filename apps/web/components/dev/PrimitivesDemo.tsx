'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';

const RANGES = [
  { value: '14', label: '14 T' },
  { value: '30', label: '30 T' },
  { value: 'all', label: 'Alles' },
] as const;

/** /dev/ui only: the interactive primitives (segmented control, sheet). */
export function PrimitivesDemo() {
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('30');
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-wrap items-center gap-4">
      <Segmented
        label="Zeitraum"
        options={RANGES}
        value={range}
        onChange={setRange}
        className="w-[240px]"
      />
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Sheet öffnen
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Reisedaten"
        closeLabel="Schließen"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button variant="subtle" onClick={() => setOpen(false)}>
              Zurücksetzen
            </Button>
            <Button onClick={() => setOpen(false)}>Fertig</Button>
          </div>
        }
      >
        <p className="text-ink-2">
          Auf dem Handy ein Blatt von unten: am Griff nach unten ziehen, um es zu schließen. Ab 768
          px ein Fenster in der Mitte.
        </p>
      </Sheet>
    </div>
  );
}
