-- Run once in the Supabase SQL Editor BEFORE deploying the matching site build.
-- Counters start at zero; existing historical traffic cannot be reconstructed.
begin;

create table if not exists public.site_visits (
  session_id uuid primary key,
  first_seen_at timestamptz not null default now()
);
create table if not exists public.registration_visits (
  session_id uuid primary key references public.site_visits(session_id) on delete cascade,
  first_seen_at timestamptz not null default now()
);
create table if not exists public.resource_visits (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_key text not null check (resource_key in ('courses', 'hemox', 'software', 'firmware', 'explorers', 'datasets', 'silo')),
  opened_at timestamptz not null default now()
);
create index if not exists resource_visits_key_time_idx on public.resource_visits(resource_key, opened_at desc);
create index if not exists resource_visits_user_time_idx on public.resource_visits(user_id, opened_at desc);

alter table public.site_visits enable row level security;
alter table public.registration_visits enable row level security;
alter table public.resource_visits enable row level security;
revoke all on public.site_visits, public.registration_visits, public.resource_visits from public, anon, authenticated;
grant select on public.resource_visits to authenticated;

drop policy if exists "Admins view resource visits" on public.resource_visits;
create policy "Admins view resource visits" on public.resource_visits
for select to authenticated using (
  exists (select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'approved')
);

create or replace function public.record_site_visit(p_session_id uuid, p_registration_page boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session_id is null then
    raise exception 'Session ID required' using errcode = '22023';
  end if;
  insert into public.site_visits(session_id) values (p_session_id) on conflict do nothing;
  if p_registration_page then
    insert into public.registration_visits(session_id) values (p_session_id) on conflict do nothing;
  end if;
end;
$$;

create or replace function public.get_site_visit_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'site_visits', (select count(*) from public.site_visits),
    'registration_visits', (select count(*) from public.registration_visits),
    'since', (select min(first_seen_at) from public.site_visits)
  );
$$;

create or replace function public.record_resource_visit(p_resource_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if p_resource_key not in ('courses', 'software') or p_resource_key is null then
    raise exception 'Resource not open for tracking' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = current_user_id and p.role = 'user' and p.status = 'approved'
      and p.expires_at > now()
  ) or not exists (
    select 1 from public.user_resource_access a
    where a.user_id = current_user_id and a.resource_key = p_resource_key
  ) then
    raise exception 'Resource access required' using errcode = '42501';
  end if;
  insert into public.resource_visits(user_id, resource_key) values (current_user_id, p_resource_key);
end;
$$;

create or replace function public.get_resource_visit_counts()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(resource_key, visit_count), '{}'::jsonb)
  from (
    select resource_key, count(*) as visit_count
    from public.resource_visits
    group by resource_key
  ) totals;
$$;

create or replace function public.get_admin_resource_metrics()
returns table(resource_key text, total_visits bigint, unique_users bigint, last_7_days bigint, last_30_days bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'admin' and p.status = 'approved') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query
  select v.resource_key, count(*), count(distinct v.user_id),
    count(*) filter (where v.opened_at >= now() - interval '7 days'),
    count(*) filter (where v.opened_at >= now() - interval '30 days')
  from public.resource_visits v group by v.resource_key;
end;
$$;

create or replace function public.get_admin_user_resource_metrics(p_user_id uuid)
returns table(resource_key text, total_visits bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'admin' and p.status = 'approved') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select v.resource_key, count(*)
    from public.resource_visits v where v.user_id = p_user_id group by v.resource_key;
end;
$$;

revoke all on function public.record_site_visit(uuid, boolean), public.get_site_visit_stats(),
  public.record_resource_visit(text), public.get_resource_visit_counts(),
  public.get_admin_resource_metrics(), public.get_admin_user_resource_metrics(uuid)
  from public, anon, authenticated;
grant execute on function public.record_site_visit(uuid, boolean), public.get_site_visit_stats() to anon, authenticated;
grant execute on function public.record_resource_visit(text), public.get_resource_visit_counts(),
  public.get_admin_resource_metrics(), public.get_admin_user_resource_metrics(uuid) to authenticated;
commit;
