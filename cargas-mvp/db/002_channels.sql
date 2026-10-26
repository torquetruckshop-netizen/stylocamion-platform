create table if not exists operation_channels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  family text not null default 'STYLO_CARGAS_OPERACIONES',
  role text not null default 'OPERATIONS',
  region text,
  segment text,
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table intake_messages add column if not exists operation_channel_id uuid references operation_channels(id) on delete set null;
alter table loads add column if not exists operation_channel_id uuid references operation_channels(id) on delete set null;

create index if not exists idx_intake_operation_channel on intake_messages(operation_channel_id);
create index if not exists idx_loads_operation_channel on loads(operation_channel_id);
