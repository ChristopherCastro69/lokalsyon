import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import { signOut } from "@/app/actions/auth";
import Wordmark from "@/components/brand/Wordmark";
import AdminBottomNav from "@/components/AdminBottomNav";

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const hasSeller = Boolean(user.seller);

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar — compact on mobile, fuller on desktop */}
      <header className="sticky top-0 z-20 border-b border-hair bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-8 sm:py-3">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="text-ink hover:opacity-80">
              <Wordmark size="sm" />
            </Link>
            {/* Desktop nav */}
            {hasSeller ? (
              <nav className="hidden items-center gap-1 sm:flex">
                <TopLink href="/admin">Home</TopLink>
                <TopLink href="/admin/new">New order</TopLink>
                <TopLink href="/admin/orders">Orders</TopLink>
                {user.isSuperAdmin ? (
                  <TopLink href="/admin/waitlist">Waitlist</TopLink>
                ) : null}
              </nav>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {user.seller ? (
              <span className="hidden max-w-[180px] truncate font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 sm:inline">
                {user.seller.display_name}
              </span>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-pill border border-hair bg-surface px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2 hover:bg-paper-deep hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        {/* Sub-bar: seller slug pill (helps you remember your /s/slug URL) */}
        {user.seller ? (
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 border-t border-hair/60 px-4 py-1.5 sm:px-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              Link prefix
            </span>
            <span className="rounded-pill border border-hair bg-surface px-2 py-0.5 font-mono text-[11px] text-ink">
              /s/{user.seller.slug}/p/
            </span>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-8 sm:py-8 sm:pb-8">
        {children}
      </main>

      <AdminBottomNav hasSeller={hasSeller} isSuperAdmin={user.isSuperAdmin} />
    </div>
  );
}

function TopLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-pill px-3 py-1 text-sm text-ink-2 hover:bg-surface hover:text-ink"
    >
      {children}
    </Link>
  );
}
