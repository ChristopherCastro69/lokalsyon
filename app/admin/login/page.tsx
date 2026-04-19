import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Already signed in? Skip the form.
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/admin");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <Link
          href="/"
          className="text-xs font-mono tracking-[0.2em] text-zinc-500 uppercase"
        >
          ← Lokalsyon
        </Link>
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Sign in
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Admin access only.
          </p>
        </header>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            Something went wrong with that sign-in. Please try again.
          </p>
        ) : null}

        <LoginForm />
      </div>
    </div>
  );
}
