-- Additive migration for multi-service provider accounts.
-- Review and apply explicitly; this file is never executed by the application.

alter table public.worker_profiles
  alter column user_id drop not null;

alter table public.worker_profiles
  add column provider_id uuid references public.profiles(id) on delete cascade,
  add column display_name text;

alter table public.worker_profiles
  add constraint worker_profiles_identity_check check (
    (user_id is not null and provider_id is null and display_name is null)
    or
    (user_id is null and provider_id is not null and display_name is not null and char_length(trim(display_name)) between 2 and 120)
  );

create policy workers_insert_provider_managed on public.worker_profiles
  for insert to authenticated
  with check (
    user_id is null
    and provider_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('customer', 'contractor', 'machine_owner', 'tanker_owner', 'material_supplier', 'admin')
    )
  );

create policy workers_update_provider_managed on public.worker_profiles
  for update to authenticated
  using (provider_id = auth.uid() or public.is_admin())
  with check (provider_id = auth.uid() or public.is_admin());

create policy workers_delete_provider_managed on public.worker_profiles
  for delete to authenticated
  using (provider_id = auth.uid() or public.is_admin());

create policy machines_insert_multi_service on public.machines
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('customer', 'contractor', 'machine_owner', 'tanker_owner', 'material_supplier', 'admin')
    )
  );

create policy tankers_insert_multi_service on public.tankers
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('customer', 'contractor', 'machine_owner', 'worker', 'tanker_owner', 'material_supplier', 'admin')
    )
  );

create policy materials_insert_multi_service on public.materials
  for insert to authenticated
  with check (
    supplier_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('customer', 'contractor', 'machine_owner', 'worker', 'tanker_owner', 'material_supplier', 'admin')
    )
  );

create policy bookings_insert_multi_service on public.bookings
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('customer', 'contractor', 'worker', 'machine_owner', 'tanker_owner', 'material_supplier', 'admin')
    )
    and exists (
      select 1 from public.profiles provider
      where provider.id = provider_id
        and (
          (item_type = 'MACHINE' and exists (
            select 1 from public.machines
            where id = item_id and owner_id = provider_id
          ))
          or (item_type = 'WORKER' and exists (
            select 1 from public.worker_profiles
            where id = item_id and coalesce(provider_id, user_id) = bookings.provider_id
          ))
          or (item_type = 'TANKER' and exists (
            select 1 from public.tankers
            where id = item_id and owner_id = provider_id
          ))
          or (item_type = 'MATERIAL' and exists (
            select 1 from public.materials
            where id = item_id and supplier_id = provider_id
          ))
        )
    )
  );
