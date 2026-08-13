-- Stylo Cargas MVP · esquema inicial compatible con Supabase/Postgres
-- No depende de PostGIS para facilitar el primer despliegue.

create extension if not exists pgcrypto;

create table if not exists carriers (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  tax_id text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','BLOCKED')),
  reputation_score numeric(3,2) not null default 0,
  completed_operations integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid references carriers(id) on delete cascade,
  external_id text unique,
  full_name text not null,
  phone text,
  license_number text,
  license_expires_at date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','BLOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references carriers(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  external_id text unique,
  plate text not null unique,
  equipment_type text not null,
  capacity_tn numeric(8,2),
  availability text not null default 'OFFLINE' check (availability in ('AVAILABLE','BUSY','OFFLINE')),
  lat numeric(9,6),
  lon numeric(9,6),
  location_source text check (location_source in ('PHONE_GPS','TELEMATICS','MANUAL')),
  location_updated_at timestamptz,
  document_state text not null default 'YELLOW' check (document_state in ('GREEN','YELLOW','RED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intake_messages (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('WHATSAPP_DIRECT','GROUP_FORWARD','OPERATOR','FORM','OTHER')),
  sender_id text,
  raw_text text not null,
  received_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  classification text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  intake_message_id uuid references intake_messages(id) on delete set null,
  source text not null,
  sender_id text,
  raw_text text,
  origin_name text,
  origin_lat numeric(9,6),
  origin_lon numeric(9,6),
  destination_name text,
  destination_lat numeric(9,6),
  destination_lon numeric(9,6),
  cargo_type text not null,
  weight_tn numeric(8,2),
  equipment_required text,
  pickup_at timestamptz,
  price_amount numeric(14,2),
  price_currency text default 'ARS',
  shipper_id text,
  status text not null check (status in (
    'DETECTADA','EN_VALIDACION','PUBLICADA','BUSCANDO','PREASIGNADA','ADJUDICADA',
    'EN_CAMINO_A_CARGA','EN_CARGA','EN_TRANSITO','EN_DESTINO','DESCARGANDO',
    'ENTREGADA','A_EVALUAR','CERRADA','BLOQUEADA'
  )),
  traffic_light text not null check (traffic_light in ('GREEN','YELLOW','RED')),
  missing_fields jsonb not null default '[]'::jsonb,
  assigned_vehicle_id uuid references vehicles(id) on delete set null,
  assigned_carrier_id uuid references carriers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_checks (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('LOAD','CARRIER','VEHICLE','DRIVER')),
  entity_id text not null,
  document_type text not null,
  status text not null check (status in ('VALID','EXPIRING','EXPIRED','MISSING','NOT_APPLICABLE')),
  expires_at date,
  source text,
  reference text,
  verified_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists load_matches (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  carrier_id uuid not null references carriers(id) on delete cascade,
  distance_km numeric(8,2) not null,
  equipment_score integer not null,
  documents_score integer not null,
  availability_score integer not null,
  distance_score integer not null,
  reputation_score integer not null,
  total_score integer not null,
  decision text not null default 'CANDIDATE' check (decision in ('CANDIDATE','CONTACTED','ACCEPTED','REJECTED','TIMEOUT','ASSIGNED')),
  created_at timestamptz not null default now(),
  unique(load_id, vehicle_id)
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null unique references loads(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id),
  carrier_id uuid not null references carriers(id),
  driver_id uuid references drivers(id),
  mode text not null check (mode in ('MANUAL','ASSISTED','AUTONOMOUS')),
  assigned_at timestamptz not null default now(),
  released_at timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','CANCELLED'))
);

create table if not exists load_events (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  type text not null,
  actor text not null check (actor in ('AI','STYLO','SHIPPER','CARRIER','DRIVER','SYSTEM')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists operation_reviews (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  reviewer_type text not null check (reviewer_type in ('SHIPPER','CARRIER','DRIVER','RECEIVER')),
  reviewer_id text,
  score integer check (score between 1 and 5),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_loads_status on loads(status);
create index if not exists idx_loads_traffic_light on loads(traffic_light);
create index if not exists idx_loads_pickup_at on loads(pickup_at);
create index if not exists idx_vehicles_availability on vehicles(availability);
create index if not exists idx_vehicles_document_state on vehicles(document_state);
create index if not exists idx_matches_load_score on load_matches(load_id, total_score desc);
create index if not exists idx_events_load_created on load_events(load_id, created_at);
create index if not exists idx_documents_entity on document_checks(entity_type, entity_id);

-- Para el MVP, el backend utilizará credenciales de servidor.
-- Antes de exponer consultas desde el cliente se deben agregar políticas RLS específicas.
