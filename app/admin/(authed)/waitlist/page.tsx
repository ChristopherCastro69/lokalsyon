import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import { createClient } from "@/lib/supabase/server";
import WaitlistReview, { type WaitlistEntry } from "@/components/WaitlistReview";

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.isSuperAdmin) redirect("/admin");

  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("waitlist_signups")
    .select("id, email, display_name, municipality, message, status, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Waitlist
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Review signups from the landing page. Approving creates their Supabase
          auth user with a starter password.
        </p>
      </header>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Couldn&rsquo;t load waitlist entries: {error.message}
        </p>
      ) : (
        <WaitlistReview entries={(entries ?? []) as WaitlistEntry[]} />
      )}
    </div>
  );
}
