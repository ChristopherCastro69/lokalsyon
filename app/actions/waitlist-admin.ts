"use server";

import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isGmailConfigured, sendGmail } from "@/lib/gmail";
import {
  sellerWelcomeHtml,
  sellerWelcomeSubject,
  sellerWelcomeText,
} from "@/lib/emails/seller-welcome";

// Password alphabet: mixed-case + digits, skipping easily-confused characters
// (0/O, 1/l/I, etc) so it's readable when you paste it into a chat.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstvwxyzABCDEFGHJKLMNPQRSTVWXYZ23456789";
const generatePassword = customAlphabet(PASSWORD_ALPHABET, 12);

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const isSuperAdmin =
    (user?.app_metadata as { role?: string } | null)?.role === "super_admin";
  if (!user || !isSuperAdmin) {
    throw new Error("Not authorized.");
  }
}

export type ApproveResult =
  | {
      ok: true;
      email: string;
      password: string;
      userExisted: boolean;
      email_sent: boolean;
      email_error?: string;
    }
  | { ok: false; message: string };

export async function approveWaitlist(waitlistId: string): Promise<ApproveResult> {
  try {
    await requireSuperAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const service = createServiceClient();

  const { data: entry, error: entryError } = await service
    .from("waitlist_signups")
    .select("id, email, display_name, municipality, status")
    .eq("id", waitlistId)
    .maybeSingle();

  if (entryError || !entry) {
    return { ok: false, message: "Waitlist entry not found." };
  }
  if (entry.status !== "pending") {
    return { ok: false, message: `This entry is already ${entry.status}.` };
  }

  const password = generatePassword();

  // Does an auth user already exist for this email?
  const { data: list, error: listError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    return { ok: false, message: listError.message };
  }
  const existing = list.users.find((u) => u.email === entry.email);

  let userExisted = false;
  if (existing) {
    userExisted = true;
    const { error: updateErr } = await service.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateErr) {
      return { ok: false, message: `Couldn't set password: ${updateErr.message}` };
    }
  } else {
    const { error: createErr } = await service.auth.admin.createUser({
      email: entry.email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      return { ok: false, message: `Couldn't create user: ${createErr.message}` };
    }
  }

  const { error: waitlistErr } = await service
    .from("waitlist_signups")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", entry.id);
  if (waitlistErr) {
    return { ok: false, message: waitlistErr.message };
  }

  // Best-effort email. Never blocks approval — the super-admin still gets the
  // credentials in the UI so they can copy-and-DM if email fails.
  let email_sent = false;
  let email_error: string | undefined;
  if (isGmailConfigured()) {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin/login`;
    const params = {
      displayName: entry.display_name,
      email: entry.email,
      password,
      loginUrl,
    };
    const send = await sendGmail({
      to: entry.email,
      subject: sellerWelcomeSubject(),
      text: sellerWelcomeText(params),
      html: sellerWelcomeHtml(params),
    });
    email_sent = send.ok;
    if (!send.ok) email_error = send.error;
  }

  revalidatePath("/admin/waitlist");
  return { ok: true, email: entry.email, password, userExisted, email_sent, email_error };
}

export async function declineWaitlist(waitlistId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await requireSuperAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("waitlist_signups")
    .update({ status: "declined", reviewed_at: new Date().toISOString() })
    .eq("id", waitlistId)
    .eq("status", "pending");
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/waitlist");
  return { ok: true };
}
