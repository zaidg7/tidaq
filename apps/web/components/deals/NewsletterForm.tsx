'use client';

import { useActionState, useId } from 'react';
import { newsletterAction, type NewsletterFormState } from '@/app/[locale]/deals/newsletterAction';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Turnstile } from '@/components/ui/Turnstile';

export type NewsletterFormLabels = {
  email: string;
  consent: string;
  privacy: string;
  privacyHref: string;
  submit: string;
  results: Record<Exclude<NewsletterFormState['status'], 'idle'>, string>;
  preview: string;
};

/**
 * Weekly deals by email (C-054a): address and a consent box that is never pre-ticked, double
 * opt-in by email. Works without JavaScript as a plain form post.
 */
export function NewsletterForm({
  locale,
  labels,
}: {
  locale: string;
  labels: NewsletterFormLabels;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(newsletterAction, { status: 'idle' });
  const ok = state.status === 'sent' || state.status === 'added';
  const values = state.status === 'idle' ? undefined : state.values;

  if (ok) {
    return (
      <div role="status" className="rounded-cell bg-accent-soft px-4 py-3 text-[14.5px]">
        <p className="font-semibold">{labels.results[state.status]}</p>
        {state.previewUrl && (
          <p className="mt-2 text-[13px]">
            <a href={state.previewUrl} className="font-semibold text-accent underline">
              {labels.preview}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form key={JSON.stringify(values)} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <TextField
        id={`${id}-email`}
        name="email"
        type="email"
        label={labels.email}
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={values?.email}
      />
      <label className="flex items-start gap-2.5 text-[13.5px] leading-snug text-muted-ink">
        <input
          type="checkbox"
          name="consent"
          required
          defaultChecked={values?.consent}
          className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
        />
        <span>
          {labels.consent}{' '}
          <a
            href={labels.privacyHref}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            {labels.privacy}
          </a>
        </span>
      </label>
      {state.status !== 'idle' && (
        <p role="alert" className="text-[13.5px] font-semibold text-bad-ink">
          {labels.results[state.status]}
        </p>
      )}
      <Turnstile locale={locale} />
      <Button type="submit" block loading={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
