-- Apply in the Supabase SQL Editor before deploying this project. Safe to rerun.
-- Existing users, expiry dates, and resource grants are preserved.
begin;

-- Positive timestamp infinity means no expiry, and keeps existing RLS checks
-- such as expires_at > now() valid without broadening null/unconfigured access.
create or replace function public.manage_user_access(
  p_user_id uuid,
  p_action text,
  p_expected_status text,
  p_expected_expires_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_days integer default null,
  p_no_expiry boolean default false
)
returns void language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare
  target_role text;
  target_status text;
  target_expiry timestamptz;
  chosen_expiry timestamptz;
  action_time timestamptz := now();
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'admin' and p.status = 'approved') then
    raise exception 'Only approved administrators can manage account access' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('set','approve','extend','resume','suspend','revoke')
    or p_expected_status is null or p_no_expiry is null then
    raise exception 'Provide a valid access action and current account state' using errcode = '22023';
  end if;

  select p.role::text, p.status::text, p.expires_at into target_role, target_status, target_expiry
    from public.profiles p where p.id = p_user_id for update;
  if target_role is distinct from 'user' then
    raise exception 'Target must be an existing user; administrator accounts cannot be changed here' using errcode = '22023';
  end if;
  if target_status is distinct from p_expected_status or target_expiry is distinct from p_expected_expires_at then
    raise exception 'Account access changed; refresh before trying again' using errcode = '40001';
  end if;

  if p_action in ('set','approve') then
    if p_no_expiry then
      if p_expires_at is not null or p_days is not null then
        raise exception 'Choose either No expiry or a finite access duration' using errcode = '22023';
      end if;
      chosen_expiry := 'infinity'::timestamptz;
    elsif p_days is not null then
      if p_days not between 1 and 3650 or p_expires_at is not null then
        raise exception 'Choose 1 to 3650 days, or a custom expiry' using errcode = '22023';
      end if;
      chosen_expiry := action_time + make_interval(days => p_days);
    else
      if p_expires_at is null or not isfinite(p_expires_at) or p_expires_at <= action_time then
        raise exception 'Choose a future expiry date or No expiry' using errcode = '22023';
      end if;
      chosen_expiry := p_expires_at;
    end if;
    if p_action = 'approve' then
      if target_status not in ('pending','expired') and not
        (target_status = 'approved' and (target_expiry is null or target_expiry <= action_time)) then
        raise exception 'Use Save Access Settings for active accounts, or Resume Access for suspended accounts' using errcode = '22023';
      end if;
      update public.profiles set status = 'approved', approved_at = coalesce(approved_at, action_time),
        expires_at = chosen_expiry where id = p_user_id;
    else
      update public.profiles set expires_at = chosen_expiry where id = p_user_id;
    end if;
  elsif p_action = 'extend' then
    if target_status not in ('approved','expired','suspended') or p_days is null or p_days not between 1 and 3650 then
      raise exception 'Approve the account first and choose 1 to 3650 extension days' using errcode = '22023';
    end if;
    if target_expiry = 'infinity'::timestamptz then
      raise exception 'This account already has no expiry' using errcode = '22023';
    end if;
    chosen_expiry := greatest(coalesce(target_expiry, action_time), action_time) + make_interval(days => p_days);
    update public.profiles set expires_at = chosen_expiry,
      status = case when status = 'expired' then 'approved' else status end,
      approved_at = coalesce(approved_at, action_time) where id = p_user_id;
  elsif p_action = 'resume' then
    if target_status <> 'suspended' or target_expiry is null or target_expiry <= action_time then
      raise exception 'Save a future expiry or No expiry before resuming a suspended account' using errcode = '22023';
    end if;
    update public.profiles set status = 'approved', approved_at = coalesce(approved_at, action_time) where id = p_user_id;
  elsif p_action = 'suspend' then
    if target_status not in ('approved','expired') then
      raise exception 'Only approved or expired accounts can be suspended' using errcode = '22023';
    end if;
    update public.profiles set status = 'suspended' where id = p_user_id;
  else
    update public.profiles set status = 'expired', expires_at = action_time where id = p_user_id;
  end if;
end;
$$;
revoke all on function public.manage_user_access(uuid,text,text,timestamptz,timestamptz,integer,boolean) from public, anon;
grant execute on function public.manage_user_access(uuid,text,text,timestamptz,timestamptz,integer,boolean) to authenticated;

-- Protect account access fields even if an existing own-profile UPDATE policy
-- permits users to edit their name or institution. Trusted database maintenance
-- and service-role operations without a user JWT retain their existing workflow.
create or replace function public.guard_profile_access_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(new.role,new.status,new.approved_at,new.expires_at) is distinct from
     row(old.role,old.status,old.approved_at,old.expires_at) then
    if (select auth.uid()) is null and coalesce((select auth.role()), '') not in ('anon','authenticated') then
      return new;
    end if;
    if not exists (select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role = 'admin' and p.status = 'approved') then
      raise exception 'Only approved administrators can change account access fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_profile_access_fields() from public, anon, authenticated;
drop trigger if exists guard_profile_access_fields on public.profiles;
create trigger guard_profile_access_fields before update on public.profiles
  for each row execute function public.guard_profile_access_fields();

notify pgrst, 'reload schema';
commit;
