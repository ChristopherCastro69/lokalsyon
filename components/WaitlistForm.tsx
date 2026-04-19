"use client";

import { useActionState } from "react";
import { submitWaitlist, type WaitlistFormState } from "@/app/actions/waitlist";

const initialState: WaitlistFormState = { ok: false, message: "" };

export default function WaitlistForm() {
  const [state, formAction, pending] = useActionState(submitWaitlist, initialState);

  if (state.ok) {
    return (
      <div className="with-crosshairs relative flex flex-col gap-3 border border-mangrove/40 bg-mangrove-soft/40 p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-mangrove" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mangrove-2">
            Received
          </span>
        </div>
        <h3 className="font-display text-2xl text-ink">You&rsquo;re on the list.</h3>
        <p className="text-sm leading-relaxed text-ink-2">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          error={state.fieldErrors?.email}
        />
        <Field
          label="Shop name"
          name="display_name"
          required
          placeholder="Jane &amp; Mark's Boutique"
          error={state.fieldErrors?.display_name}
        />
      </div>

      <Field
        label="Municipality"
        name="municipality"
        required
        placeholder="San Jose, Batangas"
        error={state.fieldErrors?.municipality}
      />
      <TextareaField
        label="Anything else?"
        optional
        name="message"
        placeholder="What do you sell, how many deliveries a week?"
        error={state.fieldErrors?.message}
      />

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex h-12 items-center gap-3 rounded-pill bg-ink px-6 text-sm font-medium text-paper transition hover:bg-mangrove-2 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Request access"}
          <span
            aria-hidden
            className="font-mono text-xs transition-transform group-hover:translate-x-0.5"
          >
            ↗
          </span>
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          Manual review · no auto-approvals
        </span>
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
      <span className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
          {label}
          {required ? (
            <span className="ml-1 text-terracotta">·</span>
          ) : (
            <span className="ml-1 text-ink-3">opt.</span>
          )}
        </span>
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className="h-11 rounded-field border border-hair bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
      />
      {error ? (
        <span className="font-mono text-[11px] text-terracotta">{error}</span>
      ) : null}
    </label>
  );
}

function TextareaField({
  label,
  name,
  placeholder,
  error,
  optional,
}: {
  label: string;
  name: string;
  placeholder?: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
          {label}
          {optional ? <span className="ml-1 text-ink-3">opt.</span> : null}
        </span>
      </span>
      <textarea
        name={name}
        rows={3}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className="resize-y rounded-field border border-hair bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
      />
      {error ? (
        <span className="font-mono text-[11px] text-terracotta">{error}</span>
      ) : null}
    </label>
  );
}
