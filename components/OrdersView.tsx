"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { createClient } from "@/lib/supabase/client";
import LeafletMap, { type LatLng } from "@/components/LeafletMapLazy";
import CoordLabel from "@/components/brand/CoordLabel";
import { googleMapsLink, wazeLink } from "@/lib/navigation";
import { formatMoney } from "@/lib/money";
import { formatDateShort } from "@/lib/dates";
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

// Theme-aligned pin colors
const PIN_PENDING = "#c84a24"; // terracotta
const PIN_DELIVERED = "#8a8373"; // muted ink
const PIN_ME = "#0b6b50"; // mangrove

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

  // Realtime subscription to orders for this seller.
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
      setOptimizeError("Share your location first — tap the 📍 button.");
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

  // Clear optimization when underlying pending set changes.
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
    const pinArr = filtered
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => ({
        id: o.id,
        pos: { lat: o.lat!, lng: o.lng! },
        label: `${orderNumber?.get(o.id) ? `${orderNumber.get(o.id)}. ` : ""}${o.customer_name} — ${o.product}`,
        color: o.status === "delivered" ? PIN_DELIVERED : PIN_PENDING,
        number: orderNumber?.get(o.id),
      }));
    if (myLocation) {
      pinArr.push({
        id: "me",
        pos: myLocation,
        label: "You",
        color: PIN_ME,
        number: undefined,
      });
    }
    return pinArr;
  }, [filtered, optimized, myLocation]);

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
      {/* Header */}
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;Orders
        </span>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-ink sm:text-[42px]">
          Today&rsquo;s route.
        </h1>
        <p className="text-sm text-ink-2">
          Pins update live as customers drop their locations. Share your
          location to optimize a multi-stop run.
        </p>
      </header>

      {/* Action bar — filters + tools */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            label={`Pending`}
            count={counts.pending}
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          />
          <FilterChip
            label={`Delivered`}
            count={counts.delivered}
            active={filter === "delivered"}
            onClick={() => setFilter("delivered")}
          />
          <FilterChip
            label={`All`}
            count={counts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestMyLocation}
            disabled={locating}
            className={
              myLocation
                ? "inline-flex h-9 items-center gap-1.5 rounded-pill border border-mangrove/40 bg-mangrove-soft/60 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-mangrove-2"
                : "inline-flex h-9 items-center gap-1.5 rounded-pill border border-hair bg-surface px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:bg-paper-deep"
            }
            title={myLocation ? "Refresh location" : "Share my location"}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${myLocation ? "bg-mangrove" : "bg-ink-3"}`}
            />
            {locating ? "Locating…" : myLocation ? "Using location" : "Share location"}
          </button>
          <button
            type="button"
            onClick={runOptimize}
            disabled={optimizing || !myLocation}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-ink px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-paper hover:bg-mangrove-2 disabled:opacity-50"
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
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-3 hover:text-ink"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {optimizeError ? (
        <p
          role="alert"
          className="rounded-field border border-sunfade/40 bg-sunfade/10 px-3 py-2 text-sm text-ink-2"
        >
          {optimizeError}
        </p>
      ) : null}

      {optimizeSummary && optimized ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mangrove/30 bg-mangrove-soft/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mangrove-2">
              Optimized
            </span>
            <span className="font-display text-lg text-ink">
              {optimized.length} stops
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-2">
            {optimizeSummary.distanceKm} km ·{" "}
            {optimizeSummary.durationMinutes < 60
              ? `${optimizeSummary.durationMinutes} min`
              : `${Math.floor(optimizeSummary.durationMinutes / 60)}h ${optimizeSummary.durationMinutes % 60}m`}
          </span>
        </div>
      ) : null}

      {/* Map */}
      <div className="overflow-hidden rounded-card border border-hair">
        <LeafletMap
          center={center}
          zoom={zoom}
          otherPins={pins}
          interactive
          className="h-[360px] w-full sm:h-[420px]"
        />
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hair bg-surface/60 py-10 text-center">
          <span className="font-display text-xl text-ink-2">Nothing here yet.</span>
          <span className="text-sm text-ink-3">
            {filter === "pending"
              ? "Create a new order or wait for pins to come in."
              : "No orders match this filter."}
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((order, i) => {
            const numbered = filter === "pending" && optimized ? i + 1 : null;
            return (
              <OrderRow
                key={order.id}
                order={order}
                sellerSlug={sellerSlug}
                appUrl={appUrl}
                myLocation={myLocation}
                stopNumber={numbered}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-9 shrink-0 items-center gap-2 rounded-pill bg-ink px-3.5 text-sm font-medium text-paper transition active:opacity-80"
          : "inline-flex h-9 shrink-0 items-center gap-2 rounded-pill border border-hair bg-surface px-3.5 text-sm text-ink-2 transition active:bg-paper-deep active:text-ink hover:bg-paper-deep hover:text-ink"
      }
    >
      {label}
      <span
        className={`font-mono text-[11px] ${active ? "opacity-70" : "text-ink-3"}`}
      >
        {count}
      </span>
    </button>
  );
}

function OrderRow({
  order,
  sellerSlug,
  appUrl,
  myLocation,
  stopNumber,
  disabled,
  onMarkDelivered,
  onMarkPending,
  onDelete,
}: {
  order: Order;
  sellerSlug: string;
  appUrl: string;
  myLocation: LatLng | null;
  stopNumber: number | null;
  disabled: boolean;
  onMarkDelivered: () => void;
  onMarkPending: () => void;
  onDelete: () => void;
}) {
  const hasLocation = order.lat != null && order.lng != null;
  const customerLink = `${appUrl}/s/${sellerSlug}/p/${order.code}`;

  return (
    <li className="flex flex-col gap-3 rounded-card border border-hair bg-surface p-4 sm:p-5">
      {/* Row 1: name + status + stop number + total */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {stopNumber ? (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-sm font-medium text-paper">
              {stopNumber}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-display text-lg leading-tight text-ink">
                {order.customer_name}
              </span>
              <StatusDot status={order.status} />
              <SchedulePill order={order} />
            </div>
            <div className="truncate text-sm text-ink-2">{order.product}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {order.total_amount != null ? (
            <span className="font-display text-base tabular-nums text-ink">
              {formatMoney(order.total_amount, order.currency ?? "PHP")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Delete order"
            title="Delete order"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 transition active:bg-paper-deep active:text-brick hover:bg-paper-deep hover:text-brick sm:h-8 sm:w-8"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Row 2: metadata */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="rounded-pill border border-hair bg-paper px-2 py-0.5 font-mono text-ink-2">
          {order.code}
        </span>
        {order.phone ? (
          <a
            href={`tel:${order.phone}`}
            className="font-mono text-ink-2 underline-offset-2 hover:underline"
          >
            {order.phone}
          </a>
        ) : null}
        {hasLocation ? (
          <CoordLabel lat={order.lat!} lng={order.lng!} />
        ) : null}
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          {order.submitted_at ? "Pin set" : "Awaiting pin"}
        </span>
      </div>

      {order.notes ? (
        <p className="rounded-field border border-hair bg-paper px-3 py-1.5 text-sm italic text-ink-2">
          &ldquo;{order.notes}&rdquo;
        </p>
      ) : null}

      {/* Row 3: actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!order.submitted_at ? (
          <CopyLinkButton link={customerLink} />
        ) : null}
        {hasLocation ? (
          <>
            <Link
              href={`/admin/orders/${order.id}/route`}
              className="inline-flex h-9 items-center rounded-pill border border-mangrove/40 bg-mangrove-soft/50 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-mangrove-2 hover:bg-mangrove-soft"
            >
              Route
            </Link>
            <a
              href={wazeLink(order.lat!, order.lng!)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-pill border border-hair bg-surface px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:bg-paper-deep"
            >
              Waze
            </a>
            <a
              href={googleMapsLink(order.lat!, order.lng!, myLocation)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-pill border border-hair bg-surface px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:bg-paper-deep"
            >
              Maps
            </a>
          </>
        ) : null}
        <div className="ml-auto">
          {order.status === "pending" ? (
            <button
              type="button"
              onClick={onMarkDelivered}
              disabled={disabled}
              className="inline-flex h-9 items-center gap-1 rounded-pill bg-mangrove px-3.5 font-mono text-[11px] uppercase tracking-[0.15em] text-paper hover:bg-mangrove-2 disabled:opacity-50"
            >
              Delivered ✓
            </button>
          ) : (
            <button
              type="button"
              onClick={onMarkPending}
              disabled={disabled}
              className="inline-flex h-9 items-center rounded-pill border border-hair bg-surface px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:bg-paper-deep disabled:opacity-50"
            >
              Undo
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function SchedulePill({ order }: { order: Order }) {
  if (order.order_type === "rental" && order.scheduled_for && order.rental_end_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-terracotta-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-terracotta-2">
        <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
        Rental · {formatDateShort(order.scheduled_for)} →{" "}
        {formatDateShort(order.rental_end_at)}
      </span>
    );
  }
  if (order.scheduled_for) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-sand-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
        <span className="h-1.5 w-1.5 rounded-full bg-sunfade" />
        {formatDateShort(order.scheduled_for)}
      </span>
    );
  }
  return null;
}

function StatusDot({ status }: { status: Order["status"] }) {
  return status === "delivered" ? (
    <span
      className="inline-flex items-center gap-1 rounded-pill bg-mangrove-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-mangrove-2"
      title="Delivered"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-mangrove" />
      Delivered
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-pill bg-terracotta-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-terracotta-2"
      title="Pending"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
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
      className="inline-flex h-9 items-center rounded-pill border border-terracotta/40 bg-terracotta-soft/50 px-3 font-mono text-[11px] uppercase tracking-[0.15em] text-terracotta-2 hover:bg-terracotta-soft"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
