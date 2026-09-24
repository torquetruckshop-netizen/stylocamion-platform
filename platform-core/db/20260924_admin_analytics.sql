begin;

create table if not exists public.platform_pageviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  path text not null check (char_length(path) between 1 and 200),
  referrer_host text,
  created_at timestamptz not null default now()
);

create index if not exists platform_pageviews_created_idx
  on public.platform_pageviews(created_at desc);

create index if not exists platform_pageviews_path_created_idx
  on public.platform_pageviews(path, created_at desc);

alter table public.platform_pageviews enable row level security;

grant select, insert, delete on table public.platform_pageviews to service_role;

commit;
