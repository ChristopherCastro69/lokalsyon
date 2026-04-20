"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import CoordLabel from "@/components/brand/CoordLabel";
import { updateSeller, type UpdateSellerState } from "@/app/actions/settings";
import { slugify } from "@/lib/slugify";

const initial: UpdateSellerState = { ok: false, message: "" };

const PH_CENTER: LatLng = { lat: 12.8797, lng: 121.774 };

type Props = {
  sellerId: string;
  initialDisplayName: string;
  initialSlug: string;
  initialLat: number | null;
  initialLng: number | null;
  initialZoom: number;
};

export default function SettingsForm({
  sellerId,
  initialDisplayName,
  initialSlug,
  initialLat,
  initialLng,
  initialZoom,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateSeller, initial);

  const startPin: LatLng | null =
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null;

  const [displayName, setDisplayName] = useState<string>(initialDisplayName);
  const [slugDraft, setSlugDraft] = useState<string>(initialSlug);
  const [pin, setPin] = useState<LatLng | null>(startPin);
  const [zoom, setZoom] = useState<number>(initialZoom || 14);

  const slugPreview = useMemo(() => slugify(slugDraft), [slugDraft]);
  const slugChanged = slugPreview !== initialSlug;

  useEffect(() => {
    if (state.ok) {
      // Pull fresh seller data into the layout (header + nav) after save.
      router.refresh();
    }
  }, [state, router]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
        setZoom((z) => Math.max(z, 15));
      },
      () => {
        /* no-op */
      },
    );
  }

  const mapCenter = pin ?? PH_CENTER;
  const effectiveZoom = pin ? Math.max(zoom, 14) : 6;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="seller_id" value={sellerId} />

      {/* Shop name */}
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
          Shop name<span className="ml-1 text-terracotta">·</span>
        </span>
        <input
          name="display_name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          aria-invalid={state.fieldErrors?.display_name ? true : undefined}
          className="h-12 rounded-field border border-hair bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
        />
        {state.fieldErrors?.display_name ? (
          <span className="font-mono text-[11px] text-terracotta">
            {state.fieldErrors.display_name}
          </span>
        ) : null}
      </label>

      {/* Slug */}
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
          Your link<span className="ml-1 text-terracotta">·</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
            /s/
          </span>
          <input
            name="slug"
            required
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value)}
            aria-invalid={state.fieldErrors?.slug ? true : undefined}
            className="h-12 flex-1 rounded-field border border-hair bg-surface px-3 font-mono text-[14px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
            /p/…
          </span>
        </div>
        <SlugHint
          preview={slugPreview}
          changed={slugChanged}
          error={state.fieldErrors?.slug}
        />
      </label>

      {/* Map */}
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
          Tap the map to move the pin. This is where your customers&rsquo; map
          opens before they drop their own pin.
        </p>
        <div className="overflow-hidden rounded-card border border-hair">
          <LeafletMap
            center={mapCenter}
            zoom={effectiveZoom}
            pin={pin}
            onPinChange={(p) => {
              setPin(p);
              setZoom((z) => Math.max(z, 15));
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
        <input type="hidden" name="zoom" value={zoom} />
      </section>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
        >
          {state.message}
        </p>
      ) : null}
      {state.message && state.ok ? (
        <p
          role="status"
          className="rounded-field border border-mangrove/40 bg-mangrove-soft/40 px-3 py-2 text-sm text-mangrove-2"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !pin || slugPreview.length < 2}
          className="inline-flex h-12 items-center gap-2 rounded-pill bg-ink px-6 text-sm font-medium text-paper transition hover:bg-mangrove-2 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
          <span aria-hidden className="font-mono text-xs">
            ↗
          </span>
        </button>
      </div>
    </form>
  );
}

function SlugHint({
  preview,
  changed,
  error,
}: {
  preview: string;
  changed: boolean;
  error?: string;
}) {
  if (error) {
    return (
      <span className="font-mono text-[11px] text-terracotta">{error}</span>
    );
  }
  if (preview.length < 2) {
    return (
      <span className="font-mono text-[11px] text-terracotta">
        Slug needs at least two letters or numbers.
      </span>
    );
  }
  return (
    <span className="font-mono text-[11px] text-ink-3">
      Preview:{" "}
      <span className="rounded-pill border border-hair bg-paper px-1.5 py-0.5 text-ink">
        /s/{preview}/p/…
      </span>
      {changed ? (
        <span className="ml-2 text-ink-2">
          · Old links redirect automatically.
        </span>
      ) : null}
    </span>
  );
}
