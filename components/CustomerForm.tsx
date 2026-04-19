"use client";

import { useActionState, useEffect, useState } from "react";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import {
  submitLocation,
  type SubmitLocationState,
} from "@/app/actions/customer";

type Props = {
  slug: string;
  code: string;
  customerName: string;
  product: string;
  center: LatLng;
  initialZoom: number;
  initialPin?: LatLng | null;
  initialPhone?: string;
  initialNotes?: string;
  isUpdate?: boolean;
};

const initial: SubmitLocationState = { ok: false, message: "" };

export default function CustomerForm({
  slug,
  code,
  customerName,
  product,
  center,
  initialZoom,
  initialPin = null,
  initialPhone = "",
  initialNotes = "",
  isUpdate = false,
}: Props) {
  const boundAction = submitLocation.bind(null, slug, code);
  const [state, formAction, pending] = useActionState(boundAction, initial);

  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [zoom, setZoom] = useState<number>(initialPin ? 17 : initialZoom);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // Show success card when re-opening an already-submitted order, or right
  // after a successful submit. "Edit location" flips back to the form.
  const [editing, setEditing] = useState<boolean>(!isUpdate);

  // Flip to success view after a successful submit.
  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  const mapCenter = pin ?? center;
  const effectiveZoom = pin ? Math.max(zoom, 16) : initialZoom;


  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("This browser doesn't support location. Please drop a pin instead.");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
        setZoom(17);
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. You can still tap the map to drop a pin."
            : "Couldn't get your location. You can still tap the map to drop a pin.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <div>
          <div className="text-lg font-semibold">Thanks, {customerName}!</div>
          <p className="mt-1 text-sm opacity-90">
            {state.ok
              ? state.message
              : "We have your delivery location. We'll message you before we arrive."}
          </p>
        </div>
        <p className="text-xs opacity-75">
          You can update the pin, phone, or notes any time before we deliver.
        </p>
        <div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Edit location & details
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Your order
          </span>
          <div className="text-lg text-black dark:text-zinc-50">
            {product}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Where should we deliver?
            <span className="text-zinc-400"> *</span>
          </span>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoBusy}
            className="inline-flex h-9 items-center rounded-full bg-black px-4 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {geoBusy ? "Getting location…" : "📍 Use my current location"}
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Or tap on the map to drop a pin. Drag the pin to fine-tune.
        </p>
        {geoError ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">{geoError}</p>
        ) : null}

        <LeafletMap
          center={mapCenter}
          zoom={effectiveZoom}
          pin={pin}
          onPinChange={(p) => {
            setPin(p);
            if (zoom < 16) setZoom(17);
          }}
          className="h-[340px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
        />
        {pin ? (
          <p className="font-mono text-xs text-zinc-500">
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Drop a pin to continue.
          </p>
        )}
        <input type="hidden" name="lat" value={pin?.lat ?? ""} />
        <input type="hidden" name="lng" value={pin?.lng ?? ""} />
      </section>

      <TextField
        label="Phone number"
        name="phone"
        type="tel"
        required
        placeholder="0917 123 4567"
        defaultValue={initialPhone}
        error={state.fieldErrors?.phone}
        hint="We'll message you before we arrive."
      />

      <TextareaField
        label="Notes / landmark (optional)"
        name="notes"
        placeholder="e.g. Near the big mango tree, green gate"
        defaultValue={initialNotes}
        error={state.fieldErrors?.notes}
      />

      {state.message && !state.ok ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !pin}
        className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-base font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : isUpdate ? "Update location" : "Submit"}
      </button>
    </form>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  error,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
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
        defaultValue={defaultValue}
        inputMode={type === "tel" ? "tel" : undefined}
        aria-invalid={error ? true : undefined}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white dark:focus:ring-white/10"
      />
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
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
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white dark:focus:ring-white/10"
      />
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </label>
  );
}
