create extension if not exists pgcrypto;

create type public.user_role as enum (
  'customer', 'contractor', 'worker', 'machine_owner',
  'tanker_owner', 'material_supplier', 'admin'
);

create type public.worker_availability as enum ('available', 'unavailable', 'working');
create type public.machine_status as enum ('ACTIVE', 'INACTIVE', 'PENDING');
create type public.listing_availability as enum ('AVAILABLE', 'BOOKED', 'UNAVAILABLE');
create type public.booking_item_type as enum ('MACHINE', 'WORKER', 'TANKER', 'MATERIAL');
create type public.booking_status as enum ('REQUESTED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.cart_status as enum ('ACTIVE', 'SUBMITTED', 'COMPLETED', 'CANCELLED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null unique,
  phone text,
  role public.user_role not null default 'customer',
  profile_image text,
  city text,
  state text,
  address text,
  bio text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  if coalesce(requested_role, '') not in ('customer', 'contractor', 'worker', 'machine_owner', 'tanker_owner', 'material_supplier') then
    requested_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Thekedar User'),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    requested_role::public.user_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  skill text not null check (char_length(trim(skill)) between 2 and 120),
  experience_years numeric(5, 2) not null default 0 check (experience_years >= 0),
  daily_wage numeric(12, 2) not null check (daily_wage >= 0),
  description text,
  availability_status public.worker_availability not null default 'available',
  city text not null,
  state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  machine_type text not null,
  brand text,
  model text,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  price_unit text not null check (char_length(trim(price_unit)) between 1 and 40),
  location text,
  city text not null,
  state text not null,
  operator_available boolean not null default false,
  delivery_available boolean not null default false,
  contact_phone text,
  availability_status public.listing_availability not null default 'AVAILABLE',
  status public.machine_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.machine_images (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  image_url text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table public.tankers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  capacity numeric(12, 2) not null check (capacity > 0),
  price numeric(12, 2) not null check (price >= 0),
  price_unit text not null check (char_length(trim(price_unit)) between 1 and 40),
  description text,
  city text not null,
  state text not null,
  location text,
  contact_phone text,
  availability_status public.listing_availability not null default 'AVAILABLE',
  status public.machine_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  unit text not null check (char_length(trim(unit)) between 1 and 40),
  quantity_available numeric(14, 2) not null default 0 check (quantity_available >= 0),
  city text not null,
  state text not null,
  image_url text,
  availability_status public.listing_availability not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  provider_id uuid not null references public.profiles(id) on delete restrict,
  item_type public.booking_item_type not null,
  item_id uuid not null,
  start_date date not null,
  end_date date not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  total_price numeric(14, 2) not null check (total_price >= 0),
  customer_note text,
  provider_note text,
  status public.booking_status not null default 'REQUESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (customer_id <> provider_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type public.booking_item_type not null,
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  related_booking_id uuid references public.bookings(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.project_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_name text not null check (char_length(trim(project_name)) between 1 and 160),
  project_description text,
  project_location text,
  city text,
  state text,
  status public.cart_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.project_carts(id) on delete cascade,
  item_type public.booking_item_type not null,
  item_id uuid not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  start_date date,
  end_date date,
  price numeric(14, 2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index profiles_role_idx on public.profiles(role);
create index profiles_city_state_idx on public.profiles(city, state);
create index worker_profiles_city_state_idx on public.worker_profiles(city, state);
create index worker_profiles_availability_idx on public.worker_profiles(availability_status);
create index machines_owner_idx on public.machines(owner_id);
create index machines_city_state_idx on public.machines(city, state);
create index machines_availability_status_idx on public.machines(availability_status, status);
create index machine_images_machine_idx on public.machine_images(machine_id);
create index tankers_owner_idx on public.tankers(owner_id);
create index tankers_city_state_idx on public.tankers(city, state);
create index tankers_availability_status_idx on public.tankers(availability_status, status);
create index materials_supplier_idx on public.materials(supplier_id);
create index materials_city_state_idx on public.materials(city, state);
create index materials_availability_idx on public.materials(availability_status);
create index bookings_customer_idx on public.bookings(customer_id);
create index bookings_provider_idx on public.bookings(provider_id);
create index bookings_item_idx on public.bookings(item_type, item_id);
create index bookings_status_idx on public.bookings(status);
create index reviews_reviewee_idx on public.reviews(reviewee_id);
create index notifications_user_read_idx on public.notifications(user_id, is_read);
create index project_carts_user_status_idx on public.project_carts(user_id, status);
create index project_cart_items_cart_idx on public.project_cart_items(cart_id);
create unique index one_active_cart_per_user_idx on public.project_carts(user_id) where status = 'ACTIVE';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger worker_profiles_set_updated_at before update on public.worker_profiles for each row execute function public.set_updated_at();
create trigger machines_set_updated_at before update on public.machines for each row execute function public.set_updated_at();
create trigger tankers_set_updated_at before update on public.tankers for each row execute function public.set_updated_at();
create trigger materials_set_updated_at before update on public.materials for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger project_carts_set_updated_at before update on public.project_carts for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' and not public.is_admin() then
    raise exception 'Only an administrator can assign the admin role';
  end if;

  if tg_op = 'UPDATE' and not public.is_admin() and (new.role <> old.role or new.is_verified <> old.is_verified) then
    raise exception 'Only an administrator can change profile role or verification';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileges before insert or update on public.profiles for each row execute function public.protect_profile_privileges();

create or replace function public.protect_booking_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and auth.uid() = old.provider_id then
    if new.customer_id <> old.customer_id or new.provider_id <> old.provider_id or new.item_type <> old.item_type or new.item_id <> old.item_id or new.start_date <> old.start_date or new.end_date <> old.end_date or new.quantity <> old.quantity or new.total_price <> old.total_price or new.customer_note is distinct from old.customer_note then
      raise exception 'Providers cannot change booking details';
    end if;

    if old.status = 'REQUESTED' and new.status not in ('ACCEPTED', 'REJECTED') then
      raise exception 'A requested booking can only be accepted or rejected';
    end if;

    if old.status = 'ACCEPTED' and new.status not in ('IN_PROGRESS', 'CANCELLED') then
      raise exception 'An accepted booking can only start, or be cancelled';
    end if;

    if old.status = 'IN_PROGRESS' and new.status not in ('COMPLETED', 'CANCELLED') then
      raise exception 'An in-progress booking can only be completed, or be cancelled';
    end if;
  elsif not public.is_admin() and auth.uid() = old.customer_id then
    if new.status <> old.status and new.status <> 'CANCELLED' then
      raise exception 'Customers can only cancel their bookings';
    end if;

    if new.provider_note is distinct from old.provider_note then
      raise exception 'Customers cannot change provider notes';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_protect_details before update on public.bookings for each row execute function public.protect_booking_updates();

alter table public.profiles enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.machines enable row level security;
alter table public.machine_images enable row level security;
alter table public.tankers enable row level security;
alter table public.materials enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.project_carts enable row level security;
alter table public.project_cart_items enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid() and role <> 'admin');
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy workers_public_read on public.worker_profiles for select to anon, authenticated using (true);
create policy workers_insert_own on public.worker_profiles for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('worker', 'admin')));
create policy workers_update_own on public.worker_profiles for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check ((user_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('worker', 'admin'))) or public.is_admin());
create policy workers_delete_own on public.worker_profiles for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy machines_public_read on public.machines for select to anon, authenticated using ((status = 'ACTIVE' and availability_status <> 'UNAVAILABLE') or owner_id = auth.uid() or public.is_admin());
create policy machines_insert_owner on public.machines for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('machine_owner', 'admin')));
create policy machines_update_owner on public.machines for update to authenticated using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy machines_delete_owner on public.machines for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

create policy machine_images_public_read on public.machine_images for select to anon, authenticated using (exists (select 1 from public.machines where id = machine_id and ((status = 'ACTIVE' and availability_status <> 'UNAVAILABLE') or owner_id = auth.uid() or public.is_admin())));
create policy machine_images_insert_owner on public.machine_images for insert to authenticated with check (exists (select 1 from public.machines where id = machine_id and (owner_id = auth.uid() or public.is_admin())));
create policy machine_images_update_owner on public.machine_images for update to authenticated using (exists (select 1 from public.machines where id = machine_id and (owner_id = auth.uid() or public.is_admin()))) with check (exists (select 1 from public.machines where id = machine_id and (owner_id = auth.uid() or public.is_admin())));
create policy machine_images_delete_owner on public.machine_images for delete to authenticated using (exists (select 1 from public.machines where id = machine_id and (owner_id = auth.uid() or public.is_admin())));

create policy tankers_public_read on public.tankers for select to anon, authenticated using ((status = 'ACTIVE' and availability_status <> 'UNAVAILABLE') or owner_id = auth.uid() or public.is_admin());
create policy tankers_insert_owner on public.tankers for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('tanker_owner', 'admin')));
create policy tankers_update_owner on public.tankers for update to authenticated using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy tankers_delete_owner on public.tankers for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

create policy materials_public_read on public.materials for select to anon, authenticated using (availability_status <> 'UNAVAILABLE' or supplier_id = auth.uid() or public.is_admin());
create policy materials_insert_supplier on public.materials for insert to authenticated with check (supplier_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('material_supplier', 'admin')));
create policy materials_update_supplier on public.materials for update to authenticated using (supplier_id = auth.uid() or public.is_admin()) with check (supplier_id = auth.uid() or public.is_admin());
create policy materials_delete_supplier on public.materials for delete to authenticated using (supplier_id = auth.uid() or public.is_admin());

create policy bookings_select_participant on public.bookings for select to authenticated using (customer_id = auth.uid() or provider_id = auth.uid() or public.is_admin());
create policy bookings_insert_customer on public.bookings for insert to authenticated with check (customer_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role in ('customer', 'contractor', 'admin')) and exists (
  select 1 from public.profiles provider where provider.id = provider_id and (
    (item_type = 'MACHINE' and provider.role = 'machine_owner' and exists (select 1 from public.machines where id = item_id and owner_id = provider_id)) or
    (item_type = 'WORKER' and provider.role = 'worker' and exists (select 1 from public.worker_profiles where id = item_id and user_id = provider_id)) or
    (item_type = 'TANKER' and provider.role = 'tanker_owner' and exists (select 1 from public.tankers where id = item_id and owner_id = provider_id)) or
    (item_type = 'MATERIAL' and provider.role = 'material_supplier' and exists (select 1 from public.materials where id = item_id and supplier_id = provider_id))
  )
));
create policy bookings_update_participant on public.bookings for update to authenticated using (customer_id = auth.uid() or provider_id = auth.uid() or public.is_admin()) with check (customer_id = auth.uid() or provider_id = auth.uid() or public.is_admin());
revoke update on public.bookings from anon, authenticated;
grant update (status, provider_note) on public.bookings to authenticated;

create policy reviews_select_participant on public.reviews for select to authenticated using (reviewer_id = auth.uid() or reviewee_id = auth.uid() or public.is_admin());
create policy reviews_insert_completed on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid() and exists (
    select 1 from public.bookings b where b.id = booking_id and b.status = 'COMPLETED' and
    ((b.customer_id = auth.uid() and b.provider_id = reviewee_id) or (b.provider_id = auth.uid() and b.customer_id = reviewee_id))
  )
);

create policy favorites_own on public.favorites for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy project_carts_own on public.project_carts for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy project_cart_items_own on public.project_cart_items for all to authenticated using (exists (select 1 from public.project_carts where id = cart_id and (user_id = auth.uid() or public.is_admin()))) with check (exists (select 1 from public.project_carts where id = cart_id and (user_id = auth.uid() or public.is_admin())));

insert into storage.buckets (id, name, public) values
  ('profile-images', 'profile-images', false),
  ('machine-images', 'machine-images', false),
  ('material-images', 'material-images', false)
on conflict (id) do nothing;

create policy profile_images_owner_select on storage.objects for select to authenticated using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_images_owner_write on storage.objects for insert to authenticated with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_images_owner_update on storage.objects for update to authenticated using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_images_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy machine_images_owner_write on storage.objects for all to authenticated using (bucket_id = 'machine-images' and exists (select 1 from public.machines where id = ((storage.foldername(name))[1])::uuid and owner_id = auth.uid())) with check (bucket_id = 'machine-images' and exists (select 1 from public.machines where id = ((storage.foldername(name))[1])::uuid and owner_id = auth.uid()));
create policy material_images_owner_write on storage.objects for all to authenticated using (bucket_id = 'material-images' and exists (select 1 from public.materials where id = ((storage.foldername(name))[1])::uuid and supplier_id = auth.uid())) with check (bucket_id = 'material-images' and exists (select 1 from public.materials where id = ((storage.foldername(name))[1])::uuid and supplier_id = auth.uid()));