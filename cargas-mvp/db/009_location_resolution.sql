-- Stylo Cargas · resolución geográfica escalable y cacheada
-- Separa el texto recibido ("Rafaela", "Rosario", etc.) de una ubicación
-- canónica reutilizable por WhatsApp, formularios, API y ERP.

create table if not exists location_resolution_cache (
  id uuid primary key default gen_random_uuid(),
  query_key text not null unique,
  raw_query text not null,
  canonical_name text,
  country_code text,
  region_name text,
  lat numeric(9,6),
  lon numeric(9,6),
  confidence numeric(4,3),
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_location_resolution_country
  on location_resolution_cache(country_code, canonical_name);

alter table loads add column if not exists origin_country_code text;
alter table loads add column if not exists origin_region_name text;
alter table loads add column if not exists origin_location_source text;
alter table loads add column if not exists origin_location_confidence numeric(4,3);
alter table loads add column if not exists destination_country_code text;
alter table loads add column if not exists destination_region_name text;
alter table loads add column if not exists destination_location_source text;
alter table loads add column if not exists destination_location_confidence numeric(4,3);
alter table loads add column if not exists location_resolution_status text not null default 'UNRESOLVED'
  check (location_resolution_status in ('UNRESOLVED','PARTIAL','RESOLVED','REVIEW'));

create index if not exists idx_loads_location_resolution_status
  on loads(location_resolution_status, status);
