"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/seller";
import {
  getDirections,
  isOrsConfigured,
  optimizeStops,
  type DirectionsResult,
  type OptimizationResult,
} from "@/lib/ors";

export type RoutePreviewResult =
  | {
      ok: true;
      coordinates: [number, number][]; // [lng, lat]
      distanceKm: number;
      durationMinutes: number;
    }
  | { ok: false; message: string };

export async function previewRouteToOrder(
  orderId: string,
  originLat: number,
  originLng: number,
): Promise<RoutePreviewResult> {
  if (!isOrsConfigured()) {
    return {
      ok: false,
      message: "ORS_API_KEY is not set — add it to .env and restart the dev server.",
    };
  }

  const user = await getCurrentUser();
  if (!user || !user.seller) return { ok: false, message: "Not authorized." };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, lat, lng")
    .eq("id", orderId)
    .eq("seller_id", user.seller.id)
    .maybeSingle();

  if (error || !order) return { ok: false, message: "Order not found." };
  if (order.lat == null || order.lng == null) {
    return { ok: false, message: "This order doesn't have a location yet." };
  }

  try {
    const directions: DirectionsResult = await getDirections(
      { lat: originLat, lng: originLng },
      { lat: order.lat, lng: order.lng },
    );
    return {
      ok: true,
      coordinates: directions.coordinates,
      distanceKm: +(directions.distanceMeters / 1000).toFixed(2),
      durationMinutes: Math.round(directions.durationSeconds / 60),
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export type OptimizedOrderStop = {
  orderId: string;
  customerName: string;
  product: string;
  lat: number;
  lng: number;
  arrivalMinutes: number;
};

export type OptimizeOrdersResult =
  | {
      ok: true;
      stops: OptimizedOrderStop[];
      totalDistanceKm: number;
      totalDurationMinutes: number;
    }
  | { ok: false; message: string };

export async function optimizePendingOrders(
  originLat: number,
  originLng: number,
): Promise<OptimizeOrdersResult> {
  if (!isOrsConfigured()) {
    return {
      ok: false,
      message: "ORS_API_KEY is not set — add it to .env and restart the dev server.",
    };
  }

  const user = await getCurrentUser();
  if (!user || !user.seller) return { ok: false, message: "Not authorized." };

  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, customer_name, product, lat, lng")
    .eq("seller_id", user.seller.id)
    .eq("status", "pending")
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (error) return { ok: false, message: error.message };
  if (!orders || orders.length === 0) {
    return { ok: false, message: "No pending orders with locations to route." };
  }
  if (orders.length > 50) {
    // ORS free tier caps optimization jobs; also 50 stops in one day is already a lot.
    return { ok: false, message: "Too many stops — cap is 50 in one optimization." };
  }

  // Index by ORS job id (integer) → order row
  const idToOrder = new Map<number, typeof orders[number]>();
  const jobs = orders.map((o, i) => {
    idToOrder.set(i, o);
    return { id: i, pos: { lat: o.lat as number, lng: o.lng as number } };
  });

  try {
    const result: OptimizationResult = await optimizeStops(
      { lat: originLat, lng: originLng },
      jobs,
    );

    const stops: OptimizedOrderStop[] = result.stops.map((s) => {
      const order = idToOrder.get(s.jobId);
      if (!order) throw new Error(`ORS returned unknown job id ${s.jobId}`);
      return {
        orderId: order.id,
        customerName: order.customer_name,
        product: order.product,
        lat: order.lat as number,
        lng: order.lng as number,
        arrivalMinutes: Math.round(s.arrivalSeconds / 60),
      };
    });

    return {
      ok: true,
      stops,
      totalDistanceKm: +(result.totalDistanceMeters / 1000).toFixed(2),
      totalDurationMinutes: Math.round(result.totalDurationSeconds / 60),
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
