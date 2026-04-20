import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.seller) redirect("/admin/setup");

  const seller = user.seller;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;Settings · 1 of 1
        </span>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-ink sm:text-[42px]">
          Edit your shop.
        </h1>
        <p className="text-sm text-ink-2">
          Change your shop name, link, or map center. Old customer links
          keep working automatically.
        </p>
      </header>
      <SettingsForm
        sellerId={seller.id}
        initialDisplayName={seller.display_name}
        initialSlug={seller.slug}
        initialLat={seller.default_map_lat}
        initialLng={seller.default_map_lng}
        initialZoom={seller.default_map_zoom}
      />
    </div>
  );
}
