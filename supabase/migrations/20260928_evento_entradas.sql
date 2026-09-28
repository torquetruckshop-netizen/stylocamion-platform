-- Módulo de entradas, estacionamientos y validación para La Feria del Usado con Ruedas 2027.
-- Ejecutar en Supabase antes de habilitar Mercado Pago en producción.

create extension if not exists pgcrypto;

create table if not exists public.event_orders (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null default 'feria-usado-con-ruedas-2027',
  order_number bigserial unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'rejected')),
  product_code text not null,
  product_name text not null,
  amount numeric(12,2) not null,
  currency text not null default 'ARS',
  quantity integer not null default 1,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text,
  buyer_document text,
  vehicle_type text,
  vehicle_plate text,
  source text not null default 'web',
  notes text,
  mp_preference_id text,
  mp_init_point text,
  mp_sandbox_init_point text,
  mp_payment_id text unique,
  mp_status text,
  mp_raw jsonb,
  ticket_code text unique,
  ticket_url text,
  paid_at timestamptz,
  whatsapp_sent_at timestamptz,
  checked_in_at timestamptz,
  checked_in_count integer not null default 0,
  box_delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_orders_status_idx on public.event_orders (status);
create index if not exists event_orders_ticket_code_idx on public.event_orders (ticket_code);
create index if not exists event_orders_vehicle_plate_idx on public.event_orders (vehicle_plate);
create index if not exists event_orders_buyer_phone_idx on public.event_orders (buyer_phone);

create table if not exists public.event_access_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.event_orders(id) on delete set null,
  ticket_code text,
  action text not null,
  validator text,
  result text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_access_logs_order_id_idx on public.event_access_logs (order_id);
create index if not exists event_access_logs_ticket_code_idx on public.event_access_logs (ticket_code);
create index if not exists event_access_logs_created_at_idx on public.event_access_logs (created_at desc);

alter table public.event_orders enable row level security;
alter table public.event_access_logs enable row level security;

-- El acceso público queda cerrado. Las API Functions usan SUPABASE_SERVICE_ROLE_KEY.
-- No crear policies públicas para evitar lectura o validación no autorizada de entradas.
