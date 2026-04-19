"use client";

import { useState, useTransition } from "react";
import {
  approveWaitlist,
  declineWaitlist,
  type ApproveResult,
} from "@/app/actions/waitlist-admin";

export type WaitlistEntry = {
  id: string;
  email: string;
  display_name: string;
  municipality: string;
  message: string | null;
  status: "pending" | "approved" | "declined";
  created_at: string;
  reviewed_at: string | null;
};

type Props = {
  entries: WaitlistEntry[];
};

type Filter = "pending" | "approved" | "declined" | "all";

export default function WaitlistReview({ entries }: Props) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [pending, startTransition] = useTransition();
  const [credentials, setCredentials] = useState<Extract<ApproveResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = {
    pending: entries.filter((e) => e.status === "pending").length,
    approved: entries.filter((e) => e.status === "approved").length,
    declined: entries.filter((e) => e.status === "declined").length,
    all: entries.length,
  };

  const filtered = entries.filter((e) => (filter === "all" ? true : e.status === filter));

  function onApprove(id: string, displayName: string) {
    if (
      !confirm(
        `Approve "${displayName}"?\n\nThis will create their Supabase auth user with a fresh password. You'll see the password once to copy; we won't show it again.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await approveWaitlist(id);
      if (result.ok) {
        setCredentials(result);
      } else {
        setError(result.message);
      }
    });
  }

  function onDecline(id: string, displayName: string) {
    if (!confirm(`Decline "${displayName}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await declineWaitlist(id);
      if (!result.ok) setError(result.message ?? "Decline failed.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label={`Pending (${counts.pending})`} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <FilterChip label={`Approved (${counts.approved})`} active={filter === "approved"} onClick={() => setFilter("approved")} />
        <FilterChip label={`Declined (${counts.declined})`} active={filter === "declined"} onClick={() => setFilter("declined")} />
        <FilterChip label={`All (${counts.all})`} active={filter === "all"} onClick={() => setFilter("all")} />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {credentials ? (
        <CredentialsCard credentials={credentials} onDismiss={() => setCredentials(null)} />
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Nothing to review here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-black dark:text-zinc-50">
                    {entry.display_name}
                  </span>
                  <StatusBadge status={entry.status} />
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-mono text-xs">{entry.email}</span>
                  {" • "}
                  <span>{entry.municipality}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  Requested {new Date(entry.created_at).toLocaleString()}
                  {entry.reviewed_at ? (
                    <>
                      {" • Reviewed "}
                      {new Date(entry.reviewed_at).toLocaleString()}
                    </>
                  ) : null}
                </div>
                {entry.message ? (
                  <div className="mt-1 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    &ldquo;{entry.message}&rdquo;
                  </div>
                ) : null}
              </div>

              {entry.status === "pending" ? (
                <div className="flex gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onApprove(entry.id, entry.display_name)}
                    className="inline-flex h-8 items-center rounded-full bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDecline(entry.id, entry.display_name)}
                    className="inline-flex h-8 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    Decline
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-black px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-black"
          : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: WaitlistEntry["status"] }) {
  const cls = {
    pending:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    approved:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    declined:
      "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  }[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}

function CredentialsCard({
  credentials,
  onDismiss,
}: {
  credentials: Extract<ApproveResult, { ok: true }>;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | "both" | null>(null);

  async function copy(text: string, label: "email" | "password" | "both") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const both = `Email: ${credentials.email}\nPassword: ${credentials.password}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            {credentials.userExisted ? "Password reset" : "Seller approved"}
            {credentials.email_sent ? (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                Emailed ✓
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Email not sent
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs opacity-90">
            {credentials.email_sent
              ? `Credentials emailed to ${credentials.email}. Show below in case they need help finding it.`
              : credentials.email_error
                ? `Email failed (${credentials.email_error}). Copy and send via Messenger / Viber instead.`
                : "Gmail isn't configured yet — copy these and send via Messenger / Viber."}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 rounded p-1 text-emerald-900/70 hover:text-emerald-900 dark:text-emerald-100/70 dark:hover:text-emerald-100"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg bg-white/70 p-3 font-mono text-xs text-zinc-800 dark:bg-black/30 dark:text-zinc-100">
        <span className="opacity-70">Email</span>
        <span className="break-all">{credentials.email}</span>
        <button
          type="button"
          onClick={() => copy(credentials.email, "email")}
          className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {copied === "email" ? "Copied" : "Copy"}
        </button>

        <span className="opacity-70">Password</span>
        <span className="break-all">{credentials.password}</span>
        <button
          type="button"
          onClick={() => copy(credentials.password, "password")}
          className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {copied === "password" ? "Copied" : "Copy"}
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => copy(both, "both")}
          className="inline-flex h-9 items-center rounded-full bg-black px-4 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {copied === "both" ? "Copied" : "Copy both"}
        </button>
      </div>
    </div>
  );
}
