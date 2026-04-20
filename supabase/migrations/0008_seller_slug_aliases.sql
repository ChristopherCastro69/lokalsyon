-- Old slugs are kept here whenever a seller renames, so customer links
-- that were shared under the previous slug still resolve to the right
-- seller (e.g. /s/old-name/p/XYZ123 → seller with new slug new-name).

create table public.seller_slug_aliases (
  slug        text primary key,
  seller_id   uuid not null references public.sellers(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index seller_slug_aliases_seller_idx
  on public.seller_slug_aliases (seller_id);

alter table public.seller_slug_aliases enable row level security;

-- Public SELECT: customer-facing routes resolve aliased slugs without auth.
-- Alias rows hold no sensitive info (slug + seller_id only).
create policy "aliases_select_public" on public.seller_slug_aliases
  for select
  using (true);

-- No INSERT / UPDATE / DELETE policies — writes happen only via the
-- service-role client inside the updateSeller server action.
