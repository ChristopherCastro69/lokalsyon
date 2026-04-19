"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import { previewRouteToOrder } from "@/app/actions/routing";
import { googleMapsLink, wazeLink } from "@/lib/navigation";

type Props = {
  orderId: string;
  customerName: string;
  product: string;
  destination: LatLng;
  phone: string | null;
  notes: string | null;
};

export default function RoutePreview({
  orderId,
  customerName,
  product,
  destination,
  phone,
  notes,
}: Props) {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originError, setOriginError] = useState<string | null>(null);
  const [route, setRoute] = useState<{
    coords: LatLng[];
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Get the seller's current location on mount.
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

  // Once we have origin, ask the server to compute the route.
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
      color: "#2563eb",
    },
    ...(origin
      ? [
          {
            id: "me",
            pos: origin,
            label: "You",
            color: "#10b981",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
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
          <span className="text-sm text-zinc-500">Computing route…</span>
        ) : null}
      </div>

      {originError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {originError}
        </p>
      ) : null}
      {routeError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {routeError}
        </p>
      ) : null}

      <LeafletMap
        center={destination}
        zoom={14}
        otherPins={pins}
        polyline={route?.coords ?? null}
        fitToBounds
        interactive
        className="h-[420px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
      />

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={wazeLink(destination.lat, destination.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-full bg-black px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Start in Waze
        </a>
        <a
          href={googleMapsLink(destination.lat, destination.lng, origin)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Start in Google Maps
        </a>
        <Link
          href="/admin/orders"
          className="ml-auto text-sm text-zinc-500 hover:text-black dark:hover:text-white"
        >
          ← Back to orders
        </Link>
      </div>

      <dl className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Customer</dt>
          <dd className="text-black dark:text-zinc-100">{customerName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-zinc-500">Product</dt>
          <dd className="text-black dark:text-zinc-100">{product}</dd>
        </div>
        {phone ? (
          <div>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">Phone</dt>
            <dd className="text-black dark:text-zinc-100">
              <a href={`tel:${phone}`} className="underline">
                {phone}
              </a>
            </dd>
          </div>
        ) : null}
        {notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-zinc-500">Notes</dt>
            <dd className="text-black dark:text-zinc-100">{notes}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-semibold text-black dark:text-zinc-100">{value}</div>
    </div>
  );
}
