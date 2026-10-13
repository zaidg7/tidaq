import type { ReactNode } from 'react';

type Props = { eyebrow: string; title: string; text: string; children: ReactNode };

/** Shared layout of the 404 and error pages: centred, calm, one clear way out. */
export function StatusPage({ eyebrow, title, text, children }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col items-center justify-center px-5 py-20 text-center md:px-7 lg:py-28">
      <p className="text-eyebrow text-accent">{eyebrow}</p>
      <h1 className="text-h2 mt-3 max-w-[22ch]">{title}</h1>
      <p className="text-lead mt-4 max-w-[30em] text-muted-ink">{text}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>
    </div>
  );
}
