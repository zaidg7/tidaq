import { inlineLinks, localizedPath, type Locale } from '@tidaq/core';

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
            className="font-semibold text-accent underline underline-offset-2 hover:no-underline"
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
 * pages add a note that the German text is binding.
 */
export function LegalPage({
  content,
  locale,
  bindingNote,
}: {
  content: LegalContent;
  locale: Locale;
  bindingNote?: string;
}) {
  return (
    <article className="mx-auto w-full max-w-[1080px] px-5 pt-8 pb-16 md:px-7 lg:pt-14 lg:pb-[88px]">
      <header className="max-w-[40em]">
        <p className="text-eyebrow text-accent">{content.eyebrow}</p>
        <h1 className="text-h2 mt-2">{content.title}</h1>
        {content.intro && (
          <p className="text-lead mt-4 text-muted-ink">
            <Inline text={content.intro} locale={locale} />
          </p>
        )}
        <p className="text-meta mt-4 text-muted-ink">{content.updated}</p>
        {bindingNote && (
          <p className="mt-4 rounded-cell bg-surface-2 px-4 py-3 text-[14px] text-muted-ink">
            {bindingNote}
          </p>
        )}
      </header>
      <div className="mt-10 grid max-w-[40em] gap-9">
        {content.sections.map((s) => (
          <section key={s.title} aria-labelledby={sectionId(s.title)}>
            <h2 id={sectionId(s.title)} className="text-h3">
              {s.title}
            </h2>
            {s.text?.map((p, i) => (
              <p key={i} className="mt-3 text-[15.5px] leading-relaxed whitespace-pre-line">
                <Inline text={p} locale={locale} />
              </p>
            ))}
            {s.list && (
              <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-[15.5px] leading-relaxed marker:text-muted-ink">
                {s.list.map((item, i) => (
                  <li key={i}>
                    <Inline text={item} locale={locale} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
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
