import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { createClient } from "@/lib/supabase/server";
import Wordmark from "@/components/brand/Wordmark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/admin");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-hair/60">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-3">
          <Link href="/" className="text-ink hover:opacity-80">
            <Wordmark size="sm" />
          </Link>
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3 hover:text-ink"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
        <div className="with-crosshairs relative flex flex-col gap-5 border border-hair bg-surface p-7">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
              §&nbsp;Sign in
            </span>
            <h1 className="font-display text-3xl tracking-tight text-ink">
              Seller access
            </h1>
            <p className="text-sm text-ink-2">
              Welcome back. Sign in to manage your shop.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
            >
              Something went wrong with that sign-in. Please try again.
            </p>
          ) : null}

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
