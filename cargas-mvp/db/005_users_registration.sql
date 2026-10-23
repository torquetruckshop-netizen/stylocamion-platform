-- Stylo Cargas MVP · Registro automático de usuarios
-- El alta es inmediata. Stylo revisa posteriormente y puede observar, suspender o dar de baja.

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  company text,
  country text not null default 'AR',
  role text not null default 'TRANSPORTISTA',
  access_status text not null default 'ACTIVE' check (access_status in ('ACTIVE','SUSPENDED','DEACTIVATED')),
  review_status text not null default 'PENDING_REVIEW' check (review_status in ('PENDING_REVIEW','APPROVED','OBSERVED','SUSPENDED','DEACTIVATED')),
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text
);

create index if not exists idx_app_users_review_status on app_users(review_status);
create index if not exists idx_app_users_access_status on app_users(access_status);
create index if not exists idx_app_users_registered_at on app_users(registered_at desc);

create table if not exists user_admin_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  event_type text not null,
  actor text not null default 'SYSTEM',
  note text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_admin_events_user on user_admin_events(user_id, created_at desc);
