'use client';

import { useActionState, useId } from 'react';
import { watchAction, type WatchFormState } from '@/app/[locale]/alarm/watchAction';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Turnstile } from '@/components/ui/Turnstile';

export type WatchFormLabels = {
  email: string;
  target: string;
  targetHint: string;
  consent: string;
  privacy: string;
  privacyHref: string;
  submit: string;
  /** Result messages by status. */
  results: Record<Exclude<WatchFormState['status'], 'idle'>, string>;
  preview: string;
};

type Props = {
  hotel: { slug: string; name: string };
  checkIn: string;
  checkOut: string;
  adults: number;
  locale: string;
  labels: WatchFormLabels;
};

/**
 * Price-alert form (C-030b): email, optional target price, consent (never pre-ticked). Works
 * without JavaScript as a plain form post; with it, the result shows in place.
 */
export function WatchForm({ hotel, checkIn, checkOut, adults, locale, labels }: Props) {
  const id = useId();
  const [state, action, pending] = useActionState(watchAction, { status: 'idle' });
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
    // Remount after each attempt so the fields show what was entered (React resets forms).
    <form key={JSON.stringify(values)} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="hotel" value={hotel.slug} />
      <input type="hidden" name="hotelName" value={hotel.name} />
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />
      <input type="hidden" name="adults" value={adults} />
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
      <TextField
        id={`${id}-target`}
        name="target"
        label={labels.target}
        hint={labels.targetHint}
        inputMode="decimal"
        autoComplete="off"
        defaultValue={values?.target}
        error={state.status === 'bad_price' ? labels.results.bad_price : undefined}
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
      {state.status !== 'idle' && state.status !== 'bad_price' && (
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
