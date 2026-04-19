"use client";

import { useActionState, useEffect, useState } from "react";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import CoordLabel from "@/components/brand/CoordLabel";
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
  const [editing, setEditing] = useState<boolean>(!isUpdate);

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state.ok]);

  const mapCenter = pin ?? center;
  const effectiveZoom = pin ? Math.max(zoom, 16) : initialZoom;

  // Read-only "thanks" card shown after submit and on return visits.
  if (!editing) {
    return (
      <div className="with-crosshairs relative flex flex-col gap-4 border border-mangrove/40 bg-mangrove-soft/40 p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-mangrove" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mangrove-2">
            Saved
          </span>
        </div>
        <h2 className="font-display text-2xl leading-tight text-ink">
          Thanks, {customerName}.
        </h2>
        <p className="text-sm leading-relaxed text-ink-2">
          {state.ok
            ? state.message
            : "We have your delivery location. We'll message you before we arrive."}
        </p>
        <p className="font-mono text-[11px] text-ink-3">
          You can update the pin, phone, or notes any time before we deliver.
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-paper hover:bg-mangrove-2"
        >
          Edit location &amp; details
          <span
            aria-hidden
            className="font-mono text-xs transition-transform group-hover:translate-x-0.5"
          >
            ↗
          </span>
        </button>
      </div>
    );
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("This browser doesn't support location. Tap the map instead.");
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
            ? "Location permission was blocked. You can still tap the map."
            : "Couldn't get your location. You can still tap the map.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Order block — quiet confirmation */}
      <section className="flex items-start justify-between gap-4 border-b border-hair pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
            Your order
          </span>
          <span className="font-display text-lg leading-snug text-ink">
            {product}
          </span>
        </div>
      </section>

      {/* Map + location picker */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
            Where to deliver<span className="ml-1 text-terracotta">·</span>
          </span>
          {pin ? (
            <CoordLabel lat={pin.lat} lng={pin.lng} />
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              Drop a pin
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoBusy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-terracotta px-4 text-sm font-medium text-paper shadow-sm hover:bg-terracotta-2 disabled:opacity-60"
        >
          {geoBusy ? (
            "Getting your location…"
          ) : (
            <>
              <LocateIcon />
              Use my current location
            </>
          )}
        </button>

        <p className="text-xs text-ink-3">
          Or tap on the map to drop a pin. Drag the pin to fine-tune.
        </p>
        {geoError ? (
          <p className="rounded-field border border-sunfade/50 bg-sunfade/10 px-3 py-2 text-xs text-ink-2">
            {geoError}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-card border border-hair">
          <LeafletMap
            center={mapCenter}
            zoom={effectiveZoom}
            pin={pin}
            onPinChange={(p) => {
              setPin(p);
              if (zoom < 16) setZoom(17);
            }}
            className="h-[340px] w-full"
          />
        </div>

        {!pin ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-terracotta">
            ↑ Drop a pin to continue
          </p>
        ) : null}

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
        label="Notes / landmark"
        name="notes"
        optional
        placeholder="e.g. Near the big mango tree, green gate"
        defaultValue={initialNotes}
        error={state.fieldErrors?.notes}
      />

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
        >
          {state.message}
        </p>
      ) : null}

      {/* Sticky-ish submit on mobile; inline on larger */}
      <div className="sticky bottom-2 z-10 -mx-5 mt-2 border-t border-hair bg-paper/90 px-5 pb-[max(env(safe-area-inset-bottom),8px)] pt-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-1 sm:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending || !pin}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink px-6 text-base font-medium text-paper transition hover:bg-mangrove-2 disabled:opacity-50"
        >
          {pending ? "Saving…" : isUpdate ? "Update location" : "Confirm location"}
        </button>
      </div>
    </form>
  );
}

function LocateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 2v2M12 20v2M2 12h2M20 12h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
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
      <span className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
          {label}
          {required ? <span className="ml-1 text-terracotta">·</span> : null}
        </span>
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode={type === "tel" ? "tel" : undefined}
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

function TextareaField({
  label,
  name,
  placeholder,
  defaultValue,
  error,
  optional,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className="resize-y rounded-field border border-hair bg-surface px-3 py-2 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
      />
      {error ? (
        <span className="font-mono text-[11px] text-terracotta">{error}</span>
      ) : null}
    </label>
  );
}
