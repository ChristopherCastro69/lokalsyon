import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/seller";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.seller) redirect("/admin");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Set up your seller
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          One-time setup. You can change the map center later from settings.
        </p>
      </header>
      <SetupForm />
    </div>
  );
}
