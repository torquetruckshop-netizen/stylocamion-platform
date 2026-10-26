-- Stylo Cargas MVP · Mi Flota + Mi Red Privada

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  tax_id text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','BLOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id text not null,
  role text not null default 'OPERATOR' check (role in ('OWNER','ADMIN','TRAFFIC','OPERATOR','VIEWER')),
  status text not null default 'ACTIVE' check (status in ('INVITED','ACTIVE','SUSPENDED')),
  created_at timestamptz not null default now(),
  unique(organization_id,user_id)
);

alter table carriers add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table vehicles add column if not exists organization_id uuid references organizations(id) on delete set null;

create table if not exists private_network_members (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references organizations(id) on delete cascade,
  carrier_id uuid not null references carriers(id) on delete cascade,
  priority integer not null default 100,
  status text not null default 'ACTIVE' check (status in ('INVITED','ACTIVE','PAUSED','BLOCKED')),
  allow_auto_offer boolean not null default true,
  allow_contact_details boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique(owner_organization_id,carrier_id)
);

create table if not exists private_network_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_organization_id uuid not null references organizations(id) on delete cascade,
  carrier_id uuid references carriers(id) on delete cascade,
  invited_phone_hash text,
  token text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED','EXPIRED','CANCELLED')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists vehicle_availability_windows (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  available_from timestamptz not null,
  available_until timestamptz,
  expected_lat numeric(9,6),
  expected_lon numeric(9,6),
  expected_location_name text,
  preferred_destinations jsonb not null default '[]'::jsonb,
  notes text,
  source text not null default 'MANUAL' check (source in ('MANUAL','GPS','TELEMATICS','AI_INFERRED')),
  created_at timestamptz not null default now()
);

alter table loads add column if not exists owner_organization_id uuid references organizations(id) on delete set null;
alter table loads add column if not exists visibility_scope text not null default 'PRIVATE' check (visibility_scope in ('OWN_FLEET','PRIVATE','STYLO_NETWORK','PUBLIC'));
alter table loads add column if not exists escalation_level text not null default 'OWN_FLEET' check (escalation_level in ('OWN_FLEET','PRIVATE_NETWORK','STYLO_NETWORK','PUBLIC'));

create index if not exists idx_private_network_owner on private_network_members(owner_organization_id,status);
create index if not exists idx_vehicle_availability_vehicle on vehicle_availability_windows(vehicle_id,available_from);
create index if not exists idx_loads_owner_org on loads(owner_organization_id,status);
