// Dumb date helpers. No date libraries. All dates are ISO strings (YYYY-MM-DD)
// treated as calendar dates — time of day is never relevant to rentals or
// scheduled deliveries in Lokalsyon.

/** Parse a YYYY-MM-DD string to a local-midnight Date. Returns null on invalid. */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Convert a Date to a local-calendar YYYY-MM-DD string. */
export function toIsoDate(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's YYYY-MM-DD in local time. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** "Apr 20 · Sat" for a YYYY-MM-DD (or empty string if invalid). */
export function formatDate(iso: string | null | undefined): string {
  const dt = parseDate(iso);
  if (!dt) return "";
  const mon = dt.toLocaleDateString("en-US", { month: "short" });
  const day = dt.getDate();
  const wk = dt.toLocaleDateString("en-US", { weekday: "short" });
  return `${mon} ${day} · ${wk}`;
}

/** Shorter "Apr 20" form, for dense pills. */
export function formatDateShort(iso: string | null | undefined): string {
  const dt = parseDate(iso);
  if (!dt) return "";
  const mon = dt.toLocaleDateString("en-US", { month: "short" });
  return `${mon} ${dt.getDate()}`;
}

/**
 * Range like "Apr 20 → Apr 23 · 4 days". Same-month collapses to
 * "Apr 20 → 23". Empty if either date invalid.
 */
export function formatDateRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  if (!start || !end) return "";
  const days = daysBetween(startIso!, endIso!) + 1;
  const startMon = start.toLocaleDateString("en-US", { month: "short" });
  const endMon = end.toLocaleDateString("en-US", { month: "short" });
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const rangeText = sameMonth
    ? `${startMon} ${start.getDate()} → ${end.getDate()}`
    : `${startMon} ${start.getDate()} → ${endMon} ${end.getDate()}`;
  return `${rangeText} · ${days} ${days === 1 ? "day" : "days"}`;
}

/** Calendar-day difference end - start. Same day → 0. */
export function daysBetween(aIso: string, bIso: string): number {
  const a = parseDate(aIso);
  const b = parseDate(bIso);
  if (!a || !b) return 0;
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / MS);
}

/** Inclusive containment: today in [start, end]. */
export function isWithin(
  todayIsoStr: string,
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): boolean {
  if (!startIso || !endIso) return false;
  return todayIsoStr >= startIso && todayIsoStr <= endIso;
}

/** ISO of N days from today (can be negative). */
export function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Monday of the current week, in local time (for "this week" stats). */
export function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toIsoDate(d);
}
