import { createClient } from "@/lib/supabase/server";

export type ResolvedSeller = {
  id: string;
  slug: string;
  display_name: string;
  default_map_lat: number | null;
  default_map_lng: number | null;
  default_map_zoom: number;
};

const SELLER_COLS =
  "id, slug, display_name, default_map_lat, default_map_lng, default_map_zoom";

/**
 * Resolve a seller by slug for public customer-facing routes. Checks the
 * current slug on `sellers` first, then falls back to `seller_slug_aliases`
 * so links shared under a previous slug keep working after a rename.
 */
export async function resolveSellerBySlug(
  slug: string,
): Promise<ResolvedSeller | null> {
  const supabase = await createClient();

  const { data: direct } = await supabase
    .from("sellers")
    .select(SELLER_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (direct) return direct as ResolvedSeller;

  const { data: alias } = await supabase
    .from("seller_slug_aliases")
    .select(`sellers:seller_id (${SELLER_COLS})`)
    .eq("slug", slug)
    .maybeSingle();
  const aliased = alias?.sellers;
  if (!aliased) return null;
  return (Array.isArray(aliased) ? aliased[0] : aliased) as ResolvedSeller;
}
