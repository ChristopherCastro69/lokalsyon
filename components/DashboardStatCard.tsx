type Props = {
  label: string;
  value: string;
  caption?: string;
  accent?: "mangrove" | "terracotta" | "sunfade" | "ink";
};

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  mangrove: "text-mangrove",
  terracotta: "text-terracotta",
  sunfade: "text-sunfade",
  ink: "text-ink",
};

export default function DashboardStatCard({
  label,
  value,
  caption,
  accent = "ink",
}: Props) {
  return (
    <div className="with-crosshairs relative flex flex-col gap-2 border border-hair bg-surface p-4 sm:p-5">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
        {label}
      </span>
      <span
        className={`font-display text-[34px] leading-none tracking-tight sm:text-[42px] ${ACCENT[accent]}`}
      >
        {value}
      </span>
      {caption ? (
        <span className="font-mono text-[11px] text-ink-2">{caption}</span>
      ) : null}
    </div>
  );
}
