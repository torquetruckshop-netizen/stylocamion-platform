-- Stylo Cargas · dispositivos, suscripciones push y trazabilidad de alertas
-- Aplicar RLS/políticas antes de producción. Los secretos de suscripción no deben exponerse al cliente de terceros.

create table if not exists notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid,
  label text,
  platform text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references notification_devices(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notification_outbox (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  organization_id uuid,
  operation_id uuid,
  load_id uuid,
  vehicle_id uuid,
  event_type text not null,
  channel text not null check (channel in ('SILENT','PUSH','WHATSAPP','PUSH_WHATSAPP')),
  priority text not null check (priority in ('LOW','NORMAL','HIGH','CRITICAL')),
  title text,
  body text,
  actions jsonb not null default '[]'::jsonb,
  dedupe_key text,
  status text not null default 'PENDING' check (status in ('PENDING','SENT','DELIVERED','READ','FAILED','CANCELLED')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists notification_outbox_dedupe_idx
  on notification_outbox(dedupe_key)
  where dedupe_key is not null and status in ('PENDING','SENT','DELIVERED');

create index if not exists notification_outbox_pending_idx
  on notification_outbox(status, available_at, priority);

create table if not exists notification_delivery_events (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notification_outbox(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
