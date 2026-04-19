-- Super-admin bootstrap
-- Emails listed in public.super_admin_emails automatically get
-- raw_app_meta_data.role = 'super_admin' when their auth.users row is created.
-- is_super_admin() (defined in 0001_init.sql) reads this from the JWT.

create table public.super_admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- Seed Christopher's email.
insert into public.super_admin_emails (email) values ('topitops123@gmail.com')
  on conflict (email) do nothing;

-- Tighten: only super-admins (or no one, before bootstrap) can read/write this table.
alter table public.super_admin_emails enable row level security;

create policy "super_admin_emails_select" on public.super_admin_emails
  for select using (public.is_super_admin());
create policy "super_admin_emails_write" on public.super_admin_emails
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Trigger function: on auth.users insert, if the email is seeded as a
-- super-admin, promote it by writing into raw_app_meta_data.
create or replace function public.assign_super_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.super_admin_emails where email = new.email) then
    new.raw_app_meta_data = coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'super_admin');
  end if;
  return new;
end;
$$;

-- BEFORE INSERT so the modified raw_app_meta_data persists on the insert itself.
drop trigger if exists on_auth_user_created_assign_super_admin on auth.users;
create trigger on_auth_user_created_assign_super_admin
  before insert on auth.users
  for each row execute function public.assign_super_admin_role();

-- If an auth.users row for this email already exists (e.g. you signed up before
-- running this migration), promote it in place.
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || jsonb_build_object('role', 'super_admin')
 where email in (select email from public.super_admin_emails);
