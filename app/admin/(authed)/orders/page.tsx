import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import { createClient } from "@/lib/supabase/server";
import OrdersView from "@/components/OrdersView";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

// Fallback center if the seller somehow has no default_map_* set.
const PH_CENTER = { lat: 12.8797, lng: 121.774 };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.seller) redirect("/admin/setup");

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("seller_id", user.seller.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const center =
    user.seller.default_map_lat != null && user.seller.default_map_lng != null
      ? { lat: user.seller.default_map_lat, lng: user.seller.default_map_lng }
      : PH_CENTER;
  const zoom = user.seller.default_map_zoom || 14;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Orders
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pending pins update live as customers drop their location.
        </p>
      </header>
      <OrdersView
        sellerId={user.seller.id}
        sellerSlug={user.seller.slug}
        center={center}
        zoom={zoom}
        initialOrders={(orders ?? []) as Order[]}
        appUrl={appUrl}
      />
    </div>
  );
}
