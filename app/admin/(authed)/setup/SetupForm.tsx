"use client";

import { useActionState, useState } from "react";
import { createSeller, type SetupState } from "@/app/actions/setup";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";

const initial: SetupState = { ok: false, message: "" };

// Default center: roughly Philippines center, overridden as soon as user drops a pin.
const DEFAULT_CENTER: LatLng = { lat: 12.8797, lng: 121.774 };
const DEFAULT_ZOOM = 6;

export default function SetupForm() {
  const [state, formAction, pending] = useActionState(createSeller, initial);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);

  const center = pin ?? DEFAULT_CENTER;
  const effectiveZoom = pin ? Math.max(zoom, 14) : DEFAULT_ZOOM;

  async function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
        setZoom(15);
      },
      () => {
        // User denied / error — stay at default view.
      },
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField
        label="Shop / couple name"
        name="display_name"
        required
        placeholder="e.g. Jane & Mark's Boutique"
        error={state.fieldErrors?.display_name}
      />
      <TextField
        label="Slug (used in your link: /s/[slug]/p/…)"
        name="slug"
        required
        placeholder="jane-and-mark"
        pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
        error={state.fieldErrors?.slug}
        hint="Lowercase letters, numbers, and hyphens only."
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Default map center
            <span className="text-zinc-400"> *</span>
          </span>
          <button
            type="button"
            onClick={useMyLocation}
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Use my current location
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Tap on the map at the center of your municipality. Customers will see
          the map centered here when they open their delivery link.
        </p>
        <LeafletMap
          center={center}
          zoom={effectiveZoom}
          pin={pin}
          onPinChange={(p) => {
            setPin(p);
            if (zoom < 14) setZoom(15);
          }}
          className="h-[360px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
        />
        {pin ? (
          <p className="font-mono text-xs text-zinc-500">
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Drop a pin on the map to continue.
          </p>
        )}
        <input type="hidden" name="lat" value={pin?.lat ?? ""} />
        <input type="hidden" name="lng" value={pin?.lng ?? ""} />
        <input type="hidden" name="zoom" value={14} />
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending || !pin}
          className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {pending ? "Setting up…" : "Create my seller"}
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  required,
  placeholder,
  pattern,
  error,
  hint,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
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
        required={required}
        placeholder={placeholder}
        pattern={pattern}
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
