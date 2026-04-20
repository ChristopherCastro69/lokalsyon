import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const BUCKET = "order-photos";
const MAX_PHOTOS = 2;
const MAX_BYTES = 800 * 1024; // 800 KB post-compression upper bound

type Ctx = { params: Promise<{ slug: string; code: string }> };

/**
 * Resolve the order by (slug, code) using the anon client (RLS allows a
 * SELECT on both tables). Returns null on any mismatch.
 */
async function resolveOrder(slug: string, code: string) {
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!seller) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, photos")
    .eq("seller_id", seller.id)
    .eq("code", code)
    .maybeSingle();
  if (!order) return null;

  return { sellerId: seller.id as string, order };
}

export async function POST(request: Request, ctx: Ctx) {
  const { slug, code } = await ctx.params;

  // Defense in depth: UI hides the uploader in lite mode, but if somehow
  // a Save-Data request reaches us we refuse rather than burn their data.
  if (request.headers.get("save-data")?.toLowerCase() === "on") {
    return NextResponse.json(
      { ok: false, message: "Upload blocked in data-saver mode." },
      { status: 413 },
    );
  }

  const ip = await getClientIp();
  const perCode = rateLimit(`photo_upload:code:${code}`, 3, 60 * 60 * 1000);
  if (!perCode.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many photo uploads on this order." },
      { status: 429 },
    );
  }
  const perIp = rateLimit(`photo_upload:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!perIp.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many uploads from this device." },
      { status: 429 },
    );
  }

  const resolved = await resolveOrder(slug, code);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, message: "Order not found." },
      { status: 404 },
    );
  }
  const { order } = resolved;

  if (order.status !== "pending") {
    return NextResponse.json(
      { ok: false, message: "This order is locked." },
      { status: 409 },
    );
  }
  const currentPhotos: string[] = order.photos ?? [];
  if (currentPhotos.length >= MAX_PHOTOS) {
    return NextResponse.json(
      { ok: false, message: `Up to ${MAX_PHOTOS} photos only.` },
      { status: 409 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { ok: false, message: "Missing file." },
      { status: 400 },
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, message: "Only image uploads are allowed." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Photo is too large." },
      { status: 413 },
    );
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const objectPath = `${order.id}/${crypto.randomUUID()}.${ext}`;

  const service = createServiceClient();
  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { ok: false, message: uploadError.message },
      { status: 500 },
    );
  }

  const { data: pub } = service.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;
  const newPhotos = [...currentPhotos, publicUrl];

  const { error: updateError } = await service
    .from("orders")
    .update({ photos: newPhotos })
    .eq("id", order.id);
  if (updateError) {
    // Clean up the orphan object.
    await service.storage.from(BUCKET).remove([objectPath]);
    return NextResponse.json(
      { ok: false, message: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, url: publicUrl, photos: newPhotos });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { slug, code } = await ctx.params;

  const body = (await request.json().catch(() => null)) as
    | { url?: string }
    | null;
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { ok: false, message: "Missing url." },
      { status: 400 },
    );
  }

  const resolved = await resolveOrder(slug, code);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, message: "Order not found." },
      { status: 404 },
    );
  }
  const { order } = resolved;
  if (order.status !== "pending") {
    return NextResponse.json(
      { ok: false, message: "This order is locked." },
      { status: 409 },
    );
  }

  const currentPhotos: string[] = order.photos ?? [];
  if (!currentPhotos.includes(url)) {
    return NextResponse.json(
      { ok: false, message: "Photo not found on this order." },
      { status: 404 },
    );
  }

  // Extract the object path after the bucket prefix.
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  const service = createServiceClient();
  if (idx !== -1) {
    const objectPath = url.slice(idx + marker.length);
    await service.storage.from(BUCKET).remove([objectPath]);
    // Ignore storage-side removal errors — the source of truth is the
    // orders.photos array; unlinking it is the real user-visible outcome.
  }

  const newPhotos = currentPhotos.filter((u) => u !== url);
  const { error: updateError } = await service
    .from("orders")
    .update({ photos: newPhotos })
    .eq("id", order.id);
  if (updateError) {
    return NextResponse.json(
      { ok: false, message: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, photos: newPhotos });
}
