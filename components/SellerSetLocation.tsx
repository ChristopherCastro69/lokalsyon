"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import CoordLabel from "@/components/brand/CoordLabel";
import { setCustomerLocation } from "@/app/actions/orders";

type Props = {
  orderId: string;
  customerName: string;
  product: string;
  center: LatLng;
  initialZoom: number;
  initialPin: LatLng | null;
  initialPhone: string;
  initialNotes: string;
};

export default function SellerSetLocation({
  orderId,
  customerName,
  product,
  center,
  initialZoom,
  initialPin,
  initialPhone,
  initialNotes,
}: Props) {
  const router = useRouter();
  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [zoom, setZoom] = useState<number>(initialPin ? 17 : initialZoom);
  const [coordText, setCoordText] = useState<string>(
    initialPin ? `${initialPin.lat.toFixed(5)}, ${initialPin.lng.toFixed(5)}` : "",
  );
  const [coordError, setCoordError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>(initialPhone);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mapCenter = pin ?? center;
  const effectiveZoom = pin ? Math.max(zoom, 16) : initialZoom;

  const parsedCoord = useMemo(() => parseCoordText(coordText), [coordText]);

  function applyPastedCoords() {
    if (!parsedCoord) {
      setCoordError(
        "Use lat, lng — e.g. 11.2605, 123.7312. Comma or space between the two.",
      );
      return;
    }
    setCoordError(null);
    setPin(parsedCoord);
    setZoom(17);
  }

  function onSave() {
    if (!pin) {
      setSubmitError("Drop a pin on the map or paste coordinates first.");
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      const result = await setCustomerLocation(
        orderId,
        pin.lat,
        pin.lng,
        phone.trim() || null,
        notes.trim() || null,
      );
      if (result.ok) {
        router.push("/admin/orders");
        router.refresh();
      } else {
        setSubmitError(result.message ?? "Couldn't save.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;Set location manually
        </span>
        <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink sm:text-4xl">
          {customerName}
          <span className="mx-2 font-normal text-ink-3">/</span>
          <span className="font-normal text-ink-2">{product}</span>
        </h1>
        <p className="text-sm text-ink-2">
          For customers with no data — after they describe a landmark or share
          coordinates in chat, drop the pin here yourself.
        </p>
      </header>

      {/* Map */}
      <div className="overflow-hidden rounded-card border border-hair">
        <LeafletMap
          center={mapCenter}
          zoom={effectiveZoom}
          pin={pin}
          onPinChange={(p) => {
            setPin(p);
            setCoordText(`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
            if (zoom < 16) setZoom(17);
          }}
          className="h-[400px] w-full"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {pin ? (
          <CoordLabel lat={pin.lat} lng={pin.lng} />
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-terracotta">
            Tap the map or paste coordinates below
          </span>
        )}
      </div>

      {/* Coord paste */}
      <section className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
          Or paste coordinates
        </span>
        <div className="flex items-stretch gap-2">
          <input
            value={coordText}
            onChange={(e) => setCoordText(e.target.value)}
            placeholder="11.2605, 123.7312"
            inputMode="decimal"
            className="flex-1 rounded-field border border-hair bg-surface px-3 font-mono text-[14px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
          />
          <button
            type="button"
            onClick={applyPastedCoords}
            className="inline-flex shrink-0 items-center rounded-pill border border-hair bg-surface px-4 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:bg-paper-deep hover:text-ink"
          >
            Drop pin
          </button>
        </div>
        {coordError ? (
          <span className="font-mono text-[11px] text-terracotta">
            {coordError}
          </span>
        ) : (
          <span className="text-xs text-ink-3">
            Accepts <span className="font-mono">11.2605, 123.7312</span> or
            <span className="font-mono"> 11.2605 123.7312</span>. Messenger
            location-share copies this format.
          </span>
        )}
      </section>

      {/* Optional phone + notes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
            Phone <span className="text-ink-3">opt.</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0917 123 4567"
            className="h-11 rounded-field border border-hair bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
            Landmark / notes <span className="text-ink-3">opt.</span>
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Near the big mango tree, green gate"
            className="h-11 rounded-field border border-hair bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-mangrove focus:outline-none focus:ring-2 focus:ring-mangrove/20"
          />
        </label>
      </div>

      {submitError ? (
        <p
          role="alert"
          className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
        >
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !pin}
          className="inline-flex h-12 items-center gap-2 rounded-pill bg-ink px-6 text-sm font-medium text-paper transition active:bg-mangrove-2 hover:bg-mangrove-2 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save location"}
          <span aria-hidden className="font-mono text-xs">
            ↗
          </span>
        </button>
        <Link
          href="/admin/orders"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
        >
          ← Back to orders
        </Link>
      </div>
    </div>
  );
}

function parseCoordText(text: string): LatLng | null {
  const t = text.trim();
  if (!t) return null;
  // Accept commas, spaces, or both between lat and lng.
  const m = t.match(
    /^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/,
  );
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
