-- Orders can now have multiple items and a computed total amount.
-- `product` column is kept as a human-readable summary (e.g. "1× blue dress"
-- or "3 items") so existing pin labels / list views don't need big changes.
-- items shape: [{ name: string, qty: integer, unit_price: number | null }]
-- total_amount is set when all items have a unit_price; otherwise null.

alter table public.orders
  add column if not exists items         jsonb        not null default '[]'::jsonb,
  add column if not exists total_amount  numeric(12,2),
  add column if not exists currency      text         not null default 'PHP';

-- Backfill existing rows: wrap their `product` text as a single unpriced item.
update public.orders
   set items = jsonb_build_array(
     jsonb_build_object('name', product, 'qty', 1, 'unit_price', null)
   )
 where items = '[]'::jsonb;

-- Allow anon to see items and total when they open their own delivery link.
-- (The existing orders_select_anon policy already permits SELECT on the row.
-- No additional grant needed since jsonb columns are visible via select.)

-- Keep column-level grants for anon UPDATE tight — customer writes still cannot
-- change items, total_amount, or currency (only lat/lng/phone/notes/address_label/submitted_at).
