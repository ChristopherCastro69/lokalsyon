import Link from "next/link";
import type { RecentActivityItem } from "@/lib/stats";
import { formatMoney } from "@/lib/money";
import { formatDateShort } from "@/lib/dates";

export default function DashboardActivity({
  items,
}: {
  items: RecentActivityItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hair bg-surface/60 py-10 text-center">
        <span className="font-display text-xl text-ink-2">
          No orders yet.
        </span>
        <span className="text-sm text-ink-3">
          Create one from the New tab to get started.
        </span>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-0 overflow-hidden rounded-card border border-hair bg-surface">
      {items.map((it, i) => (
        <li
          key={it.id}
          className={
            i === items.length - 1
              ? ""
              : "border-b border-hair/60"
          }
        >
          <Link
            href={`/admin/orders/${it.id}/route`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-paper-deep/50"
          >
            <StatusDotMini status={it.status} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-base leading-tight text-ink">
                  {it.customer_name}
                </span>
                {it.order_type === "rental" ? (
                  <span className="rounded-pill bg-terracotta-soft px-1.5 py-0 font-mono text-[9px] uppercase tracking-[0.18em] text-terracotta-2">
                    Rental
                  </span>
                ) : null}
              </div>
              <div className="truncate text-xs text-ink-2">{it.product}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {it.total_amount != null ? (
                <span className="font-mono text-sm tabular-nums text-ink">
                  {formatMoney(it.total_amount, it.currency)}
                </span>
              ) : null}
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                {it.scheduled_for
                  ? formatDateShort(it.scheduled_for)
                  : relative(it.created_at)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusDotMini({ status }: { status: RecentActivityItem["status"] }) {
  return (
    <span
      className={
        status === "delivered"
          ? "inline-block h-2 w-2 shrink-0 rounded-full bg-mangrove"
          : "inline-block h-2 w-2 shrink-0 rounded-full bg-terracotta"
      }
      aria-label={status}
    />
  );
}

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
