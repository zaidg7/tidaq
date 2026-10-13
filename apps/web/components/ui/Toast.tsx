'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Icon } from './Icon';

type Props = {
  message: string;
  closeLabel: string;
  onClose: () => void;
  /** ms before it hides; paused while hovered or focused. */
  duration?: number;
};

/**
 * Short confirmation (CRAFT.md §3 Toast): dark ink surface, bottom centre on mobile, bottom right
 * on desktop, `role="status"`, 5 s, paused on hover and focus. Errors that need an action stay
 * inline instead.
 */
export function Toast({ message, closeLabel, onClose, duration = 5000 }: Props) {
  const [paused, setPaused] = useState(false);
  const left = useRef(duration);
  const started = useRef(0);

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
      className="toast fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[360px] items-center gap-3 rounded-tooltip bg-ink-surface py-2 pr-2 pl-4 text-[14px] font-semibold text-white shadow-hover md:right-6 md:bottom-6 md:left-auto md:mx-0"
    >
      <span className="flex-1 py-1.5">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="grid size-9 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
      >
        <Icon icon={X} size={16} />
      </button>
    </div>
  );
}
