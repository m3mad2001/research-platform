-- Engineering Nexus communications and resource visibility upgrade.
-- Run in Supabase SQL Editor after the existing setup scripts. Safe to rerun.
begin;

-- ============================================================
-- 1. IN-PLATFORM NOTIFICATIONS
-- ============================================================
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null default 'general'
    check (notification_type in ('general','access_approved','access_changed')),
  title text not null check (length(btrim(title)) between 1 and 160),
  message text not null check (length(btrim(message)) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);
alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from public, anon, authenticated;
grant select, update on public.user_notifications to authenticated;

drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications" on public.user_notifications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Users mark own notifications read" on public.user_notifications;
create policy "Users mark own notifications read" on public.user_notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.mark_notification_read(p_notification_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  update public.user_notifications set read_at = coalesce(read_at, now())
    where user_id = (select auth.uid()) and (p_notification_id is null or id = p_notification_id);
end;
$$;
revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.notify_first_profile_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.approved_at is null and new.approved_at is not null and new.status = 'approved' then
    insert into public.user_notifications(user_id, notification_type, title, message)
    values (new.id, 'access_approved', 'Research access approved',
      'Your Engineering Nexus access is active. You can now sign in and open the resources assigned to your account.');
  end if;
  return new;
end;
$$;
revoke all on function public.notify_first_profile_approval() from public, anon, authenticated;
drop trigger if exists notify_first_profile_approval on public.profiles;
create trigger notify_first_profile_approval after update on public.profiles
  for each row execute function public.notify_first_profile_approval();

-- ============================================================
-- 2. GLOBAL CARD VISIBILITY
-- visible: only assigned subscribers see the card
-- locked: everybody sees it; unassigned subscribers see a locked card
-- hidden: subscribers cannot see or open it
-- ============================================================
create table if not exists public.resource_visibility (
  resource_key text primary key check (resource_key in
    ('courses','hemox','software','firmware','explorers','datasets','silo')),
  display_mode text not null default 'locked' check (display_mode in ('visible','locked','hidden')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.resource_visibility(resource_key, display_mode)
values ('courses','locked'),('hemox','locked'),('software','locked'),('firmware','locked'),
  ('explorers','locked'),('datasets','locked'),('silo','locked')
on conflict (resource_key) do nothing;
alter table public.resource_visibility enable row level security;
revoke all on public.resource_visibility from public, anon, authenticated;
grant select on public.resource_visibility to authenticated;

drop policy if exists "Approved accounts read resource visibility" on public.resource_visibility;
create policy "Approved accounts read resource visibility" on public.resource_visibility for select to authenticated
  using (exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'approved'));

create or replace function public.set_resource_visibility(p_resource_key text, p_display_mode text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role = 'admin' and p.status = 'approved') then
    raise exception 'Only approved administrators can manage visibility' using errcode = '42501';
  end if;
  if p_resource_key is null or p_resource_key not in
      ('courses','hemox','software','firmware','explorers','datasets','silo')
      or p_display_mode is null or p_display_mode not in ('visible','locked','hidden') then
    raise exception 'Invalid resource visibility setting' using errcode = '22023';
  end if;
  insert into public.resource_visibility(resource_key, display_mode, updated_at, updated_by)
  values (p_resource_key, p_display_mode, now(), (select auth.uid()))
  on conflict (resource_key) do update set display_mode = excluded.display_mode,
    updated_at = excluded.updated_at, updated_by = excluded.updated_by;
end;
$$;
revoke all on function public.set_resource_visibility(text,text) from public, anon;
grant execute on function public.set_resource_visibility(text,text) to authenticated;

-- Hidden cards are also blocked at the database layer for Courses and SILO.
create or replace function public.can_access_courses()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid())
    and p.status = 'approved' and (
      p.role = 'admin' or (p.role = 'user' and p.expires_at > now()
        and coalesce((select rv.display_mode from public.resource_visibility rv where rv.resource_key = 'courses'),'locked') <> 'hidden'
        and exists(select 1 from public.user_resource_access ra where ra.user_id = p.id and ra.resource_key = 'courses'))));
$$;

create or replace function public.can_access_silo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid())
    and p.status = 'approved' and (p.role = 'admin' or
      (p.role = 'user' and p.expires_at > now()
        and coalesce((select rv.display_mode from public.resource_visibility rv where rv.resource_key = 'silo'),'locked') <> 'hidden'
        and exists(select 1 from public.user_resource_access a where a.user_id = p.id and a.resource_key = 'silo'))));
$$;
revoke all on function public.can_access_courses(), public.can_access_silo() from public, anon;
grant execute on function public.can_access_courses(), public.can_access_silo() to authenticated;

create or replace function public.record_resource_visit(p_resource_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := (select auth.uid());
begin
  if p_resource_key not in ('courses','software','silo') or p_resource_key is null then
    raise exception 'Resource not open for tracking' using errcode = '22023';
  end if;
  if not exists(select 1 from public.profiles p where p.id = current_user_id
      and p.role = 'user' and p.status = 'approved' and p.expires_at > now())
      or not exists(select 1 from public.user_resource_access a
        where a.user_id = current_user_id and a.resource_key = p_resource_key)
      or coalesce((select rv.display_mode from public.resource_visibility rv
        where rv.resource_key = p_resource_key),'locked') = 'hidden' then
    raise exception 'Resource access required' using errcode = '42501';
  end if;
  insert into public.resource_visits(user_id, resource_key) values(current_user_id, p_resource_key);
end;
$$;
revoke all on function public.record_resource_visit(text) from public, anon;
grant execute on function public.record_resource_visit(text) to authenticated;

-- ============================================================
-- 3. ITEM-LEVEL VISIBILITY FOR CURRENT DYNAMIC LIBRARIES
-- ============================================================
alter table public.courses add column if not exists is_visible boolean not null default true;
alter table public.silo_projects add column if not exists is_visible boolean not null default true;

create or replace function public.can_read_course(target_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_courses() and exists(select 1 from public.courses c
    where c.id = target_course_id and (
      public.is_platform_admin()
      or (c.author_id = (select auth.uid()) and public.can_create_courses())
      or (c.status = 'published' and c.is_visible)));
$$;
drop policy if exists "Allowed users read published courses, authors read drafts" on public.courses;
create policy "Allowed users read published courses, authors read drafts" on public.courses
  for select to authenticated using (
    (select public.can_access_courses()) and (
      (select public.is_platform_admin())
      or (author_id = (select auth.uid()) and (select public.can_create_courses()))
      or (status = 'published' and is_visible)));

create or replace function public.can_read_silo(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_silo() and exists(select 1 from public.silo_projects p
    where p.id = p_project_id and (
      public.is_platform_admin()
      or (p.author_id = (select auth.uid()) and public.can_create_silo())
      or (p.status = 'published' and p.is_visible)));
$$;
drop policy if exists "Read published SILO projects" on public.silo_projects;
create policy "Read published SILO projects" on public.silo_projects for select to authenticated
  using ((select public.can_access_silo()) and (
    (select public.is_platform_admin())
    or (author_id = (select auth.uid()) and (select public.can_create_silo()))
    or (status = 'published' and is_visible)));

-- ============================================================
-- 4. PRIVATE CONTACT INBOX
-- ============================================================
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  sender_name text not null check (length(btrim(sender_name)) between 2 and 120),
  sender_email text not null check (length(sender_email) between 5 and 254),
  category text not null check (category in ('General','Access','Technical','Research collaboration','Other')),
  subject text not null check (length(btrim(subject)) between 3 and 160),
  message text not null check (length(btrim(message)) between 10 and 5000),
  status text not null default 'new' check (status in ('new','in_progress','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages(created_at desc);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public, anon, authenticated;
grant select, update on public.contact_messages to authenticated;

drop policy if exists "Admins read contact inbox" on public.contact_messages;
create policy "Admins read contact inbox" on public.contact_messages for select to authenticated
  using (public.is_platform_admin());
drop policy if exists "Admins update contact inbox" on public.contact_messages;
create policy "Admins update contact inbox" on public.contact_messages for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.submit_contact_message(
  p_name text, p_email text, p_category text, p_subject text, p_message text, p_user_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  p_name := btrim(coalesce(p_name,'')); p_email := lower(btrim(coalesce(p_email,'')));
  p_category := btrim(coalesce(p_category,'')); p_subject := btrim(coalesce(p_subject,''));
  p_message := btrim(coalesce(p_message,''));
  if length(p_name) not between 2 and 120 or length(p_email) not between 5 and 254
      or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      or p_category not in ('General','Access','Technical','Research collaboration','Other')
      or length(p_subject) not between 3 and 160 or length(p_message) not between 10 and 5000 then
    raise exception 'Invalid contact message' using errcode = '22023';
  end if;
  if p_user_id is not null and p_user_id is distinct from (select auth.uid()) then
    raise exception 'Invalid contact identity' using errcode = '42501';
  end if;
  if (select count(*) from public.contact_messages c where lower(c.sender_email) = p_email
      and c.created_at > now() - interval '15 minutes') >= 3 then
    raise exception 'Too many messages. Please wait before trying again.' using errcode = 'P0001';
  end if;
  insert into public.contact_messages(user_id,sender_name,sender_email,category,subject,message)
    values (p_user_id,p_name,p_email,p_category,p_subject,p_message) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.submit_contact_message(text,text,text,text,text,uuid) from public;
grant execute on function public.submit_contact_message(text,text,text,text,text,uuid) to anon, authenticated;

create or replace function public.set_contact_message_status(p_message_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role = 'admin' and p.status = 'approved') then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('new','in_progress','resolved') then
    raise exception 'Invalid message status' using errcode = '22023';
  end if;
  update public.contact_messages set status = p_status, updated_at = now() where id = p_message_id;
end;
$$;
revoke all on function public.set_contact_message_status(uuid,text) from public, anon;
grant execute on function public.set_contact_message_status(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
