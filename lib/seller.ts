import { createClient } from "@/lib/supabase/server";

export type Seller = {
  id: string;
  slug: string;
  display_name: string;
  default_map_lat: number | null;
  default_map_lng: number | null;
  default_map_zoom: number;
  plan: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  seller: Seller | null;
};

/**
 * Resolve the authenticated user + their seller (if any) for admin pages.
 * Returns null if not signed in.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const user = userData.user;
  const isSuperAdmin =
    (user.app_metadata as { role?: string } | null)?.role === "super_admin";

  // Look up the first seller this user belongs to. MVP assumes one seller per user.
  const { data: membership } = await supabase
    .from("seller_members")
    .select("seller_id, sellers (id, slug, display_name, default_map_lat, default_map_lng, default_map_zoom, plan)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const seller =
    membership?.sellers && !Array.isArray(membership.sellers)
      ? (membership.sellers as Seller)
      : Array.isArray(membership?.sellers)
        ? (membership.sellers[0] as Seller)
        : null;

  return {
    id: user.id,
    email: user.email ?? "",
    isSuperAdmin,
    seller,
  };
}
