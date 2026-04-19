import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import { signOut } from "@/app/actions/auth";

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase"
            >
              Lokalsyon
            </Link>
            {user.seller ? (
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/admin"
                  className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white"
                >
                  New order
                </Link>
                <Link
                  href="/admin/orders"
                  className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white"
                >
                  Orders
                </Link>
                {user.isSuperAdmin ? (
                  <Link
                    href="/admin/waitlist"
                    className="text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white"
                  >
                    Waitlist
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {user.seller?.display_name ?? user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-zinc-500 hover:text-black dark:hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        {children}
      </main>
    </div>
  );
}
