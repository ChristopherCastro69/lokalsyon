"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import { googleMapsLink, wazeLink } from "@/lib/navigation";
import { deleteOrder, markDelivered, markPending } from "@/app/actions/orders";
import {
  optimizePendingOrders,
  type OptimizedOrderStop,
} from "@/app/actions/routing";
import type { Order } from "@/lib/types";

type Props = {
  sellerId: string;
  sellerSlug: string;
  center: LatLng;
  zoom: number;
  initialOrders: Order[];
  appUrl: string;
};

type Filter = "pending" | "delivered" | "all";

export default function OrdersView({
  sellerId,
  sellerSlug,
  center,
  zoom,
  initialOrders,
  appUrl,
}: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<Filter>("pending");
  const [pending, startTransition] = useTransition();
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [optimized, setOptimized] = useState<OptimizedOrderStop[] | null>(null);
  const [optimizeSummary, setOptimizeSummary] = useState<{
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const requestMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMyLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const runOptimize = useCallback(() => {
    setOptimizeError(null);
    if (!myLocation) {
      setOptimizeError("Share your location first (the button above).");
      return;
    }
    setOptimizing(true);
    (async () => {
      const result = await optimizePendingOrders(myLocation.lat, myLocation.lng);
      setOptimizing(false);
      if (result.ok) {
        setOptimized(result.stops);
        setOptimizeSummary({
          distanceKm: result.totalDistanceKm,
          durationMinutes: result.totalDurationMinutes,
        });
      } else {
        setOptimizeError(result.message);
      }
    })();
  }, [myLocation]);

  // Clear any optimization when the underlying pending orders change — it's
  // no longer accurate once a row is added/removed/delivered.
  useEffect(() => {
    if (!optimized) return;
    const pendingIds = new Set(
      orders.filter((o) => o.status === "pending" && o.lat != null).map((o) => o.id),
    );
    const stopIds = new Set(optimized.map((s) => s.orderId));
    if (
      pendingIds.size !== stopIds.size ||
      [...pendingIds].some((id) => !stopIds.has(id))
    ) {
      setOptimized(null);
      setOptimizeSummary(null);
    }
  }, [orders, optimized]);

  // Subscribe to realtime changes on orders for this seller.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders:${sellerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${sellerId}`,
        },
        (payload) => {
          setOrders((current) => {
            if (payload.eventType === "INSERT") {
              const next = payload.new as Order;
              if (current.some((o) => o.id === next.id)) return current;
              return [next, ...current];
            }
            if (payload.eventType === "UPDATE") {
              const next = payload.new as Order;
              return current.map((o) => (o.id === next.id ? next : o));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              return current.filter((o) => o.id !== old.id);
            }
            return current;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId]);

  const filtered = useMemo(() => {
    const base = filter === "all" ? orders : orders.filter((o) => o.status === filter);
    if (filter !== "pending" || !optimized) return base;

    const stopIndex = new Map(optimized.map((s, i) => [s.orderId, i]));
    return [...base].sort((a, b) => {
      const ai = stopIndex.get(a.id);
      const bi = stopIndex.get(b.id);
      if (ai == null && bi == null) return 0;
      if (ai == null) return 1;
      if (bi == null) return -1;
      return ai - bi;
    });
  }, [orders, filter, optimized]);

  const pins = useMemo(() => {
    const orderNumber = optimized
      ? new Map(optimized.map((s, i) => [s.orderId, i + 1]))
      : null;
    return filtered
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => ({
        id: o.id,
        pos: { lat: o.lat!, lng: o.lng! },
        label: `${orderNumber?.get(o.id) ? `${orderNumber.get(o.id)}. ` : ""}${o.customer_name} — ${o.product}`,
        color: o.status === "delivered" ? "#6b7280" : "#2563eb",
        number: orderNumber?.get(o.id),
      }));
  }, [filtered, optimized]);

  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "pending").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      all: orders.length,
    }),
    [orders],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label={`Pending (${counts.pending})`} active={filter === "pending"} onClick={() => setFilter("pending")} />
          <FilterChip label={`Delivered (${counts.delivered})`} active={filter === "delivered"} onClick={() => setFilter("delivered")} />
          <FilterChip label={`All (${counts.all})`} active={filter === "all"} onClick={() => setFilter("all")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestMyLocation}
            disabled={locating}
            className={
              myLocation
                ? "inline-flex h-8 items-center rounded-full bg-emerald-100 px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                : "inline-flex h-8 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }
            title={myLocation ? "Refresh location" : "Share my location to pre-fill navigation"}
          >
            {locating
              ? "Locating…"
              : myLocation
                ? "📍 Using my location"
                : "📍 Share my location"}
          </button>
          <button
            type="button"
            onClick={runOptimize}
            disabled={optimizing || !myLocation}
            className="inline-flex h-8 items-center rounded-full bg-black px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            title={myLocation ? "Order pending stops by shortest route" : "Share your location first"}
          >
            {optimizing ? "Optimizing…" : optimized ? "Re-optimize" : "Optimize route"}
          </button>
          {optimized ? (
            <button
              type="button"
              onClick={() => {
                setOptimized(null);
                setOptimizeSummary(null);
              }}
              className="text-xs text-zinc-500 hover:text-black dark:hover:text-white"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {optimizeError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {optimizeError}
        </p>
      ) : null}
      {optimizeSummary && optimized ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <span className="font-medium">Optimized route</span>
          <span className="text-xs opacity-80">
            {optimized.length} stops · {optimizeSummary.distanceKm} km · ~
            {optimizeSummary.durationMinutes < 60
              ? `${optimizeSummary.durationMinutes} min`
              : `${Math.floor(optimizeSummary.durationMinutes / 60)}h ${optimizeSummary.durationMinutes % 60}m`}
          </span>
        </div>
      ) : null}

      <LeafletMap
        center={center}
        zoom={zoom}
        otherPins={pins}
        interactive
        className="h-[360px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No orders in this view yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              sellerSlug={sellerSlug}
              appUrl={appUrl}
              myLocation={myLocation}
              disabled={pending}
              onMarkDelivered={() =>
                startTransition(async () => {
                  await markDelivered(order.id);
                })
              }
              onMarkPending={() =>
                startTransition(async () => {
                  await markPending(order.id);
                })
              }
              onDelete={() =>
                startTransition(async () => {
                  if (confirm(`Delete order for ${order.customer_name}?`)) {
                    await deleteOrder(order.id);
                  }
                })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
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
      className={
        active
          ? "rounded-full bg-black px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-black"
          : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }
    >
      {label}
    </button>
  );
}

function OrderRow({
  order,
  sellerSlug,
  appUrl,
  myLocation,
  disabled,
  onMarkDelivered,
  onMarkPending,
  onDelete,
}: {
  order: Order;
  sellerSlug: string;
  appUrl: string;
  myLocation: LatLng | null;
  disabled: boolean;
  onMarkDelivered: () => void;
  onMarkPending: () => void;
  onDelete: () => void;
}) {
  const hasLocation = order.lat != null && order.lng != null;
  const customerLink = `${appUrl}/s/${sellerSlug}/p/${order.code}`;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-black dark:text-zinc-50">
            {order.customer_name}
          </span>
          <StatusBadge status={order.status} />
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {order.product}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span>
            Created {new Date(order.created_at).toLocaleString()}
          </span>
          {order.submitted_at ? (
            <span>• Location submitted</span>
          ) : (
            <span>• Awaiting location</span>
          )}
          {order.phone ? <span>• {order.phone}</span> : null}
        </div>
        {order.notes ? (
          <div className="mt-1 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            &ldquo;{order.notes}&rdquo;
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {!order.submitted_at ? (
          <CopyLinkButton link={customerLink} />
        ) : null}
        {hasLocation ? (
          <>
            <Link
              href={`/admin/orders/${order.id}/route`}
              className="inline-flex h-8 items-center rounded-full border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
            >
              Route preview
            </Link>
            <a
              href={wazeLink(order.lat!, order.lng!)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Waze
            </a>
            <a
              href={googleMapsLink(order.lat!, order.lng!, myLocation)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Google Maps
            </a>
          </>
        ) : null}
        {order.status === "pending" ? (
          <button
            type="button"
            onClick={onMarkDelivered}
            disabled={disabled}
            className="inline-flex h-8 items-center rounded-full bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Mark delivered
          </button>
        ) : (
          <button
            type="button"
            onClick={onMarkPending}
            disabled={disabled}
            className="inline-flex h-8 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            Undo deliver
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="inline-flex h-8 items-center rounded-full px-2 text-xs text-zinc-400 hover:text-red-600 disabled:opacity-60"
          title="Delete order"
          aria-label="Delete order"
        >
          ✕
        </button>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  if (status === "delivered") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        Delivered
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      Pending
    </span>
  );
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex h-8 items-center rounded-full border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
