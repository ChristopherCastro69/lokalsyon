import { createClient } from "@/lib/supabase/server";
import { startOfWeekIso, todayIso, todayPlus } from "@/lib/dates";
import type { Order, OrderType } from "@/lib/types";

export type RecentActivityItem = {
  id: string;
  customer_name: string;
  product: string;
  status: Order["status"];
  total_amount: number | null;
  currency: string;
  order_type: OrderType;
  scheduled_for: string | null;
  rental_end_at: string | null;
  created_at: string;
};

export type SellerStats = {
  pendingCount: number;
  deliveredThisWeek: { count: number; revenue: number | null };
  activeRentalsToday: number;
  upcomingWeek: number;
  recent: RecentActivityItem[];
};

/**
 * One server-side fan-out of small queries, each scoped by seller_id.
 * RLS already enforces this, but we also include the eq filter for clarity
 * and so the helper works if called with the service-role client later.
 */
export async function getSellerStats(sellerId: string): Promise<SellerStats> {
  const supabase = await createClient();

  const today = todayIso();
  const weekStart = startOfWeekIso();
  const weekEnd = todayPlus(7);

  const [pendingCountQ, deliveredQ, activeRentalsQ, upcomingQ, recentQ] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .eq("status", "pending"),

      supabase
        .from("orders")
        .select("total_amount", { count: "exact" })
        .eq("seller_id", sellerId)
        .eq("status", "delivered")
        .gte("delivered_at", `${weekStart}T00:00:00`),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .eq("order_type", "rental")
        .lte("scheduled_for", today)
        .gte("rental_end_at", today),

      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .gte("scheduled_for", today)
        .lte("scheduled_for", weekEnd),

      supabase
        .from("orders")
        .select(
          "id, customer_name, product, status, total_amount, currency, order_type, scheduled_for, rental_end_at, created_at",
        )
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const deliveredRows = (deliveredQ.data ?? []) as { total_amount: number | null }[];
  const revenue = deliveredRows.reduce<number | null>((acc, row) => {
    if (row.total_amount == null) return acc;
    return (acc ?? 0) + Number(row.total_amount);
  }, null);

  return {
    pendingCount: pendingCountQ.count ?? 0,
    deliveredThisWeek: {
      count: deliveredQ.count ?? 0,
      revenue,
    },
    activeRentalsToday: activeRentalsQ.count ?? 0,
    upcomingWeek: upcomingQ.count ?? 0,
    recent: (recentQ.data ?? []) as RecentActivityItem[],
  };
}
