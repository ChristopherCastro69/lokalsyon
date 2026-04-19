"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import CoordLabel from "@/components/brand/CoordLabel";
import ItemsReceipt from "@/components/ItemsReceipt";
import type { OrderItem, OrderType } from "@/lib/types";
import { previewRouteToOrder } from "@/app/actions/routing";
import { googleMapsLink, wazeLink } from "@/lib/navigation";

type Props = {
  orderId: string;
  customerName: string;
  product: string;
  items: OrderItem[];
  totalAmount: number | null;
  currency: string;
  orderType: OrderType;
  scheduledFor: string | null;
  rentalEndAt: string | null;
  destination: LatLng;
  phone: string | null;
  notes: string | null;
};

const PIN_DEST = "#c84a24"; // terracotta — customer
const PIN_ME = "#0b6b50"; // mangrove — you

export default function RoutePreview({
  orderId,
  customerName,
  product,
  items,
  totalAmount,
  currency,
  orderType,
  scheduledFor,
  rentalEndAt,
  destination,
  phone,
  notes,
}: Props) {
  const schedule =
    orderType === "rental" && scheduledFor && rentalEndAt
      ? ({ kind: "rental", scheduledFor, rentalEndAt } as const)
      : orderType === "sale" && scheduledFor
        ? ({ kind: "sale", scheduledFor } as const)
        : null;
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originError, setOriginError] = useState<string | null>(null);
  const [route, setRoute] = useState<{
    coords: LatLng[];
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!navigator.geolocation) {
      setOriginError("This browser doesn't support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) =>
        setOriginError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Grant it and reload."
            : "Couldn't get your location.",
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (!origin) return;
    setRouteError(null);
    startTransition(async () => {
      const result = await previewRouteToOrder(orderId, origin.lat, origin.lng);
      if (result.ok) {
        setRoute({
          coords: result.coordinates.map(([lng, lat]) => ({ lat, lng })),
          distanceKm: result.distanceKm,
          durationMinutes: result.durationMinutes,
        });
      } else {
        setRouteError(result.message);
      }
    });
  }, [origin, orderId]);

  const pins = [
    {
      id: "dest",
      pos: destination,
      label: `${customerName} — ${product}`,
      color: PIN_DEST,
    },
    ...(origin
      ? [{ id: "me", pos: origin, label: "You", color: PIN_ME }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip */}
      <div className="flex flex-wrap items-center gap-3">
        {route ? (
          <>
            <Stat label="Distance" value={`${route.distanceKm} km`} />
            <Stat
              label="Drive time"
              value={
                route.durationMinutes < 60
                  ? `${route.durationMinutes} min`
                  : `${Math.floor(route.durationMinutes / 60)}h ${route.durationMinutes % 60}m`
              }
            />
          </>
        ) : pending || (!origin && !originError) ? (
          <span className="inline-flex items-center gap-2 rounded-pill border border-hair bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-terracotta" />
            Computing route…
          </span>
        ) : null}
      </div>

      {originError ? (
        <p className="rounded-field border border-sunfade/40 bg-sunfade/10 px-3 py-2 text-sm text-ink-2">
          {originError}
        </p>
      ) : null}
      {routeError ? (
        <p className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick">
          {routeError}
        </p>
      ) : null}

      {/* Map */}
      <div className="overflow-hidden rounded-card border border-hair">
        <LeafletMap
          center={destination}
          zoom={14}
          otherPins={pins}
          polyline={route?.coords ?? null}
          fitToBounds
          interactive
          className="h-[380px] w-full sm:h-[460px]"
        />
      </div>

      {/* Nav hand-off buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={wazeLink(destination.lat, destination.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-paper hover:bg-mangrove-2"
        >
          Start in Waze
          <span aria-hidden className="font-mono text-xs">
            ↗
          </span>
        </a>
        <a
          href={googleMapsLink(destination.lat, destination.lng, origin)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-pill border border-hair bg-surface px-5 text-sm font-medium text-ink hover:bg-paper-deep"
        >
          Google Maps
          <span aria-hidden className="font-mono text-xs">
            ↗
          </span>
        </a>
        <Link
          href="/admin/orders"
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
        >
          ← Back to orders
        </Link>
      </div>

      {/* Details card */}
      <section className="with-crosshairs relative flex flex-col gap-3 border border-hair bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              Destination
            </span>
            <span className="font-display text-xl text-ink">{customerName}</span>
            <span className="text-sm text-ink-2">{product}</span>
          </div>
          <CoordLabel lat={destination.lat} lng={destination.lng} />
        </div>

        {items && items.length > 0 ? (
          <>
            <div className="divider-dashed" />
            <ItemsReceipt
              heading="Order"
              items={items}
              totalAmount={totalAmount}
              currency={currency}
              schedule={schedule}
            />
          </>
        ) : null}

        <div className="divider-dashed" />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {phone ? (
            <div className="flex flex-col gap-0.5">
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
                Phone
              </dt>
              <dd>
                <a
                  href={`tel:${phone}`}
                  className="font-mono text-ink underline-offset-2 hover:underline"
                >
                  {phone}
                </a>
              </dd>
            </div>
          ) : null}
          {notes ? (
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
                Landmark / notes
              </dt>
              <dd className="italic text-ink-2">&ldquo;{notes}&rdquo;</dd>
            </div>
          ) : null}
        </dl>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="with-crosshairs relative flex flex-col gap-0.5 border border-hair bg-surface px-4 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
        {label}
      </span>
      <span className="font-display text-2xl leading-none text-ink">{value}</span>
    </div>
  );
}
