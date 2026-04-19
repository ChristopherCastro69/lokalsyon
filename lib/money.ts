// Currency formatting. PHP is the default for Lokalsyon.
// Keep it dumb-simple — no i18n, just the symbol and grouped digits.

const SYMBOLS: Record<string, string> = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
};

export function formatMoney(
  amount: number | null | undefined,
  currency = "PHP",
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const sym = SYMBOLS[currency] ?? currency + " ";
  const fixed = amount.toFixed(2);
  const [int, dec] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sym}${grouped}.${dec}`;
}

import type { OrderItem } from "./types";

/** Sum line totals. Returns null if any item is missing a unit_price. */
export function computeTotal(items: OrderItem[]): number | null {
  if (items.length === 0) return null;
  let sum = 0;
  for (const it of items) {
    if (it.unit_price == null) return null;
    sum += it.unit_price * it.qty;
  }
  return +sum.toFixed(2);
}

/** Short human summary used as the `product` column and pin labels. */
export function summarizeItems(items: OrderItem[]): string {
  if (items.length === 0) return "(no items)";
  if (items.length === 1) {
    const it = items[0];
    return it.qty > 1 ? `${it.qty}× ${it.name}` : it.name;
  }
  const first = items[0];
  const firstStr = first.qty > 1 ? `${first.qty}× ${first.name}` : first.name;
  return `${firstStr} + ${items.length - 1} more`;
}
