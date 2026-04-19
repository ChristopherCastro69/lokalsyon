import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/seller";
import NewOrderForm from "@/components/NewOrderForm";

export default async function AdminHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  if (!user.seller) {
    if (user.isSuperAdmin) {
      return (
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <header className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              §&nbsp;Super-admin
            </span>
            <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
              You haven&rsquo;t set up a shop yet.
            </h1>
            <p className="text-sm text-ink-2">
              You can create your own seller workspace, or jump straight to
              reviewing the waitlist queue.
            </p>
          </header>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/setup"
              className="inline-flex h-11 items-center rounded-pill bg-ink px-5 text-sm font-medium text-paper hover:bg-mangrove-2"
            >
              Set up my shop →
            </Link>
            <Link
              href="/admin/waitlist"
              className="inline-flex h-11 items-center rounded-pill border border-hair bg-surface px-5 text-sm font-medium text-ink hover:bg-paper-deep"
            >
              Review waitlist
            </Link>
          </div>
        </div>
      );
    }
    redirect("/admin/setup");
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-7">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;New order
        </span>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-ink sm:text-[42px]">
          Who&rsquo;s next?
        </h1>
        <p className="text-sm text-ink-2">
          Give them a name and what they&rsquo;re buying. We&rsquo;ll mint a
          one-use link. They drop a pin. You deliver.
        </p>
      </header>
      <NewOrderForm />
    </div>
  );
}
