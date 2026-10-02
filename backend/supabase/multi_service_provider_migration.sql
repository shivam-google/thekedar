-- Apply after schema.sql on an existing Supabase project. Safe to re-run.
-- Preserves accounts and listings; do not re-run schema.sql on a populated project.
begin;

alter table public.worker_profiles alter column user_id drop not null;
alter table public.worker_profiles add column if not exists provider_id uuid references public.profiles(id) on delete cascade;
alter table public.worker_profiles add column if not exists display_name text;
alter table public.worker_profiles drop constraint if exists worker_profiles_identity_check;
alter table public.worker_profiles add constraint worker_profiles_identity_check check (
  (user_id is not null and provider_id is null and display_name is null)
  or (user_id is null and provider_id is not null and display_name is not null and char_length(trim(display_name)) between 2 and 120)
);
create index if not exists worker_profiles_provider_idx on public.worker_profiles(provider_id);
create index if not exists bookings_item_idx on public.bookings(item_type, item_id);

-- Coordinates are optional for legacy records and must be supplied as a pair.
do $$
declare asset_table text;
begin
  foreach asset_table in array array['machines', 'worker_profiles', 'tankers', 'materials'] loop
    execute format('alter table public.%I add column if not exists latitude double precision', asset_table);
    execute format('alter table public.%I add column if not exists longitude double precision', asset_table);
    execute format('alter table public.%I drop constraint if exists listing_coordinates_check', asset_table);
    execute format('alter table public.%I add constraint listing_coordinates_check check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180))', asset_table);
  end loop;
end;
$$;

-- Remove superseded permissive policies; authorization must not depend on
-- reading another provider's private profiles row.
drop policy if exists machines_insert_owner on public.machines;
drop policy if exists machines_insert_multi_service on public.machines;
create policy machines_insert_multi_service on public.machines for insert to authenticated
  with check (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid()));
drop policy if exists tankers_insert_owner on public.tankers;
drop policy if exists tankers_insert_multi_service on public.tankers;
create policy tankers_insert_multi_service on public.tankers for insert to authenticated
  with check (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid()));
drop policy if exists materials_insert_supplier on public.materials;
drop policy if exists materials_insert_multi_service on public.materials;
create policy materials_insert_multi_service on public.materials for insert to authenticated
  with check (supplier_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid()));

drop policy if exists workers_insert_provider_managed on public.worker_profiles;
drop policy if exists workers_update_provider_managed on public.worker_profiles;
drop policy if exists workers_delete_provider_managed on public.worker_profiles;
create policy workers_insert_provider_managed on public.worker_profiles for insert to authenticated
  with check (user_id is null and provider_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid()));
create policy workers_update_provider_managed on public.worker_profiles for update to authenticated
  using (provider_id = auth.uid() or public.is_admin()) with check (provider_id = auth.uid() or public.is_admin());
create policy workers_delete_provider_managed on public.worker_profiles for delete to authenticated
  using (provider_id = auth.uid() or public.is_admin());

-- Keep ownership fixed and prevent self-approval by editing a listing directly.
create or replace function public.protect_listing_identity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id then raise exception 'Listing identity cannot change'; end if;
    if tg_table_name = 'worker_profiles' then
      if new.user_id is distinct from old.user_id or new.provider_id is distinct from old.provider_id then
        raise exception 'Worker ownership cannot change';
      end if;
    elsif tg_table_name = 'materials' then
      if new.supplier_id <> old.supplier_id then raise exception 'Listing ownership cannot change'; end if;
    elsif new.owner_id <> old.owner_id then raise exception 'Listing ownership cannot change';
    end if;
  end if;
  if tg_table_name in ('machines', 'tankers') and not public.is_admin() then
    if (tg_op = 'INSERT' and new.status <> 'PENDING') or (tg_op = 'UPDATE' and new.status <> old.status) then
      raise exception 'Only an administrator can approve or change listing status';
    end if;
  end if;
  return new;
end;
$$;

-- Enforce historical integrity in the database, including direct API deletes.
create or replace function public.protect_booked_listing_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare service_type public.booking_item_type;
begin
  service_type := case tg_table_name when 'machines' then 'MACHINE' when 'worker_profiles' then 'WORKER' when 'tankers' then 'TANKER' else 'MATERIAL' end;
  if exists (select 1 from public.bookings where item_type = service_type and item_id = old.id) then
    raise exception 'This listing has booking history; pause it instead';
  end if;
  return old;
end;
$$;

do $$
declare asset_table text;
begin
  foreach asset_table in array array['machines', 'worker_profiles', 'tankers', 'materials'] loop
    execute format('drop trigger if exists listing_protect_identity on public.%I', asset_table);
    execute format('create trigger listing_protect_identity before insert or update on public.%I for each row execute function public.protect_listing_identity()', asset_table);
    execute format('drop trigger if exists listing_protect_history on public.%I', asset_table);
    execute format('create trigger listing_protect_history before delete on public.%I for each row execute function public.protect_booked_listing_delete()', asset_table);
  end loop;
end;
$$;

-- The server computes totals from the current listing price, never from a
-- browser-supplied total. Row locks coordinate bookings with listing deletion.
create or replace function public.validate_booking_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; rate numeric; rate_unit text; stock numeric;
begin
  if new.status <> 'REQUESTED' then raise exception 'New bookings must be requested'; end if;
  if new.start_date < current_date or new.end_date < new.start_date or new.quantity <= 0 then
    raise exception 'Choose valid future dates and a positive quantity';
  end if;
  case new.item_type
    when 'MACHINE' then
      select m.owner_id, m.price, m.price_unit into owner, rate, rate_unit from public.machines m
      where m.id = new.item_id and m.status = 'ACTIVE' and m.availability_status = 'AVAILABLE' for share;
    when 'WORKER' then
      select coalesce(w.provider_id, w.user_id), w.daily_wage, 'per day' into owner, rate, rate_unit from public.worker_profiles w
      where w.id = new.item_id and w.availability_status = 'available' for share;
    when 'TANKER' then
      select t.owner_id, t.price, t.price_unit into owner, rate, rate_unit from public.tankers t
      where t.id = new.item_id and t.status = 'ACTIVE' and t.availability_status = 'AVAILABLE' for share;
    when 'MATERIAL' then
      select m.supplier_id, m.price, m.unit, m.quantity_available into owner, rate, rate_unit, stock from public.materials m
      where m.id = new.item_id and m.availability_status = 'AVAILABLE' for share;
      if stock < new.quantity then raise exception 'Requested quantity exceeds available stock'; end if;
  end case;
  if owner is null or owner <> new.provider_id or owner = new.customer_id then
    raise exception 'Listing is unavailable or provider is invalid';
  end if;
  if new.provider_note is not null then raise exception 'Customers cannot set provider notes'; end if;
  new.total_price := round(rate * new.quantity * case when new.item_type <> 'MATERIAL' and lower(trim(rate_unit)) in ('per day', 'day', 'daily') then (new.end_date - new.start_date + 1) else 1 end, 2);
  return new;
end;
$$;
drop trigger if exists bookings_validate_insert on public.bookings;
create trigger bookings_validate_insert before insert on public.bookings for each row execute function public.validate_booking_insert();

drop policy if exists bookings_insert_customer on public.bookings;
drop policy if exists bookings_insert_multi_service on public.bookings;
create policy bookings_insert_multi_service on public.bookings for insert to authenticated
  with check (customer_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid()));

-- Terminal bookings cannot be resurrected or cancelled. Customers can only
-- cancel their own active requests; providers follow the lifecycle.
create or replace function public.protect_booking_updates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.customer_id <> old.customer_id or new.provider_id <> old.provider_id or new.item_type <> old.item_type or new.item_id <> old.item_id or new.start_date <> old.start_date or new.end_date <> old.end_date or new.quantity <> old.quantity or new.total_price <> old.total_price or new.customer_note is distinct from old.customer_note then
    raise exception 'Booking details cannot change';
  end if;
  if not public.is_admin() then
    if auth.uid() = old.customer_id then
      if new.provider_note is distinct from old.provider_note then raise exception 'Customers cannot change provider notes'; end if;
      if new.status <> old.status and (new.status <> 'CANCELLED' or old.status not in ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS')) then
        raise exception 'Customers can only cancel active bookings';
      end if;
    elsif auth.uid() = old.provider_id then
      if new.status <> old.status and not (
        (old.status = 'REQUESTED' and new.status in ('ACCEPTED', 'REJECTED')) or
        (old.status = 'ACCEPTED' and new.status in ('IN_PROGRESS', 'CANCELLED')) or
        (old.status = 'IN_PROGRESS' and new.status in ('COMPLETED', 'CANCELLED'))
      ) then raise exception 'Invalid booking status transition'; end if;
    else raise exception 'Booking participant required';
    end if;
  end if;
  return new;
end;
$$;

-- Functions are trigger-only, never callable by a browser.
revoke all on function public.protect_listing_identity() from public, anon, authenticated;
revoke all on function public.protect_booked_listing_delete() from public, anon, authenticated;
revoke all on function public.validate_booking_insert() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
