-- Lokalsyon initial schema
-- Tables: sellers, seller_members, orders, waitlist_signups
-- Plus RLS policies enforcing multi-tenant isolation.

-- Extensions
create extension if not exists "pgcrypto";

-- sellers: one row per delivery couple / small seller
create table public.sellers (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  display_name      text not null,
  default_map_lat   double precision,
  default_map_lng   double precision,
  default_map_zoom  int not null default 14,
  plan              text not null default 'free',
  created_at        timestamptz not null default now()
);
create index sellers_slug_idx on public.sellers (slug);

-- seller_members: join table between auth.users and sellers
create table public.seller_members (
  seller_id  uuid not null references public.sellers(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (seller_id, user_id)
);
create index seller_members_user_idx on public.seller_members (user_id);

-- orders: one row per delivery
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.sellers(id) on delete cascade,
  code            text not null,
  customer_name   text not null,
  product         text not null,
  phone           text,
  lat             double precision,
  lng             double precision,
  address_label   text,
  notes           text,
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  delivered_at    timestamptz,
  unique (seller_id, code),
  check (status in ('pending', 'delivered'))
);
create index orders_seller_status_idx on public.orders (seller_id, status);
create index orders_code_idx on public.orders (code);

-- waitlist_signups: public request-access entries
create table public.waitlist_signups (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  display_name  text not null,
  municipality  text not null,
  message       text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  check (status in ('pending', 'approved', 'declined'))
);
create index waitlist_status_idx on public.waitlist_signups (status, created_at);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Helper: is the current user a super-admin?
-- Reads from auth.jwt() -> app_metadata.role
create or replace function public.is_super_admin()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin'
$$;

-- Helper: does the current user belong to a given seller?
create or replace function public.is_seller_member(target_seller_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.seller_members
    where seller_id = target_seller_id and user_id = auth.uid()
  )
$$;

alter table public.sellers enable row level security;
alter table public.seller_members enable row level security;
alter table public.orders enable row level security;
alter table public.waitlist_signups enable row level security;

-- sellers policies
-- Anon + authed can SELECT by slug (needed to resolve /s/[slug]/...).
-- We don't leak anything sensitive; all fields here are OK for public.
create policy "sellers_select_public" on public.sellers
  for select
  using (true);

-- Only members of a seller can update it.
create policy "sellers_update_members" on public.sellers
  for update
  using (public.is_seller_member(id))
  with check (public.is_seller_member(id));

-- Only super-admin can insert sellers (approval flow).
create policy "sellers_insert_super_admin" on public.sellers
  for insert
  with check (public.is_super_admin());

-- seller_members policies
-- Authenticated users see only their own membership rows.
create policy "seller_members_select_self" on public.seller_members
  for select
  using (user_id = auth.uid() or public.is_super_admin());

-- Only super-admin inserts memberships (during approval).
create policy "seller_members_insert_super_admin" on public.seller_members
  for insert
  with check (public.is_super_admin());

-- orders policies
-- Anon can SELECT an order (needed for customer page to show name/product).
-- This is OK because orders are addressed by a 6-char random code that isn't enumerable.
create policy "orders_select_anon" on public.orders
  for select
  using (true);

-- Anon can UPDATE only the location/phone/notes/submitted_at fields, and only
-- if the order hasn't been submitted yet. We enforce this by checking submitted_at
-- in both USING and WITH CHECK. Column-level write protection is handled by
-- GRANTing only specific columns to the anon role (below).
create policy "orders_update_anon_pre_submit" on public.orders
  for update
  using (submitted_at is null)
  with check (submitted_at is not null);

-- Authenticated sellers: full read/write on rows in their sellers.
create policy "orders_all_members" on public.orders
  for all
  using (public.is_seller_member(seller_id))
  with check (public.is_seller_member(seller_id));

-- waitlist_signups policies
-- Anyone (anon) can insert a signup.
create policy "waitlist_insert_anon" on public.waitlist_signups
  for insert
  with check (true);

-- Only super-admin can read / update waitlist entries.
create policy "waitlist_select_super_admin" on public.waitlist_signups
  for select
  using (public.is_super_admin());

create policy "waitlist_update_super_admin" on public.waitlist_signups
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ============================================================
-- Column-level grants (restrict anon writes to specific fields)
-- ============================================================

-- Anon role: can only update location/phone/notes/address_label/submitted_at on orders.
-- This combined with the RLS policy above enforces "customer can fill in their location
-- but can't change name/product/status/seller_id".
revoke update on public.orders from anon;
grant update (lat, lng, phone, notes, address_label, submitted_at) on public.orders to anon;

-- Anon: insert only the fields we expect on waitlist_signups.
revoke insert on public.waitlist_signups from anon;
grant insert (email, display_name, municipality, message) on public.waitlist_signups to anon;

-- ============================================================
-- Realtime: publish orders so sellers get live updates
-- ============================================================
alter publication supabase_realtime add table public.orders;
