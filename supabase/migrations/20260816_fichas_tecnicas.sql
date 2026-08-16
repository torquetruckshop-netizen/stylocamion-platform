-- Biblioteca técnica de Stylo Camión
create extension if not exists pgcrypto;

create table if not exists public.fichas_tecnicas (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text,
  model_year integer,
  country text not null default 'AR',
  source_id text not null,
  source_url text not null,
  storage_path text,
  sha256 text not null unique,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'archived')),
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);

create index if not exists fichas_brand_year_idx
  on public.fichas_tecnicas (brand, model_year desc nulls last, model);

alter table public.fichas_tecnicas enable row level security;

create policy "public reads approved technical sheets"
on public.fichas_tecnicas for select
using (status = 'approved');

insert into storage.buckets (id, name, public)
values ('fichas-tecnicas', 'fichas-tecnicas', false)
on conflict (id) do nothing;
