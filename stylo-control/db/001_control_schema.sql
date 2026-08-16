-- STYLO CONTROL · esquema inicial
-- Diseñado para Supabase/Postgres. Aplicar RLS antes de cualquier exposición web.

create table if not exists control_facts (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  event_type text not null,
  entity_type text,
  entity_id text,
  value numeric(20,4),
  currency text,
  status text,
  channel text,
  country text,
  dimensions jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_control_facts_event_time
  on control_facts(event_type, occurred_at desc);
create index if not exists idx_control_facts_module_time
  on control_facts(module, occurred_at desc);
create index if not exists idx_control_facts_entity
  on control_facts(entity_type, entity_id);

create table if not exists control_module_health (
  module text primary key,
  status text not null check (status in ('HEALTHY','DEGRADED','DOWN','UNKNOWN')),
  detail text,
  latency_ms numeric(12,2),
  last_success_at timestamptz,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists control_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  view_type text not null check (view_type in ('ADMIN','INVESTOR')),
  catalog_version text not null,
  range_start timestamptz,
  range_end timestamptz,
  metrics jsonb not null,
  generated_at timestamptz not null default now()
);

create index if not exists idx_control_snapshots_view_generated
  on control_metric_snapshots(view_type, generated_at desc);

create table if not exists control_access_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  role text not null,
  action text not null,
  resource text,
  outcome text not null check (outcome in ('ALLOWED','DENIED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Seguridad de diseño:
-- 1. Investor View jamás consulta tablas de detalle de usuarios/clientes.
-- 2. control_facts admite entity_id interno para COUNT DISTINCT, pero Investor View sólo recibe agregados.
-- 3. dimensions no debe contener PII: teléfono, email, DNI, patente, mensaje/raw_text ni secretos.
-- 4. Las claves de administración/integraciones viven sólo en backend/secret manager.
