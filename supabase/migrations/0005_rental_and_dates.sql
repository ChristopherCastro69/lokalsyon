-- Orders support two types — 'sale' and 'rental' — plus an optional
-- scheduled delivery date that doubles as the rental start date.
--   order_type:    'sale' (default) or 'rental'
--   scheduled_for: optional delivery date on any order; required for rentals
--   rental_end_at: return date; required for rentals, null for sales

alter table public.orders
  add column if not exists order_type     text not null default 'sale',
  add column if not exists scheduled_for  date,
  add column if not exists rental_end_at  date;

alter table public.orders
  drop constraint if exists orders_type_check,
  add  constraint orders_type_check check (order_type in ('sale', 'rental'));

-- Seatbelt: rentals need both dates and end >= start. Sales don't require either.
alter table public.orders
  drop constraint if exists orders_rental_dates_check,
  add  constraint orders_rental_dates_check check (
    order_type = 'sale'
    or (scheduled_for is not null
        and rental_end_at is not null
        and rental_end_at >= scheduled_for)
  );

-- Dashboard queries: "upcoming in 7 days" hits scheduled_for;
-- "active rentals today" hits both scheduled_for and rental_end_at.
create index if not exists orders_seller_scheduled_idx
  on public.orders (seller_id, scheduled_for);

create index if not exists orders_seller_rental_end_idx
  on public.orders (seller_id, rental_end_at)
  where order_type = 'rental';
