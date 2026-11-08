-- Stylo Cargas MVP · sesiones persistentes por dispositivo

create table if not exists user_sessions (
  id text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  device_label text,
  platform text,
  remember boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoke_reason text
);

create index if not exists idx_user_sessions_user on user_sessions(user_id, created_at desc);
create index if not exists idx_user_sessions_expires on user_sessions(expires_at);
create index if not exists idx_user_sessions_active on user_sessions(user_id) where revoked_at is null;
