-- Stylo Ventas Intelligence · esquema inicial
create table if not exists sales_saved_searches (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, name text, criteria jsonb not null default '{}'::jsonb,
 alert_new_listings boolean not null default true, alert_price_changes boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists sales_watchlist (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, listing_id text not null, status text not null default 'WATCHING',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,listing_id)
);
create table if not exists sales_price_history (
 id uuid primary key default gen_random_uuid(), listing_id text not null, price_amount numeric(18,2) not null, currency text not null default 'ARS', observed_at timestamptz not null default now()
);
create index if not exists idx_sales_price_history_listing_time on sales_price_history(listing_id,observed_at desc);
create table if not exists sales_lead_events (
 id uuid primary key default gen_random_uuid(), lead_id text not null, listing_id text, user_id uuid, event_type text not null, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
create index if not exists idx_sales_lead_events_lead_time on sales_lead_events(lead_id,occurred_at desc);
create table if not exists sales_market_price_snapshots (
 id uuid primary key default gen_random_uuid(), listing_id text, comparable_count integer not null default 0, p25 numeric(18,2), median numeric(18,2), p75 numeric(18,2), confidence text, currency text, generated_at timestamptz not null default now()
);
