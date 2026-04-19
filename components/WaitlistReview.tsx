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

type Filter = "pending" | "approved" | "declined" | "all";

export default function WaitlistReview({
  entries,
}: {
  entries: WaitlistEntry[];
}) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [pending, startTransition] = useTransition();
  const [credentials, setCredentials] = useState<
    Extract<ApproveResult, { ok: true }> | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const counts = {
    pending: entries.filter((e) => e.status === "pending").length,
    approved: entries.filter((e) => e.status === "approved").length,
    declined: entries.filter((e) => e.status === "declined").length,
    all: entries.length,
  };

  const filtered = entries.filter((e) =>
    filter === "all" ? true : e.status === filter,
  );

  function onApprove(id: string, displayName: string) {
    if (
      !confirm(
        `Approve "${displayName}"?\n\nThis creates their Supabase user with a fresh password and emails it to them. You'll see the password once — save or copy if needed.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await approveWaitlist(id);
      if (result.ok) setCredentials(result);
      else setError(result.message);
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
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip label="Pending" count={counts.pending} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <FilterChip label="Approved" count={counts.approved} active={filter === "approved"} onClick={() => setFilter("approved")} />
        <FilterChip label="Declined" count={counts.declined} active={filter === "declined"} onClick={() => setFilter("declined")} />
        <FilterChip label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-field border border-brick/40 bg-brick-soft px-3 py-2 text-sm text-brick"
        >
          {error}
        </p>
      ) : null}

      {credentials ? (
        <CredentialsCard
          credentials={credentials}
          onDismiss={() => setCredentials(null)}
        />
      ) : null}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hair bg-surface/60 py-10 text-center">
          <span className="font-display text-xl text-ink-2">Quiet here.</span>
          <span className="text-sm text-ink-3">
            Nothing matches this filter.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-3 rounded-card border border-hair bg-surface p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-lg leading-tight text-ink">
                      {entry.display_name}
                    </span>
                    <StatusDot status={entry.status} />
                  </div>
                  <div className="truncate text-sm text-ink-2">
                    {entry.municipality}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <a
                  href={`mailto:${entry.email}`}
                  className="font-mono text-ink-2 underline-offset-2 hover:underline"
                >
                  {entry.email}
                </a>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                {entry.reviewed_at ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                    · reviewed {new Date(entry.reviewed_at).toLocaleString()}
                  </span>
                ) : null}
              </div>

              {entry.message ? (
                <p className="rounded-field border border-hair bg-paper px-3 py-1.5 text-sm italic text-ink-2">
                  &ldquo;{entry.message}&rdquo;
                </p>
              ) : null}

              {entry.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onApprove(entry.id, entry.display_name)}
                    className="inline-flex h-9 items-center rounded-pill bg-mangrove px-4 font-mono text-[11px] uppercase tracking-[0.15em] text-paper hover:bg-mangrove-2 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDecline(entry.id, entry.display_name)}
                    className="inline-flex h-9 items-center rounded-pill border border-hair bg-surface px-4 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-2 hover:bg-paper-deep disabled:opacity-50"
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
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex shrink-0 items-center gap-2 rounded-pill bg-ink px-3.5 py-1.5 text-sm font-medium text-paper"
          : "inline-flex shrink-0 items-center gap-2 rounded-pill border border-hair bg-surface px-3.5 py-1.5 text-sm text-ink-2 hover:bg-paper-deep hover:text-ink"
      }
    >
      {label}
      <span
        className={`font-mono text-[11px] ${active ? "opacity-70" : "text-ink-3"}`}
      >
        {count}
      </span>
    </button>
  );
}

function StatusDot({ status }: { status: WaitlistEntry["status"] }) {
  const conf = {
    pending: {
      cls: "bg-terracotta-soft text-terracotta-2",
      dot: "bg-terracotta",
      label: "Pending",
    },
    approved: {
      cls: "bg-mangrove-soft text-mangrove-2",
      dot: "bg-mangrove",
      label: "Approved",
    },
    declined: {
      cls: "bg-sand-soft text-ink-2",
      dot: "bg-ink-3",
      label: "Declined",
    },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${conf.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      {conf.label}
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
    <div className="with-crosshairs relative flex flex-col gap-4 border border-mangrove/40 bg-mangrove-soft/40 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-mangrove" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mangrove-2">
              {credentials.userExisted ? "Password reset" : "Approved"}
            </span>
            {credentials.email_sent ? (
              <span className="rounded-pill bg-mangrove px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
                Emailed ✓
              </span>
            ) : (
              <span className="rounded-pill bg-sunfade/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
                Email not sent
              </span>
            )}
          </div>
          <p className="text-xs text-ink-2">
            {credentials.email_sent
              ? `Credentials emailed to ${credentials.email}. Visible here once in case you need to re-share.`
              : credentials.email_error
                ? `Email failed: ${credentials.email_error}. Copy and DM instead.`
                : "Gmail isn't configured — copy and send via Messenger/Viber."}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 rounded p-1 text-ink-3 hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 rounded-field border border-mangrove/20 bg-paper px-4 py-3 font-mono text-[12px] text-ink">
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-3">
          Email
        </span>
        <span className="break-all">{credentials.email}</span>
        <button
          type="button"
          onClick={() => copy(credentials.email, "email")}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-mangrove-2 hover:underline"
        >
          {copied === "email" ? "Copied" : "Copy"}
        </button>

        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-3">
          Password
        </span>
        <span className="break-all">{credentials.password}</span>
        <button
          type="button"
          onClick={() => copy(credentials.password, "password")}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-mangrove-2 hover:underline"
        >
          {copied === "password" ? "Copied" : "Copy"}
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => copy(both, "both")}
          className="inline-flex h-10 items-center rounded-pill bg-ink px-4 text-xs font-medium text-paper hover:bg-mangrove-2"
        >
          {copied === "both" ? "Copied both" : "Copy both"}
        </button>
      </div>
    </div>
  );
}
