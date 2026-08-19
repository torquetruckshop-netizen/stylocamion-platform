-- Stylo Cargas · Administradores y auditoría
-- Las identidades bootstrap se configuran en ADMIN_PHONE_ALLOWLIST del backend.
-- Nunca guardar teléfonos privados ni secretos en el repositorio.

create table if not exists admin_principals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id) on delete restrict,
  display_name text not null,
  principal_type text not null check (principal_type in ('PERSON','INSTITUTION')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','REVOKED')),
  scopes text[] not null default array[
    'DASHBOARD_READ','USERS_MANAGE','LOADS_MANAGE','VEHICLES_MANAGE',
    'MATCHING_MANAGE','COMPLIANCE_MANAGE','FINANCE_READ','AI_POLICY_MANAGE','AUDIT_READ'
  ]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references app_users(id) on delete set null
);

create index if not exists idx_admin_principals_status on admin_principals(status);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references app_users(id) on delete restrict,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_actor on admin_audit_log(actor_user_id, created_at desc);
create index if not exists idx_admin_audit_target on admin_audit_log(target_type, target_id, created_at desc);

-- El acceso cliente debe quedar cerrado. El backend de Cargas opera con service role
-- y expone únicamente endpoints autenticados con scope administrativo.
alter table admin_principals enable row level security;
alter table admin_audit_log enable row level security;
