"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CredentialsSchema = z.object({
  email: z.string().email("That doesn't look like an email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type SignInState = {
  ok: boolean;
  message: string;
};

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = CredentialsSchema.safeParse({
    email: (formData.get("email") ?? "").toString().trim(),
    password: (formData.get("password") ?? "").toString(),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      ok: false,
      message: "Server isn't configured (Supabase credentials missing).",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
