import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.seller) redirect("/admin");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-7">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          §&nbsp;Setup · 1 of 1
        </span>
        <h1 className="font-display text-[34px] leading-[1.05] tracking-tight text-ink sm:text-[42px]">
          Mark your territory.
        </h1>
        <p className="text-sm text-ink-2">
          One-time setup. Pick a URL slug, name your shop, and drop a pin at
          the center of your municipality — that&rsquo;s what your customers
          will see first when they open a delivery link.
        </p>
      </header>
      <SetupForm />
    </div>
  );
}
