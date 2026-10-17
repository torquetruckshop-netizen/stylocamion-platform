alter table app_users add column if not exists email text;
alter table app_users add column if not exists email_verified boolean not null default false;
alter table app_users add column if not exists avatar_url text;

create table if not exists user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  email text,
  email_verified boolean not null default false,
  profile jsonb not null default '{}'::jsonb,
  linked_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  unique(provider, provider_subject)
);

create index if not exists idx_user_identities_user on user_identities(user_id);
create index if not exists idx_user_identities_provider on user_identities(provider, provider_subject);
