'use client';

import { useCallback, useState } from 'react';
import { Link2 } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

type Props = {
  /** Page path without origin, e.g. `/price-drops/adlon/2026-10-18`. */
  path: string;
  /** Share sheet title and text. */
  title: string;
  text: string;
  /** Translated on the server: the client gets only these strings, not the message files. */
  labels: Record<'shareLink' | 'linkCopied' | 'shareFailed' | 'close', string>;
};

const aborted = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/**
 * "Link teilen" on a drop page (C-080b). Uses the phone's share sheet (Web Share API), or the
 * clipboard where that's missing. Nothing is tracked. Story images are admin-only since C-130
 * (creator kit): nobody but us shares a drop as a story.
 */
export function DropShare({ path, title, text, labels: l }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setToast(null), []);

  async function shareLink() {
    const url = `${location.origin}${path}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
      } catch (e) {
        if (!aborted(e)) setToast(l.shareFailed);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(l.linkCopied);
    } catch {
      setToast(l.shareFailed);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={shareLink}
          className={cn(buttonClasses({ variant: 'ghost' }), 'gap-2')}
        >
          <Icon icon={Link2} size={18} />
          {l.shareLink}
        </button>
      </div>
      {toast && <Toast message={toast} closeLabel={l.close} onClose={close} />}
    </>
  );
}
