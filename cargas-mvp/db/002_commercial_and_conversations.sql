-- Stylo Cargas MVP · conversaciones e ingresos

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  external_conversation_id text,
  contact_external_id text,
  role text,
  status text not null default 'OPEN',
  linked_load_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  external_message_id text,
  direction text not null,
  message_type text not null default 'TEXT',
  raw_text text,
  normalized_action text,
  created_at timestamptz not null default now()
);

create table if not exists operation_revenue (
  id uuid primary key default gen_random_uuid(),
  load_id text not null,
  freight_amount numeric(14,2),
  currency text not null default 'ARS',
  platform_fee_rate numeric(8,4) not null default 3,
  platform_fee_amount numeric(14,2),
  state text not null default 'ESTIMATED',
  trigger_event text,
  invoiced_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_load on conversations(linked_load_id);
create index if not exists idx_messages_conversation on conversation_messages(conversation_id, created_at);
create index if not exists idx_revenue_load on operation_revenue(load_id);
create index if not exists idx_revenue_state on operation_revenue(state);
