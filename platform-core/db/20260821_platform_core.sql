begin;

create extension if not exists pgcrypto;

create table if not exists public.platform_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone_e164 text,
  country_code text not null default 'AR',
  accepted_general_terms_version text,
  accepted_general_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('buyer','seller','carrier','load_owner','company','driver')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scope text[] not null default array['all']::text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_products (
  sku text primary key,
  name text not null,
  amount numeric(14,2),
  currency text not null default 'ARS',
  tax_included boolean not null default true,
  duration_days integer,
  entitlement_code text not null,
  qr_kind text,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (amount is null or amount >= 0)
);

create table if not exists public.platform_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  sku text not null references public.platform_products(sku),
  amount numeric(14,2) not null,
  currency text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled','refunded','charged_back')),
  provider text not null default 'mercadopago',
  provider_preference_id text,
  provider_payment_id text,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_orders_provider_payment_uidx
  on public.platform_orders(provider, provider_payment_id)
  where provider_payment_id is not null;

create table if not exists public.platform_payment_events (
  provider text not null,
  provider_event_id text not null,
  order_id uuid references public.platform_orders(id),
  payment_id text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  primary key (provider, provider_event_id)
);

create table if not exists public.platform_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.platform_orders(id),
  user_id uuid not null references auth.users(id),
  code text not null,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  unique (order_id, code)
);

create table if not exists public.platform_event_qr (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.platform_orders(id),
  user_id uuid not null references auth.users(id),
  kind text not null,
  token_hash text not null unique,
  token_ciphertext text not null,
  status text not null default 'valid' check (status in ('valid','used','revoked')),
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users(id),
  revoked_at timestamptz,
  unique (order_id, kind)
);

create table if not exists public.platform_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  result text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = check_user and enabled = true
  );
$$;

alter table public.platform_profiles enable row level security;
alter table public.platform_roles enable row level security;
alter table public.platform_products enable row level security;
alter table public.platform_orders enable row level security;
alter table public.platform_payment_events enable row level security;
alter table public.platform_entitlements enable row level security;
alter table public.platform_event_qr enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_admin_audit enable row level security;

drop policy if exists profiles_own_select on public.platform_profiles;
create policy profiles_own_select on public.platform_profiles for select
  using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists profiles_own_update on public.platform_profiles;
create policy profiles_own_update on public.platform_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists roles_own_select on public.platform_roles;
create policy roles_own_select on public.platform_roles for select
  using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists products_public_select on public.platform_products;
create policy products_public_select on public.platform_products for select
  using (enabled = true or public.is_platform_admin());
drop policy if exists orders_own_select on public.platform_orders;
create policy orders_own_select on public.platform_orders for select
  using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists entitlements_own_select on public.platform_entitlements;
create policy entitlements_own_select on public.platform_entitlements for select
  using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists qr_own_select on public.platform_event_qr;
create policy qr_own_select on public.platform_event_qr for select
  using (user_id = auth.uid() or public.is_platform_admin());
drop policy if exists admins_self_select on public.platform_admins;
create policy admins_self_select on public.platform_admins for select
  using (user_id = auth.uid());
drop policy if exists audit_admin_select on public.platform_admin_audit;
create policy audit_admin_select on public.platform_admin_audit for select
  using (public.is_platform_admin());

insert into public.platform_products
  (sku, name, amount, currency, tax_included, duration_days, entitlement_code, qr_kind, enabled, metadata)
values
  ('network_free', 'Acceso gratuito a la Red Stylo Camión', 0, 'ARS', true, null, 'network.free', null, true, '{}'),
  ('feria_person_adult', 'Entrada mayor de 18 años · Feria 2027', 6500, 'ARS', true, null, 'feria.person', 'person', true, '{}'),
  ('feria_person_minor', 'Entrada menor de 18 años · Feria 2027', 0, 'ARS', true, null, 'feria.person.minor', 'person_minor', true, '{"requires_birth_date":true}'),
  ('feria_vehicle_truck', 'Espacio camión · Feria 2027', 35000, 'ARS', true, null, 'feria.vehicle.truck', 'vehicle_truck', true, '{"launch_month":"2026-10","purpose":"exhibition_and_sale","includes_vehicle_data_sign":true}'),
  ('feria_vehicle_car_pickup', 'Espacio auto o pick-up · Feria 2027', 20000, 'ARS', true, null, 'feria.vehicle.car_pickup', 'vehicle_car_pickup', true, '{"launch_month":"2026-10","purpose":"exhibition_and_sale","includes_vehicle_data_sign":true}'),
  ('feria_vehicle_motorcycle', 'Espacio moto · Feria 2027', 15000, 'ARS', true, null, 'feria.vehicle.motorcycle', 'vehicle_motorcycle', true, '{"launch_month":"2026-10","purpose":"exhibition_and_sale","includes_vehicle_data_sign":true}'),
  ('sales_featured', 'Venta destacada', 65000, 'ARS', true, 365, 'sales.featured', null, true, '{}'),
  ('sales_assisted', 'Venta asistida', 130000, 'ARS', true, 365, 'sales.assisted', null, true, '{}'),
  ('sales_mandate', 'Venta por mandato', 350000, 'ARS', true, 120, 'sales.mandate', null, true, '{"commission":0}'),
  ('drivers_professional', 'Choferes Profesional', 50000, 'ARS', true, 183, 'drivers.recruiter.professional', null, true, '{}'),
  ('drivers_fleet', 'Choferes Flota', 80000, 'ARS', true, 365, 'drivers.recruiter.fleet', null, true, '{"unlimited_search":true,"promotions":false}'),
  ('club_annual', 'Club Stylo anual', 35000, 'ARS', true, 365, 'club.annual', null, true, '{}'),
  ('cargas_free', 'Stylo Cargas · acceso gratuito', 0, 'ARS', true, null, 'cargas.free', null, true, '{"commission":0,"future_billing":["monthly","quarterly","annual"]}')
on conflict (sku) do update set
  name = excluded.name,
  amount = excluded.amount,
  currency = excluded.currency,
  tax_included = excluded.tax_included,
  duration_days = excluded.duration_days,
  entitlement_code = excluded.entitlement_code,
  qr_kind = excluded.qr_kind,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  updated_at = now();

commit;
