import type { OrderItem } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { formatDate, formatDateRange } from "@/lib/dates";

type Schedule =
  | { kind: "sale"; scheduledFor: string | null }
  | { kind: "rental"; scheduledFor: string; rentalEndAt: string };

type Props = {
  items: OrderItem[];
  totalAmount: number | null;
  currency?: string;
  className?: string;
  heading?: string;
  schedule?: Schedule | null;
};

export default function ItemsReceipt({
  items,
  totalAmount,
  currency = "PHP",
  className,
  heading,
  schedule,
}: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      {heading ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
          {heading}
        </span>
      ) : null}

      {schedule ? <ScheduleStrip schedule={schedule} /> : null}

      <ul className="flex flex-col">
        {items.map((item, i) => {
          const lineTotal =
            item.unit_price != null ? item.unit_price * item.qty : null;
          return (
            <li
              key={i}
              className="flex items-start justify-between gap-3 border-b border-hair/60 py-2 last:border-b-0"
            >
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-3">
                  {item.qty}×
                </span>
                <span className="min-w-0 truncate text-sm text-ink">
                  {item.name}
                </span>
              </div>
              <div className="flex shrink-0 items-baseline gap-2">
                {item.unit_price != null ? (
                  <span className="font-mono text-[11px] tabular-nums text-ink-3">
                    {formatMoney(item.unit_price, currency)}
                  </span>
                ) : null}
                <span className="w-[84px] text-right font-mono text-sm tabular-nums text-ink">
                  {lineTotal != null ? formatMoney(lineTotal, currency) : "—"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="divider-dashed" />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-2">
          Total
        </span>
        <span className="font-display text-xl leading-none text-ink">
          {formatMoney(totalAmount, currency)}
        </span>
      </div>
    </div>
  );
}

function ScheduleStrip({ schedule }: { schedule: Schedule }) {
  if (schedule.kind === "rental") {
    const range = formatDateRange(schedule.scheduledFor, schedule.rentalEndAt);
    if (!range) return null;
    return (
      <div className="flex items-center justify-between gap-3 rounded-field border border-terracotta/30 bg-terracotta-soft/60 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-terracotta-2">
          Rental
        </span>
        <span className="font-mono text-xs tabular-nums text-ink">{range}</span>
      </div>
    );
  }
  if (!schedule.scheduledFor) return null;
  const date = formatDate(schedule.scheduledFor);
  if (!date) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-field border border-mangrove/30 bg-mangrove-soft/60 px-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-mangrove-2">
        Scheduled
      </span>
      <span className="font-mono text-xs tabular-nums text-ink">{date}</span>
    </div>
  );
}
