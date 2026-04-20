-- Customer can attach up to 2 landmark photos to an order. Photos live
-- in a public Supabase Storage bucket; paths are keyed by order id +
-- UUID so URLs are unguessable. Writes happen only via our server
-- route handler (service-role key), so anon Storage policies stay off.

alter table public.orders
  add column if not exists photos text[] not null default '{}';

alter table public.orders
  drop constraint if exists orders_photos_max,
  add  constraint orders_photos_max
    check (array_length(photos, 1) is null or array_length(photos, 1) <= 2);

-- Public bucket. public=true means objects are fetchable without auth,
-- which is fine because each object lives under a UUID path the admin
-- UI is the only source of. Insert conflict-safe for re-runs.
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;
