"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createOrder, type CreateOrderState } from "@/app/actions/orders";
import { formatMoney } from "@/lib/money";
import { todayIso } from "@/lib/dates";

const initial: CreateOrderState = { ok: false, message: "" };

type ItemDraft = { id: string; name: string; qty: string; unit_price: string };
type Mode = "sale" | "rental";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function blankItem(): ItemDraft {
  return { id: uid(), name: "", qty: "1", unit_price: "" };
}

export default function NewOrderForm() {
  const [state, formAction, pending] = useActionState(createOrder, initial);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);
  const [mode, setMode] = useState<Mode>("sale");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [rentalEnd, setRentalEnd] = useState<string>("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setItems([blankItem()]);
      setMode("sale");
      setScheduledFor("");
      setRentalEnd("");
    }
  }, [state.ok]);

  const lineTotals = useMemo(
    () =>
      items.map((it) => {
        const qty = Number(it.qty) || 0;
        const price = it.unit_price === "" ? null : Number(it.unit_price);
        if (price == null || Number.isNaN(price)) return null;
        return +(qty * price).toFixed(2);
      }),
    [items],
  );

  const runningTotal = useMemo(() => {
    if (lineTotals.some((t) => t == null)) return null;
    return lineTotals.reduce<number>((acc, t) => acc + (t ?? 0), 0);
  }, [lineTotals]);

  function updateItem(id: string, patch: Partial<ItemDraft>) {
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function removeItem(id: string) {
    setItems((cur) => (cur.length === 1 ? cur : cur.filter((it) => it.id !== id)));
  }
  function addItem() {
    setItems((cur) => [...cur, blankItem()]);
  }

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
        await (
          navigator as Navigator & { share: (d: ShareData) => Promise<void> }
        ).share({
          text: `Please set your delivery location: ${text}`,
          url: text,
        });
        return;
      } catch {
        /* dismissed */
      }
    }
    copy(text);
  }

  const itemsJson = JSON.stringify(
    items.map((it) => ({
      name: it.name.trim(),
      qty: it.qty,
      unit_price: it.unit_price,
    })),
  );

  const today = todayIso();
  const rentalMinEnd = scheduledFor || today;

  return (
    <div className="flex flex-col gap-6">
      <form
        ref={formRef}
        action={formAction}
        className="with-crosshairs relative flex flex-col gap-5 border border-hair bg-surface p-5 sm:p-6"
      >
        {/* Segmented type toggle */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
            Order type
          </span>
          <div className="grid grid-cols-2 gap-1 rounded-pill border border-hair bg-paper p-1">
            <TypeToggle
              label="Sale"
              active={mode === "sale"}
              onClick={() => setMode("sale")}
            />
            <TypeToggle
              label="Rental"
              active={mode === "rental"}
              onClick={() => setMode("rental")}
            />
          </div>
          <input type="hidden" name="order_type" value={mode} />
        </div>

        <TextField
          label="Customer name"
          name="customer_name"
          required
          placeholder="Maria dela Cruz"
          error={state.fieldErrors?.customer_name}
        />

        {/* Dates */}
        <div
          className={
            mode === "rental"
              ? "grid grid-cols-2 gap-3"
              : "grid grid-cols-1 gap-3"
          }
        >
          <DateField
            label={mode === "rental" ? "Rental start" : "Scheduled for"}
            name="scheduled_for"
            required={mode === "rental"}
            optional={mode === "sale"}
            min={today}
            value={scheduledFor}
            onChange={(v) => {
              setScheduledFor(v);
              if (rentalEnd && rentalEnd < v) setRentalEnd(v);
            }}
            error={state.fieldErrors?.scheduled_for}
          />
          {mode === "rental" ? (
            <DateField
              label="Return by"
              name="rental_end_at"
              required
              min={rentalMinEnd}
              value={rentalEnd}
              onChange={(v) => setRentalEnd(v)}
              error={state.fieldErrors?.rental_end_at}
            />
          ) : null}
        </div>

        {/* Items */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
              Items<span className="ml-1 text-terracotta">·</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {items.map((it, idx) => (
              <ItemRow
                key={it.id}
                item={it}
                index={idx}
                lineTotal={lineTotals[idx]}
                canRemove={items.length > 1}
                errors={state.fieldErrors?.item_rows?.[idx]}
                onChange={(patch) => updateItem(it.id, patch)}
                onRemove={() => removeItem(it.id)}
              />
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-hair bg-paper px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:bg-paper-deep"
            >
              <span aria-hidden>＋</span> Add item
            </button>
            {state.fieldErrors?.items ? (
              <span className="font-mono text-[11px] text-terracotta">
                {state.fieldErrors.items}
              </span>
            ) : null}
          </div>

          <div className="divider-dashed" />

          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-2">
              Total
            </span>
            <span className="font-display text-2xl leading-none text-ink">
              {formatMoney(runningTotal, "PHP")}
            </span>
          </div>
          {runningTotal == null ? (
            <p className="-mt-1 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
              Add prices for a total (optional)
            </p>
          ) : null}

          <input type="hidden" name="items_json" value={itemsJson} />
          <input type="hidden" name="currency" value="PHP" />
        </div>

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

function TypeToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "h-9 rounded-pill bg-ink text-xs font-medium uppercase tracking-[0.18em] text-paper"
          : "h-9 rounded-pill text-xs font-medium uppercase tracking-[0.18em] text-ink-2 hover:bg-paper-deep"
      }
    >
      {label}
    </button>
  );
}

function ItemRow({
  item,
  index,
  lineTotal,
  canRemove,
  errors,
  onChange,
  onRemove,
}: {
  item: ItemDraft;
  index: number;
  lineTotal: number | null;
  canRemove: boolean;
  errors: { name?: string; qty?: string; unit_price?: string } | undefined;
  onChange: (patch: Partial<ItemDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-field border border-hair bg-paper p-2.5 sm:p-3">
      <div className="flex items-start gap-2">
        <span className="mt-2 hidden w-6 shrink-0 text-center font-mono text-[11px] text-ink-3 sm:inline">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="grid flex-1 grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_80px_120px_auto]">
          <input
            value={item.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Item name (e.g. blue dress)"
            aria-invalid={errors?.name ? true : undefined}
            className="col-span-2 h-11 rounded-field border border-hair bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20 sm:col-span-1"
          />
          <div className="flex items-center gap-2 sm:contents">
            <label className="flex flex-1 items-center gap-1 sm:block">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 sm:sr-only">
                Qty
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={item.qty}
                onChange={(e) =>
                  onChange({ qty: e.target.value.replace(/[^0-9]/g, "") })
                }
                aria-invalid={errors?.qty ? true : undefined}
                className="h-11 w-full rounded-field border border-hair bg-surface px-2 text-center text-[15px] tabular-nums text-ink focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
              />
            </label>
            <label className="flex flex-1 items-center gap-1 sm:block">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 sm:sr-only">
                Price
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm text-ink-3">
                  ₱
                </span>
                <input
                  inputMode="decimal"
                  value={item.unit_price}
                  onChange={(e) =>
                    onChange({
                      unit_price: e.target.value.replace(/[^0-9.]/g, ""),
                    })
                  }
                  placeholder="0.00"
                  aria-invalid={errors?.unit_price ? true : undefined}
                  className="h-11 w-full rounded-field border border-hair bg-surface pl-7 pr-2 text-right text-[15px] tabular-nums text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
                />
              </div>
            </label>
          </div>

          <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
            <span className="font-mono text-xs tabular-nums text-ink-2 sm:w-full sm:text-right">
              {lineTotal == null ? "—" : formatMoney(lineTotal, "PHP")}
            </span>
            <button
              type="button"
              onClick={onRemove}
              disabled={!canRemove}
              aria-label="Remove item"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-paper-deep hover:text-brick disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      {(errors?.name || errors?.qty || errors?.unit_price) ? (
        <p className="mt-1 pl-2 font-mono text-[11px] text-terracotta">
          {errors?.name ?? errors?.qty ?? errors?.unit_price}
        </p>
      ) : null}
    </li>
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

function DateField({
  label,
  name,
  required,
  optional,
  min,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  optional?: boolean;
  min?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
        {label}
        {required ? <span className="ml-1 text-terracotta">·</span> : null}
        {optional ? <span className="ml-1 text-ink-3">opt.</span> : null}
      </span>
      <input
        type="date"
        name={name}
        required={required}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className="h-12 rounded-field border border-hair bg-paper px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
      />
      {error ? (
        <span className="font-mono text-[11px] text-terracotta">{error}</span>
      ) : null}
    </label>
  );
}
