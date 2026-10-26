-- Stylo Cargas · operational intelligence
create table if not exists instant_book_proposals (
 id uuid primary key default gen_random_uuid(), proposal_id text unique not null, load_id uuid not null references loads(id) on delete cascade,
 vehicle_id uuid not null references vehicles(id) on delete cascade, status text not null default 'PENDING_CONFIRMATION',
 price_amount numeric(16,2), currency text not null default 'ARS', policy_version text not null default 'instant-book-v1',
 policy_snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), expires_at timestamptz not null,
 confirmed_at timestamptz, cancelled_at timestamptz
);
create index if not exists idx_instant_book_load_status on instant_book_proposals(load_id,status,created_at desc);

create table if not exists conditional_bids (
 id uuid primary key default gen_random_uuid(), bid_id text unique not null, load_id uuid not null references loads(id) on delete cascade,
 carrier_id uuid references carriers(id) on delete set null, vehicle_id uuid references vehicles(id) on delete set null,
 price_amount numeric(16,2) not null, currency text not null default 'ARS', pickup_at timestamptz, pickup_window_minutes integer,
 conditions jsonb not null default '[]'::jsonb, status text not null default 'OPEN', created_at timestamptz not null default now(), expires_at timestamptz,
 resolved_at timestamptz
);
create index if not exists idx_conditional_bids_load_status on conditional_bids(load_id,status,created_at desc);

create table if not exists operational_exceptions (
 id uuid primary key default gen_random_uuid(), dedupe_key text, type text not null, severity text not null check (severity in ('INFO','WARNING','CRITICAL')),
 status text not null default 'OPEN', load_id uuid references loads(id) on delete cascade, vehicle_id uuid references vehicles(id) on delete cascade,
 detail text, value jsonb, observed_at timestamptz not null default now(), resolved_at timestamptz, created_at timestamptz not null default now()
);
create unique index if not exists idx_operational_exception_active_dedupe on operational_exceptions(dedupe_key) where dedupe_key is not null and status='OPEN';
create index if not exists idx_operational_exceptions_queue on operational_exceptions(status,severity,observed_at desc);

create table if not exists market_heatmap_snapshots (
 id uuid primary key default gen_random_uuid(), country_code text, equipment_type text, cell_degrees numeric(5,3) not null default .5,
 cells jsonb not null default '[]'::jsonb, generated_at timestamptz not null default now(), expires_at timestamptz
);
