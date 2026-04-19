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
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;Super-admin · Waitlist
        </span>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-ink sm:text-[42px]">
          Who&rsquo;s knocking?
        </h1>
        <p className="text-sm text-ink-2">
          Approve a signup and we&rsquo;ll email their starter credentials
          straight from your Gmail.
        </p>
      </header>
      {error ? (
        <p
          role="alert"
          className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
        >
          Couldn&rsquo;t load waitlist: {error.message}
        </p>
      ) : (
        <WaitlistReview entries={(entries ?? []) as WaitlistEntry[]} />
      )}
    </div>
  );
}
