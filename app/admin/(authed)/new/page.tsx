import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import NewOrderForm from "@/components/NewOrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.seller) redirect("/admin/setup");

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
          Sale or rental — add items, prices, and a date. We&rsquo;ll mint a
          one-use link for the customer to drop their pin.
        </p>
      </header>
      <NewOrderForm />
    </div>
  );
}
