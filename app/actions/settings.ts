"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/slugify";

const UpdateSchema = z.object({
  seller_id: z.string().uuid(),
  display_name: z
    .string()
    .min(2, "Give your shop a name.")
    .max(80, "Keep the name under 80 characters."),
  slug: z
    .string()
    .min(2, "Slug needs at least two characters.")
    .max(60, "Slug is too long."),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().int().min(3).max(19).default(14),
});

type FieldKey = "display_name" | "slug" | "lat" | "lng" | "zoom";

export type UpdateSellerState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<FieldKey, string>>;
};

export async function updateSeller(
  _prev: UpdateSellerState,
  formData: FormData,
): Promise<UpdateSellerState> {
  const raw = {
    seller_id: (formData.get("seller_id") ?? "").toString(),
    display_name: (formData.get("display_name") ?? "").toString().trim(),
    slug: slugify((formData.get("slug") ?? "").toString()),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    zoom: formData.get("zoom") ?? 14,
  };

  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<FieldKey, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as FieldKey;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  // Authenticate + authorize: the user must be a member of this seller.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { ok: false, message: "You need to be signed in." };

  const { data: membership } = await supabase
    .from("seller_members")
    .select("seller_id")
    .eq("user_id", user.id)
    .eq("seller_id", parsed.data.seller_id)
    .maybeSingle();
  if (!membership) {
    return { ok: false, message: "You don't have access to this shop." };
  }

  const service = createServiceClient();

  // Fetch the current slug so we can decide whether to archive it as an alias.
  const { data: current } = await service
    .from("sellers")
    .select("slug")
    .eq("id", parsed.data.seller_id)
    .maybeSingle();
  if (!current) {
    return { ok: false, message: "Shop not found." };
  }

  const newSlug = parsed.data.slug;
  const slugChanged = newSlug !== current.slug;

  if (slugChanged) {
    // Reject if another seller already holds this slug.
    const { data: conflictSeller } = await service
      .from("sellers")
      .select("id")
      .eq("slug", newSlug)
      .maybeSingle();
    if (conflictSeller && conflictSeller.id !== parsed.data.seller_id) {
      return {
        ok: false,
        message: "That link is already taken by another shop.",
        fieldErrors: { slug: "Already in use — pick a different one." },
      };
    }
    // Reject if the slug is reserved as a historical alias owned by someone
    // else (i.e. another seller used to live at that URL).
    const { data: conflictAlias } = await service
      .from("seller_slug_aliases")
      .select("seller_id")
      .eq("slug", newSlug)
      .maybeSingle();
    if (conflictAlias && conflictAlias.seller_id !== parsed.data.seller_id) {
      return {
        ok: false,
        message: "That link was used by another shop before — pick a different one.",
        fieldErrors: { slug: "Reserved from a previous shop." },
      };
    }

    // Archive the previous slug so any customer links already in the wild
    // keep resolving. Upsert in case this seller has cycled through this
    // slug before and we already have a stale alias row.
    const { error: aliasErr } = await service
      .from("seller_slug_aliases")
      .upsert(
        { slug: current.slug, seller_id: parsed.data.seller_id },
        { onConflict: "slug" },
      );
    if (aliasErr) {
      return { ok: false, message: `Couldn't archive old link: ${aliasErr.message}` };
    }

    // If the seller is reclaiming one of their own old slugs, drop that
    // alias row so we never have an alias that points to the same slug
    // as the seller's current one.
    await service
      .from("seller_slug_aliases")
      .delete()
      .eq("slug", newSlug)
      .eq("seller_id", parsed.data.seller_id);
  }

  const { error: updateErr } = await service
    .from("sellers")
    .update({
      display_name: parsed.data.display_name,
      slug: newSlug,
      default_map_lat: parsed.data.lat,
      default_map_lng: parsed.data.lng,
      default_map_zoom: parsed.data.zoom,
    })
    .eq("id", parsed.data.seller_id);
  if (updateErr) {
    return { ok: false, message: updateErr.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");

  return {
    ok: true,
    message: slugChanged
      ? "Saved. Old customer links still work — they redirect to the new one."
      : "Saved.",
  };
}
