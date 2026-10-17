-- Stylo Cargas · inteligencia de marketplace clase mundial

create table if not exists facility_reviews (
  id uuid primary key default gen_random_uuid(),
  facility_id text not null,
  organization_id uuid references organizations(id) on delete set null,
  user_id uuid references app_users(id) on delete set null,
  rating numeric(3,2) check (rating between 1 and 5),
  wait_minutes integer check (wait_minutes >= 0),
  amenities jsonb not null default '[]'::jsonb,
  source text not null default 'USER',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_facility_reviews_facility_time on facility_reviews(facility_id, observed_at desc);

create table if not exists facility_profiles (
  facility_id text primary key,
  review_count integer not null default 0,
  average_rating numeric(4,2),
  median_wait_minutes numeric(10,2),
  p90_wait_minutes numeric(10,2),
  amenities jsonb not null default '[]'::jsonb,
  confidence text not null default 'LOW' check (confidence in ('LOW','MEDIUM','HIGH')),
  risk text not null default 'UNKNOWN' check (risk in ('GREEN','YELLOW','RED','UNKNOWN')),
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists carrier_preference_events (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid references carriers(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  load_id uuid references loads(id) on delete set null,
  action text not null,
  origin_name text,
  destination_name text,
  equipment_type text,
  cargo_type text,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_carrier_preference_events_carrier_time on carrier_preference_events(carrier_id, occurred_at desc);

create table if not exists carrier_preference_profiles (
  carrier_id uuid primary key references carriers(id) on delete cascade,
  sample_count integer not null default 0,
  acceptance_rate numeric(8,2),
  preferred_lanes jsonb not null default '[]'::jsonb,
  preferred_equipment jsonb not null default '[]'::jsonb,
  preferred_cargo jsonb not null default '[]'::jsonb,
  confidence text not null default 'LOW' check (confidence in ('LOW','MEDIUM','HIGH')),
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists continuous_move_plans (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  status text not null,
  legs jsonb not null default '[]'::jsonb,
  total_empty_km numeric(12,2) not null default 0,
  total_loaded_km numeric(12,2) not null default 0,
  empty_km_percent numeric(8,2) not null default 0,
  total_revenue numeric(16,2),
  total_variable_cost numeric(16,2),
  preliminary_contribution numeric(16,2),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists idx_continuous_move_vehicle_time on continuous_move_plans(vehicle_id, created_at desc);
