-- Apply after resource-access.sql and courses-and-silo.sql. Safe to rerun.
-- Discussions use existing approvals, expiry dates, and resource grants.
begin;

create table if not exists public.discussion_responders (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists public.discussion_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  author_name text not null default 'Researcher',
  title text not null check (length(btrim(title)) between 5 and 160),
  body text not null check (length(btrim(body)) between 10 and 6000),
  resource_key text not null default 'general'
    check (resource_key in ('general','courses','hemox','software','firmware','explorers','datasets','silo')),
  status text not null default 'open' check (status in ('open','answered','closed')),
  solution_reply_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  author_name text not null default 'Researcher',
  body text not null check (length(btrim(body)) between 2 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists discussion_threads_recent_idx on public.discussion_threads(created_at desc);
create index if not exists discussion_replies_thread_idx on public.discussion_replies(thread_id, created_at);

create or replace function public.can_access_discussion_resource(p_resource_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
      and (p.role = 'admin' or (
        p.role = 'user' and p.expires_at > now() and (
          p_resource_key = 'general' or exists (
            select 1 from public.user_resource_access a
            where a.user_id = p.id and a.resource_key = p_resource_key
          )
        )
      ))
  );
$$;

create or replace function public.can_read_discussion(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.discussion_threads t where t.id = p_thread_id
    and public.can_access_discussion_resource(t.resource_key));
$$;

create or replace function public.can_reply_discussion(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.discussion_threads t where t.id = p_thread_id
    and t.status <> 'closed' and public.can_access_discussion_resource(t.resource_key)
    and (t.author_id = (select auth.uid()) or public.is_platform_admin()
      or exists(select 1 from public.course_instructors i where i.user_id = (select auth.uid()))
      or exists(select 1 from public.discussion_responders r where r.user_id = (select auth.uid()))));
$$;

create or replace function public.discussion_post_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := (select auth.uid());
  if new.author_id is null then raise exception 'Sign in to post' using errcode = '42501'; end if;
  new.author_name := coalesce((select nullif(btrim(p.full_name), '') from public.profiles p
    where p.id = new.author_id), 'Researcher');
  new.created_at := now();
  if tg_table_name = 'discussion_threads' then new.updated_at := now(); end if;
  return new;
end;
$$;

create or replace function public.discussion_post_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recent_count integer;
begin
  if tg_table_name = 'discussion_threads' then
    select count(*) into recent_count from public.discussion_threads t
      where t.author_id = (select auth.uid()) and t.created_at > now() - interval '1 minute';
    if recent_count >= 2 then raise exception 'Please wait before asking another question' using errcode = '22023'; end if;
  else
    select count(*) into recent_count from public.discussion_replies r
      where r.author_id = (select auth.uid()) and r.created_at > now() - interval '1 minute';
    if recent_count >= 8 then raise exception 'Please wait before replying again' using errcode = '22023'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists discussion_thread_identity on public.discussion_threads;
create trigger discussion_thread_identity before insert on public.discussion_threads
  for each row execute function public.discussion_post_identity();
drop trigger if exists discussion_reply_identity on public.discussion_replies;
create trigger discussion_reply_identity before insert on public.discussion_replies
  for each row execute function public.discussion_post_identity();
drop trigger if exists discussion_thread_limit on public.discussion_threads;
create trigger discussion_thread_limit before insert on public.discussion_threads
  for each row execute function public.discussion_post_limit();
drop trigger if exists discussion_reply_limit on public.discussion_replies;
create trigger discussion_reply_limit before insert on public.discussion_replies
  for each row execute function public.discussion_post_limit();

create or replace function public.set_discussion_state(
  p_thread_id uuid, p_status text, p_solution_reply_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare thread_author uuid;
begin
  select t.author_id into thread_author from public.discussion_threads t
    where t.id = p_thread_id for update;
  if thread_author is null or not public.can_read_discussion(p_thread_id) or
     (thread_author <> (select auth.uid()) and not public.is_platform_admin()) then
    raise exception 'Not allowed to manage this discussion' using errcode = '42501';
  end if;
  if p_status not in ('open','answered','closed') or p_status is null then
    raise exception 'Invalid discussion state' using errcode = '22023';
  end if;
  if (p_status = 'answered' and p_solution_reply_id is null)
    or (p_status = 'open' and p_solution_reply_id is not null)
    or (p_solution_reply_id is not null and not exists (
       select 1 from public.discussion_replies r where r.id = p_solution_reply_id
         and r.thread_id = p_thread_id)) then
    raise exception 'Select a reply from this discussion' using errcode = '22023';
  end if;
  update public.discussion_threads set status = p_status,
    solution_reply_id = p_solution_reply_id, updated_at = now()
    where id = p_thread_id;
end;
$$;

create or replace function public.set_discussion_responder(p_user_id uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only administrators can assign responders' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id and p.role = 'user') then
    raise exception 'Choose an existing user' using errcode = '22023';
  end if;
  if p_enabled is true then
    insert into public.discussion_responders(user_id) values(p_user_id) on conflict do nothing;
  else
    delete from public.discussion_responders where user_id = p_user_id;
  end if;
end;
$$;

alter table public.discussion_threads enable row level security;
alter table public.discussion_replies enable row level security;
alter table public.discussion_responders enable row level security;
revoke all on public.discussion_threads, public.discussion_replies, public.discussion_responders from public, anon, authenticated;
grant select, insert on public.discussion_threads, public.discussion_replies to authenticated;
grant select on public.discussion_responders to authenticated;
revoke all on function public.can_access_discussion_resource(text), public.can_read_discussion(uuid),
  public.can_reply_discussion(uuid), public.set_discussion_state(uuid,text,uuid),
  public.set_discussion_responder(uuid,boolean), public.discussion_post_identity(),
  public.discussion_post_limit() from public, anon;
grant execute on function public.can_access_discussion_resource(text), public.can_read_discussion(uuid),
  public.can_reply_discussion(uuid), public.set_discussion_state(uuid,text,uuid),
  public.set_discussion_responder(uuid,boolean) to authenticated;

drop policy if exists "View permitted discussions" on public.discussion_threads;
create policy "View permitted discussions" on public.discussion_threads for select to authenticated
  using (public.can_access_discussion_resource(resource_key));
drop policy if exists "Ask in permitted resources" on public.discussion_threads;
create policy "Ask in permitted resources" on public.discussion_threads for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'open'
    and solution_reply_id is null and public.can_access_discussion_resource(resource_key));
drop policy if exists "View permitted replies" on public.discussion_replies;
create policy "View permitted replies" on public.discussion_replies for select to authenticated
  using (public.can_read_discussion(thread_id));
drop policy if exists "Respond when authorized" on public.discussion_replies;
create policy "Respond when authorized" on public.discussion_replies for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_reply_discussion(thread_id));
drop policy if exists "View own or admin responder grants" on public.discussion_responders;
create policy "View own or admin responder grants" on public.discussion_responders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());

commit;
