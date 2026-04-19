"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createOrder, type CreateOrderState } from "@/app/actions/orders";

const initial: CreateOrderState = { ok: false, message: "" };

export default function NewOrderForm() {
  const [state, formAction, pending] = useActionState(createOrder, initial);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Reset the form after a successful create so the seller can type the next order.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable — ignore.
    }
  }

  async function share(text: string) {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          text: `Please set your delivery location: ${text}`,
          url: text,
        });
        return;
      } catch {
        // Share sheet dismissed — fall through to copy.
      }
    }
    copy(text);
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        ref={formRef}
        action={formAction}
        className="flex max-w-lg flex-col gap-4"
      >
        <TextField
          label="Customer name"
          name="customer_name"
          required
          placeholder="e.g. Maria dela Cruz"
          error={state.fieldErrors?.customer_name}
        />
        <TextField
          label="Product"
          name="product"
          required
          placeholder="e.g. 1x blue dress, 2x t-shirts"
          error={state.fieldErrors?.product}
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
            {pending ? "Generating…" : "Generate link"}
          </button>
        </div>
      </form>

      {state.ok && state.link ? (
        <div className="flex max-w-lg flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Link ready</div>
            <div className="font-mono text-xs opacity-70">{state.code}</div>
          </div>
          <code className="block break-all rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-zinc-800 dark:bg-black/30 dark:text-zinc-100">
            {state.link}
          </code>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(state.link!)}
              className="inline-flex h-9 items-center rounded-full bg-black px-4 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => share(state.link!)}
              className="inline-flex h-9 items-center rounded-full border border-emerald-300 bg-white px-4 text-xs font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
            >
              Share…
            </button>
          </div>
          <p className="text-xs opacity-75">
            Send this to the customer via Messenger / SMS / Viber. They&rsquo;ll
            drop a pin and their location shows up in Orders.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TextField({
  label,
  name,
  required,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
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
        required={required}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white dark:focus:ring-white/10"
      />
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </label>
  );
}
