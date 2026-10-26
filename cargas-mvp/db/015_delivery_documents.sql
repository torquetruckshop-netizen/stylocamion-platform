-- Stylo Cargas · compliance documental y prueba de entrega
create table if not exists operation_document_checks (
 id uuid primary key default gen_random_uuid(), load_id uuid not null references loads(id) on delete cascade,
 vehicle_id uuid references vehicles(id) on delete set null, rule_version text not null, status text not null,
 checks jsonb not null default '[]'::jsonb, blocking_count integer not null default 0,
 legal_review_required boolean not null default true, checked_at timestamptz not null default now()
);
create index if not exists idx_operation_document_checks_load_time on operation_document_checks(load_id,checked_at desc);

create table if not exists proof_of_delivery_records (
 id uuid primary key default gen_random_uuid(), pod_id text unique not null, load_id uuid not null references loads(id) on delete cascade,
 vehicle_id uuid references vehicles(id) on delete set null, delivered_at timestamptz not null, location jsonb,
 evidence jsonb not null default '[]'::jsonb, receiver jsonb, notes text,
 checksum text not null, legal_status text not null default 'OPERATIONAL_EVIDENCE_ONLY',
 created_at timestamptz not null default now()
);
create index if not exists idx_pod_load_time on proof_of_delivery_records(load_id,delivered_at desc);

create table if not exists delivery_disputes (
 id uuid primary key default gen_random_uuid(), load_id uuid not null references loads(id) on delete cascade,
 pod_id text, status text not null default 'OPEN', reason text not null, evidence jsonb not null default '[]'::jsonb,
 opened_at timestamptz not null default now(), resolved_at timestamptz
);
create index if not exists idx_delivery_disputes_status on delivery_disputes(status,opened_at desc);
