-- Run ONCE in the Supabase SQL Editor before deploying this version.
-- Existing approved users keep all six resources. Future users start with none.
begin;

create table public.user_resource_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_key text not null check (
    resource_key in ('courses', 'hemox', 'software', 'firmware', 'explorers', 'datasets')
  ),
  granted_at timestamptz not null default now(),
  primary key (user_id, resource_key)
);

alter table public.user_resource_access enable row level security;
revoke all on table public.user_resource_access from public, anon, authenticated;
grant select on table public.user_resource_access to authenticated;

create policy "Users read own resource grants, admins read all"
on public.user_resource_access for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles as admin_profile
    where admin_profile.id = (select auth.uid())
      and admin_profile.role = 'admin'
      and admin_profile.status = 'approved'
  )
);

-- Preserve access for accounts already approved when the migration first runs.
insert into public.user_resource_access (user_id, resource_key)
select p.id, r.resource_key
from public.profiles as p
cross join (values
  ('courses'), ('hemox'), ('software'), ('firmware'), ('explorers'), ('datasets')
) as r(resource_key)
where p.role = 'user' and p.status = 'approved';

create function public.set_user_resources(target_user_id uuid, resource_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'approved'
  ) then
    raise exception 'Only approved administrators can manage resource access' using errcode = '42501';
  end if;

  if exists (
    select 1 from unnest(coalesce(resource_keys, array[]::text[])) as requested(key)
    where requested.key is null or requested.key not in
      ('courses', 'hemox', 'software', 'firmware', 'explorers', 'datasets')
  ) then
    raise exception 'Unknown resource key' using errcode = '22023';
  end if;

  -- Serialize changes to this user's grants and reject admin targets.
  select role into target_role from public.profiles
  where id = target_user_id for update;
  if target_role is distinct from 'user' then
    raise exception 'Target must be an existing user' using errcode = '22023';
  end if;

  delete from public.user_resource_access where user_id = target_user_id;
  insert into public.user_resource_access(user_id, resource_key)
  select target_user_id, requested.key
  from (select distinct key from unnest(coalesce(resource_keys, array[]::text[])) as keys(key)) as requested;
end;
$$;

revoke all on function public.set_user_resources(uuid, text[]) from public, anon;
grant execute on function public.set_user_resources(uuid, text[]) to authenticated;

commit;
