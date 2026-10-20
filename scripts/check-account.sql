-- Run read-only in the Supabase SQL Editor for the project used by .env.local.
-- This checks whether the account exists and whether its platform role is approved.
select
  u.id,
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  p.role,
  p.status,
  p.approved_at,
  p.expires_at
from auth.users as u
left join public.profiles as p on p.id = u.id
where lower(u.email) = 'ahmed.mohamed@kfupm.edu.sa';

-- If the first query finds a profile but the app reports it inaccessible,
-- inspect the table policies. Authenticated users must be able to select
-- their own profile; admins also need permission to list user profiles.
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'profiles';
