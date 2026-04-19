-- Prevent the same email from filling waitlist_signups multiple times.
-- Also normalize case so server-side email lookups are reliable.

-- Normalize any historical mixed-case emails first.
update public.waitlist_signups
   set email = lower(email)
 where email <> lower(email);

-- Collapse duplicates (keeping the earliest signup per email).
delete from public.waitlist_signups
 where id not in (
   select distinct on (email) id
     from public.waitlist_signups
   order by email, created_at asc
 );

alter table public.waitlist_signups
  drop constraint if exists waitlist_signups_email_unique,
  add  constraint waitlist_signups_email_unique unique (email);
