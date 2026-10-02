-- Review-only profile repair SQL.
-- This file is not executed automatically.

-- 1. Define the auth.users -> public.profiles trigger function.
--    Signup metadata is mapped to the existing profiles columns.
--    Invalid or missing roles fall back to customer.
--    Invalid or missing names fall back to Thekedar User.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  requested_name text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';
  requested_name := trim(new.raw_user_meta_data ->> 'full_name');

  if requested_role not in (
    'customer',
    'contractor',
    'worker',
    'machine_owner',
    'tanker_owner',
    'material_supplier'
  ) then
    requested_role := 'customer';
  end if;

  if requested_name is null
     or char_length(requested_name) not between 2 and 120 then
    requested_name := 'Thekedar User';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    role
  )
  values (
    new.id,
    requested_name,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    requested_role::public.user_role
  )
  on conflict do nothing;

  return new;
end;
$$;

-- 2. Create the trigger if it is missing, or re-enable it if it exists.
--    This does not delete users, profiles, or tables.
do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    alter table auth.users enable trigger on_auth_user_created;
  else
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  end if;
end;
$$;

-- 3. Backfill existing Auth users that do not have a public.profiles row.
--    Existing profiles are preserved. Duplicate IDs and duplicate emails are skipped.
--    Values are sourced from auth.users and its raw_user_meta_data.
insert into public.profiles (
  id,
  full_name,
  email,
  phone,
  role
)
select
  u.id,
  case
    when char_length(trim(u.raw_user_meta_data ->> 'full_name')) between 2 and 120
      then trim(u.raw_user_meta_data ->> 'full_name')
    else 'Thekedar User'
  end,
  u.email,
  nullif(trim(u.raw_user_meta_data ->> 'phone'), ''),
  case
    when u.raw_user_meta_data ->> 'role' in (
      'customer',
      'contractor',
      'worker',
      'machine_owner',
      'tanker_owner',
      'material_supplier'
    )
      then (u.raw_user_meta_data ->> 'role')::public.user_role
    else 'customer'::public.user_role
  end
from auth.users u
where u.email is not null
  and not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  )
  and not exists (
    select 1
    from public.profiles p
    where p.email = u.email
  )
on conflict do nothing;
