"use client";

import { useActionState } from "react";
import { submitWaitlist, type WaitlistFormState } from "@/app/actions/waitlist";

const initialState: WaitlistFormState = { ok: false, message: "" };

export default function WaitlistForm() {
  const [state, formAction, pending] = useActionState(submitWaitlist, initialState);

  if (state.ok) {
    return (
      <div className="max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <div className="font-medium">You're on the list.</div>
        <p className="mt-1 text-sm opacity-90">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={state.fieldErrors?.email}
      />
      <Field
        label="Business / shop name"
        name="display_name"
        required
        placeholder="e.g. Jane &amp; Mark's Boutique"
        error={state.fieldErrors?.display_name}
      />
      <Field
        label="Municipality"
        name="municipality"
        required
        placeholder="e.g. San Jose, Batangas"
        error={state.fieldErrors?.municipality}
      />
      <TextareaField
        label="Anything else? (optional)"
        name="message"
        placeholder="What do you sell, how many deliveries a week, etc."
        error={state.fieldErrors?.message}
      />

      {state.message && !state.ok ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {pending ? "Sending…" : "Request access"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
        {required ? <span className="text-zinc-400"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white dark:focus:ring-white/10"
      />
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </label>
  );
}

function TextareaField({
  label,
  name,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </span>
      <textarea
        name={name}
        rows={3}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white dark:focus:ring-white/10"
      />
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </label>
  );
}
