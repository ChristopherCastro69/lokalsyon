"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateOrderCode } from "@/lib/codes";
import { getCurrentUser } from "@/lib/seller";
import { computeTotal, summarizeItems } from "@/lib/money";
import type { OrderItem } from "@/lib/types";

const ItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required.").max(120),
  qty: z.coerce.number().int().positive().max(999),
  unit_price: z
    .union([z.coerce.number().nonnegative().max(10_000_000), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? null : Number(v))),
});

const DateOrEmpty = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date."), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

const CreateOrderSchema = z
  .object({
    customer_name: z.string().min(1, "Customer name is required.").max(120),
    items: z
      .array(ItemSchema)
      .min(1, "Add at least one item.")
      .max(50, "Too many items (max 50)."),
    currency: z.string().length(3).default("PHP"),
    order_type: z.enum(["sale", "rental"]).default("sale"),
    scheduled_for: DateOrEmpty,
    rental_end_at: DateOrEmpty,
  })
  .superRefine((val, ctx) => {
    if (val.order_type === "rental") {
      if (!val.scheduled_for) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduled_for"],
          message: "Rental start date is required.",
        });
      }
      if (!val.rental_end_at) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rental_end_at"],
          message: "Rental end date is required.",
        });
      }
      if (
        val.scheduled_for &&
        val.rental_end_at &&
        val.rental_end_at < val.scheduled_for
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rental_end_at"],
          message: "End date must be the same or after start.",
        });
      }
    } else if (val.order_type === "sale") {
      // Sales ignore rental_end_at — zero it out below.
    }
  });

export type CreateOrderState = {
  ok: boolean;
  message: string;
  link?: string;
  code?: string;
  fieldErrors?: {
    customer_name?: string;
    items?: string;
    item_rows?: Array<{ name?: string; qty?: string; unit_price?: string }>;
    scheduled_for?: string;
    rental_end_at?: string;
  };
};

export async function createOrder(
  _prev: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const user = await getCurrentUser();
  if (!user || !user.seller) {
    return { ok: false, message: "You need a seller workspace first." };
  }

  const itemsJsonRaw = (formData.get("items_json") ?? "").toString();
  let itemsRaw: unknown = [];
  try {
    itemsRaw = JSON.parse(itemsJsonRaw || "[]");
  } catch {
    return { ok: false, message: "Item list was malformed." };
  }

  const parsed = CreateOrderSchema.safeParse({
    customer_name: (formData.get("customer_name") ?? "").toString().trim(),
    items: Array.isArray(itemsRaw) ? itemsRaw : [],
    currency: (formData.get("currency") ?? "PHP").toString(),
    order_type: (formData.get("order_type") ?? "sale").toString(),
    scheduled_for: (formData.get("scheduled_for") ?? "").toString(),
    rental_end_at: (formData.get("rental_end_at") ?? "").toString(),
  });

  if (!parsed.success) {
    const fieldErrors: CreateOrderState["fieldErrors"] = {};
    const itemRowErrors: Array<{
      name?: string;
      qty?: string;
      unit_price?: string;
    }> = [];
    for (const issue of parsed.error.issues) {
      const [head, ...rest] = issue.path;
      if (head === "customer_name" && !fieldErrors.customer_name) {
        fieldErrors.customer_name = issue.message;
      } else if (head === "scheduled_for" && !fieldErrors.scheduled_for) {
        fieldErrors.scheduled_for = issue.message;
      } else if (head === "rental_end_at" && !fieldErrors.rental_end_at) {
        fieldErrors.rental_end_at = issue.message;
      } else if (head === "items") {
        if (rest.length === 0 && !fieldErrors.items) {
          fieldErrors.items = issue.message;
        } else {
          const idx = rest[0] as number;
          const field = rest[1] as string | undefined;
          itemRowErrors[idx] = itemRowErrors[idx] ?? {};
          if (field === "name" && !itemRowErrors[idx].name) {
            itemRowErrors[idx].name = issue.message;
          } else if (field === "qty" && !itemRowErrors[idx].qty) {
            itemRowErrors[idx].qty = issue.message;
          } else if (field === "unit_price" && !itemRowErrors[idx].unit_price) {
            itemRowErrors[idx].unit_price = issue.message;
          }
        }
      }
    }
    if (itemRowErrors.length > 0) fieldErrors.item_rows = itemRowErrors;
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const items: OrderItem[] = parsed.data.items.map((it) => ({
    name: it.name,
    qty: it.qty,
    unit_price: it.unit_price,
  }));
  const total = computeTotal(items);
  const productSummary = summarizeItems(items);

  const supabase = await createClient();

  // Sales don't get a rental_end_at even if the form stashed one.
  const rentalEnd =
    parsed.data.order_type === "rental" ? parsed.data.rental_end_at : null;

  let code = "";
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateOrderCode();
    const { error } = await supabase.from("orders").insert({
      seller_id: user.seller.id,
      code,
      customer_name: parsed.data.customer_name,
      product: productSummary,
      items: items,
      total_amount: total,
      currency: parsed.data.currency,
      order_type: parsed.data.order_type,
      scheduled_for: parsed.data.scheduled_for,
      rental_end_at: rentalEnd,
    });
    if (!error) {
      lastError = null;
      break;
    }
    lastError = error.message;
    if (!error.message.toLowerCase().includes("unique")) break;
  }
  if (lastError) {
    return { ok: false, message: lastError };
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${base}/s/${user.seller.slug}/p/${code}`;

  revalidatePath("/admin/orders");

  return {
    ok: true,
    message: "Link generated. Send it to your customer.",
    link,
    code,
  };
}

export async function markDelivered(
  orderId: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.seller) return { ok: false, message: "Not authorized." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("seller_id", user.seller.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function markPending(
  orderId: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.seller) return { ok: false, message: "Not authorized." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "pending", delivered_at: null })
    .eq("id", orderId)
    .eq("seller_id", user.seller.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function deleteOrder(
  orderId: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.seller) return { ok: false, message: "Not authorized." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("seller_id", user.seller.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/orders");
  return { ok: true };
}
