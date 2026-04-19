import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS.
 *
 * USE SPARINGLY — only for privileged server-side actions like:
 *   - super-admin approving a waitlist entry (creates user + seller + membership in one txn)
 *   - trusted cron jobs
 *
 * NEVER import this from a client component or expose the service key.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
