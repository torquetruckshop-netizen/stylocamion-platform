-- Stylo Cargas · telemetría avanzada
create table if not exists telematics_idle_summaries (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references vehicles(id) on delete cascade,
 period_start timestamptz not null, period_end timestamptz not null, engine_on_minutes numeric(12,2), moving_minutes numeric(12,2),
 total_idle_minutes numeric(12,2), productive_idle_minutes numeric(12,2), avoidable_idle_minutes numeric(12,2),
 avoidable_fuel_l numeric(12,3), avoidable_idle_cost numeric(16,2), currency text default 'ARS', severity text,
 created_at timestamptz not null default now()
);
create index if not exists idx_telematics_idle_vehicle_time on telematics_idle_summaries(vehicle_id,period_end desc);

create table if not exists fuel_anomalies (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references vehicles(id) on delete cascade,
 type text not null, severity text not null, status text not null default 'OPEN', observed_at timestamptz not null,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), resolved_at timestamptz
);
create index if not exists idx_fuel_anomalies_vehicle_status on fuel_anomalies(vehicle_id,status,observed_at desc);

create table if not exists maintenance_risk_snapshots (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references vehicles(id) on delete cascade,
 status text not null, services jsonb not null default '[]'::jsonb, faults jsonb not null default '[]'::jsonb,
 next_action text, calculated_at timestamptz not null default now()
);
create index if not exists idx_maintenance_risk_vehicle_time on maintenance_risk_snapshots(vehicle_id,calculated_at desc);

create table if not exists driver_efficiency_snapshots (
 id uuid primary key default gen_random_uuid(), vehicle_id uuid not null references vehicles(id) on delete cascade,
 driver_id uuid references drivers(id) on delete set null, efficiency_score integer check (efficiency_score between 0 and 100),
 grade text, factors jsonb not null default '[]'::jsonb, recommendations jsonb not null default '[]'::jsonb,
 purpose text not null default 'COACHING_AND_EFFICIENCY', calculated_at timestamptz not null default now()
);
create index if not exists idx_driver_efficiency_vehicle_time on driver_efficiency_snapshots(vehicle_id,calculated_at desc);
