import { createClient } from "@/lib/supabase/server";
import CustomerForm from "@/components/CustomerForm";
import Wordmark from "@/components/brand/Wordmark";

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

  if (!seller) return <NotFound />;

  const { data: order } = await supabase
    .from("orders")
    .select("id, code, customer_name, product, status, submitted_at, lat, lng, phone, notes")
    .eq("seller_id", seller.id)
    .eq("code", code)
    .maybeSingle();

  if (!order) return <NotFound />;

  const center =
    seller.default_map_lat != null && seller.default_map_lng != null
      ? { lat: seller.default_map_lat, lng: seller.default_map_lng }
      : PH_CENTER;
  const zoom = seller.default_map_zoom || 14;

  const alreadySubmitted = order.submitted_at != null;
  const delivered = order.status === "delivered";

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      {/* Shop header strip */}
      <header className="border-b border-hair bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-5 py-3">
          <span className="truncate font-display text-base tracking-tight text-ink">
            {seller.display_name}
          </span>
          <Wordmark size="sm" className="text-ink-3" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 pb-12 pt-8">
        {/* Order summary card */}
        <section className="with-crosshairs relative flex flex-col gap-3 border border-hair bg-surface px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              Delivery No.
            </span>
            <span className="rounded-pill border border-hair bg-paper px-2 py-0.5 font-mono text-[11px] text-ink">
              {order.code}
            </span>
          </div>
          <h1 className="font-display text-[32px] leading-[1.05] tracking-tight text-ink sm:text-[40px]">
            Hi {order.customer_name}
            <span className="text-terracotta">.</span>
          </h1>
          <p className="text-sm leading-relaxed text-ink-2">
            {delivered
              ? "This order has been delivered. Thanks for shopping!"
              : alreadySubmitted
                ? "Your delivery location is saved. You can update it any time until we deliver."
                : "Let us know exactly where to drop off your order."}
          </p>
        </section>

        {delivered ? (
          <DeliveredView product={order.product} />
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
      </main>

      <footer className="border-t border-hair/60">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-5 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          <span>Powered by Lokalsyon</span>
          <span>No app required</span>
        </div>
      </footer>
    </div>
  );
}

function DeliveredView({ product }: { product: string }) {
  return (
    <div className="with-crosshairs relative flex flex-col gap-3 border border-mangrove/40 bg-mangrove-soft/50 p-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-mangrove" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mangrove-2">
          Delivered
        </span>
      </div>
      <h2 className="font-display text-2xl text-ink">Your order arrived.</h2>
      <p className="text-sm leading-relaxed text-ink-2">
        Your <span className="font-medium text-ink">{product}</span> has been
        delivered. Hope you enjoy it!
      </p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-start justify-center gap-4 px-5 py-16">
        <Wordmark />
        <h1 className="font-display text-4xl text-ink">Link not found.</h1>
        <p className="text-sm text-ink-2">
          This link isn&rsquo;t valid — it may have been mistyped or the order
          was cancelled. Please ask the seller for a new link.
        </p>
      </main>
    </div>
  );
}
