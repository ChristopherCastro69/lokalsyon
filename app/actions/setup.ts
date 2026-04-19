"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const SetupSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters.")
    .max(40, "Slug must be under 40 characters.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens only (e.g. jane-and-mark).",
    ),
  display_name: z
    .string()
    .min(2, "Give your shop a name.")
    .max(80, "Keep the name under 80 characters."),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().int().min(3).max(19).default(14),
});

export type SetupState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof SetupSchema>, string>>;
};

export async function createSeller(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const raw = {
    slug: (formData.get("slug") ?? "").toString().trim().toLowerCase(),
    display_name: (formData.get("display_name") ?? "").toString().trim(),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    zoom: formData.get("zoom") ?? 14,
  };

  const parsed = SetupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SetupState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof SetupSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, message: "You need to be signed in." };
  }
  const user = userData.user;

  // Slug uniqueness pre-check — friendlier error than relying on the DB constraint.
  const { data: existing } = await supabase
    .from("sellers")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      message: "That slug is already taken.",
      fieldErrors: { slug: "That slug is already taken — pick another." },
    };
  }

  // Service-role client: RLS on sellers/seller_members restricts inserts to
  // super-admins only; setup runs for any authed user, so we bypass here.
  // The user's identity is verified above, so we only ever write their own row.
  const service = createServiceClient();

  const { data: seller, error: insertSellerError } = await service
    .from("sellers")
    .insert({
      slug: parsed.data.slug,
      display_name: parsed.data.display_name,
      default_map_lat: parsed.data.lat,
      default_map_lng: parsed.data.lng,
      default_map_zoom: parsed.data.zoom,
    })
    .select("id")
    .single();

  if (insertSellerError || !seller) {
    return {
      ok: false,
      message: insertSellerError?.message ?? "Couldn't create seller.",
    };
  }

  const { error: memberError } = await service.from("seller_members").insert({
    seller_id: seller.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    // Roll back the seller insert so we don't leave an orphan row.
    await service.from("sellers").delete().eq("id", seller.id);
    return { ok: false, message: memberError.message };
  }

  redirect("/admin");
}
