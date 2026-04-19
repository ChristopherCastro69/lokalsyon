"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

export async function submitWaitlist(
  _prev: WaitlistFormState,
  formData: FormData,
): Promise<WaitlistFormState> {
  const raw = {
    email: (formData.get("email") ?? "").toString().trim(),
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
