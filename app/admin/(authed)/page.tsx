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
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
              Hello, super-admin.
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              You don&rsquo;t have a seller workspace yet. You can set one up for yourself,
              or jump straight to reviewing waitlist requests.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/setup"
              className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Set up my seller
            </Link>
            <Link
              href="/admin/waitlist"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-black hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          New order
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Generate a link to send to a customer. They drop a pin on a map;
          their location appears in <Link href="/admin/orders" className="underline">Orders</Link>.
        </p>
      </header>
      <NewOrderForm />
    </div>
  );
}
