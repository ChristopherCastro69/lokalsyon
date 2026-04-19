"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";

const initialState: SignInState = { ok: false, message: "" };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white dark:focus:ring-white/10"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-white dark:focus:ring-white/10"
        />
      </label>

      {state.message && !state.ok ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
