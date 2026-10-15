'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Icon } from './Icon';

type Props = {
  message: string;
  /** Optional leading icon (an <Icon /> element), e.g. a check after "Link kopiert". */
  icon?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  /** ms before it hides; paused while hovered or focused. */
  duration?: number;
};

/**
 * Short confirmation (PREMIUM.md §11 Toast): ink pill, bottom centre on phones, bottom right on
 * desktop, above a sticky bar (set `--sticky-bar-h`) and the safe area. `role="status"`, 4 s,
 * paused on hover and focus, Esc closes. Errors that need an action stay inline instead.
 */
export function Toast({ message, icon, closeLabel, onClose, duration = 4000 }: Props) {
  const [paused, setPaused] = useState(false);
  const left = useRef(duration);
  const started = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const timer = setTimeout(onClose, left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started.current;
    };
  }, [paused, onClose]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="toast fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom)+var(--sticky-bar-h,0px))] z-50 mx-auto flex max-w-[380px] items-center gap-2.5 rounded-[22px] bg-night py-1 pr-1 pl-4 text-[15px] font-semibold text-white shadow-3 md:right-6 md:bottom-6 md:left-auto md:mx-0"
    >
      {icon && <span className="text-good-bright">{icon}</span>}
      <span className="flex-1 py-2.5">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="grid size-11 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
      >
        <Icon icon={X} size={16} />
      </button>
    </div>
  );
}
