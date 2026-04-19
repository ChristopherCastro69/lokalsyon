"use client";

import { useActionState, useState } from "react";
import { createSeller, type SetupState } from "@/app/actions/setup";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import CoordLabel from "@/components/brand/CoordLabel";

const initial: SetupState = { ok: false, message: "" };

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
        /* no-op */
      },
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField
        label="Shop / couple name"
        name="display_name"
        required
        placeholder="Jane &amp; Mark's Boutique"
        error={state.fieldErrors?.display_name}
      />
      <TextField
        label="Slug"
        name="slug"
        required
        placeholder="jane-and-mark"
        pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
        hint="Lowercase letters, numbers, hyphens. Your link will be /s/<slug>/p/…"
        error={state.fieldErrors?.slug}
      />

      {/* Map block */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
            Default map center<span className="ml-1 text-terracotta">·</span>
          </span>
          <button
            type="button"
            onClick={useMyLocation}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-mangrove-2 hover:underline"
          >
            📍 My location
          </button>
        </div>
        <p className="text-xs text-ink-3">
          Tap the map to drop a pin at your municipality&rsquo;s center.
          Customers see this when they open a delivery link.
        </p>
        <div className="overflow-hidden rounded-card border border-hair">
          <LeafletMap
            center={center}
            zoom={effectiveZoom}
            pin={pin}
            onPinChange={(p) => {
              setPin(p);
              if (zoom < 14) setZoom(15);
            }}
            className="h-[360px] w-full"
          />
        </div>
        <div className="flex items-center justify-between">
          {pin ? (
            <CoordLabel lat={pin.lat} lng={pin.lng} />
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-terracotta">
              Drop a pin to continue
            </span>
          )}
        </div>
        <input type="hidden" name="lat" value={pin?.lat ?? ""} />
        <input type="hidden" name="lng" value={pin?.lng ?? ""} />
        <input type="hidden" name="zoom" value={14} />
      </section>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !pin}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink px-6 text-sm font-medium text-paper transition hover:bg-mangrove-2 disabled:opacity-50 sm:w-fit"
      >
        {pending ? "Setting up…" : "Create my shop"}
        <span aria-hidden className="font-mono text-xs">
          ↗
        </span>
      </button>
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
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
        {label}
        {required ? <span className="ml-1 text-terracotta">·</span> : null}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        pattern={pattern}
        aria-invalid={error ? true : undefined}
        className="h-12 rounded-field border border-hair bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
      />
      {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
      {error ? (
        <span className="font-mono text-[11px] text-terracotta">{error}</span>
      ) : null}
    </label>
  );
}
