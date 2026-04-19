"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const WaitlistSchema = z.object({
  email: z.string().email("That doesn't look like an email address."),
  display_name: z
    .string()
    .min(2, "Who's this for?")
    .max(80, "That's a long name — keep it under 80 characters."),
  municipality: z
    .string()
    .min(2, "Which town?")
    .max(80, "Keep the town name under 80 characters."),
  message: z.string().max(500, "Please keep this under 500 characters.").optional(),
});

export type WaitlistFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof WaitlistSchema>, string>>;
};

// Soft-looking "success" response to feed bots without telling them we saw through.
const DECOY_OK: WaitlistFormState = {
  ok: true,
  message:
    "Thanks — we'll be in touch. Approvals are manual, so it may take a day or two.",
};

export async function submitWaitlist(
  _prev: WaitlistFormState,
  formData: FormData,
): Promise<WaitlistFormState> {
  // --- Bot traps (silent) ---------------------------------------------------
  // Honeypot — real browsers don't fill hidden fields.
  if ((formData.get("website") ?? "").toString().trim() !== "") {
    return DECOY_OK;
  }
  // Timing — a human can't fill 4 fields in under 2 seconds.
  const startedAtRaw = (formData.get("form_started_at") ?? "").toString();
  const startedAt = Number(startedAtRaw);
  if (Number.isFinite(startedAt) && Date.now() - startedAt < 2000) {
    return DECOY_OK;
  }

  // --- Per-IP rate limit ----------------------------------------------------
  const ip = await getClientIp();
  const rl = rateLimit(`waitlist:${ip}`, 5, 60 * 60 * 1000); // 5/hour/IP
  if (!rl.allowed) {
    return {
      ok: false,
      message:
        "Too many requests. Please try again in a bit — we're only one small team on the other end.",
    };
  }

  const raw = {
    email: (formData.get("email") ?? "").toString().trim().toLowerCase(),
    display_name: (formData.get("display_name") ?? "").toString().trim(),
    municipality: (formData.get("municipality") ?? "").toString().trim(),
    message: (formData.get("message") ?? "").toString().trim() || undefined,
  };

  const parsed = WaitlistSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: WaitlistFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof WaitlistSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      ok: false,
      message:
        "Server isn't configured yet — Supabase credentials are missing. " +
        "(Dev note: copy .env.local.example to .env.local and fill in the Supabase keys, then restart the dev server.)",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist_signups").insert(parsed.data);
    if (error) {
      // Unique-constraint violation on email → already signed up.
      if (error.code === "23505" || error.message.toLowerCase().includes("unique")) {
        return {
          ok: true,
          message:
            "You're already on the list — we'll reach out as soon as we can. No need to submit again.",
        };
      }
      return {
        ok: false,
        message:
          "We couldn't save your request right now. Please try again in a moment.",
      };
    }
  } catch {
    return {
      ok: false,
      message:
        "We couldn't save your request right now. Please try again in a moment.",
    };
  }

  return {
    ok: true,
    message:
      "Thanks — we'll be in touch. Approvals are manual, so it may take a day or two.",
  };
}
