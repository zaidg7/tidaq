'use client';

import { useCallback, useState } from 'react';
import { Link2, Share2 } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { canvasFile, drawStory, type StoryText } from './storyImage';

type Props = {
  /** Page path without origin, e.g. `/preissturz/adlon/2026-10-18`. */
  path: string;
  /** Hotel photo (self-hosted) for the story image. */
  photo: string | null;
  story: StoryText;
  /** Share sheet title and text. */
  title: string;
  text: string;
  /** Download name without extension. */
  fileName: string;
  /** Translated on the server: the client gets only these strings, not the message files. */
  labels: Record<
    | 'shareStory'
    | 'storyWorking'
    | 'shareLink'
    | 'linkCopied'
    | 'imageSaved'
    | 'shareFailed'
    | 'close',
    string
  >;
};

const aborted = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/**
 * "Als Story teilen" and "Link teilen" on a drop page (C-080b). The story image is drawn in the
 * browser and handed to the phone's share sheet (Web Share API with files: Instagram, TikTok,
 * WhatsApp); where that's not supported (most desktops) it downloads instead. The link uses the
 * share sheet too, or the clipboard. Nothing is tracked.
 */
export function DropShare({ path, photo, story, title, text, fileName, labels: l }: Props) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setToast(null), []);

  async function shareStory() {
    if (busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      const font = getComputedStyle(document.body).fontFamily;
      await drawStory(canvas, photo, story, font);
      const file = await canvasFile(canvas, `${fileName}.png`);
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text });
        } catch (e) {
          if (!aborted(e)) throw e;
        }
        return;
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setToast(l.imageSaved);
    } catch {
      setToast(l.shareFailed);
    } finally {
      setBusy(false);
    }
  }

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
          onClick={shareStory}
          aria-busy={busy}
          disabled={busy}
          className={cn(buttonClasses({ variant: 'ghost' }), 'gap-2')}
        >
          <Icon icon={Share2} size={18} />
          {busy ? l.storyWorking : l.shareStory}
        </button>
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
