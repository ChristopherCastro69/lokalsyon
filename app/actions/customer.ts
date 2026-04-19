"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SubmitSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  phone: z
    .string()
    .min(1, "Phone number is required.")
    .max(30, "Keep the phone number under 30 characters.")
    .refine(
      (v) => /^(09\d{9}|(\+?63)9\d{9})$/.test(v.replace(/[\s-]/g, "")),
      "Enter a valid PH mobile number (e.g. 09171234567 or +639171234567).",
    ),
  notes: z.string().max(280, "Keep notes under 280 characters.").optional(),
});

export type SubmitLocationState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof SubmitSchema>, string>>;
};

export async function submitLocation(
  slug: string,
  code: string,
  _prev: SubmitLocationState,
  formData: FormData,
): Promise<SubmitLocationState> {
  const raw = {
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    phone: (formData.get("phone") ?? "").toString().trim(),
    notes: (formData.get("notes") ?? "").toString().trim() || undefined,
  };

  const parsed = SubmitSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SubmitLocationState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof SubmitSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();

  // Resolve seller by slug (anon SELECT is allowed).
  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (sellerError || !seller) {
    return { ok: false, message: "This link isn't valid anymore." };
  }

  // Update the specific order. RLS restricts anon UPDATE to:
  //   - rows where status = 'pending' (the seller can lock editing by marking delivered)
  //   - columns lat, lng, phone, notes, address_label, submitted_at (column-level grant)
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      phone: parsed.data.phone,
      notes: parsed.data.notes ?? null,
      submitted_at: new Date().toISOString(),
    })
    .eq("seller_id", seller.id)
    .eq("code", code)
    .eq("status", "pending")
    .select("id, submitted_at")
    .maybeSingle();

  if (updateError) {
    return { ok: false, message: updateError.message };
  }
  if (!updated) {
    // Either the row doesn't exist or the order is already delivered.
    return {
      ok: false,
      message: "This order has already been delivered — the location is locked.",
    };
  }

  return { ok: true, message: "Thanks! We'll message you before we arrive." };
}
