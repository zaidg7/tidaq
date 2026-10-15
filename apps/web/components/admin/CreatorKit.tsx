'use client';

import { useCallback, useId, useState } from 'react';
import { Check, Copy, ExternalLink, Images, Share2 } from 'lucide-react';
import { PLATFORMS, type Platform } from '@tidaq/core';
import { markPostedAction } from '@/app/admin/actions';
import { shareOrDownload } from '@/components/drops/shareFiles';
import {
  canvasFile,
  drawCover,
  drawStory,
  type CoverText,
  type StoryText,
} from '@/components/drops/storyImage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';

export interface KitItem {
  key: string;
  hotel: string;
  /** "Zürich · Di, 27. Okt." */
  place: string;
  pct: string;
  /** "684 € statt 989 €" */
  prices: string;
  photo: string | null;
  thumb: string | null;
  story: StoryText;
  caption: string;
  /** The drop page, e.g. `/price-drops/baur-au-lac-zuerich/2026-10-27`. */
  path: string;
  fileName: string;
  /** For "Gepostet auf" (C-080j). */
  mark: { slug: string; key: string; period: 'day' | 'week'; posted: Platform[] };
}

const PLATFORM_NAME: Record<Platform, string> = { tiktok: 'TikTok', instagram: 'Instagram' };

const font = () => getComputedStyle(document.body).fontFamily;

async function storyFile(item: KitItem): Promise<File> {
  const canvas = document.createElement('canvas');
  await drawStory(canvas, item.photo, item.story, font());
  return canvasFile(canvas, `${item.fileName}.png`);
}

/**
 * Creator kit (C-080c): today's top drops with one tap to a story image and a ready caption, plus
 * the day's top-5 set (cover slide + five stories) for a carousel or TikTok photo post. Images are
 * drawn in the browser like on the drop pages; on a phone they go straight to the share sheet.
 */
export function CreatorKit({
  items,
  top,
}: {
  items: KitItem[];
  top: {
    caption: string;
    cover: CoverText;
    date: string;
    /** "Top 5 des Tages" or "Top 5 der Woche" (C-080h). */
    heading: string;
    /** File name start, e.g. `tidaq-top5` or `tidaq-woche`. */
    filePrefix: string;
  } | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setToast(null), []);

  async function run(key: string, make: () => Promise<File[]>, text: string) {
    if (busy) return;
    setBusy(key);
    try {
      const files = await make();
      const done = await shareOrDownload(files, { title: 'Tidaq Price Drop', text });
      if (done === 'downloaded') {
        setToast(files.length > 1 ? `${files.length} Bilder gespeichert` : 'Bild gespeichert');
      }
    } catch {
      setToast('Das hat nicht geklappt. Versuch es noch einmal.');
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Text kopiert');
    } catch {
      setToast('Kopieren ging nicht. Markier den Text und kopier ihn von Hand.');
    }
  }

  const topSet = items.slice(0, 5);

  return (
    <>
      {top && (
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-h3">{top.heading}</h2>
            <p className="text-meta text-muted-ink">
              Titelbild und fünf Storys als Karussell oder TikTok-Fotopost, dazu der Text.
            </p>
          </div>
          <Caption text={top.caption} label="Text für die Top 5" />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              leading={<Icon icon={Images} size={16} />}
              loading={busy === 'top'}
              disabled={busy !== null && busy !== 'top'}
              onClick={() =>
                run(
                  'top',
                  async () => {
                    const canvas = document.createElement('canvas');
                    await drawCover(canvas, top.cover, font());
                    const cover = await canvasFile(canvas, `${top.filePrefix}-${top.date}-0.png`);
                    const stories = [];
                    for (const item of topSet) stories.push(await storyFile(item));
                    return [cover, ...stories];
                  },
                  top.caption,
                )
              }
            >
              {`${topSet.length + 1} Bilder teilen`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leading={<Icon icon={Copy} size={16} />}
              onClick={() => copy(top.caption)}
            >
              Text kopieren
            </Button>
          </div>
        </Card>
      )}

      <ol aria-label="Price Drops" className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        {items.map((item, i) => (
          <li key={item.key}>
            <Card className="flex h-full flex-col gap-4">
              <div className="flex gap-4">
                {item.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- licensed photo, self-hosted (C-011c), already sized
                  <img
                    src={item.thumb}
                    alt=""
                    width={96}
                    height={72}
                    className="bg-placeholder h-[72px] w-24 shrink-0 rounded-cell object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="bg-placeholder h-[72px] w-24 shrink-0 rounded-cell"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-[17px] leading-snug font-bold">
                    {i + 1}. {item.hotel}
                  </h3>
                  <p className="text-meta text-muted-ink">{item.place}</p>
                  <p className="text-meta mt-0.5 font-semibold tabular-nums">
                    <span className="text-good-ink">{item.pct}</span> · {item.prices}
                  </p>
                </div>
              </div>
              <Caption text={item.caption} label={`Text für ${item.hotel}`} />
              <PostedMarks hotel={item.hotel} mark={item.mark} />
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leading={<Icon icon={Share2} size={16} />}
                  loading={busy === item.key}
                  disabled={busy !== null && busy !== item.key}
                  onClick={() => run(item.key, async () => [await storyFile(item)], item.caption)}
                >
                  Story-Bild
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leading={<Icon icon={Copy} size={16} />}
                  onClick={() => copy(item.caption)}
                >
                  Text kopieren
                </Button>
                <a
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Seite öffnen
                  <Icon icon={ExternalLink} size={14} />
                </a>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      {toast && <Toast message={toast} closeLabel="Schließen" onClose={close} />}
    </>
  );
}

/**
 * "Gepostet auf TikTok / Instagram" (C-080j): a marked drop shows up under "Aus unseren Videos"
 * on the bio-link landing for a week. Plain forms, so a tap works before hydration too.
 */
function PostedMarks({ hotel, mark }: { hotel: string; mark: KitItem['mark'] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-meta text-muted-ink">Gepostet auf</span>
      {PLATFORMS.map((p) => {
        const on = mark.posted.includes(p);
        return (
          <form key={p} action={markPostedAction}>
            <input type="hidden" name="slug" value={mark.slug} />
            <input type="hidden" name="key" value={mark.key} />
            <input type="hidden" name="period" value={mark.period} />
            <input type="hidden" name="platform" value={p} />
            <input type="hidden" name="on" value={on ? '0' : '1'} />
            <button
              type="submit"
              aria-pressed={on}
              aria-label={`${hotel} auf ${PLATFORM_NAME[p]} gepostet`}
              className={
                on
                  ? 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-good-ink bg-good-soft px-3.5 text-[14px] font-semibold text-good-ink'
                  : 'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[14px] font-semibold hover:border-line-strong'
              }
            >
              {on && <Icon icon={Check} size={16} />}
              {PLATFORM_NAME[p]}
            </button>
          </form>
        );
      })}
    </div>
  );
}

function Caption({ text, label }: { text: string; label: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        readOnly
        value={text}
        rows={Math.min(14, text.split('\n').length + 3)}
        className="w-full resize-y rounded-cell border border-line bg-field p-3 text-[14px] leading-relaxed"
      />
    </div>
  );
}
