-- Stylo Cargas · telemetría multi-proveedor y costos reales medidos

create table if not exists telematics_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  provider text not null,
  external_account_ref text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','ERROR','REVOKED')),
  capabilities jsonb not null default '[]'::jsonb,
  secret_reference text,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicle_telematics_links (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references telematics_connections(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  external_vehicle_id text not null,
  vin text,
  plate_snapshot text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','UNLINKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id, external_vehicle_id),
  unique(connection_id, vehicle_id)
);

create table if not exists telematics_readings (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references telematics_connections(id) on delete set null,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  provider text not null,
  external_vehicle_id text,
  observed_at timestamptz not null,
  lat numeric(9,6),
  lon numeric(9,6),
  odometer_km numeric(14,3),
  total_fuel_used_l numeric(14,3),
  fuel_level_percent numeric(6,3),
  engine_hours numeric(14,3),
  idling_fuel_used_l numeric(14,3),
  fuel_consumption_rate_lph numeric(12,3),
  source_quality text not null default 'MEDIUM' check (source_quality in ('HIGH','MEDIUM','LOW')),
  raw_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(vehicle_id, provider, observed_at)
);

create table if not exists telematics_trip_actuals (
  id uuid primary key default gen_random_uuid(),
  load_id uuid references loads(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  provider text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_km numeric(12,3),
  fuel_used_l numeric(12,3),
  idling_fuel_used_l numeric(12,3),
  consumption_l_100km numeric(10,3),
  fuel_price_per_liter numeric(14,4),
  fuel_cost_amount numeric(16,2),
  currency text not null default 'ARS',
  fuel_cost_source text,
  confidence text not null default 'LOW' check (confidence in ('HIGH','MEDIUM','LOW')),
  status text not null default 'PARTIAL' check (status in ('PARTIAL','MEASURED','RECONCILED')),
  estimated_snapshot_id uuid references trip_economic_estimates(id) on delete set null,
  variance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_telematics_connections_org on telematics_connections(organization_id,status);
create index if not exists idx_vehicle_telematics_links_vehicle on vehicle_telematics_links(vehicle_id,status);
create index if not exists idx_telematics_readings_vehicle_time on telematics_readings(vehicle_id,observed_at desc);
create index if not exists idx_telematics_actuals_load on telematics_trip_actuals(load_id,created_at desc);
create index if not exists idx_telematics_actuals_vehicle on telematics_trip_actuals(vehicle_id,ended_at desc);

-- secret_reference apunta a un secreto seguro externo/backend; nunca guardar tokens/API keys en texto plano aquí.
