-- Run ONCE after scripts/resource-access.sql has already been applied.
-- This migration does not reset existing resource choices.
begin;

alter table public.user_resource_access
  drop constraint if exists user_resource_access_resource_key_check;
alter table public.user_resource_access
  add constraint user_resource_access_resource_key_check
  check (resource_key in ('courses','hemox','software','firmware','explorers','datasets','silo'));

create table public.course_instructors (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

create or replace function public.set_user_resources(target_user_id uuid, resource_keys text[])
returns void language plpgsql security definer set search_path = '' as $$
declare target_role text;
begin
  if not exists (select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin' and status = 'approved') then
    raise exception 'Only approved administrators can manage resource access' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(resource_keys, array[]::text[])) as requested(key)
    where requested.key is null or requested.key not in
      ('courses','hemox','software','firmware','explorers','datasets','silo')
  ) then
    raise exception 'Unknown resource key' using errcode = '22023';
  end if;
  select role into target_role from public.profiles where id = target_user_id for update;
  if target_role is distinct from 'user' then
    raise exception 'Target must be an existing user' using errcode = '22023';
  end if;
  delete from public.user_resource_access where user_id = target_user_id;
  insert into public.user_resource_access(user_id, resource_key)
  select target_user_id, requested.key
  from (select distinct key from unnest(coalesce(resource_keys, array[]::text[])) as keys(key)) as requested;
  if not ('courses' = any(coalesce(resource_keys, array[]::text[]))) then
    delete from public.course_instructors where user_id = target_user_id;
  end if;
end;
$$;
revoke all on function public.set_user_resources(uuid,text[]) from public, anon;
grant execute on function public.set_user_resources(uuid,text[]) to authenticated;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  title text not null check (length(btrim(title)) between 3 and 160),
  description text not null default '' check (length(description) <= 2000),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_author_idx on public.courses(author_id);

create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null check (position between 0 and 1000),
  title text not null check (length(btrim(title)) between 1 and 160),
  video_url text not null check (length(video_url) between 8 and 2048 and video_url ~* '^https://'),
  unique(course_id, position)
);

create table public.course_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  file_name text not null check (length(file_name) between 1 and 200),
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now(),
  check (storage_path like course_id::text || '/%' and storage_path ~* '[.](pdf|zip)$')
);
create index course_files_course_idx on public.course_files(course_id);

alter table public.course_instructors enable row level security;
alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_files enable row level security;
revoke all on public.course_instructors, public.courses, public.course_lessons, public.course_files from public, anon, authenticated;
grant select on public.course_instructors to authenticated;
grant select, insert, update, delete on public.courses, public.course_lessons, public.course_files to authenticated;

create function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'admin' and p.status = 'approved');
$$;
create function public.can_access_courses()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid())
    and p.status = 'approved' and (
      p.role = 'admin' or (p.role = 'user' and p.expires_at > now()
        and exists(select 1 from public.user_resource_access ra
          where ra.user_id = p.id and ra.resource_key = 'courses'))));
$$;
create function public.can_create_courses()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_courses() and (
    public.is_platform_admin() or exists(select 1 from public.course_instructors ci
      where ci.user_id = (select auth.uid())));
$$;
create function public.can_manage_course(target_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_create_courses() and (
    public.is_platform_admin() or exists(select 1 from public.courses c
      where c.id = target_course_id and c.author_id = (select auth.uid())));
$$;
create function public.can_read_course(target_course_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_courses() and exists(select 1 from public.courses c
    where c.id = target_course_id and (c.status = 'published'
      or public.is_platform_admin()
      or (c.author_id = (select auth.uid()) and public.can_create_courses())));
$$;

revoke all on function public.is_platform_admin(), public.can_access_courses(),
  public.can_create_courses(), public.can_manage_course(uuid), public.can_read_course(uuid)
  from public, anon;
grant execute on function public.is_platform_admin(), public.can_access_courses(),
  public.can_create_courses(), public.can_manage_course(uuid), public.can_read_course(uuid)
  to authenticated;

create policy "Course instructors visible to self and admin" on public.course_instructors
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_platform_admin()));
create policy "Allowed users read published courses, authors read drafts" on public.courses
  for select to authenticated using (
    (select public.can_access_courses()) and (
      status = 'published' or (select public.is_platform_admin())
      or (author_id = (select auth.uid()) and (select public.can_create_courses()))));
create policy "Instructors create own courses" on public.courses
  for insert to authenticated with check (author_id = (select auth.uid()) and (select public.can_create_courses()));
create policy "Instructors edit own courses" on public.courses
  for update to authenticated using ((select public.can_manage_course(id)))
  with check ((select public.can_manage_course(id)));
create policy "Instructors remove own courses" on public.courses
  for delete to authenticated using ((select public.can_manage_course(id)));
create policy "Read permitted lessons" on public.course_lessons
  for select to authenticated using (public.can_read_course(course_id));
create policy "Create permitted lessons" on public.course_lessons
  for insert to authenticated with check (public.can_manage_course(course_id));
create policy "Update permitted lessons" on public.course_lessons
  for update to authenticated using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));
create policy "Remove permitted lessons" on public.course_lessons
  for delete to authenticated using (public.can_manage_course(course_id));
create policy "Read permitted file records" on public.course_files
  for select to authenticated using (public.can_read_course(course_id));
create policy "Create permitted file records" on public.course_files
  for insert to authenticated with check (public.can_manage_course(course_id));
create policy "Remove permitted file records" on public.course_files
  for delete to authenticated using (public.can_manage_course(course_id));

create function public.replace_course_lessons(target_course_id uuid, lesson_rows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_course(target_course_id) then
    raise exception 'Course editing is not permitted' using errcode = '42501';
  end if;
  if lesson_rows is null or jsonb_typeof(lesson_rows) <> 'array' then
    raise exception 'Lessons must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(lesson_rows) > 50 then
    raise exception 'Provide at most 50 lessons' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(lesson_rows) as l(item)
    where jsonb_typeof(l.item) <> 'object'
      or length(btrim(coalesce(l.item->>'title',''))) not between 1 and 160
      or length(coalesce(l.item->>'video_url','')) > 2048
      or coalesce(l.item->>'video_url','') !~* '^https://') then
    raise exception 'Each lesson needs a title and HTTPS video link' using errcode = '22023';
  end if;
  delete from public.course_lessons where course_id = target_course_id;
  insert into public.course_lessons(course_id, position, title, video_url)
  select target_course_id, (l.ordinality - 1)::integer,
    btrim(l.item->>'title'), l.item->>'video_url'
  from jsonb_array_elements(lesson_rows) with ordinality as l(item, ordinality);
end;
$$;
revoke all on function public.replace_course_lessons(uuid,jsonb) from public, anon;
grant execute on function public.replace_course_lessons(uuid,jsonb) to authenticated;

create function public.set_course_instructor(target_user_id uuid, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target_role text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only approved administrators can assign instructors' using errcode = '42501';
  end if;
  select role into target_role from public.profiles where id = target_user_id for update;
  if target_role is distinct from 'user' then
    raise exception 'Target must be an existing user' using errcode = '22023';
  end if;
  if enabled is true then
    if not exists(select 1 from public.user_resource_access
      where user_id = target_user_id and resource_key = 'courses') then
      raise exception 'Grant Courses access before Instructor access' using errcode = '22023';
    end if;
    insert into public.course_instructors(user_id) values(target_user_id) on conflict do nothing;
  else
    delete from public.course_instructors where user_id = target_user_id;
  end if;
end;
$$;
revoke all on function public.set_course_instructor(uuid,boolean) from public, anon;
grant execute on function public.set_course_instructor(uuid,boolean) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit)
values ('course-materials','course-materials',false,26214400);

create policy "Instructors upload course materials" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'course-materials' and name ~* '[.](pdf|zip)$'
    and exists(select 1 from public.courses c where c.id::text = split_part(name,'/',1)
      and public.can_manage_course(c.id)));
create policy "Authorized learners download course materials" on storage.objects
  for select to authenticated using (
    bucket_id = 'course-materials'
    and (exists(select 1 from public.course_files f where f.storage_path = name
      and public.can_read_course(f.course_id))
      or exists(select 1 from public.courses c where c.id::text = split_part(name,'/',1)
        and public.can_manage_course(c.id))));
create policy "Instructors remove course materials" on storage.objects
  for delete to authenticated using (
    bucket_id = 'course-materials'
    and exists(select 1 from public.courses c where c.id::text = split_part(name,'/',1)
      and public.can_manage_course(c.id)));

commit;
