-- Stylo Cargas · economía estimada del viaje
-- Permite empezar con 30 L/100 km y mejorar el dato por empresa/unidad.

alter table organizations add column if not exists default_fuel_consumption_l_per_100km numeric(7,2) not null default 30;
alter table organizations add column if not exists default_fuel_price_per_liter numeric(14,2);
alter table organizations add column if not exists default_toll_average_amount numeric(14,2);
alter table organizations add column if not exists default_cost_currency text not null default 'ARS';

alter table vehicles add column if not exists fuel_consumption_l_per_100km numeric(7,2);

create table if not exists trip_economic_estimates (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  calculation_version text not null default 'trip-economics-v1',
  loaded_km numeric(12,2) not null default 0,
  empty_km numeric(12,2) not null default 0,
  total_km numeric(12,2) not null default 0,
  consumption_l_per_100km numeric(7,2) not null,
  consumption_source text,
  estimated_liters numeric(12,2) not null default 0,
  fuel_price_per_liter numeric(14,2),
  fuel_cost numeric(16,2),
  toll_count integer not null default 0,
  confirmed_toll_count integer not null default 0,
  estimated_toll_count integer not null default 0,
  average_toll_amount numeric(14,2),
  toll_cost numeric(16,2) not null default 0,
  toll_confidence text not null default 'NONE'
    check (toll_confidence in ('NONE','CONFIRMED','MIXED','ESTIMATED')),
  tolls jsonb not null default '[]'::jsonb,
  variable_cost numeric(16,2),
  variable_cost_per_km numeric(14,2),
  freight_amount numeric(16,2),
  preliminary_contribution numeric(16,2),
  preliminary_contribution_percent numeric(8,2),
  currency text not null default 'ARS',
  estimate_confidence text not null default 'PARTIAL'
    check (estimate_confidence in ('HIGH','ESTIMATED','PARTIAL')),
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_economics_load_vehicle
  on trip_economic_estimates(load_id, vehicle_id, created_at desc);

create index if not exists idx_trip_economics_org_created
  on trip_economic_estimates(organization_id, created_at desc);
