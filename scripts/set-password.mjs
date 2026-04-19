// One-off: create (or update) a Supabase user with a specific password.
// Run with: node --env-file=.env scripts/set-password.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("usage: node --env-file=.env scripts/set-password.mjs <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listErr) {
  console.error("listUsers failed:", listErr.message);
  process.exit(1);
}

const existing = listData.users.find((u) => u.email === email);

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("updateUserById failed:", error.message);
    process.exit(1);
  }
  console.log(`Updated password for existing user ${email} (id: ${existing.id}).`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  console.log(`Created user ${email} (id: ${data.user?.id}).`);
}
