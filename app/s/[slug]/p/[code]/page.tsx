import { createClient } from "@/lib/supabase/server";
import CustomerForm from "@/components/CustomerForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string; code: string }>;
};

const PH_CENTER = { lat: 12.8797, lng: 121.774 };

export default async function CustomerLocationPage({ params }: PageProps) {
  const { slug, code } = await params;
  const supabase = await createClient();

  const { data: seller } = await supabase
    .from("sellers")
    .select("id, slug, display_name, default_map_lat, default_map_lng, default_map_zoom")
    .eq("slug", slug)
    .maybeSingle();

  if (!seller) {
    return <NotFound message="This link isn't valid." />;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, code, customer_name, product, status, submitted_at, lat, lng, phone, notes")
    .eq("seller_id", seller.id)
    .eq("code", code)
    .maybeSingle();

  if (!order) {
    return <NotFound message="This link isn't valid." />;
  }

  const center =
    seller.default_map_lat != null && seller.default_map_lng != null
      ? { lat: seller.default_map_lat, lng: seller.default_map_lng }
      : PH_CENTER;
  const zoom = seller.default_map_zoom || 14;

  const alreadySubmitted = order.submitted_at != null;
  const delivered = order.status === "delivered";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <div className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase">
          {seller.display_name}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Hi {order.customer_name}!
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {delivered
            ? "This order has been delivered. Thanks!"
            : alreadySubmitted
              ? "Your delivery location is saved. You can update it below until we deliver."
              : "Confirm your delivery location below."}
        </p>
      </header>

      {delivered ? (
        <DeliveredView
          customerName={order.customer_name}
          product={order.product}
        />
      ) : (
        <CustomerForm
          slug={seller.slug}
          code={order.code}
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
          isUpdate={alreadySubmitted}
        />
      )}
    </div>
  );
}

function DeliveredView({
  customerName,
  product,
}: {
  customerName: string;
  product: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
      <div className="text-lg font-semibold">Delivered</div>
      <p className="mt-1 text-sm opacity-90">
        Thanks, {customerName} — your <span className="font-medium">{product}</span>{" "}
        has been delivered. Hope you enjoy it!
      </p>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-5 py-16 text-center">
      <div className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase">
        Lokalsyon
      </div>
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Link not found
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );
}
