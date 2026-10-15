'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Heading of the sheet; also its accessible name. */
  title: string;
  closeLabel: string;
  children: ReactNode;
  /** Sticky bottom bar (e.g. "Zurücksetzen · Fertig"). */
  footer?: ReactNode;
  /** Width of the centred panel from 768 px: 560 (default) or 720 (calendars). */
  wide?: boolean;
};

/** How far (px) a downward drag must go before the sheet closes. */
const CLOSE_DRAG = 96;

/**
 * Sheet (PREMIUM.md §6, §11): a modal <dialog>. On phones a bottom sheet that slides up (320 ms),
 * with a drag handle: pull it down to close. From 768 px a centred panel that fades and scales in.
 * Esc and a tap on the backdrop close it; focus is trapped by the browser and returns to the
 * trigger on close; the page doesn't scroll behind it.
 */
export function Sheet({ open, onClose, title, closeLabel, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ start: number; id: number } | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { start: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    setOffset(Math.max(0, e.clientY - drag.current.start));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (offset > CLOSE_DRAG) onClose();
    setOffset(0);
  };

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn('sheet', wide && 'sheet-wide')}
      style={offset ? { transform: `translateY(${offset}px)`, transition: 'none' } : undefined}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div
          className="flex cursor-grab touch-none justify-center pt-2.5 pb-1 md:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>
        <header className="flex items-center justify-between gap-4 px-5 pt-2 pb-3 md:px-6 md:pt-5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            autoFocus
            className="-mr-2 grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2"
          >
            <Icon icon={X} size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 md:px-6">
          {children}
        </div>
        {footer && (
          <div className="border-t border-line px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:px-6 md:pb-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
