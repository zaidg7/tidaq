'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';

/** /dev/ui only: shows the toast on demand. */
export function ToastDemo({
  label,
  message,
  closeLabel,
}: {
  label: string;
  message: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && <Toast message={message} closeLabel={closeLabel} onClose={() => setOpen(false)} />}
    </>
  );
}
