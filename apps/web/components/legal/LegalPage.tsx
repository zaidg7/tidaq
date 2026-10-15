import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { inlineLinks, localizedPath, type Locale } from '@tidaq/core';
import { PageHead } from '@/components/shell/PageHead';

/** One section of a legal or transparency page, as stored in the message files. */
export interface LegalSection {
  title: string;
  /** Paragraphs; `[label](href)` marks a link (core `inlineLinks`). */
  text?: string[];
  /** A bullet list after the paragraphs. */
  list?: string[];
}

export interface LegalContent {
  eyebrow: string;
  title: string;
  intro?: string;
  /** "Stand: 14. Oktober 2026". */
  updated: string;
  sections: LegalSection[];
}

function Inline({ text, locale }: { text: string; locale: Locale }) {
  return (
    <>
      {inlineLinks(text).map((part, i) => {
        if (!part.href) return part.text;
        const internal = part.href.startsWith('/');
        return (
          <a
            key={i}
            href={internal ? localizedPath(part.href, locale) : part.href}
            {...(part.href.startsWith('https://') && { rel: 'noopener' })}
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {part.text}
          </a>
        );
      })}
    </>
  );
}

/**
 * Legal and transparency pages (C-027): Impressum, Datenschutz, Affiliate-Hinweis, Ranking,
 * Methodik. Plain reading layout, one column of ~65 characters, a heading per section. English
 * pages add a note that the German text is binding. `children` (live numbers on /methodik) sit
 * between the header and the sections.
 */
export function LegalPage({
  content,
  locale,
  bindingNote,
  children,
}: {
  content: LegalContent;
  locale: Locale;
  bindingNote?: string;
  children?: ReactNode;
}) {
  const tocLabel = useTranslations('legal')('toc');
  return (
    <article className="mx-auto w-full max-w-[1240px] px-[18px] pt-6 pb-16 md:px-10 md:pt-12 md:pb-24">
      <PageHead
        pill={content.eyebrow}
        title={content.title}
        lead={content.intro && <Inline text={content.intro} locale={locale} />}
      >
        <p className="mt-4 text-[14px] text-muted">{content.updated}</p>
        {bindingNote && (
          <p className="mt-4 rounded-input bg-surface-2 px-4 py-3 text-[14px] text-muted">
            {bindingNote}
          </p>
        )}
      </PageHead>
      {children}
      <div className="mt-10 grid gap-10 md:mt-16 lg:grid-cols-[240px_minmax(0,680px)] lg:gap-20">
        {content.sections.length > 2 && (
          <nav aria-label={tocLabel} className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-[13px] font-semibold text-muted">{tocLabel}</p>
              <ul className="mt-3 flex flex-col border-l border-line">
                {content.sections.map((s) => (
                  <li key={s.title}>
                    <a
                      href={`#${sectionId(s.title)}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[14px] text-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
        <div className="grid gap-10 md:gap-12 lg:col-start-2">
          {content.sections.map((s) => (
            <section key={s.title} aria-labelledby={sectionId(s.title)} className="scroll-mt-28">
              <h2
                id={sectionId(s.title)}
                className="scroll-mt-28 text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] md:text-[26px]"
              >
                {s.title}
              </h2>
              {s.text?.map((p, i) => (
                <p
                  key={i}
                  className="mt-3.5 text-[16px] leading-[1.7] whitespace-pre-line text-ink-2 md:text-[17px]"
                >
                  <Inline text={p} locale={locale} />
                </p>
              ))}
              {s.list && (
                <ul className="mt-3.5 grid gap-2.5 text-[16px] leading-[1.6] text-ink-2 md:text-[17px]">
                  {s.list.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-accent"
                      />
                      <span>
                        <Inline text={item} locale={locale} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

/** Stable anchor ids from section titles ("5. Deine Rechte" → "5-deine-rechte"). */
function sectionId(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
