import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import { createClient } from "@/lib/supabase/server";
import SellerSetLocation from "@/components/SellerSetLocation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

const PH_CENTER = { lat: 12.8797, lng: 121.774 };

export default async function SetLocationPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.seller) redirect("/admin/setup");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, customer_name, product, phone, notes, lat, lng",
    )
    .eq("id", id)
    .eq("seller_id", user.seller.id)
    .maybeSingle();

  if (!order) notFound();

  const center =
    user.seller.default_map_lat != null && user.seller.default_map_lng != null
      ? { lat: user.seller.default_map_lat, lng: user.seller.default_map_lng }
      : PH_CENTER;
  const zoom = user.seller.default_map_zoom || 14;

  return (
    <SellerSetLocation
      orderId={order.id}
      customerName={order.customer_name}
      product={order.product}
      center={center}
      initialZoom={zoom}
      initialPin={
        order.lat != null && order.lng != null
          ? { lat: order.lat, lng: order.lng }
          : null
      }
      initialPhone={order.phone ?? ""}
      initialNotes={order.notes ?? ""}
    />
  );
}
