"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createOrder, type CreateOrderState } from "@/app/actions/orders";

const initial: CreateOrderState = { ok: false, message: "" };

export default function NewOrderForm() {
  const [state, formAction, pending] = useActionState(createOrder, initial);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
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
        /* user dismissed share sheet */
      }
    }
    copy(text);
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        ref={formRef}
        action={formAction}
        className="with-crosshairs relative flex flex-col gap-5 border border-hair bg-surface p-5 sm:p-6"
      >
        <TextField
          label="Customer name"
          name="customer_name"
          required
          placeholder="Maria dela Cruz"
          error={state.fieldErrors?.customer_name}
        />
        <TextField
          label="Product"
          name="product"
          required
          placeholder="1× blue dress, 2× t-shirts"
          error={state.fieldErrors?.product}
        />

        {state.message && !state.ok ? (
          <p
            role="alert"
            className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
          >
            {state.message}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="group inline-flex h-12 items-center gap-2 rounded-pill bg-ink px-6 text-sm font-medium text-paper transition hover:bg-mangrove-2 disabled:opacity-60"
          >
            {pending ? "Generating…" : "Generate link"}
            <span
              aria-hidden
              className="font-mono text-xs transition-transform group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </button>
        </div>
      </form>

      {state.ok && state.link ? (
        <div className="with-crosshairs relative flex flex-col gap-4 border border-mangrove/40 bg-mangrove-soft/50 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-mangrove" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mangrove-2">
                Link ready
              </span>
            </div>
            <span className="rounded-pill border border-mangrove/30 bg-paper px-2 py-0.5 font-mono text-[11px] text-ink">
              {state.code}
            </span>
          </div>

          <code className="block break-all rounded-field border border-mangrove/20 bg-surface px-3 py-2 font-mono text-[12px] text-ink">
            {state.link}
          </code>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy(state.link!)}
              className="inline-flex h-10 items-center rounded-pill bg-ink px-4 text-xs font-medium text-paper hover:bg-mangrove-2"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => share(state.link!)}
              className="inline-flex h-10 items-center rounded-pill border border-mangrove/40 bg-surface px-4 text-xs font-medium text-ink hover:bg-paper-deep"
            >
              Share…
            </button>
          </div>
          <p className="text-xs leading-relaxed text-ink-2">
            Send this via Messenger, SMS, or Viber. When they drop their pin,
            it shows up in <span className="font-medium text-ink">Orders</span>.
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
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
        {label}
        {required ? <span className="ml-1 text-terracotta">·</span> : null}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className="h-12 rounded-field border border-hair bg-paper px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
      />
      {error ? (
        <span className="font-mono text-[11px] text-terracotta">{error}</span>
      ) : null}
    </label>
  );
}
