"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateOrderCode } from "@/lib/codes";
import { getCurrentUser } from "@/lib/seller";

const CreateOrderSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required.").max(120),
  product: z.string().min(1, "Product is required.").max(200),
});

export type CreateOrderState = {
  ok: boolean;
  message: string;
  link?: string;
  code?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof CreateOrderSchema>, string>>;
};

export async function createOrder(
  _prev: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  const user = await getCurrentUser();
  if (!user || !user.seller) {
    return { ok: false, message: "You need a seller workspace first." };
  }

  const parsed = CreateOrderSchema.safeParse({
    customer_name: (formData.get("customer_name") ?? "").toString().trim(),
    product: (formData.get("product") ?? "").toString().trim(),
  });
  if (!parsed.success) {
    const fieldErrors: CreateOrderState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof CreateOrderSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }

  const supabase = await createClient();

  // Generate a code, retry on unique-constraint violation (extremely unlikely but cheap).
  let code = "";
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateOrderCode();
    const { error } = await supabase.from("orders").insert({
      seller_id: user.seller.id,
      code,
      customer_name: parsed.data.customer_name,
      product: parsed.data.product,
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

export async function markDelivered(orderId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.seller) {
    return { ok: false, message: "Not authorized." };
  }
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

export async function markPending(orderId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.seller) {
    return { ok: false, message: "Not authorized." };
  }
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

export async function deleteOrder(orderId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.seller) {
    return { ok: false, message: "Not authorized." };
  }
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
