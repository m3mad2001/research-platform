-- Run after courses-and-silo.sql and visit-analytics.sql in Supabase SQL Editor.
-- Safe to rerun. No existing courses, access choices, or visit history are reset.
begin;

create table if not exists public.silo_editors (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

create table if not exists public.silo_projects (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null check (length(btrim(title)) between 3 and 160),
  description text not null default '' check (length(description) <= 2000),
  supplementary_url text check (supplementary_url is null or (length(supplementary_url) <= 2048 and supplementary_url ~* '^https://')),
  readme_markdown text not null default '' check (octet_length(readme_markdown) <= 131072),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.silo_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.silo_projects(id) on delete cascade,
  position integer not null check (position between 0 and 1000),
  title text not null check (length(btrim(title)) between 1 and 160),
  video_url text not null check (length(video_url) between 8 and 2048 and video_url ~* '^https://'),
  unique(project_id, position)
);

create table if not exists public.silo_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.silo_projects(id) on delete cascade,
  file_name text not null check (length(file_name) between 1 and 200),
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now(),
  check (storage_path like project_id::text || '/%' and storage_path ~* '[.](pdf|zip)$')
);
create index if not exists silo_projects_author_idx on public.silo_projects(author_id);
create index if not exists silo_files_project_idx on public.silo_files(project_id);

alter table public.silo_editors enable row level security;
alter table public.silo_projects enable row level security;
alter table public.silo_links enable row level security;
alter table public.silo_files enable row level security;
revoke all on public.silo_editors, public.silo_projects, public.silo_links, public.silo_files from public, anon, authenticated;
grant select on public.silo_editors to authenticated;
grant select, insert, update, delete on public.silo_projects, public.silo_links, public.silo_files to authenticated;

create or replace function public.can_access_silo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid())
    and p.status = 'approved' and (p.role = 'admin' or
      (p.role = 'user' and p.expires_at > now() and exists (
        select 1 from public.user_resource_access a where a.user_id = p.id and a.resource_key = 'silo'))));
$$;
create or replace function public.can_create_silo()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_silo() and (public.is_platform_admin() or
    exists(select 1 from public.silo_editors e where e.user_id = (select auth.uid())));
$$;
create or replace function public.can_manage_silo(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_create_silo() and (public.is_platform_admin() or
    exists(select 1 from public.silo_projects p where p.id = p_project_id and p.author_id = (select auth.uid())));
$$;
create or replace function public.can_read_silo(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_silo() and exists(select 1 from public.silo_projects p
    where p.id = p_project_id and (p.status = 'published' or public.is_platform_admin()
      or (p.author_id = (select auth.uid()) and public.can_create_silo())));
$$;
revoke all on function public.can_access_silo(), public.can_create_silo(),
  public.can_manage_silo(uuid), public.can_read_silo(uuid) from public, anon;
grant execute on function public.can_access_silo(), public.can_create_silo(),
  public.can_manage_silo(uuid), public.can_read_silo(uuid) to authenticated;

drop policy if exists "SILO editors self or admin" on public.silo_editors;
create policy "SILO editors self or admin" on public.silo_editors for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_platform_admin()));
drop policy if exists "Read published SILO projects" on public.silo_projects;
create policy "Read published SILO projects" on public.silo_projects for select to authenticated
  using ((select public.can_access_silo()) and (status = 'published' or (select public.is_platform_admin())
    or (author_id = (select auth.uid()) and (select public.can_create_silo()))));
drop policy if exists "Create SILO projects" on public.silo_projects;
create policy "Create SILO projects" on public.silo_projects for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.can_create_silo()));
drop policy if exists "Edit SILO projects" on public.silo_projects;
create policy "Edit SILO projects" on public.silo_projects for update to authenticated
  using (public.can_manage_silo(id)) with check (public.can_manage_silo(id)
    and (author_id = (select auth.uid()) or (select public.is_platform_admin())));
drop policy if exists "Delete SILO projects" on public.silo_projects;
create policy "Delete SILO projects" on public.silo_projects for delete to authenticated using (public.can_manage_silo(id));
drop policy if exists "Read SILO links" on public.silo_links;
create policy "Read SILO links" on public.silo_links for select to authenticated using (public.can_read_silo(project_id));
drop policy if exists "Insert SILO links" on public.silo_links;
create policy "Insert SILO links" on public.silo_links for insert to authenticated with check (public.can_manage_silo(project_id));
drop policy if exists "Delete SILO links" on public.silo_links;
create policy "Delete SILO links" on public.silo_links for delete to authenticated using (public.can_manage_silo(project_id));
drop policy if exists "Read SILO files" on public.silo_files;
create policy "Read SILO files" on public.silo_files for select to authenticated using (public.can_read_silo(project_id));
drop policy if exists "Insert SILO files" on public.silo_files;
create policy "Insert SILO files" on public.silo_files for insert to authenticated with check (public.can_manage_silo(project_id));
drop policy if exists "Delete SILO files" on public.silo_files;
create policy "Delete SILO files" on public.silo_files for delete to authenticated using (public.can_manage_silo(project_id));

create or replace function public.replace_silo_links(target_project_id uuid, link_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_silo(target_project_id) then
    raise exception 'SILO editing is not permitted' using errcode = '42501';
  end if;
  if link_rows is null or jsonb_typeof(link_rows) <> 'array' or jsonb_array_length(link_rows) > 50 then
    raise exception 'Provide an array of at most 50 links' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(link_rows) as l(item)
    where jsonb_typeof(l.item) <> 'object' or length(btrim(coalesce(l.item->>'title',''))) not between 1 and 160
      or length(coalesce(l.item->>'video_url','')) > 2048 or coalesce(l.item->>'video_url','') !~* '^https://') then
    raise exception 'Each link needs a title and HTTPS URL' using errcode = '22023';
  end if;
  delete from public.silo_links where project_id = target_project_id;
  insert into public.silo_links(project_id, position, title, video_url)
  select target_project_id, (l.ordinality - 1)::integer, btrim(l.item->>'title'), l.item->>'video_url'
  from jsonb_array_elements(link_rows) with ordinality as l(item, ordinality);
end;
$$;
revoke all on function public.replace_silo_links(uuid,jsonb) from public, anon;
grant execute on function public.replace_silo_links(uuid,jsonb) to authenticated;

create or replace function public.set_silo_editor(target_user_id uuid, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only administrators can assign SILO editors' using errcode = '42501';
  end if;
  if enabled is true then
    if not exists(select 1 from public.profiles p join public.user_resource_access a on a.user_id = p.id
      where p.id = target_user_id and p.role = 'user' and a.resource_key = 'silo') then
      raise exception 'Grant SILO access to a user first' using errcode = '22023';
    end if;
    insert into public.silo_editors(user_id) values(target_user_id) on conflict do nothing;
  else
    delete from public.silo_editors where user_id = target_user_id;
  end if;
end;
$$;
revoke all on function public.set_silo_editor(uuid,boolean) from public, anon;
grant execute on function public.set_silo_editor(uuid,boolean) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit)
values ('silo-materials','silo-materials',false,26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;
drop policy if exists "SILO editors upload" on storage.objects;
create policy "SILO editors upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'silo-materials' and name ~* '[.](pdf|zip)$' and exists (
    select 1 from public.silo_projects p where p.id::text = split_part(name,'/',1) and public.can_manage_silo(p.id)));
drop policy if exists "SILO members download" on storage.objects;
create policy "SILO members download" on storage.objects for select to authenticated using (
  bucket_id = 'silo-materials' and (exists (
    select 1 from public.silo_files f where f.storage_path = name and public.can_read_silo(f.project_id))
    or exists (select 1 from public.silo_projects p where p.id::text = split_part(name,'/',1)
      and public.can_manage_silo(p.id))));
drop policy if exists "SILO editors remove" on storage.objects;
create policy "SILO editors remove" on storage.objects for delete to authenticated using (
  bucket_id = 'silo-materials' and exists (
    select 1 from public.silo_projects p where p.id::text = split_part(name,'/',1) and public.can_manage_silo(p.id)));

-- Seed the public research artifact for an existing approved administrator, once.
insert into public.silo_projects(id, author_id, title, description, supplementary_url, status)
select '6421e844-a79b-4b17-9e02-a8353158aece'::uuid, p.id,
  'Spectre-in-the-Loop variability-aware CAD for RFIC design',
  'SILO supplementary research artifact: oscillator and rectifier optimization, Monte Carlo and PVT datasets, reports and reproducibility resources.',
  'https://github.com/Ahmed-Reda-SILO/SILO-RFIC-CAD', 'published'
from public.profiles p where p.role = 'admin' and p.status = 'approved'
order by p.created_at limit 1
on conflict (id) do nothing;

-- Permit the SILO card to record opens using the same strict access check as the other live cards.
create or replace function public.record_resource_visit(p_resource_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if p_resource_key not in ('courses','software','silo') or p_resource_key is null then
    raise exception 'Resource not open for tracking' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = current_user_id
    and p.role = 'user' and p.status = 'approved' and p.expires_at > now())
    or not exists (select 1 from public.user_resource_access a
      where a.user_id = current_user_id and a.resource_key = p_resource_key) then
    raise exception 'Resource access required' using errcode = '42501';
  end if;
  insert into public.resource_visits(user_id, resource_key) values(current_user_id, p_resource_key);
end;
$$;

create index if not exists site_visits_first_seen_idx on public.site_visits(first_seen_at);
create index if not exists registration_visits_first_seen_idx on public.registration_visits(first_seen_at);
create or replace function public.get_admin_visit_trends(p_days integer default 30)
returns table(visit_date date, site_visits bigint, registration_visits bigint, resource_opens bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_days not between 1 and 90 then
    raise exception 'Choose 1 to 90 days' using errcode = '22023';
  end if;
  return query
  with days as (select (current_date - n)::date as d from generate_series(p_days - 1, 0, -1) as n),
  sites as (select (s.first_seen_at at time zone 'UTC')::date d, count(*) n
    from public.site_visits s where s.first_seen_at >= (current_date - (p_days - 1))::timestamptz group by 1),
  registrations as (select (r.first_seen_at at time zone 'UTC')::date d, count(*) n
    from public.registration_visits r where r.first_seen_at >= (current_date - (p_days - 1))::timestamptz group by 1),
  resources as (select (v.opened_at at time zone 'UTC')::date d, count(*) n
    from public.resource_visits v where v.opened_at >= (current_date - (p_days - 1))::timestamptz group by 1)
  select days.d, coalesce(sites.n, 0), coalesce(registrations.n, 0), coalesce(resources.n, 0)
  from days left join sites on sites.d = days.d
    left join registrations on registrations.d = days.d
    left join resources on resources.d = days.d order by days.d;
end;
$$;
revoke all on function public.get_admin_visit_trends(integer) from public, anon;
grant execute on function public.get_admin_visit_trends(integer) to authenticated;
commit;
