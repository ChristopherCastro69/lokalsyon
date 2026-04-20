"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/slugify";

const SetupSchema = z.object({
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

// Upper bound for slug suffix attempts. 100 is plenty — if "jane-and-mark"
// through "jane-and-mark-100" are all taken, something unusual is going on.
const MAX_SLUG_ATTEMPTS = 100;

export async function createSeller(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const raw = {
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

  const baseSlug = slugify(parsed.data.display_name);
  if (baseSlug.length < 2) {
    return {
      ok: false,
      message: "Shop name must contain readable letters or numbers.",
      fieldErrors: {
        display_name:
          "Use at least two letters or numbers — emojis / symbols alone won't work for the URL.",
      },
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, message: "You need to be signed in." };
  }
  const user = userData.user;

  // Service-role client: RLS on sellers/seller_members restricts inserts to
  // super-admins only; setup runs for any authed approved user, so we bypass
  // here. The user's identity is verified above.
  const service = createServiceClient();

  // Gate seller creation on an approved waitlist entry (or super-admin).
  // Defense-in-depth: if Supabase Auth public signup is ever re-enabled,
  // random accounts still can't spin up a seller workspace.
  //
  // We use the service-role client here because RLS on waitlist_signups
  // restricts SELECT to super-admins — a regular approved user can't read
  // their own row through the auth client. Safe: we only query by the
  // email of the already-authenticated user and check one boolean field.
  const isSuperAdmin =
    (user.app_metadata as { role?: string } | null)?.role === "super_admin";
  if (!isSuperAdmin) {
    const email = (user.email ?? "").toLowerCase();
    if (!email) {
      return { ok: false, message: "Your account has no email on file." };
    }
    const { data: entry } = await service
      .from("waitlist_signups")
      .select("status")
      .eq("email", email)
      .maybeSingle();
    if (!entry || entry.status !== "approved") {
      return {
        ok: false,
        message:
          "Your account isn't approved to create a shop. Please request access via the waitlist.",
      };
    }
  }

  // Race-safe unique slug: try baseSlug, then base-2, base-3 ... on unique violation.
  // Also skip slugs already reserved as historical aliases of other sellers,
  // otherwise the new shop would steal an old customer link.
  let sellerId: string | null = null;
  let finalSlug = baseSlug;
  let lastErrorMessage: string | null = null;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    finalSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;

    const { data: aliasHit } = await service
      .from("seller_slug_aliases")
      .select("slug")
      .eq("slug", finalSlug)
      .maybeSingle();
    if (aliasHit) {
      lastErrorMessage = "slug-conflict";
      continue;
    }

    const { data, error } = await service
      .from("sellers")
      .insert({
        slug: finalSlug,
        display_name: parsed.data.display_name,
        default_map_lat: parsed.data.lat,
        default_map_lng: parsed.data.lng,
        default_map_zoom: parsed.data.zoom,
      })
      .select("id")
      .single();
    if (!error && data) {
      sellerId = data.id;
      break;
    }
    // 23505 = unique_violation
    if (
      error &&
      (error.code === "23505" || error.message.toLowerCase().includes("unique"))
    ) {
      lastErrorMessage = "slug-conflict";
      continue;
    }
    return { ok: false, message: error?.message ?? "Couldn't create seller." };
  }

  if (!sellerId) {
    return {
      ok: false,
      message:
        lastErrorMessage === "slug-conflict"
          ? "Too many shops with a similar name — try a more distinctive shop name."
          : "Couldn't create seller.",
    };
  }

  const { error: memberError } = await service.from("seller_members").insert({
    seller_id: sellerId,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    // Rollback the seller row so we don't leave an orphan.
    await service.from("sellers").delete().eq("id", sellerId);
    return { ok: false, message: memberError.message };
  }

  redirect("/admin");
}
