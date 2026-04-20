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
    .select(
      "id, customer_name, product, items, total_amount, currency, order_type, scheduled_for, rental_end_at, phone, notes, lat, lng, photos, status",
    )
    .eq("id", id)
    .eq("seller_id", user.seller.id)
    .maybeSingle();

  if (!order) notFound();

  if (order.lat == null || order.lng == null) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 py-8 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;Route preview
        </span>
        <h1 className="font-display text-3xl text-ink">No location yet.</h1>
        <p className="text-sm text-ink-2">
          This order hasn&rsquo;t been pinned by the customer yet. Share the
          link and check back in a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;Route preview
        </span>
        <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink sm:text-4xl">
          {order.customer_name}
          <span className="mx-2 font-normal text-ink-3">/</span>
          <span className="font-normal text-ink-2">{order.product}</span>
        </h1>
      </header>
      <RoutePreview
        orderId={order.id}
        customerName={order.customer_name}
        product={order.product}
        items={order.items ?? []}
        totalAmount={order.total_amount}
        currency={order.currency ?? "PHP"}
        orderType={order.order_type ?? "sale"}
        scheduledFor={order.scheduled_for}
        rentalEndAt={order.rental_end_at}
        destination={{ lat: order.lat, lng: order.lng }}
        phone={order.phone}
        notes={order.notes}
        photos={order.photos ?? []}
        status={order.status ?? "pending"}
      />
    </div>
  );
}
