import Mark from "./Mark";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function Wordmark({ className, size = "md" }: Props) {
  const layout =
    size === "sm"
      ? "gap-1.5 text-[10px]"
      : size === "lg"
        ? "gap-2.5 text-sm"
        : "gap-2 text-[11px]";

  const markSize = size === "sm" ? 14 : size === "lg" ? 22 : 18;

  return (
    <span
      className={`inline-flex items-center ${layout} font-mono uppercase tracking-[0.22em] text-ink ${className ?? ""}`}
    >
      <Mark size={markSize} />
      Lokalsyon
    </span>
  );
}
