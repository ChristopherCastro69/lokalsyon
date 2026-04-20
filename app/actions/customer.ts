"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveSellerBySlug } from "@/lib/seller-resolve";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

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
  // Rate-limit pin updates both per-code (catches someone spamming one link)
  // and per-IP (catches one person blasting many codes).
  const ip = await getClientIp();
  const perCode = rateLimit(`customer_submit:code:${code}`, 30, 60 * 60 * 1000);
  if (!perCode.allowed) {
    return {
      ok: false,
      message: "Too many updates on this link. Try again in an hour.",
    };
  }
  const perIp = rateLimit(`customer_submit:ip:${ip}`, 60, 60 * 60 * 1000);
  if (!perIp.allowed) {
    return {
      ok: false,
      message: "Too many submissions from this device. Try again in a bit.",
    };
  }

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

  // Resolve seller by slug — falls back to historical slug aliases so links
  // shared under a previous name still update the correct seller's orders.
  const seller = await resolveSellerBySlug(slug);
  if (!seller) {
    return { ok: false, message: "This link isn't valid anymore." };
  }

  const supabase = await createClient();

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
