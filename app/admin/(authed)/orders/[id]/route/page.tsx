import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import { createClient } from "@/lib/supabase/server";
import RoutePreview from "@/components/RoutePreview";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderRoutePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.seller) redirect("/admin/setup");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_name, product, phone, notes, lat, lng")
    .eq("id", id)
    .eq("seller_id", user.seller.id)
    .maybeSingle();

  if (!order) notFound();
  if (order.lat == null || order.lng == null) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          No location yet
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This order hasn&rsquo;t been pinned by the customer. Share the link and
          check back.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase">
          Route preview
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {order.customer_name} &middot; {order.product}
        </h1>
      </header>
      <RoutePreview
        orderId={order.id}
        customerName={order.customer_name}
        product={order.product}
        destination={{ lat: order.lat, lng: order.lng }}
        phone={order.phone}
        notes={order.notes}
      />
    </div>
  );
}
