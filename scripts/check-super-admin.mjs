// Verify a user's app_metadata.role and set it to 'super_admin' if their email
// is in public.super_admin_emails but the role wasn't stamped on.
// Run with: node --env-file=.env scripts/check-super-admin.mjs <email>
import { createClient } from "@supabase/supabase-js";

const [, , email] = process.argv;
if (!email) {
  console.error("usage: node --env-file=.env scripts/check-super-admin.mjs <email>");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const user = list.users.find((u) => u.email === email);
if (!user) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}

const role = user.app_metadata?.role;
console.log(`Current app_metadata.role: ${role ?? "(unset)"}`);

if (role === "super_admin") {
  console.log("Already super_admin — nothing to do.");
  process.exit(0);
}

const { data: rows } = await admin
  .from("super_admin_emails")
  .select("email")
  .eq("email", email);

if (!rows || rows.length === 0) {
  console.log("Email not in super_admin_emails — leaving role untouched.");
  process.exit(0);
}

const { error } = await admin.auth.admin.updateUserById(user.id, {
  app_metadata: { ...(user.app_metadata ?? {}), role: "super_admin" },
});
if (error) {
  console.error("updateUserById failed:", error.message);
  process.exit(1);
}
console.log(`Promoted ${email} to super_admin.`);
