import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import { getSellerStats } from "@/lib/stats";
import { formatMoney } from "@/lib/money";
import DashboardStatCard from "@/components/DashboardStatCard";
import DashboardActivity from "@/components/DashboardActivity";

export const dynamic = "force-dynamic";

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

  const stats = await getSellerStats(user.seller.id);

  const weekRevenue = stats.deliveredThisWeek.revenue;
  const revenueValue =
    weekRevenue != null ? formatMoney(weekRevenue, "PHP") : "—";

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
            §&nbsp;Dashboard · {user.seller.display_name}
          </span>
          <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-ink sm:text-[42px]">
            How&rsquo;s it going?
          </h1>
          <p className="text-sm text-ink-2">
            A quick read on this week&rsquo;s activity, plus what&rsquo;s up next.
          </p>
        </div>
        <Link
          href="/admin/new"
          className="hidden shrink-0 items-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-paper hover:bg-mangrove-2 sm:inline-flex sm:h-11"
        >
          New order ↗
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <DashboardStatCard
          label="Pending"
          value={String(stats.pendingCount)}
          caption={stats.pendingCount === 0 ? "all caught up" : "to be delivered"}
          accent="terracotta"
        />
        <DashboardStatCard
          label="Delivered / wk"
          value={String(stats.deliveredThisWeek.count)}
          caption={revenueValue}
          accent="mangrove"
        />
        <DashboardStatCard
          label="Active rentals"
          value={String(stats.activeRentalsToday)}
          caption="today"
          accent="sunfade"
        />
        <DashboardStatCard
          label="Upcoming / 7d"
          value={String(stats.upcomingWeek)}
          caption="scheduled ahead"
          accent="ink"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
            §&nbsp;Recent activity
          </span>
          <Link
            href="/admin/orders"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
          >
            View all →
          </Link>
        </div>
        <DashboardActivity items={stats.recent} />
      </section>

      {/* Mobile-only new-order CTA */}
      <div className="sm:hidden">
        <Link
          href="/admin/new"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink px-5 text-sm font-medium text-paper hover:bg-mangrove-2"
        >
          New order ↗
        </Link>
      </div>
    </div>
  );
}
