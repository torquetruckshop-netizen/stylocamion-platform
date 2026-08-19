-- Stylo Cargas · Fuentes digitales autorizadas e intenciones logísticas

create table if not exists digital_source_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  source_type text not null check (source_type in (
    'WHATSAPP_DIRECT','WHATSAPP_GROUP','WHATSAPP_FORWARD','PWA_SHARE',
    'NATIVE_SHARE_EXTENSION','MANUAL_UPLOAD','PARTNER_API'
  )),
  external_source_id text,
  display_name text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','REVOKED')),
  consent_basis text not null,
  consent_reference text,
  authorized_at timestamptz not null default now(),
  authorized_by uuid references app_users(id) on delete set null,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(source_type, external_source_id)
);

create index if not exists idx_digital_sources_active
  on digital_source_authorizations(source_type, status);

create table if not exists logistics_intake_signals (
  id uuid primary key default gen_random_uuid(),
  intake_message_id uuid references intake_messages(id) on delete cascade,
  authorization_id uuid references digital_source_authorizations(id) on delete set null,
  intent text not null check (intent in (
    'LOAD_OFFER','TRUCK_AVAILABLE','UNKNOWN','IRRELEVANT','AWAITING_TRANSCRIPTION'
  )),
  confidence numeric(5,4),
  next_action text not null,
  processing_status text not null default 'PENDING' check (processing_status in (
    'PENDING','PROCESSING','COMPLETE','IGNORED','BLOCKED','FAILED'
  )),
  vehicle_id uuid references vehicles(id) on delete set null,
  load_id uuid references loads(id) on delete set null,
  policy_version text not null,
  retention_class text not null,
  decision_trace jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_logistics_signals_intent_status
  on logistics_intake_signals(intent, processing_status, created_at desc);

alter table digital_source_authorizations enable row level security;
alter table logistics_intake_signals enable row level security;
