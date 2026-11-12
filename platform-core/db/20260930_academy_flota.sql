begin;
create table if not exists public.platform_academy_flota (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  revision integer not null default 0 check (revision >= 0),
  document jsonb not null,
  check (document->>'id' = id::text),
  check (document->>'ownerId' = owner_id::text),
  check ((document->>'revision')::integer = revision),
  check (octet_length(document::text) <= 2097152)
);
alter table public.platform_academy_flota enable row level security;
revoke all on public.platform_academy_flota from public, anon, authenticated;
grant select, insert, update on public.platform_academy_flota to service_role;
create index if not exists academy_owner_idx on public.platform_academy_flota(owner_id);

create or replace function public.platform_academy_for_user(actor_id uuid)
returns setof public.platform_academy_flota language sql stable security invoker set search_path = public
as $$ select * from public.platform_academy_flota
  where owner_id = actor_id or document->'members'->(actor_id::text)->>'active' = 'true'; $$;

create or replace function public.platform_academy_cas(org_id uuid, expected_revision integer, next_document jsonb)
returns boolean language plpgsql security invoker set search_path = public
as $$
begin
  update public.platform_academy_flota set document = next_document, revision = revision + 1
    where id = org_id and revision = expected_revision;
  return found;
end;
$$;
revoke all on function public.platform_academy_for_user(uuid) from public, anon, authenticated;
revoke all on function public.platform_academy_cas(uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.platform_academy_for_user(uuid) to service_role;
grant execute on function public.platform_academy_cas(uuid,integer,jsonb) to service_role;
commit;
